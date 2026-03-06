"""
Router FastAPI pentru AI Dental Scan
Folosește MobileNetV2 ca model principal (cel mai bun),
cu fallback pe ResNet50 și CustomCNN pentru ensemble opțional.
"""

import numpy as np
import io
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
import tensorflow as tf
from pathlib import Path

router = APIRouter(prefix="/ai", tags=["AI Scan"])

# ── Config ────────────────────────────────────────────────────
IMG_SIZE       = (224, 224)
MODELS_DIR     = Path("models")  # ajustează dacă e altă cale

CLASS_NAMES = [
    "Calculus",
    "Caries",
    "Gingivitis",
    "Hypodontia",
    "Mouth Ulcer",
    "Tooth Discoloration",
]

# Info per clasă — severity, descriere, recomandare
CLASS_INFO = {
    "Calculus": {
        "severity": "moderate",
        "icon": "🦷",
        "description": "Mineralized plaque deposits detected on the tooth surface. "
                       "Calculus cannot be removed by brushing alone and requires professional scaling.",
        "recommendation": "Schedule a professional dental cleaning (scaling) as soon as possible.",
    },
    "Caries": {
        "severity": "severe",
        "icon": "⚠️",
        "description": "Tooth decay detected. Caries is a bacterial infection that progressively "
                       "destroys tooth structure if left untreated.",
        "recommendation": "Consult a dentist urgently. Early treatment (filling) prevents further damage.",
    },
    "Gingivitis": {
        "severity": "mild",
        "icon": "🔴",
        "description": "Inflammation of the gums detected. Gingivitis is an early stage of gum disease "
                       "and is fully reversible with proper treatment.",
        "recommendation": "Improve oral hygiene routine and schedule a dental check-up.",
    },
    "Hypodontia": {
        "severity": "moderate",
        "icon": "🦷",
        "description": "One or more teeth appear to be congenitally missing. "
                       "This condition may affect bite and jaw development.",
        "recommendation": "Consult an orthodontist or prosthodontist for evaluation and treatment options.",
    },
    "Mouth Ulcer": {
        "severity": "mild",
        "icon": "🔍",
        "description": "Oral ulcers detected. Most mouth ulcers are benign and heal on their own, "
                       "but recurrent or large ulcers may require treatment.",
        "recommendation": "Monitor for 1–2 weeks. If persistent or painful, consult a dentist or doctor.",
    },
    "Tooth Discoloration": {
        "severity": "mild",
        "icon": "🎨",
        "description": "Tooth discoloration detected. This can be caused by staining (coffee, tea), "
                       "medication, or internal factors affecting enamel.",
        "recommendation": "A dental check-up can determine the cause. Professional whitening may be an option.",
    },
}

# ── Model loading (lazy, singleton) ──────────────────────────
_models = {}

def load_model(name: str, filename: str):
    """Încarcă un model .h5 dacă nu e deja în memorie."""
    if name not in _models:
        path = MODELS_DIR / filename
        if not path.exists():
            return None
        print(f"[AI] Loading {name} from {path}...")
        _models[name] = tf.keras.models.load_model(str(path))
        print(f"[AI] {name} loaded ✓")
    return _models[name]

def get_mobilenet():
    return load_model("mobilenet", "mobilenetv2_best.h5")

def get_resnet():
    return load_model("resnet", "resnet50_best.h5")

def get_custom():
    return load_model("custom", "cnn_custom_best.h5")

# ── Image preprocessing ───────────────────────────────────────
def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Convertește bytes → tensor numpy (1, 224, 224, 3) normalizat."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE, Image.LANCZOS)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)  # shape: (1, 224, 224, 3)

# ── Prediction logic ──────────────────────────────────────────
def predict_single(model, img_array: np.ndarray) -> np.ndarray:
    """Returnează array de probabilități pentru cele 7 clase."""
    preds = model.predict(img_array, verbose=0)
    return preds[0]  # shape: (7,)

def build_results(probabilities: np.ndarray, threshold: float = 0.40):
    """
    Construiește lista de rezultate din probabilități.
    Returnează doar clasele cu probabilitate >= 40%,
    sortate descrescător.
    """
    results = []
    for idx, prob in enumerate(probabilities):
        if prob >= threshold:
            class_name = CLASS_NAMES[idx]
            info = CLASS_INFO.get(class_name, {})
            results.append({
                "condition":      class_name,
                "confidence":     round(float(prob) * 100, 1),
                "severity":       info.get("severity", "mild"),
                "icon":           info.get("icon", "🦷"),
                "description":    info.get("description", ""),
                "recommendation": info.get("recommendation", "Please consult a dentist."),
            })

    # Sortăm după confidence descrescător
    results.sort(key=lambda x: x["confidence"], reverse=True)

    # Dacă nicio clasă nu depășește 40% → dinții par sănătoși
    if not results:
        results.append({
            "condition":      "Healthy Teeth",
            "confidence":     round(float(1 - np.max(probabilities)) * 100 + float(np.max(probabilities)) * 100, 1),
            "severity":       "good",
            "icon":           "✅",
            "description":    "No significant dental conditions were detected in the analyzed image. Your teeth appear to be in good condition.",
            "recommendation": "Keep up your oral hygiene routine! Regular check-ups every 6 months are still recommended.",
            "is_healthy":     True,
        })

    return results

# ── Endpoints ─────────────────────────────────────────────────

@router.post("/scan")
async def scan_image(file: UploadFile = File(...)):
    """
    Analizează o imagine dentară folosind MobileNetV2.
    Returnează lista de afecțiuni detectate cu confidence și recomandări.
    """
    # Validare tip fișier
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    # Citim imaginea
    try:
        image_bytes = await file.read()
        img_array = preprocess_image(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not process image: {str(e)}")

    # Încărcăm modelul principal (MobileNetV2)
    model = get_mobilenet()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="AI model not available. Please check that mobilenetv2_best.h5 exists in the models/ directory."
        )

    # Predicție
    try:
        probs = predict_single(model, img_array)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    results = build_results(probs)

    return JSONResponse({
        "model_used": "MobileNetV2",
        "results": results,
        "top_condition": results[0]["condition"] if results else None,
        "classes": CLASS_NAMES,
    })


@router.post("/scan/ensemble")
async def scan_image_ensemble(file: UploadFile = File(...)):
    """
    Analizează imaginea folosind toate 3 modele și face media probabilităților (ensemble).
    Mai lent dar mai precis.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    try:
        image_bytes = await file.read()
        img_array = preprocess_image(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not process image: {str(e)}")

    all_probs = []
    models_used = []

    for name, loader in [("MobileNetV2", get_mobilenet), ("ResNet50", get_resnet), ("CustomCNN", get_custom)]:
        m = loader()
        if m is not None:
            try:
                probs = predict_single(m, img_array)
                all_probs.append(probs)
                models_used.append(name)
            except Exception:
                pass

    if not all_probs:
        raise HTTPException(status_code=503, detail="No AI models available.")

    # Media probabilităților
    avg_probs = np.mean(all_probs, axis=0)
    results = build_results(avg_probs)

    return JSONResponse({
        "model_used": f"Ensemble ({', '.join(models_used)})",
        "results": results,
        "top_condition": results[0]["condition"] if results else None,
        "classes": CLASS_NAMES,
    })


@router.get("/scan/status")
async def scan_status():
    """Verifică ce modele sunt disponibile."""
    status = {}
    for name, filename in [
        ("MobileNetV2", "mobilenetv2_best.h5"),
        ("ResNet50",    "resnet50_best.h5"),
        ("CustomCNN",   "cnn_custom_best.h5"),
    ]:
        path = MODELS_DIR / filename
        status[name] = {
            "file_exists": path.exists(),
            "loaded":      name.lower().replace("net", "net") in _models,
        }
    return status