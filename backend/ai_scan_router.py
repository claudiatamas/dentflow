import numpy as np
import io
import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from PIL import Image
import tensorflow as tf
from pathlib import Path
from datetime import datetime
 
from dependencies import get_db
from models import AIScanHistory, Patient
from auth import get_current_user       
 
router = APIRouter(prefix="/ai", tags=["AI Scan"])
 
# Config
IMG_SIZE    = (224, 224)
MODELS_DIR  = Path("models")
UPLOADS_DIR = Path("static/ai_scans")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
 
CLASS_NAMES = [
    "Calculus",
    "Caries",
    "Gingivitis",
    "Mouth Ulcer",
    "Tooth Discoloration",
    "Hypodontia",
]
 
CLASS_INFO = {
    "Calculus": {
        "severity": "moderate", "icon": "🦷",
        "description": "Mineralized plaque deposits detected on the tooth surface. Calculus cannot be removed by brushing alone.",
        "recommendation": "Schedule a professional dental cleaning (scaling) as soon as possible.",
    },
    "Caries": {
        "severity": "severe", "icon": "⚠️",
        "description": "Tooth decay detected. Caries is a bacterial infection that progressively destroys tooth structure.",
        "recommendation": "Consult a dentist urgently. Early treatment (filling) prevents further damage.",
    },
    "Gingivitis": {
        "severity": "mild", "icon": "🔴",
        "description": "Inflammation of the gums detected. Gingivitis is fully reversible with proper treatment.",
        "recommendation": "Improve oral hygiene routine and schedule a dental check-up.",
    },
    "Hypodontia": {
        "severity": "moderate", "icon": "🦷",
        "description": "One or more teeth appear to be congenitally missing.",
        "recommendation": "Consult an orthodontist or prosthodontist for evaluation.",
    },
    "Mouth Ulcer": {
        "severity": "mild", "icon": "🔍",
        "description": "Oral ulcers detected. Most mouth ulcers are benign and heal on their own.",
        "recommendation": "Monitor for 1–2 weeks. If persistent or painful, consult a dentist.",
    },
    "Tooth Discoloration": {
        "severity": "mild", "icon": "🎨",
        "description": "Tooth discoloration detected. Can be caused by staining or internal factors.",
        "recommendation": "A dental check-up can determine the cause. Professional whitening may be an option.",
    },
}
 
# ── Model loading (singleton) ─────────────────────────────────────────
_models = {}
 
def load_model(name: str, filename: str):
    if name not in _models:
        path = MODELS_DIR / filename
        if not path.exists():
            return None
        print(f"[AI] Loading {name}...")
        _models[name] = tf.keras.models.load_model(str(path))
        print(f"[AI] {name} loaded ✓")
    return _models[name]
 
def get_mobilenet(): return load_model("mobilenet", "mobilenetv2_best.h5")
def get_resnet():    return load_model("resnet",    "resnet50_best.h5")
def get_custom():    return load_model("custom",    "cnn_custom_best.h5")
 
# ── Helpers ───────────────────────────────────────────────────────────
def preprocess_image(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE, Image.LANCZOS)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)
 
def predict_single(model, img_array: np.ndarray) -> np.ndarray:
    return model.predict(img_array, verbose=0)[0]
 
def build_results(probabilities: np.ndarray, threshold: float = 0.40):
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
    results.sort(key=lambda x: x["confidence"], reverse=True)
    if not results:
        results.append({
            "condition":      "No Detected Conditions",
            "confidence":     100.0,
            "severity":       "info",
            "icon":           "ℹ️",
            "description":    "No supported dental conditions detected.",
            "recommendation": "If you have concerns, consult a dental professional.",
            "is_healthy":     True,
        })
    return results
 
def save_image_to_disk(image_bytes: bytes) -> str:
    """Salvează imaginea pe disk și returnează calea relativă."""
    filename  = f"{uuid.uuid4().hex}.jpg"
    file_path = UPLOADS_DIR / filename
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img.save(str(file_path), "JPEG", quality=85)
    return f"static/ai_scans/{filename}"
 
def save_scan_to_db(
    db:            Session,
    current_user,
    scan_mode:     str,
    model_used:    str,
    image_path:    str,
    results:       list,
):
    """Găsește patient_id și salvează scanarea în DB."""
    patient = db.query(Patient).filter(
        Patient.user_id == current_user.id
    ).first()
    if not patient:
        return None   # userul nu are profil de pacient — nu salvăm
 
    scan = AIScanHistory(
        patient_id    = patient.id,
        scan_mode     = scan_mode,
        model_used    = model_used,
        image_path    = image_path,
        top_condition = results[0]["condition"] if results else None,
        results       = results,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan
 
# ── Endpoints ─────────────────────────────────────────────────────────
 
@router.post("/scan")
async def scan_image(
    file:         UploadFile = File(...),
    db:           Session    = Depends(get_db),
    current_user             = Depends(get_current_user),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
 
    try:
        image_bytes = await file.read()
        img_array   = preprocess_image(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not process image: {str(e)}")
 
    model = get_mobilenet()
    if model is None:
        raise HTTPException(status_code=503, detail="MobileNetV2 model not available.")
 
    try:
        probs   = predict_single(model, img_array)
        results = build_results(probs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
 
    # Salvează imaginea și istoricul
    image_path = save_image_to_disk(image_bytes)
    save_scan_to_db(
        db          = db,
        current_user= current_user,
        scan_mode   = "single",
        model_used  = "MobileNetV2",
        image_path  = image_path,
        results     = results,
    )
 
    return JSONResponse({
        "model_used":    "MobileNetV2",
        "results":       results,
        "top_condition": results[0]["condition"] if results else None,
        "classes":       CLASS_NAMES,
        "image_path":    image_path,
    })
 
 
@router.post("/scan/ensemble")
async def scan_image_ensemble(
    file:         UploadFile = File(...),
    db:           Session    = Depends(get_db),
    current_user             = Depends(get_current_user),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
 
    try:
        image_bytes = await file.read()
        img_array   = preprocess_image(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not process image: {str(e)}")
 
    all_probs    = []
    models_used  = []
 
    for name, loader in [
        ("MobileNetV2", get_mobilenet),
        ("ResNet50",    get_resnet),
        ("CustomCNN",   get_custom),
    ]:
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
 
    avg_probs        = np.mean(all_probs, axis=0)
    ensemble_results = build_results(avg_probs)
 
    # Adaugă breakdown per model
    for result in ensemble_results:
        condition = result["condition"]
        if condition not in CLASS_NAMES:
            result["detected_by"] = []
            continue
        class_idx   = CLASS_NAMES.index(condition)
        detected_by = []
        for model_name, probs_arr in zip(models_used, all_probs):
            conf = round(float(probs_arr[class_idx]) * 100, 1)
            detected_by.append({
                "model":      model_name,
                "confidence": conf,
                "detected":   conf >= 40.0,
            })
        detected_by.sort(key=lambda x: (not x["detected"], -x["confidence"]))
        result["detected_by"] = detected_by
 
    ensemble_results.sort(key=lambda x: x["confidence"], reverse=True)
    model_label = f"Ensemble ({', '.join(models_used)})"
 
    # Salvează imaginea și istoricul
    image_path = save_image_to_disk(image_bytes)
    save_scan_to_db(
        db           = db,
        current_user = current_user,
        scan_mode    = "ensemble",
        model_used   = model_label,
        image_path   = image_path,
        results      = ensemble_results,
    )
 
    return JSONResponse({
        "model_used":    model_label,
        "results":       ensemble_results,
        "top_condition": ensemble_results[0]["condition"] if ensemble_results else None,
        "classes":       CLASS_NAMES,
        "image_path":    image_path,
    })
 
 
@router.get("/scan/history")
async def get_scan_history(
    db:           Session = Depends(get_db),
    current_user          = Depends(get_current_user),
):
    """
    Returnează istoricul scanărilor AI pentru pacientul autentificat.
    Sortat descrescător după dată.
    """
    patient = db.query(Patient).filter(
        Patient.user_id == current_user.id
    ).first()
    if not patient:
        return JSONResponse({"scans": []})
 
    scans = (
        db.query(AIScanHistory)
        .filter(AIScanHistory.patient_id == patient.id)
        .order_by(AIScanHistory.created_at.desc())
        .all()
    )
 
    return JSONResponse({
        "scans": [
            {
                "id":            s.id,
                "scan_mode":     s.scan_mode,
                "model_used":    s.model_used,
                "image_path":    s.image_path,
                "top_condition": s.top_condition,
                "results":       s.results,
                "created_at":    s.created_at.isoformat(),
            }
            for s in scans
        ]
    })
 
 
@router.delete("/scan/history/{scan_id}")
async def delete_scan(
    scan_id:      int,
    db:           Session = Depends(get_db),
    current_user          = Depends(get_current_user),
):
    """Șterge o scanare din istoric (doar a pacientului autentificat)."""
    patient = db.query(Patient).filter(
        Patient.user_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
 
    scan = db.query(AIScanHistory).filter(
        AIScanHistory.id         == scan_id,
        AIScanHistory.patient_id == patient.id,
    ).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found.")
 
    # Șterge fișierul de pe disk
    if scan.image_path:
        path = Path(scan.image_path)
        if path.exists():
            path.unlink()
 
    db.delete(scan)
    db.commit()
    return {"message": "Scan deleted successfully."}
 
 
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
            "loaded":      name in _models,
        }
    return status