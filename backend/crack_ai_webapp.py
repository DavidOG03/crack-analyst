"""
Structural Crack Detection - Demo-Proof Backend
Classical Computer Vision Version
No ML needed. Robust for frontend demo.
"""

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import cv2
import numpy as np
import base64
from skimage.morphology import skeletonize

app = FastAPI(title="Demo-Proof Structural Crack Detection API")

# Allow all origins for demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Helper Functions
# -----------------------------

def safe_skeletonize(mask):
    try:
        return skeletonize(mask > 0)
    except Exception:
        return np.zeros_like(mask, dtype=bool)

def encode_overlay(image):
    """Encode overlay image to base64"""
    _, buf = cv2.imencode(".png", image)
    return base64.b64encode(buf).decode()

# -----------------------------
# Crack Detection
# -----------------------------
def detect_crack_demo(image):
    """
    Robust crack detection for demo.
    Always returns a mask (even if empty)
    """
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        # Enhance local contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # Edge detection
        edges = cv2.Canny(enhanced, 50, 150)

        # Adaptive threshold
        adaptive = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 21, 5
        )

        combined = cv2.bitwise_and(edges, adaptive)

        # Strengthen linear features
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel, iterations=2)

        # Connected components
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(combined, connectivity=8)
        mask = np.zeros_like(combined)

        valid = 0
        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            w = stats[i, cv2.CC_STAT_WIDTH]
            h = stats[i, cv2.CC_STAT_HEIGHT]

            if area < 20:
                continue
            aspect_ratio = max(w, h) / (min(w, h) + 1e-5)
            if aspect_ratio > 2.0:
                mask[labels == i] = 255
                valid += 1

        # If no valid crack detected, still return empty mask
        status = "NO_CRACK" if valid == 0 else "STRUCTURAL_CRACK_DETECTED"

        return status, mask

    except Exception:
        return "ERROR_PROCESSING_IMAGE", np.zeros_like(image[:, :, 0])

# -----------------------------
# Crack Analysis
# -----------------------------
def analyze_crack(mask):
    skeleton = safe_skeletonize(mask)
    length = float(np.sum(skeleton))
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    width = float(np.mean(dist[mask > 0]) * 2) if np.any(mask > 0) else 0

    orientation = "Irregular"
    pattern = "Structural crack"

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        cnt = max(contours, key=cv2.contourArea)
        (_, _), (w, h), _ = cv2.minAreaRect(cnt)
        if h > w * 1.4:
            orientation = "Vertical"
        elif w > h * 1.4:
            orientation = "Horizontal"
        else:
            orientation = "Diagonal"

    return {
        "length_pixels": round(length, 2),
        "width_pixels": round(width, 2),
        "orientation": orientation,
        "pattern": pattern,
    }

# -----------------------------
# Severity & Recommendation
# -----------------------------
def classify_severity(width, length):
    if width < 1 and length < 80:
        return "Low"
    elif width < 3 and length < 200:
        return "Moderate"
    elif width < 6:
        return "Severe"
    else:
        return "Critical"

def recommendation(severity):
    mapping = {
        "Low": ("Low", "Seal and monitor"),
        "Moderate": ("Medium", "Epoxy injection"),
        "Severe": ("High", "Structural strengthening"),
        "Critical": ("Critical", "Immediate evacuation"),
    }
    return mapping.get(severity, ("Critical", "Immediate evacuation"))

# -----------------------------
# API Endpoint
# -----------------------------
@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    try:
        data = await file.read()
        image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            return {"status": "ERROR", "message": "Invalid image file"}

        status, mask = detect_crack_demo(image)

        # Always create overlay for frontend demo
        overlay = image.copy()
        overlay[mask > 0] = [0, 0, 255]  # Red cracks
        blended = cv2.addWeighted(image, 0.7, overlay, 0.3, 0)
        overlay_b64 = encode_overlay(blended)

        response = {
            "status": status,
            "overlay_image_base64": overlay_b64
        }

        if status == "STRUCTURAL_CRACK_DETECTED":
            analysis = analyze_crack(mask)
            severity = classify_severity(
                analysis["width_pixels"], analysis["length_pixels"]
            )
            risk, action = recommendation(severity)
            response.update({
                "crack_analysis": analysis,
                "severity": severity,
                "engineering_recommendation": {
                    "risk_level": risk,
                    "recommended_action": action,
                    "engineer_required": severity != "Low",
                }
            })

        return response

    except Exception as e:
        return {"status": "ERROR", "message": f"Exception: {str(e)}"}

# -----------------------------
# Health Check
# -----------------------------
@app.get("/")
async def root():
    return {"message": "Demo-Proof Structural Crack Detection API is running"}

# -----------------------------
# Run Server
# -----------------------------
if __name__ == "__main__":
    uvicorn.run("crack_demo_backend:app", host="0.0.0.0", port=8000, reload=True)
