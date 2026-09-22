"""
GramSwasthya AI — Unified Inference Server
Loads all AI models and exposes a single inference interface.
This module is imported by the FastAPI backend routes.

Usage:
    from ai_inference import inference_engine
    result = inference_engine.predict_tb(image_bytes)
    result = inference_engine.predict_risk(vitals_list)
"""

import os
from pathlib import Path
from typing import Dict, List, Optional, Callable
import importlib.util

# Model checkpoint directory
CHECKPOINT_DIR = os.getenv('MODEL_CHECKPOINT_DIR', str(Path(__file__).parent / 'checkpoints'))


class ModelRegistry:
    """
    Lazy-loading model registry.
    Models are only loaded into memory when first used.
    This reduces startup time and memory usage.
    """

    def __init__(self, checkpoint_dir: str = CHECKPOINT_DIR):
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(exist_ok=True)
        self._models: Dict[str, object] = {}
        self._loaders: Dict[str, Callable] = {}
        self._register_loaders()

    def _register_loaders(self):
        """Register lazy loaders for each model."""

        def load_tb():
            try:
                from tb_detection.model import TBPredictor
                return TBPredictor(str(self.checkpoint_dir / 'tb_best.pt'))
            except Exception as e:
                print(f"⚠️  TB model load failed: {e}. Using simulation.")
                return None

        def load_retinopathy():
            try:
                from retinopathy.model import RetinopathyPredictor
                return RetinopathyPredictor(str(self.checkpoint_dir / 'retinopathy_best.pt'))
            except Exception as e:
                print(f"⚠️  Retinopathy model load failed: {e}. Using simulation.")
                return None

        def load_malaria():
            try:
                from malaria.model import MalariaPredictor
                return MalariaPredictor(str(self.checkpoint_dir / 'malaria_best.pt'))
            except Exception as e:
                print(f"⚠️  Malaria model load failed: {e}. Using simulation.")
                return None

        def load_cough():
            try:
                from cough_analysis.model import CoughPredictor
                return CoughPredictor(str(self.checkpoint_dir / 'cough_best.pt'))
            except Exception as e:
                print(f"⚠️  Cough model load failed: {e}. Using simulation.")
                return None

        def load_risk():
            try:
                from risk_prediction.model import RiskPredictor
                return RiskPredictor(save_dir=str(self.checkpoint_dir))
            except Exception as e:
                print(f"⚠️  Risk model load failed: {e}. Using rule-based.")
                return None

        self._loaders = {
            'tb':           load_tb,
            'retinopathy':  load_retinopathy,
            'malaria':      load_malaria,
            'cough':        load_cough,
            'risk':         load_risk,
        }

    def get(self, model_name: str):
        """Get model, loading it on first access."""
        if model_name not in self._models:
            print(f"🔄 Loading model: {model_name}")
            loader = self._loaders.get(model_name)
            if loader:
                self._models[model_name] = loader()
            else:
                self._models[model_name] = None
        return self._models[model_name]

    def preload_all(self):
        """Preload all models at startup."""
        for name in self._loaders:
            self.get(name)
        print("✅ All AI models loaded")


class InferenceEngine:
    """
    Main inference interface used by FastAPI routes.
    Falls back to realistic simulation if model not available.
    """

    def __init__(self):
        self.registry = ModelRegistry()
        print(f"🚀 GramSwasthya AI Inference Engine initialized")
        print(f"   Checkpoint dir: {CHECKPOINT_DIR}")

    # ── TB Detection ──────────────────────────────────────────────────────────

    def predict_tb(self, image_bytes: bytes) -> Dict:
        model = self.registry.get('tb')
        if model:
            return model.predict_from_bytes(image_bytes)
        return self._simulate_tb(image_bytes)

    def _simulate_tb(self, image_bytes: bytes) -> Dict:
        import random, hashlib
        seed = int(hashlib.md5(image_bytes[:100]).hexdigest(), 16) % 1000
        random.seed(seed)
        prob = round(random.uniform(0.05, 0.95), 3)
        positive = prob > 0.5
        return {
            "disease": "Tuberculosis",
            "positive": positive,
            "probability": prob,
            "confidence": round(max(prob, 1 - prob), 3),
            "triage_level": "urgent" if positive else "routine",
            "class_probabilities": {"negative": round(1 - prob, 3), "positive": round(prob, 3)},
            "abnormal_regions": ["upper_right_lobe"] if positive else [],
            "heatmap_base64": None,
            "recommended_action": (
                "⚠️ HIGH TB PROBABILITY: Refer to RNTCP. Sputum GeneXpert required."
                if positive else "No TB detected. Monitor symptoms."
            ),
            "model_info": {"name": "Simulation (train model for real inference)", "target_accuracy": "96.9%"}
        }

    # ── Retinopathy ───────────────────────────────────────────────────────────

    def predict_retinopathy(self, image_bytes: bytes) -> Dict:
        model = self.registry.get('retinopathy')
        if model:
            return model.predict_from_bytes(image_bytes)
        return self._simulate_retinopathy()

    def _simulate_retinopathy(self) -> Dict:
        import random
        grade = random.choice([0, 0, 0, 1, 2, 3, 4])
        grades = {0: "No DR", 1: "Mild NPDR", 2: "Moderate NPDR", 3: "Severe NPDR", 4: "PDR"}
        vision_threatening = grade >= 3
        return {
            "disease": "Diabetic Retinopathy",
            "grade": grade, "grade_label": grades[grade],
            "vision_threatening": vision_threatening,
            "referral_required": grade >= 2,
            "triage_level": "emergency" if vision_threatening else "urgent" if grade >= 2 else "routine",
            "recommended_action": (
                "🚨 Immediate vitreo-retina specialist referral." if vision_threatening
                else "Ophthalmology follow-up in 3-6 months." if grade >= 2
                else "Annual screening recommended."
            ),
            "model_info": {"name": "Simulation", "backbone": "ResNet-50"}
        }

    # ── Malaria ───────────────────────────────────────────────────────────────

    def predict_malaria(self, image_bytes: bytes) -> Dict:
        model = self.registry.get('malaria')
        if model:
            return model.predict_from_bytes(image_bytes)
        return self._simulate_malaria()

    def _simulate_malaria(self) -> Dict:
        import random
        prob = round(random.uniform(0.05, 0.95), 3)
        positive = prob > 0.5
        return {
            "disease": "Malaria",
            "positive": positive,
            "probability": prob,
            "species": "P. falciparum" if positive and prob > 0.8 else ("P. vivax" if positive else None),
            "triage_level": "urgent" if positive else "routine",
            "recommended_action": (
                "⚠️ MALARIA POSITIVE: Start ACT immediately." if positive
                else "No parasites detected."
            ),
            "model_info": {"name": "Simulation", "target_accuracy": "95%"}
        }

    # ── Cough Analysis ────────────────────────────────────────────────────────

    def predict_cough_tb(self, audio_bytes: bytes) -> Dict:
        model = self.registry.get('cough')
        if model:
            return model.predict_from_bytes(audio_bytes)
        return self._simulate_cough()

    def _simulate_cough(self) -> Dict:
        import random
        prob = round(random.uniform(0.05, 0.95), 3)
        positive = prob > 0.5
        return {
            "disease": "Tuberculosis (Cough Analysis)",
            "positive": positive,
            "probability": prob,
            "triage_level": "urgent" if positive else "routine",
            "recommended_action": (
                "TB-suspicious cough. Chest X-ray recommended." if positive
                else "No TB-suspicious cough pattern."
            ),
            "model_info": {"name": "Simulation", "target_accuracy": "86%"}
        }

    # ── Risk Prediction ───────────────────────────────────────────────────────

    def predict_risk(self, features: Dict, vitals_sequence: List[Dict] = None) -> Dict:
        model = self.registry.get('risk')
        if model:
            seq = vitals_sequence or [features]
            return model.predict_from_vitals_sequence(seq)
        return self._rule_based_risk(features)

    def _rule_based_risk(self, features: Dict) -> Dict:
        score = 20
        age = features.get('age', 30)
        if age > 60 or age < 5: score += 20
        if features.get('oxygen_level', 99) < 94: score += 25
        if features.get('temperature', 37) > 38.5: score += 15
        if features.get('heart_rate', 72) > 110: score += 10
        if features.get('has_diabetes'): score += 15
        if features.get('has_heart_disease'): score += 20
        if features.get('village_outbreak_risk_score', 0) > 0.7: score += 15
        score = min(score, 100)

        level = 'critical' if score >= 70 else 'high' if score >= 50 else 'medium' if score >= 30 else 'low'
        return {
            "risk_score": score, "risk_level": level,
            "contributing_factors": [],
            "recommended_action": {
                'critical': "🚨 IMMEDIATE hospital admission.",
                'high': "⚠️ PHC visit within 24 hours.",
                'medium': "📋 Follow-up in 72 hours.",
                'low': "✅ Continue routine monitoring."
            }[level],
            "model_info": {"name": "Rule-based fallback (train model for ML inference)"}
        }

    def status(self) -> Dict:
        """Return loaded model status."""
        return {
            "models_loaded": list(self.registry._models.keys()),
            "checkpoint_dir": str(self.registry.checkpoint_dir),
            "available_models": ["tb", "retinopathy", "malaria", "cough", "risk"]
        }


# Singleton
inference_engine = InferenceEngine()
