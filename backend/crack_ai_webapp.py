"""
STRUCTURAL CRACK DETECTION SYSTEM
Classical Computer Vision with Structural Validation + Visual Overlay

Save as: crack_ai_webapp.py
"""

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import cv2
import numpy as np
from skimage.morphology import skeletonize
import base64

# -----------------------------------------
# FASTAPI APP
# -----------------------------------------
app = FastAPI(
    title="Structural Crack Detection System (Classical CV)"
)

# -----------------------------------------
# CORS CONFIG
# -----------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------
# STAGE 1: CRACK CANDIDATE DETECTION
# -----------------------------------------
def detect_crack(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    blackhat = cv2.morphologyEx(
        blurred,
        cv2.MORPH_BLACKHAT,
        cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    )

    _, binary = cv2.threshold(
        blackhat, 0, 255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
        cleaned, connectivity=8
    )

    crack_mask = np.zeros_like(cleaned)
    valid_components = 0

    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        w = stats[i, cv2.CC_STAT_WIDTH]
        h = stats[i, cv2.CC_STAT_HEIGHT]

        aspect_ratio = max(w, h) / (min(w, h) + 1e-5)

        if area > 80 and aspect_ratio > 3.5:
            crack_mask[labels == i] = 255
            valid_components += 1

    if valid_components == 0:
        return False, None, "NO_CRACK"

    return True, crack_mask, "CRACK_CANDIDATE"

# -----------------------------------------
# STAGE 2: STRUCTURAL VALIDATION
# -----------------------------------------
def is_structural_crack(mask):
    skeleton = skeletonize(mask > 0)
    length_px = np.sum(skeleton)

    if length_px < 60:
        return False, "Crack length too short to be structural"

    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    widths = dist[mask > 0] * 2

    if len(widths) == 0:
        return False, "Unable to compute crack width"

    if np.std(widths) > 4:
        return False, "High width variation indicates non-structural feature"

    crack_density = np.sum(mask > 0) / mask.size
    if crack_density > 0.25:
        return False, "Feature density too high, likely surface texture"

    return True, "Structural crack validated"

# -----------------------------------------
# VISUAL OVERLAY
# -----------------------------------------
def generate_crack_overlay(image, mask):
    overlay = image.copy()
    overlay[mask > 0] = [0, 0, 255]

    blended = cv2.addWeighted(image, 0.7, overlay, 0.3, 0)

    contours, _ = cv2.findContours(
        mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        cv2.rectangle(blended, (x, y), (x + w, y + h), (255, 0, 0), 2)

    return blended

# -----------------------------------------
# CRACK ANALYSIS
# -----------------------------------------
def analyze_crack(mask):
    skeleton = skeletonize(mask > 0)
    length_px = np.sum(skeleton)

    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    width_px = np.mean(dist[mask > 0]) * 2 if np.any(mask > 0) else 0

    contours, _ = cv2.findContours(
        mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    orientation = "Irregular"
    pattern = "Undetermined"

    if contours:
        cnt = max(contours, key=cv2.contourArea)
        (_, _), (w, h), _ = cv2.minAreaRect(cnt)

        if h > w * 1.5:
            orientation = "Vertical"
            pattern = "Shrinkage or load-induced crack"
        elif w > h * 1.5:
            orientation = "Horizontal"
            pattern = "Settlement-related crack"
        else:
            orientation = "Diagonal"
            pattern = "Shear-related structural crack"

    return {
        "length_pixels": round(float(length_px), 2),
        "width_pixels": round(float(width_px), 2),
        "orientation": orientation,
        "pattern": pattern
    }

# -----------------------------------------
# SEVERITY CLASSIFICATION
# -----------------------------------------
def classify_severity(width, length):
    if width < 1.5 and length < 80:
        return "Low"
    elif width < 3 and length < 200:
        return "Moderate"
    elif width < 6:
        return "Severe"
    else:
        return "Critical"

# -----------------------------------------
# ENGINEERING RECOMMENDATION
# -----------------------------------------
def engineering_recommendation(severity):
    return {
        "Low": {
            "risk_level": "Low",
            "recommended_action": "Seal crack and monitor",
            "engineer_required": False
        },
        "Moderate": {
            "risk_level": "Medium",
            "recommended_action": "Epoxy injection or surface repair",
            "engineer_required": True
        },
        "Severe": {
            "risk_level": "High",
            "recommended_action": "Structural strengthening required",
            "engineer_required": True
        },
        "Critical": {
            "risk_level": "Critical",
            "recommended_action": "Immediate structural assessment required",
            "engineer_required": True
        }
    }[severity]

# -----------------------------------------
# API ENDPOINT
# -----------------------------------------
@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        data = await file.read()
        image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)

        if image is None:
            return {
                "status": "ERROR",
                "message": "Invalid image file",
                "crack_analysis": None
            }

        crack_found, mask, _ = detect_crack(image)

        if not crack_found:
            return {
                "status": "NO_CRACK",
                "message": "No crack-like features detected",
                "crack_analysis": None
            }

        is_structural, reason = is_structural_crack(mask)

        if not is_structural:
            return {
                "status": "NON_STRUCTURAL_FEATURE",
                "message": "Crack-like features detected but not structural",
                "reason": reason,
                "crack_analysis": None
            }

        analysis = analyze_crack(mask)
        severity = classify_severity(
            analysis["width_pixels"],
            analysis["length_pixels"]
        )

        overlay = generate_crack_overlay(image, mask)
        _, buffer = cv2.imencode(".png", overlay)
        overlay_base64 = base64.b64encode(buffer).decode("utf-8")

        return {
            "status": "STRUCTURAL_CRACK_DETECTED",
            "severity": severity,
            "crack_analysis": analysis,
            "engineering_recommendation": engineering_recommendation(severity),
            "overlay_image_base64": overlay_base64,
            "disclaimer": "All measurements are pixel-based and intended for comparative assessment only."
        }

    except Exception as e:
        return {
            "status": "ERROR",
            "message": str(e),
            "crack_analysis": None
        }

# -----------------------------------------
# HEALTH CHECK
# -----------------------------------------
@app.get("/")
async def root():
    return {
        "message": "Structural Crack Detection API is running",
        "version": "1.3 - Stable Contract + Structural Validation + Overlay"
    }

# -----------------------------------------
# RUN SERVER
# -----------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        "crack_ai_webapp:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
