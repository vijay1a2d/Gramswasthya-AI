import os

def analyze_audio_emotion(file_path: str) -> dict:
    """
    Analyzes an audio file to determine voice emotion heuristics.
    Extracts pitch, energy, and MFCCs using librosa.
    Returns a dictionary with emotion string, confidence score, and possible reason.
    """
    try:
        import librosa
        import numpy as np

        # Load audio (mono, 16kHz for faster processing)
        y, sr = librosa.load(file_path, sr=16000, mono=True)
        
        # 1. Calculate Energy (Root Mean Square energy)
        rms = librosa.feature.rms(y=y)
        mean_energy = np.mean(rms)
        
        # 2. Calculate Pitch (Fundamental Frequency using yin)
        f0, voiced_flag, voiced_probs = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
        valid_f0 = f0[~np.isnan(f0)]
        mean_pitch = np.mean(valid_f0) if len(valid_f0) > 0 else 0
        
        # 3. Speech Rate heuristic (zero crossing rate can correlate with speech pacing)
        zcr = librosa.feature.zero_crossing_rate(y)
        mean_zcr = np.mean(zcr)

        # Simple heuristic model for demo purposes
        # Thresholds are approximate and typically set via actual datasets
        emotion = "Normal"
        confidence = 0.70
        reason = "Voice features within normal baseline"

        # High energy and high pitch -> Anxious/Distressed
        if mean_energy > 0.05 and mean_pitch > 200:
            emotion = "Anxious/Distressed"
            confidence = 0.85
            reason = "High vocal energy and elevated pitch detected"
        # Low energy and low pitch -> Weak/Fatigue
        elif mean_energy < 0.015 and mean_pitch > 0 and mean_pitch < 120:
            emotion = "Weak/Fatigued"
            confidence = 0.80
            reason = "Low vocal energy and pitch detected"
        # Fast speech / breathy (high ZCR) might indicate respiratory distress
        elif mean_zcr > 0.15:
            emotion = "Breathless/Stressed"
            confidence = 0.75
            reason = "Irregular breathing / speech patterns detected"

        return {
            "emotion": emotion,
            "confidence": round(confidence, 2),
            "reason": reason,
            "features": {
                "energy": round(float(mean_energy), 4),
                "pitch": round(float(mean_pitch), 2),
                "zcr": round(float(mean_zcr), 4)
            }
        }
    except ImportError:
        print("Warning: librosa not installed. Audio emotion analysis unavailable.")
        return {
            "emotion": "Unknown",
            "confidence": 0.0,
            "reason": "Audio analysis library (librosa) not installed",
            "features": {}
        }
    except Exception as e:
        print(f"Error in emotion analysis: {e}")
        return {
            "emotion": "Unknown",
            "confidence": 0.0,
            "reason": "Could not process audio features",
            "features": {}
        }
