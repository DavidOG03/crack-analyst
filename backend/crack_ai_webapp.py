"""
AI Crack Detection Web App - Classical Computer Vision Version
NO MODEL FILE NEEDED - Works immediately!
Save as: crack_ai_webapp.py
"""

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import cv2
import numpy as np
from skimage.morphology import skeletonize

# -----------------------------------------
# FASTAPI APP
# -----------------------------------------
app = FastAPI(title="AI Crack Detection System")

# ADD CORS MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------
# CRACK DETECTION USING COMPUTER VISION
# -----------------------------------------
def detect_crack(image, crack_threshold=0.015):
    """
    Detect cracks using classical computer vision techniques
    No ML model required!
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Apply adaptive thresholding to detect dark lines (cracks)
    thresh = cv2.adaptiveThreshold(
        blurred, 255, 
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 
        11, 2
    )
    
    # Apply morphological operations to clean up
    kernel = np.ones((3, 3), np.uint8)
    morph = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    morph = cv2.morphologyEx(morph, cv2.MORPH_OPEN, kernel)
    
    # Edge detection using Canny
    edges = cv2.Canny(blurred, 50, 150)
    
    # Combine thresholding and edge detection
    combined = cv2.bitwise_or(morph, edges)
    
    # Calculate crack ratio
    crack_ratio = np.sum(combined > 0) / combined.size
    
    if crack_ratio < crack_threshold:
        return False, None
    
    # The combined result is our crack mask
    mask = combined.astype(np.uint8)
    
    return True, mask

# -----------------------------------------
# CRACK ANALYSIS
# -----------------------------------------
def analyze_crack(mask):
    """
    Analyze the detected crack
    """
    # Skeletonize to get crack length
    skeleton = skeletonize(mask > 0)
    length_px = np.sum(skeleton)
    
    # Distance transform to get crack width
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    width_px = np.mean(dist[mask > 0]) * 2 if np.any(mask > 0) else 0
    
    # Find contours to determine orientation
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    orientation = "Irregular"
    pattern = "Non-structural"
    
    if contours:
        # Get the largest contour
        cnt = max(contours, key=cv2.contourArea)
        
        # Get minimum area rectangle to determine orientation
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

# -----------------------------------------
# SEVERITY CLASSIFICATION
# -----------------------------------------
def classify_severity(width, length):
    """
    Classify crack severity based on dimensions
    """
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
    """
    Provide engineering recommendations based on severity
    """
    recommendations = {
        "Low": {
            "risk_level": "Low",
            "recommended_action": "Seal crack and monitor",
            "estimated_repair_time": "1–2 days",
            "engineer_required": False
        },
        "Moderate": {
            "risk_level": "Medium",
            "recommended_action": "Epoxy injection or surface repair",
            "estimated_repair_time": "3–7 days",
            "engineer_required": True
        },
        "Severe": {
            "risk_level": "High",
            "recommended_action": "Structural strengthening required",
            "estimated_repair_time": "2–4 weeks",
            "engineer_required": True
        },
        "Critical": {
            "risk_level": "Critical",
            "recommended_action": "Immediate evacuation and full structural assessment",
            "estimated_repair_time": "1–3 months",
            "engineer_required": True
        }
    }
    
    return recommendations.get(severity, recommendations["Critical"])

# -----------------------------------------
# API ENDPOINT
# -----------------------------------------
@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """
    Main endpoint to analyze uploaded images
    """
    try:
        # Read uploaded file
        data = await file.read()
        
        # Convert to OpenCV image
        nparr = np.frombuffer(data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return {
                "status": "ERROR",
                "message": "Could not read image. Please upload a valid image file."
            }
        
        # Detect crack
        crack_found, mask = detect_crack(image)
        
        if not crack_found:
            return {
                "status": "NO CRACK DETECTED",
                "message": "The uploaded image does not contain any detectable crack."
            }
        
        # Analyze crack
        analysis = analyze_crack(mask)
        
        # Classify severity
        severity = classify_severity(
            analysis["width_pixels"],
            analysis["length_pixels"]
        )
        
        # Get recommendation
        recommendation = engineering_recommendation(severity)
        
        return {
            "status": "CRACK DETECTED",
            "severity": severity,
            "crack_analysis": analysis,
            "engineering_recommendation": recommendation
        }
        
    except Exception as e:
        return {
            "status": "ERROR",
            "message": f"An error occurred: {str(e)}"
        }

# -----------------------------------------
# HEALTH CHECK ENDPOINT
# -----------------------------------------
@app.get("/")
async def root():
    return {
        "message": "AI Crack Detection API is running!",
        "version": "1.0 (Computer Vision)",
        "endpoints": {
            "/analyze": "POST - Upload image for crack detection",
            "/docs": "GET - API documentation"
        }
    }

# -----------------------------------------
# RUN SERVER
# -----------------------------------------
if __name__ == "__main__":
    print("\n" + "="*60)
    print("   🚀 CRACK DETECTION API SERVER")
    print("="*60)
    print("   Method: Classical Computer Vision")
    print("   No ML model required!")
    print("   Server: http://localhost:8000")
    print("   API Docs: http://localhost:8000/docs")
    print("="*60 + "\n")
    
    uvicorn.run("crack_ai_webapp:app", host="0.0.0.0", port=8000, reload=True)