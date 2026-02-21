import os
import traceback
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend
import json
import time
from pathlib import Path

app = FastAPI(title="Docling OCR/Document Conversion API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Docling
print("Initializing Docling DocumentConverter...")
try:
    # Memory-optimized pipeline options
    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = True
    pipeline_options.do_table_structure = True
    pipeline_options.generate_parsed_pages = True # Needed for page-level access

    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(
                pipeline_options=pipeline_options,
                backend=PyPdfiumDocumentBackend,
            )
        }
    )
    print("Docling initialized successfully.")
except Exception as e:
    print(f"Docling init failed: {e}")
    converter = None


@app.get("/health")
async def health():
    return {"status": "ok", "engine": "docling"}


def process_docling_result(result):
    """
    Map Docling result to the format expected by the frontend.
    Expected: { text, results: [{text, confidence, box, page}], pages: [{page_number, text, line_count}], page_count, engine }
    """
    doc = result.document
    full_text = doc.export_to_markdown()
    
    # Extract page-level data
    pages_data = []
    # If generate_parsed_pages was True, we can theoretically get per-page info
    # But for simplicity, we can also use the structured elements
    
    # Map elements to 'results'
    results = []
    
    # Docling items have .prov (provenance) which contains bounding box
    # bbox format in Docling: [l, t, r, b] (left, top, right, bottom)
    # Frontend expects: [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    
    for item, level in doc.iterate_items():
        if hasattr(item, 'text'):
            text_str = item.text
            page_num = 1
            bbox_poly = []
            
            if item.prov:
                # Get the first provenance record
                prov = item.prov[0]
                page_num = prov.page_no
                if hasattr(prov, 'bbox') and prov.bbox:
                    b = prov.bbox
                    # Convert [l, t, r, b] to 4-point polygon
                    # Coordinate system might need adjustment (Docling uses points from bottom-left or top-left?)
                    # Paddle expects top-left [x,y]. Docling bbox is often [l,t,r,b].
                    bbox_poly = [[b.l, b.t], [b.r, b.t], [b.r, b.b], [b.l, b.b]]
            
            results.append({
                "text": text_str,
                "confidence": 0.95, # Docling doesn't always provide confidence per item easily
                "box": bbox_poly,
                "page": page_num
            })

    # Group results by page to fill 'pages' array
    pages_dict = {}
    for res in results:
        p_num = res['page']
        if p_num not in pages_dict:
            pages_dict[p_num] = []
        pages_dict[p_num].append(res['text'])
    
    sorted_page_nums = sorted(pages_dict.keys())
    pages_array = []
    for p_num in sorted_page_nums:
        page_text = "\n".join(pages_dict[p_num])
        pages_array.append({
            "page_number": p_num,
            "text": page_text,
            "line_count": len(pages_dict[p_num])
        })

    return {
        "text": full_text,
        "results": results,
        "pages": pages_array,
        "page_count": len(pages_array),
        "engine": "docling"
    }


@app.post("/ocr-path")
async def perform_ocr_by_path(file_path: str, start_page: int = 1, limit: int = 100):
    if converter is None:
        raise HTTPException(status_code=503, detail="Docling failed to initialize")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Docling handles page ranges (1-indexed)
        end_page = start_page + limit - 1
        result = converter.convert(
            source=file_path,
            page_range=(start_page, end_page)
        )
        return process_docling_result(result)
    except Exception as e:
        print(f"Docling Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ocr")
async def perform_ocr(file: UploadFile = File(...)):
    if converter is None:
        raise HTTPException(status_code=503, detail="Docling failed to initialize")

    temp_path = None
    try:
        contents = await file.read()
        filename = file.filename or "unknown.pdf"
        temp_path = Path(f"temp_{filename}")
        
        with open(temp_path, "wb") as f:
            f.write(contents)
        
        result = converter.convert(source=str(temp_path))
        return process_docling_result(result)

    except Exception as e:
        print(f"Docling Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path and temp_path.exists():
            os.remove(temp_path)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
