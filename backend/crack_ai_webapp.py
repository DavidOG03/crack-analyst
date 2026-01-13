"""
AI Structural Crack Detection API - Robust & Demo-Ready
No ML model required, classical CV with multi-scale detection
"""

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import cv2
import numpy as np
from skimage.morphology import skeletonize
import base64

# -----------------------
# FASTAPI APP
# -----------------------
app = FastAPI(title="Robust Structural Crack Detection System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for demo; restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------
# CRACK DETECTION FUNCTION
# -----------------------
def detect_cracks(image):
    """
    Detect cracks using multi-scale morphological operations
    Returns: bool (found?), crack_mask (uint8), status_str
    """

    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Enhance contrast using CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)

    # Initialize final mask
    final_mask = np.zeros_like(gray)

    # Multi-scale kernel sizes for blackhat (small and large cracks)
    kernels = [7, 15, 25]  # small, medium, large

    for k in kernels:
        # Blackhat enhances dark cracks on bright surfaces
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k, k))
        blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel)

        # Threshold the blackhat result
        _, thresh = cv2.threshold(blackhat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Morphological clean up
        clean = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8), iterations=2)
        clean = cv2.morphologyEx(clean, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8), iterations=1)

        # Combine with final mask
        final_mask = cv2.bitwise_or(final_mask, clean)

    # Remove tiny noise using connected components
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(final_mask, connectivity=8)
    crack_mask = np.zeros_like(final_mask)

    valid_components = 0
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area > 50:  # Allow small and large cracks
            crack_mask[labels == i] = 255
            valid_components += 1

    if valid_components == 0:
        return False, None, "NO_CRACK"

    return True, crack_mask, "CRACK_DETECTED"


# -----------------------
# ANALYSIS
# -----------------------
def analyze_crack(mask):
    skeleton = skeletonize(mask > 0)
    length_px = np.sum(skeleton)

    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    width_px = np.mean(dist[mask > 0]) * 2 if np.any(mask > 0) else 0

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    orientation = "Irregular"
    pattern = "Non-structural"

    if contours:
        cnt = max(contours, key=cv2.contourArea)
        (_, _), (w, h), angle = cv2.minAreaRect(cnt)

        if h > w * 1.5:
            orientation = "Vertical"
            pattern = "Shrinkage / load-induced crack"
        elif w > h * 1.5:
            orientation = "Horizontal"
            pattern = "Settlement crack"
        else:
            orientation = "Diagonal"
            pattern = "Shear / structural crack"

    return {
        "length_pixels": round(float(length_px), 2),
        "width_pixels": round(float(width_px), 2),
        "orientation": orientation,
        "pattern": pattern
    }


# -----------------------
# SEVERITY & RECOMMENDATION
# -----------------------
def classify_severity(width, length):
    if width < 1.5 and length < 80:
        return "Low"
    elif width < 3 and length < 200:
        return "Moderate"
    elif width < 6:
        return "Severe"
    else:
        return "Critical"


def engineering_recommendation(severity):
    recommendations = {
        "Low": {
            "risk_level": "Low",
            "recommended_action": "Seal crack and monitor",
            "estimated_repair_time": "1–2 days",
            "engineer_required": False,
        },
        "Moderate": {
            "risk_level": "Medium",
            "recommended_action": "Epoxy injection or surface repair",
            "estimated_repair_time": "3–7 days",
            "engineer_required": True,
        },
        "Severe": {
            "risk_level": "High",
            "recommended_action": "Structural strengthening required",
            "estimated_repair_time": "2–4 weeks",
            "engineer_required": True,
        },
        "Critical": {
            "risk_level": "Critical",
            "recommended_action": "Immediate evacuation and full structural assessment",
            "estimated_repair_time": "1–3 months",
            "engineer_required": True,
        },
    }
    return recommendations.get(severity, recommendations["Critical"])


# -----------------------
# OVERLAY IMAGE (demo impact)
# -----------------------
def create_overlay(image, mask):
    overlay = image.copy()
    overlay[mask > 0] = [0, 0, 255]  # Red highlight for cracks
    combined = cv2.addWeighted(image, 0.7, overlay, 0.3, 0)
    _, buffer = cv2.imencode(".png", combined)
    return base64.b64encode(buffer).decode("utf-8")


# -----------------------
# API ENDPOINT
# -----------------------
@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        data = await file.read()
        nparr = np.frombuffer(data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            return {"status": "ERROR", "message": "Invalid image file"}

        # Detect cracks
        found, mask, status = detect_cracks(image)

        if not found:
            return {"status": "NO_CRACK_DETECTED", "message": "No structural crack detected"}

        # Analysis
        analysis = analyze_crack(mask)
        severity = classify_severity(analysis["width_pixels"], analysis["length_pixels"])
        recommendation = engineering_recommendation(severity)
        overlay_image_base64 = create_overlay(image, mask)

        return {
            "status": "CRACK_DETECTED",
            "crack_analysis": analysis,
            "severity": severity,
            "engineering_recommendation": recommendation,
            "overlay_image_base64": overlay_image_base64,
        }

    except Exception as e:
        return {"status": "ERROR", "message": f"Backend error: {str(e)}"}


# -----------------------
# HEALTH CHECK
# -----------------------
@app.get("/")
async def root():
    return {"message": "Structural Crack Detection API running!", "version": "1.0"}


# -----------------------
# RUN SERVER
# -----------------------
if __name__ == "__main__":
    print("🚀 Structural Crack Detection API running at http://localhost:8000")
    uvicorn.run("crack_ai_webapp:app", host="0.0.0.0", port=8000, reload=True)
