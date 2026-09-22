"""
GramSwasthya AI — Shared Model Utilities
Preprocessing, augmentation, evaluation, explainability helpers
"""

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
import cv2
import io
import base64
from pathlib import Path
from typing import Tuple, List, Dict, Optional
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.cm as cm


# ── Image preprocessing ──────────────────────────────────────────────────────

def preprocess_xray(image_input, target_size=(224, 224)) -> np.ndarray:
    """
    Preprocess chest X-ray image for CNN inference.
    Handles file path, PIL image, bytes, or numpy array.
    Applies CLAHE contrast enhancement (standard for X-ray AI).
    """
    if isinstance(image_input, (str, Path)):
        img = cv2.imread(str(image_input), cv2.IMREAD_GRAYSCALE)
    elif isinstance(image_input, bytes):
        img_array = np.frombuffer(image_input, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
    elif isinstance(image_input, Image.Image):
        img = np.array(image_input.convert('L'))
    else:
        img = image_input

    # CLAHE contrast enhancement — standard for chest X-ray AI
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    img = clahe.apply(img)

    # Resize and normalize
    img = cv2.resize(img, target_size)
    img = img.astype(np.float32) / 255.0

    # Convert to 3-channel (models expect RGB)
    img = np.stack([img, img, img], axis=-1)
    return img


def preprocess_retinal(image_input, target_size=(224, 224)) -> np.ndarray:
    """
    Preprocess retinal fundus image.
    Applies Ben Graham preprocessing (standard for DR detection).
    """
    if isinstance(image_input, bytes):
        img_array = np.frombuffer(image_input, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    elif isinstance(image_input, Image.Image):
        img = np.array(image_input.convert('RGB'))
    else:
        img = image_input

    # Ben Graham preprocessing — subtract local mean
    img = cv2.resize(img, target_size)
    img = img.astype(np.float32)
    img = cv2.addWeighted(img, 4,
                          cv2.GaussianBlur(img, (0, 0), target_size[0] // 30),
                          -4, 128)
    img = np.clip(img, 0, 255) / 255.0
    return img


def preprocess_microscopy(image_input, target_size=(224, 224)) -> np.ndarray:
    """Preprocess malaria microscopy slide."""
    if isinstance(image_input, bytes):
        img_array = np.frombuffer(image_input, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    elif isinstance(image_input, Image.Image):
        img = np.array(image_input.convert('RGB'))
    else:
        img = image_input

    img = cv2.resize(img, target_size)
    # Stain normalization (Reinhard method approximation)
    img = img.astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    img = (img - mean) / std
    return img


def to_tensor(img: np.ndarray) -> torch.Tensor:
    """Convert HWC numpy array to CHW torch tensor."""
    if img.ndim == 2:
        img = img[:, :, np.newaxis]
    return torch.from_numpy(img.transpose(2, 0, 1)).float().unsqueeze(0)


# ── Grad-CAM implementation ──────────────────────────────────────────────────

class GradCAM:
    """
    Gradient-weighted Class Activation Mapping.
    Produces heatmaps showing which image regions influenced the prediction.
    Used for TB cavity detection, retinopathy lesion highlighting, etc.
    """

    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self.target_layer = target_layer
        self.gradients: Optional[torch.Tensor] = None
        self.activations: Optional[torch.Tensor] = None
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output.detach()

        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach()

        self.target_layer.register_forward_hook(forward_hook)
        self.target_layer.register_full_backward_hook(backward_hook)

    def generate(self, input_tensor: torch.Tensor, class_idx: int = None) -> np.ndarray:
        self.model.eval()
        input_tensor.requires_grad_(True)

        output = self.model(input_tensor)
        if class_idx is None:
            class_idx = output.argmax(dim=1).item()

        self.model.zero_grad()
        class_score = output[0, class_idx]
        class_score.backward()

        # Pool gradients across channels
        weights = self.gradients.mean(dim=[2, 3], keepdim=True)
        cam = (weights * self.activations).sum(dim=1, keepdim=True)
        cam = torch.relu(cam)
        cam = cam.squeeze().cpu().numpy()

        # Normalize
        cam = cv2.resize(cam, (input_tensor.shape[-1], input_tensor.shape[-2]))
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        return cam

    def overlay_on_image(self, original_img: np.ndarray, cam: np.ndarray) -> str:
        """Returns base64-encoded PNG of the Grad-CAM overlay."""
        heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
        heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)

        if original_img.max() <= 1.0:
            orig = (original_img * 255).astype(np.uint8)
        else:
            orig = original_img.astype(np.uint8)

        if orig.ndim == 2:
            orig = np.stack([orig, orig, orig], axis=-1)

        heatmap = cv2.resize(heatmap, (orig.shape[1], orig.shape[0]))
        overlay = cv2.addWeighted(orig, 0.6, heatmap, 0.4, 0)

        buf = io.BytesIO()
        Image.fromarray(overlay).save(buf, format='PNG')
        return base64.b64encode(buf.getvalue()).decode()


# ── SHAP wrapper ─────────────────────────────────────────────────────────────

def compute_shap_values(model_fn, background_data: np.ndarray,
                        input_data: np.ndarray) -> Dict:
    """
    Compute SHAP values for tabular models (risk prediction, symptom triage).
    Uses KernelExplainer for model-agnostic explanation.
    """
    import shap
    explainer = shap.KernelExplainer(model_fn, background_data[:50])
    shap_vals = explainer.shap_values(input_data, nsamples=100)
    return {
        "shap_values": shap_vals.tolist() if hasattr(shap_vals, 'tolist') else shap_vals,
        "expected_value": float(explainer.expected_value)
            if not isinstance(explainer.expected_value, list)
            else explainer.expected_value
    }


# ── Evaluation metrics ───────────────────────────────────────────────────────

def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray,
                    y_prob: np.ndarray = None) -> Dict:
    """Standard classification metrics for medical AI evaluation."""
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score,
        f1_score, roc_auc_score, confusion_matrix
    )

    metrics = {
        "accuracy":  round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(float(precision_score(y_true, y_pred, average='weighted', zero_division=0)), 4),
        "recall":    round(float(recall_score(y_true, y_pred, average='weighted', zero_division=0)), 4),
        "f1_score":  round(float(f1_score(y_true, y_pred, average='weighted', zero_division=0)), 4),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }

    if y_prob is not None:
        try:
            if y_prob.ndim == 2:
                auc = roc_auc_score(y_true, y_prob[:, 1])
            else:
                auc = roc_auc_score(y_true, y_prob)
            metrics["auc_roc"] = round(float(auc), 4)
        except Exception:
            pass

    return metrics


def plot_training_history(history: Dict, save_path: str = None):
    """Plot and optionally save training loss/accuracy curves."""
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))

    axes[0].plot(history.get('train_loss', []), label='Train Loss', color='#0ea472')
    axes[0].plot(history.get('val_loss', []), label='Val Loss', color='#ef4444')
    axes[0].set_title('Training Loss')
    axes[0].set_xlabel('Epoch')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    axes[1].plot(history.get('train_acc', []), label='Train Acc', color='#0ea472')
    axes[1].plot(history.get('val_acc', []), label='Val Acc', color='#ef4444')
    axes[1].set_title('Training Accuracy')
    axes[1].set_xlabel('Epoch')
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
    return fig


# ── Model I/O helpers ─────────────────────────────────────────────────────────

def save_model(model: nn.Module, path: str, metadata: Dict = None):
    """Save PyTorch model with metadata."""
    save_dict = {
        'model_state_dict': model.state_dict(),
        'model_class': model.__class__.__name__,
        'metadata': metadata or {}
    }
    torch.save(save_dict, path)
    print(f"✅ Model saved: {path}")


def load_model(model: nn.Module, path: str) -> Tuple[nn.Module, Dict]:
    """Load PyTorch model from checkpoint."""
    checkpoint = torch.load(path, map_location='cpu')
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    return model, checkpoint.get('metadata', {})


def export_to_onnx(model: nn.Module, dummy_input: torch.Tensor,
                   output_path: str, input_names: List[str] = None,
                   output_names: List[str] = None):
    """Export PyTorch model to ONNX for TensorFlow Lite conversion."""
    model.eval()
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=input_names or ['input'],
        output_names=output_names or ['output'],
        dynamic_axes={
            'input': {0: 'batch_size'},
            'output': {0: 'batch_size'}
        }
    )
    print(f"✅ ONNX model exported: {output_path}")
