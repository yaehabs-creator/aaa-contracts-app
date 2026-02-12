import os

# Disable connectivity check on startup - must be before any paddle imports
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
import numpy as np
import cv2
import io
from PIL import Image

app = FastAPI(title="PaddleOCR Bridge API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PaddleOCR
# Note: In PaddleOCR 3.x, use_gpu is no longer a direct argument.
# It automatically detects GPU if paddlepaddle-gpu is installed.
# use_angle_cls is deprecated in favor of use_textline_orientation.
print("Initializing PaddleOCR (v3.4.0 compatible)...")

try:
    # Try initialization with orientation detection
    ocr = PaddleOCR(use_textline_orientation=True, lang='en')
    print("PaddleOCR initialized successfully.")
except Exception as e:
    print(f"PaddleOCR initialization failed: {e}")
    # Fallback to basic settings if needed
    ocr = PaddleOCR(lang='en')

@app.get("/health")
async def health():
    return {
        "status": "ok", 
        "engine": "paddle",
        "version": "3.4.0-compat"
    }

@app.post("/ocr")
async def perform_ocr(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        
        # Determine if it's a PDF or Image
        filename = file.filename.lower()
        
        if filename.endswith('.pdf'):
            # PaddleOCR has built-in PDF support
            # We write to a temp file because PaddleOCR expects a path for PDFs
            temp_path = f"temp_{file.filename}"
            with open(temp_path, "wb") as f:
                f.write(contents)
            
            # cls=True enables the textline orientation/angle classifier
            result = ocr.ocr(temp_path, cls=True)
            if os.path.exists(temp_path):
                os.remove(temp_path)
        else:
            # Process as image
            image = Image.open(io.BytesIO(contents)).convert('RGB')
            img_array = np.array(image)
            # Convert RGB to BGR for OpenCV (PaddleOCR uses BGR)
            img_array = img_array[:, :, ::-1].copy()
            
            result = ocr.ocr(img_array, cls=True)

        # Flatten and format results
        # PaddleOCR result is a list of lists (one per page for PDFs, one element for images)
        extracted_text = []
        raw_results = []
        pages = []
        
        if result:
            for page_idx, page in enumerate(result):
                page_lines = []
                if page:
                    for line in page:
                        box = line[0]
                        text, confidence = line[1]
                        extracted_text.append(text)
                        page_lines.append(text)
                        raw_results.append({
                            "text": text,
                            "confidence": float(confidence),
                            "box": box,
                            "page": page_idx + 1
                        })
                
                pages.append({
                    "page_number": page_idx + 1,
                    "text": "\n".join(page_lines),
                    "line_count": len(page_lines)
                })

        return {
            "text": "\n".join(extracted_text),
            "results": raw_results,
            "pages": pages,
            "page_count": len(pages),
            "engine": "paddle"
        }
        
    except Exception as e:
        print(f"OCR Error: {e}")
        # Cleanup temp file if it exists on error
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
