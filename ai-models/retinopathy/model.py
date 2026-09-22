"""
GramSwasthya AI — Diabetic Retinopathy Detection
CNN-based grading of diabetic retinopathy from retinal fundus images.

Grades (ETDRS scale):
  0 — No DR
  1 — Mild NPDR (microaneurysms only)
  2 — Moderate NPDR (hemorrhages, hard exudates)
  3 — Severe NPDR (4-2-1 rule)
  4 — PDR (neovascularization, vitreous hemorrhage)

Architecture: ResNet-50 + custom regression head
Dataset: Kaggle DR Detection (88,702 images), APTOS 2019
Target: ~90% quadratic weighted kappa
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T
import torchvision.models as models
import numpy as np
import pandas as pd
from PIL import Image
from pathlib import Path
from typing import Dict, Optional
import json, os, sys
sys.path.append(str(Path(__file__).parent.parent))
from utils.model_utils import (
    preprocess_retinal, to_tensor, GradCAM,
    compute_metrics, save_model, load_model
)


# ── DR Grade labels ───────────────────────────────────────────────────────────

DR_GRADES = {
    0: "No DR",
    1: "Mild NPDR",
    2: "Moderate NPDR",
    3: "Severe NPDR",
    4: "PDR (Proliferative)"
}

VISION_THREATENING = {3, 4}   # Grades requiring urgent referral
REFERRAL_REQUIRED  = {2, 3, 4}


# ── Dataset ───────────────────────────────────────────────────────────────────

class RetinopathyDataset(Dataset):
    """
    Retinal fundus image dataset.

    Directory structure:
        data/retinopathy/
            train.csv   ← columns: image_path, grade (0-4)
            val.csv
            test.csv
            images/     ← all fundus images

    Public datasets:
    - APTOS 2019: https://www.kaggle.com/c/aptos2019-blindness-detection
    - Kaggle DR: https://www.kaggle.com/c/diabetic-retinopathy-detection
    - MESSIDOR-2: https://www.adcis.net/en/third-party/messidor2/
    """

    def __init__(self, csv_path: str, img_dir: str, split: str = 'train'):
        self.df = pd.read_csv(csv_path)
        self.img_dir = Path(img_dir)
        self.split = split

        self.transform_train = T.Compose([
            T.Resize((256, 256)),
            T.RandomCrop(224),
            T.RandomHorizontalFlip(),
            T.RandomVerticalFlip(),
            T.RandomRotation(180),
            T.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        self.transform_val = T.Compose([
            T.Resize((224, 224)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img = Image.open(self.img_dir / row['image_path']).convert('RGB')
        transform = self.transform_train if self.split == 'train' else self.transform_val
        return transform(img), torch.tensor(row['grade'], dtype=torch.long)


# ── Model ─────────────────────────────────────────────────────────────────────

class RetinopathyModel(nn.Module):
    """
    ResNet-50 backbone for diabetic retinopathy grading.

    Uses ordinal regression approach (better than pure classification
    for ordered grades like DR severity).
    """

    def __init__(self, num_grades: int = 5, dropout: float = 0.5,
                 pretrained: bool = True):
        super().__init__()

        self.backbone = models.resnet50(
            weights=models.ResNet50_Weights.IMAGENET1K_V2 if pretrained else None
        )
        in_features = self.backbone.fc.in_features

        # Dual head: classification + regression
        self.backbone.fc = nn.Identity()

        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(in_features, 512),
            nn.ReLU(),
            nn.BatchNorm1d(512),
            nn.Dropout(dropout / 2),
            nn.Linear(512, num_grades)
        )

        # Regression head for continuous severity estimation
        self.regressor = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(in_features, 256),
            nn.ReLU(),
            nn.Linear(256, 1),
            nn.Sigmoid()
        )

    def forward(self, x: torch.Tensor):
        features = self.backbone(x)
        return self.classifier(features), self.regressor(features)

    def get_target_layer(self):
        return self.backbone.layer4[-1]


# ── Training ──────────────────────────────────────────────────────────────────

class RetinopathyTrainer:
    """Training pipeline with quadratic weighted kappa optimization."""

    def __init__(self, data_dir: str = 'data/retinopathy',
                 save_dir: str = 'checkpoints',
                 batch_size: int = 16, lr: float = 1e-4,
                 epochs: int = 60, device: str = None):
        self.data_dir = Path(data_dir)
        self.save_dir = Path(save_dir)
        self.save_dir.mkdir(exist_ok=True)
        self.batch_size = batch_size
        self.lr = lr
        self.epochs = epochs
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')

    def quadratic_weighted_kappa(self, y_true: np.ndarray,
                                  y_pred: np.ndarray) -> float:
        """Cohen's kappa with quadratic weighting — standard DR metric."""
        from sklearn.metrics import cohen_kappa_score
        return cohen_kappa_score(y_true, y_pred, weights='quadratic')

    def train(self) -> Dict:
        print("\n🚀 Starting Diabetic Retinopathy Model Training")
        print("=" * 50)

        train_ds = RetinopathyDataset(
            str(self.data_dir / 'train.csv'),
            str(self.data_dir / 'images'), 'train'
        )
        val_ds = RetinopathyDataset(
            str(self.data_dir / 'val.csv'),
            str(self.data_dir / 'images'), 'val'
        )

        train_loader = DataLoader(train_ds, batch_size=self.batch_size,
                                  shuffle=True, num_workers=4)
        val_loader   = DataLoader(val_ds, batch_size=self.batch_size,
                                  shuffle=False, num_workers=4)

        model = RetinopathyModel(pretrained=True).to(self.device)

        # Class-weighted loss for DR grade imbalance
        criterion_cls = nn.CrossEntropyLoss(
            weight=torch.tensor([1.0, 2.0, 2.0, 3.0, 3.0]).to(self.device)
        )
        criterion_reg = nn.MSELoss()

        optimizer = optim.AdamW(model.parameters(), lr=self.lr, weight_decay=1e-4)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)

        best_kappa = -1.0

        for epoch in range(self.epochs):
            model.train()
            total_loss = 0

            for images, labels in train_loader:
                images = images.to(self.device)
                labels = labels.to(self.device)
                reg_targets = (labels.float() / 4.0).unsqueeze(1)

                optimizer.zero_grad()
                cls_out, reg_out = model(images)

                loss = criterion_cls(cls_out, labels) + \
                       0.3 * criterion_reg(reg_out, reg_targets)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()

            # Validate
            model.eval()
            all_preds, all_labels = [], []
            with torch.no_grad():
                for images, labels in val_loader:
                    cls_out, _ = model(images.to(self.device))
                    all_preds.extend(cls_out.argmax(1).cpu().numpy())
                    all_labels.extend(labels.numpy())

            kappa = self.quadratic_weighted_kappa(all_labels, all_preds)
            scheduler.step(1 - kappa)

            print(f"Epoch {epoch+1:3d}/{self.epochs} | "
                  f"Loss: {total_loss/len(train_loader):.4f} | "
                  f"QWK: {kappa:.4f}")

            if kappa > best_kappa:
                best_kappa = kappa
                save_model(model, str(self.save_dir / 'retinopathy_best.pt'), {
                    'epoch': epoch, 'qwk': kappa,
                    'disease': 'Diabetic_Retinopathy'
                })

        return {'best_qwk': best_kappa}


# ── Inference ─────────────────────────────────────────────────────────────────

class RetinopathyPredictor:
    """Production inference for DR screening."""

    def __init__(self, model_path: str = 'checkpoints/retinopathy_best.pt',
                 device: str = None):
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = RetinopathyModel(pretrained=False)
        if os.path.exists(model_path):
            self.model, self.metadata = load_model(self.model, model_path)
        else:
            self.metadata = {}
        self.model = self.model.to(self.device)
        self.model.eval()
        self.gradcam = GradCAM(self.model, self.model.get_target_layer())

    def predict_from_bytes(self, image_bytes: bytes) -> Dict:
        img = preprocess_retinal(image_bytes)
        tensor = to_tensor(img).to(self.device)

        with torch.no_grad():
            cls_out, reg_out = self.model(tensor)
            probs = torch.softmax(cls_out, dim=1).cpu().numpy()[0]
            severity = float(reg_out.cpu().item()) * 4.0

        grade = int(probs.argmax())
        vision_threatening = grade in VISION_THREATENING

        # Grad-CAM to highlight lesions
        heatmap_b64 = None
        try:
            cam = self.gradcam.generate(tensor, class_idx=grade)
            heatmap_b64 = self.gradcam.overlay_on_image(img, cam)
        except Exception:
            pass

        return {
            "disease": "Diabetic Retinopathy",
            "grade": grade,
            "grade_label": DR_GRADES[grade],
            "severity_score": round(severity, 2),
            "vision_threatening": vision_threatening,
            "referral_required": grade in REFERRAL_REQUIRED,
            "triage_level": "emergency" if vision_threatening else
                            "urgent" if grade in REFERRAL_REQUIRED else "routine",
            "grade_probabilities": {
                DR_GRADES[i]: round(float(p), 4) for i, p in enumerate(probs)
            },
            "heatmap_base64": heatmap_b64,
            "recommended_action": (
                "🚨 URGENT: Vision-threatening DR detected. Immediate vitreo-retina "
                "specialist referral. Risk of blindness without treatment." if vision_threatening
                else "Schedule ophthalmology follow-up within 3-6 months." if grade >= 2
                else "Annual DR screening recommended. Strict glycemic control."
            ),
            "lesion_types": self._identify_lesions(grade),
            "model_info": {"name": "GramSwasthya-DR-CNN", "backbone": "ResNet-50"}
        }

    def _identify_lesions(self, grade: int) -> list:
        """Return expected lesion types based on DR grade."""
        lesions = {
            0: [],
            1: ["microaneurysms"],
            2: ["microaneurysms", "hemorrhages", "hard_exudates"],
            3: ["extensive_hemorrhages", "venous_beading", "IRMA"],
            4: ["neovascularization", "fibrous_proliferation", "vitreous_hemorrhage"]
        }
        return lesions.get(grade, [])


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', choices=['train', 'predict'], default='train')
    parser.add_argument('--data_dir', default='data/retinopathy')
    parser.add_argument('--model_path', default='checkpoints/retinopathy_best.pt')
    parser.add_argument('--image')
    args = parser.parse_args()

    if args.mode == 'train':
        trainer = RetinopathyTrainer(data_dir=args.data_dir)
        results = trainer.train()
        print(f"Best QWK: {results['best_qwk']:.4f}")
    elif args.mode == 'predict':
        predictor = RetinopathyPredictor(model_path=args.model_path)
        with open(args.image, 'rb') as f:
            result = predictor.predict_from_bytes(f.read())
        print(json.dumps({k: v for k, v in result.items() if k != 'heatmap_base64'}, indent=2))
