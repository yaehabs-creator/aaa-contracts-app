import os
import multiprocessing

# Optimization: Disable online check and use spawn for memory safety on Windows
# MUST be set before importing paddleocr
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

import io
import json
import traceback
import uvicorn
import hashlib
import concurrent.futures
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
from pypdfium2 import PdfDocument
from pathlib import Path

try:
    multiprocessing.set_start_method('spawn', force=True)
except RuntimeError:
    pass

# Cache directory for OCR results
CACHE_DIR = Path("ocr_cache")
CACHE_DIR.mkdir(exist_ok=True)

app = FastAPI(title="PaddleOCR Contract API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Initializing PaddleOCR...")
try:
    ocr = PaddleOCR(use_angle_cls=True, lang='en')
    print("PaddleOCR initialized successfully.")
except Exception as e:
    print(f"PaddleOCR init failed: {e}")
    ocr = None

def process_page_ocr(page_data):
    """Worker function to process a single page OCR in a separate process."""
    page_idx, temp_path, filename = page_data
    try:
        # Initialize OCR in each worker process
        worker_ocr = PaddleOCR(use_angle_cls=True, lang='en')
        
        pdf = PdfDocument(temp_path)
        page = pdf[page_idx]
        bitmap = page.render(scale=2.5) # Higher scale for better quality
        pil_image = bitmap.to_pil()
        
        img_path = f"temp_page_{os.getpid()}_{page_idx}.png"
        pil_image.save(img_path)
        
        result = worker_ocr.ocr(img_path)
        
        page_text = []
        if result and result[0]:
            for line in result[0]:
                text = line[1][0]
                page_text.append(text)
        
        if os.path.exists(img_path):
            os.remove(img_path)
        pdf.close()
        
        print(f"[{filename}] Finished page {page_idx + 1}", flush=True)
        return page_idx, "\\n".join(page_text)
    except Exception as e:
        print(f"Error on page {page_idx}: {e}")
        return page_idx, ""

@app.get("/health")
async def health():
    return {"status": "ok", "engine": "paddleocr"}

@app.post("/paddle-ocr")
async def perform_paddle_ocr(file: UploadFile = File(...)):
    if ocr is None:
        raise HTTPException(status_code=503, detail="PaddleOCR failed to initialize")

    temp_path = None
    try:
        contents = await file.read()
        filename = file.filename or "unknown.pdf"
        
        # Calculate hash for caching
        file_hash = hashlib.sha256(contents).hexdigest()
        cache_path = CACHE_DIR / f"{file_hash}.json"
        
        if cache_path.exists():
            print(f"Found cached OCR result for {filename} ({file_hash})")
            with open(cache_path, "r", encoding="utf-8") as f:
                return json.load(f)

        temp_path = Path(f"temp_paddle_{filename}")
        
        with open(temp_path, "wb") as f:
            f.write(contents)
            
        print(f"Processing {filename} with Parallel PaddleOCR (4 Workers)...")
        
        pdf = PdfDocument(temp_path)
        total_pages = len(pdf)
        pdf.close() # Close to allow worker access

        full_text_map = {}
        
        # Reduced workers to 2 to save RAM for concurrent AI models (like Ollama)
        with concurrent.futures.ProcessPoolExecutor(max_workers=2) as executor:
            page_tasks = [(i, str(temp_path), filename) for i in range(total_pages)]
            futures = [executor.submit(process_page_ocr, task) for task in page_tasks]
            
            for future in concurrent.futures.as_completed(futures):
                idx, text = future.result()
                full_text_map[idx] = text

        # Reconstruct in order
        ordered_texts = [full_text_map[i] for i in range(total_pages)]
        final_text = "\\n\\n--- PAGE BREAK ---\\n\\n".join(ordered_texts)
        
        result = {
            "text": final_text,
            "engine": "paddleocr"
        }
        
        # Save to cache
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False)
            
        return result

    except Exception as e:
        print(f"PaddleOCR Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path and temp_path.exists():
            os.remove(temp_path)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
