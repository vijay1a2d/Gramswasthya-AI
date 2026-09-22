"""
GramSwasthya AI — Training Orchestrator
Run all AI model training pipelines in one command.

Usage:
    python train_all.py                          # Train all models
    python train_all.py --models tb malaria      # Train specific models
    python train_all.py --model tb --epochs 30   # Custom epochs
"""

import argparse
import time
from pathlib import Path

def train_tb(args):
    print("\n" + "="*60)
    print("🫁  Training TB Detection Model")
    print("="*60)
    print("Dataset needed: data/tb_xray/{train,val,test}/{positive,negative}/")
    print("Download: https://www.kaggle.com/datasets/kmader/pulmonary-chest-xray-abnormalities")

    from tb_detection.model import TBTrainer
    trainer = TBTrainer(
        data_dir=str(Path(args.data_dir) / 'tb_xray'),
        save_dir=args.save_dir,
        epochs=args.epochs,
        batch_size=args.batch_size
    )
    return trainer.train()


def train_retinopathy(args):
    print("\n" + "="*60)
    print("👁️  Training Diabetic Retinopathy Model")
    print("="*60)
    print("Dataset needed: data/retinopathy/{train,val,test}.csv + images/")
    print("Download: https://www.kaggle.com/c/aptos2019-blindness-detection")

    from retinopathy.model import RetinopathyTrainer
    trainer = RetinopathyTrainer(
        data_dir=str(Path(args.data_dir) / 'retinopathy'),
        save_dir=args.save_dir,
        epochs=args.epochs,
        batch_size=args.batch_size
    )
    return trainer.train()


def train_malaria(args):
    print("\n" + "="*60)
    print("🦟  Training Malaria Detection Model")
    print("="*60)
    print("Dataset needed: data/malaria/{Parasitized,Uninfected}/")
    print("Download: https://www.kaggle.com/datasets/iarunava/cell-images-for-detecting-malaria")

    from malaria.model import MalariaTrainer
    trainer = MalariaTrainer(
        data_dir=str(Path(args.data_dir) / 'malaria'),
        save_dir=args.save_dir,
        epochs=args.epochs,
        batch_size=args.batch_size
    )
    return trainer.train()


def train_cough(args):
    print("\n" + "="*60)
    print("🎙️  Training Cough TB Detection Model")
    print("="*60)
    print("Dataset needed: data/cough/{train,val,test}/{tb_positive,tb_negative}/")
    print("Sources: Coughvid (coughvid.epfl.ch), Coswara (coswara.iisc.ac.in)")

    from cough_analysis.model import CoughTrainer
    trainer = CoughTrainer(
        data_dir=str(Path(args.data_dir) / 'cough'),
        save_dir=args.save_dir,
        epochs=args.epochs,
        batch_size=args.batch_size
    )
    return trainer.train()


def train_risk(args):
    print("\n" + "="*60)
    print("📈  Training Risk Prediction Engine")
    print("="*60)
    print("Uses synthetic data by default (can use real EHR data)")

    from risk_prediction.model import train_all
    train_all(save_dir=args.save_dir)
    return {}


MODEL_TRAINERS = {
    'tb':           train_tb,
    'retinopathy':  train_retinopathy,
    'malaria':      train_malaria,
    'cough':        train_cough,
    'risk':         train_risk,
}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='GramSwasthya AI — Train All Models')
    parser.add_argument('--models', nargs='+',
                        choices=list(MODEL_TRAINERS.keys()) + ['all'],
                        default=['all'],
                        help='Which models to train')
    parser.add_argument('--data_dir',   default='data',
                        help='Root data directory')
    parser.add_argument('--save_dir',   default='checkpoints',
                        help='Model checkpoint directory')
    parser.add_argument('--epochs',     type=int, default=50,
                        help='Training epochs (overrides per-model defaults)')
    parser.add_argument('--batch_size', type=int, default=16,
                        help='Batch size')
    parser.add_argument('--gpu',        action='store_true',
                        help='Force GPU training')
    args = parser.parse_args()

    if 'all' in args.models:
        models_to_train = list(MODEL_TRAINERS.keys())
    else:
        models_to_train = args.models

    Path(args.save_dir).mkdir(exist_ok=True)

    print("\n🏥 GramSwasthya AI — Model Training Pipeline")
    print(f"   Models: {', '.join(models_to_train)}")
    print(f"   Save dir: {args.save_dir}")
    print(f"   Epochs: {args.epochs}")
    print(f"   Batch size: {args.batch_size}")

    results = {}
    total_start = time.time()

    for model_name in models_to_train:
        start = time.time()
        try:
            result = MODEL_TRAINERS[model_name](args)
            results[model_name] = {'status': 'success', 'result': result,
                                   'time_min': round((time.time() - start) / 60, 1)}
        except FileNotFoundError as e:
            print(f"\n⚠️  Skipping {model_name}: Dataset not found ({e})")
            results[model_name] = {'status': 'skipped', 'reason': str(e)}
        except Exception as e:
            print(f"\n❌ {model_name} training failed: {e}")
            results[model_name] = {'status': 'failed', 'error': str(e)}

    print("\n" + "="*60)
    print("📊 Training Summary")
    print("="*60)
    for model, res in results.items():
        status_icon = '✅' if res['status'] == 'success' else '⚠️' if res['status'] == 'skipped' else '❌'
        print(f"  {status_icon} {model:15s}: {res['status']}", end='')
        if res['status'] == 'success' and 'time_min' in res:
            print(f" ({res['time_min']} min)", end='')
        print()

    total_min = (time.time() - total_start) / 60
    print(f"\n⏱️  Total time: {total_min:.1f} minutes")
    print(f"📁 Checkpoints saved to: {args.save_dir}/")
