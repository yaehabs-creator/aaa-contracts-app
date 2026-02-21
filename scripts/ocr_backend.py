import os
import traceback

# Disable connectivity check on startup - must be before any paddle imports
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
import numpy as np
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
print("Initializing PaddleOCR (v3.4.0)...")
try:
    ocr = PaddleOCR(use_textline_orientation=True, lang='en')
    print("PaddleOCR initialized successfully.")
except Exception as e:
    print(f"Init with textline_orientation failed: {e}, trying basic...")
    try:
        ocr = PaddleOCR(lang='en')
        print("PaddleOCR initialized (basic mode).")
    except Exception as e2:
        print(f"PaddleOCR init failed completely: {e2}")
        ocr = None


@app.get("/health")
async def health():
    return {"status": "ok", "engine": "paddle", "version": "3.4.0"}


import fitz  # PyMuPDF

@app.post("/ocr-path")
async def perform_ocr_by_path(file_path: str, start_page: int = 0, limit: int = 100):
    if ocr is None:
        raise HTTPException(status_code=503, detail="PaddleOCR failed to initialize")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path_lower = file_path.lower()
    try:
        if file_path_lower.endswith('.pdf'):
            doc = fitz.open(file_path)
            total_pages = len(doc)
            
            if start_page >= total_pages:
                doc.close()
                return {
                    "text": "",
                    "results": [],
                    "pages": [],
                    "page_count": 0,
                    "total_pages": total_pages,
                    "is_last_batch": True
                }

            end_page = min(start_page + limit, total_pages)
            print(f"Processing PDF batch: {file_path}, pages {start_page+1} to {end_page}")
            
            all_pages_data = []
            full_text_list = []
            raw_results = []
            
            for page_index in range(start_page, end_page):
                print(f"OCR Page {page_index + 1}/{total_pages}...")
                page = doc.load_page(page_index)
                # Lower resolution for massive documents to speed up
                pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)) 
                img_data = pix.tobytes("png")
                
                image = Image.open(io.BytesIO(img_data)).convert('RGB')
                img_array = np.array(image)
                img_array = img_array[:, :, ::-1].copy() # BGR
                
                prediction = ocr.predict(img_array)
                page_result = process_prediction(prediction)
                
                for res in page_result['results']:
                    res['page'] = page_index + 1
                    raw_results.append(res)
                
                full_text_list.append(page_result['text'])
                all_pages_data.append({
                    "page_number": page_index + 1,
                    "text": page_result['text'],
                    "line_count": len(page_result['text'].split('\n'))
                })
            
            is_last = end_page >= total_pages
            doc.close()
            return {
                "text": "\n\n".join(full_text_list),
                "results": raw_results,
                "pages": all_pages_data,
                "page_count": len(all_pages_data),
                "total_pages": total_pages,
                "is_last_batch": is_last,
                "engine": "paddle"
            }
        else:
            prediction = ocr.predict(file_path)
            return process_prediction(prediction)
    except Exception as e:
        print(f"OCR Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


def process_prediction(prediction):
    extracted_text = []
    raw_results = []
    pages = []

    for item in prediction:
        res = item.json.get('res', item.json)
        rec_texts = res.get('rec_texts', [])
        rec_scores = res.get('rec_scores', [])
        dt_polys = res.get('dt_polys', [])
        page_index = res.get('page_index', None)
        page_num = (page_index if page_index is not None else len(pages)) + 1

        page_lines = []
        for i, text in enumerate(rec_texts):
            text_str = str(text)
            confidence = float(rec_scores[i]) if i < len(rec_scores) else 0.0
            box = dt_polys[i] if i < len(dt_polys) else []
            if hasattr(box, 'tolist'):
                box = box.tolist()

            extracted_text.append(text_str)
            page_lines.append(text_str)
            raw_results.append({
                "text": text_str,
                "confidence": confidence,
                "box": box,
                "page": page_num
            })

        pages.append({
            "page_number": page_num,
            "text": "\n".join(page_lines),
            "line_count": len(page_lines)
        })

    print(f"OCR complete: {len(pages)} pages, {len(extracted_text)} text lines")

    return {
        "text": "\n".join(extracted_text),
        "results": raw_results,
        "pages": pages,
        "page_count": len(pages),
        "engine": "paddle"
    }


@app.post("/ocr")
async def perform_ocr(file: UploadFile = File(...)):
    if ocr is None:
        raise HTTPException(status_code=503, detail="PaddleOCR failed to initialize")

    temp_path = None
    try:
        contents = await file.read()
        filename = (file.filename or "unknown.pdf").lower()

        if filename.endswith('.pdf'):
            temp_path = f"temp_{file.filename}"
            with open(temp_path, "wb") as f:
                f.write(contents)
            input_data = temp_path
        else:
            image = Image.open(io.BytesIO(contents)).convert('RGB')
            img_array = np.array(image)
            img_array = img_array[:, :, ::-1].copy()  # RGB -> BGR
            input_data = img_array

        # Use predict() - the v3.4.0 API (ocr() is deprecated and broken)
        prediction = ocr.predict(input_data)
        return process_prediction(prediction)

    except Exception as e:
        print(f"OCR Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
