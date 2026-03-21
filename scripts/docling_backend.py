import json
import time
import os
import traceback
from supabase import create_client, Client
from dotenv import load_dotenv

# --- SUPABASE CONFIGURATION ---
BASE_DIR = Path(__file__).parent.parent if "__file__" in locals() else Path(os.getcwd())
load_dotenv(BASE_DIR / ".env.local")

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("CRITICAL: Supabase environment variables missing. Backend will be limited.")
    supabase: Client = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"Connected to Supabase at {SUPABASE_URL}")

# --- SUPABASE DATABASE MANAGER ---

class DatabaseManager:
    def __init__(self):
        self._ensure_bucket()

    def _ensure_bucket(self):
        if not supabase: return
        try:
            # Check if 'contracts' bucket exists, create if not
            buckets = supabase.storage.list_buckets()
            if not any(b.name == 'contracts' for b in buckets):
                supabase.storage.create_bucket('contracts', options={"public": False})
                print("Created 'contracts' storage bucket.")
        except Exception as e:
            print(f"Bucket check error: {e}")

    def save_contract(self, metadata: dict):
        if not supabase: return
        try:
            # Map identity fields to columns
            payload = {
                "id": metadata.get("id"),
                "name": metadata.get("name"),
                "title": metadata.get("name"),
                "contractor_name": metadata.get("company_name") or metadata.get("contractor_name"),
                "start_date": metadata.get("effective_date") or metadata.get("start_date"),
                "end_date": metadata.get("expiry_date") or metadata.get("end_date"),
                "value": metadata.get("contract_value") or metadata.get("value"),
                "status": metadata.get("status"),
                "metadata": metadata,
                "is_deleted": False,
                "updated_at": "now()"
            }
            # Clean None values for date columns to avoid Supabase errors
            if not payload["start_date"]: del payload["start_date"]
            if not payload["end_date"]: del payload["end_date"]
            if payload["value"] is None: del payload["value"]

            supabase.table("contracts").upsert(payload).execute()
            print(f"Synced contract {metadata.get('id')} with identity to Supabase.")
        except Exception as e:
            print(f"Supabase save_contract error: {e}")

    def list_contracts(self):
        if not supabase: return []
        try:
            res = supabase.table("contracts").select("*").eq("is_deleted", False).order("updated_at", desc=True).execute()
            # Map Supabase rows to the dictionary format expected by the frontend
            return [ {**row.get("metadata", {}), "id": row["id"], "name": row["name"]} for row in res.data ]
        except Exception as e:
            print(f"Supabase list_contracts error: {e}")
            return []

    def get_contract(self, contract_id: str):
        if not supabase: return None
        try:
            res = supabase.table("contracts").select("*").eq("id", contract_id).execute()
            if res.data:
                return {**res.data[0].get("metadata", {}), "id": res.data[0]["id"]}
            return None
        except Exception as e:
            print(f"Supabase get_contract error: {e}")
            return None

    def delete_contract(self, contract_id: str):
        if not supabase: return
        try:
            supabase.table("contracts").update({"is_deleted": True}).eq("id", contract_id).execute()
            print(f"Marked contract {contract_id} as deleted in Supabase.")
        except Exception as e:
            print(f"Supabase delete_contract error: {e}")

    def save_message(self, msg_id: str, contract_id: str, role: str, content: str, agents: list = None):
        if not supabase: return
        try:
            supabase.table("chat_messages").insert({
                "id": msg_id,
                "contract_id": contract_id,
                "role": role,
                "content": content,
                "created_at": "now()"
            }).execute()
        except Exception as e:
            print(f"Supabase save_message error: {e}")

    def sync_clauses(self, contract_id: str, clauses: list):
        """Insert processed clauses into Supabase."""
        if not supabase: return
        try:
            # First, clean older clauses for this contract to avoid duplicates
            supabase.table("clauses").delete().eq("contract_id", contract_id).execute()
            
            rows = []
            for i, c in enumerate(clauses):
                rows.append({
                    "contract_id": contract_id,
                    "clause_number": c.get("number", ""),
                    "clause_title": c.get("title", "Untitled Clause"),
                    "clause_text": c.get("text", ""),
                    "category": c.get("category"),
                    "chapter": c.get("chapter"),
                    "condition_type": c.get("type", "General"),
                    "order_index": i
                })
            
            if rows:
                supabase.table("clauses").insert(rows).execute()
                print(f"Synced {len(rows)} clauses to Supabase for {contract_id}.")
        except Exception as e:
            print(f"Supabase sync_clauses error: {e}")

    def get_history(self, contract_id: str):
        if not supabase: return []
        try:
            res = supabase.table("chat_messages").select("*").eq("contract_id", contract_id).order("created_at", desc=False).execute()
            return res.data
        except Exception as e:
            print(f"Supabase get_history error: {e}")
            return []

    def upload_file(self, contract_id: str, file_path: Path, remote_name: str):
        if not supabase: return None
        try:
            with open(file_path, "rb") as f:
                path_on_storage = f"{contract_id}/{remote_name}"
                res = supabase.storage.from_("contracts").upload(
                    path=path_on_storage,
                    file=f,
                    file_options={"upsert": "true"}
                )
                return path_on_storage
        except Exception as e:
            print(f"Supabase upload_file error: {e}")
            return None

print("Creating db_manager...")
db_manager = DatabaseManager()
print("db_manager (Supabase) created.")

# def migrate_existing_data():
#     """Migrate folder-based metadata.json files into SQLite."""
#     print("Starting migration check...")
#     contracts_dir = DB_DIR / "contracts"
#     if not contracts_dir.exists():
#         return
#     
#     count = 0
#     for folder in contracts_dir.iterdir():
#         if not folder.is_dir():
#             continue
#         meta_path = folder / "metadata.json"
#         if meta_path.exists():
#             try:
#                 with open(meta_path, "r", encoding="utf-8") as f:
#                     meta = json.load(f)
#                 db_manager.save_contract(meta)
#                 count += 1
#             except Exception as e:
#                 print(f"Migration error for {folder.name}: {e}")
#     if count > 0:
#         print(f"Successfully migrated {count} contracts to Supabase (locally cached).")

# migrate_existing_data()

print("Importing FastAPI and standard libs...")
import os
import traceback
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import base64

print("Importing Docling...")
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend
print("Docling imported.")

# Resume remaining imports
print("Resuming heavy imports...")

load_dotenv(BASE_DIR / ".env.local")

# Add Python Scripts directory to PATH for RAGAnything parsers (Docling/MinerU)
scripts_dir = str(Path(os.getenv("APPDATA")) / "Python" / "Python312" / "Scripts")
if scripts_dir not in os.environ["PATH"]:
    os.environ["PATH"] = scripts_dir + os.pathsep + os.environ["PATH"]

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="AEhab Neural Digestion Engine")

# Setup Database path
BASE_DIR = Path(__file__).parent.parent if "__file__" in locals() else Path(os.getcwd())
DB_DIR = BASE_DIR / "Database"
DB_DIR.mkdir(parents=True, exist_ok=True)

class Base64Request(BaseModel):
    file_name: str
    base64_data: str

class SaveKnowledgeRequest(BaseModel):
    id: str
    name: str
    data: dict

class ContractSaveRequest(BaseModel):
    id: str
    name: str
    data: dict

class BatchInitRequest(BaseModel):
    name: str

class AdvancedQueryRequest(BaseModel):
    query: str
    mode: str = "mix"

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*", 
        "http://localhost:5173", 
        "https://ae-contract-01-47b6vzt80-aehabs-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve knowledge data — stored inside the Database folder
knowledge_dir = DB_DIR / "knowledge"
knowledge_dir.mkdir(parents=True, exist_ok=True)
app.mount("/knowledge-data", StaticFiles(directory=str(knowledge_dir)), name="knowledge")

# Move DatabaseManager to the top (see above)
pass

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


@app.post("/process/base64")
async def process_base64_ocr(req: Base64Request):
    if converter is None:
        raise HTTPException(status_code=503, detail="Docling failed to initialize")
    
    temp_path = None
    try:
        # Decode base64 data
        pdf_bytes = base64.b64decode(req.base64_data)
        filename = req.file_name or "document.pdf"
        temp_path = Path(f"temp_b64_{filename}")
        
        with open(temp_path, "wb") as f:
            f.write(pdf_bytes)
            
        result = converter.convert(source=str(temp_path))
        processed = process_docling_result(result)
        
        # chatContractUploadService expects a simple string array for pages
        if "pages" in processed and isinstance(processed["pages"], list):
            # If they are dicts, extract the text
            processed["pages"] = [p["text"] if isinstance(p, dict) else p for p in processed["pages"]]
            
        return processed
        
    except Exception as e:
        print(f"Docling Base64 Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path and temp_path.exists():
            os.remove(temp_path)


@app.post("/save-knowledge")
async def save_knowledge(req: SaveKnowledgeRequest):
    try:
        output_dir = knowledge_dir
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Sanitize filename
        safe_name = "".join([c for c in req.id if c.isalnum() or c in (' ', '.', '_', '-')]).strip()
        file_path = output_dir / f"{safe_name}.json"
        
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump({
                "id": req.id,
                "name": req.name,
                "timestamp": time.time(),
                "content": req.data
            }, f, indent=2, ensure_ascii=False)
            
        return {"status": "success", "path": str(file_path.absolute())}
    except Exception as e:
        print(f"Save Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/list-knowledge")
async def list_knowledge():
    try:
        output_dir = knowledge_dir
        if not output_dir.exists():
            return []
            
        results = []
        for f in output_dir.glob("*.json"):
            try:
                with open(f, "r", encoding="utf-8") as file:
                    data = json.load(file)
                    results.append({
                        "id": data.get("id"),
                        "name": data.get("name"),
                        "timestamp": data.get("timestamp"),
                        "size": f.stat().st_size
                    })
            except:
                continue
        return sorted(results, key=lambda x: x['timestamp'], reverse=True)
    except Exception as e:
        print(f"List Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- BACKGROUND JOB MANAGER ---

async def semantic_cleaning_layer(text: str):
    """Clean OCR noise and structure markdown using LLM."""
    if not text or len(text) < 10: return text
    
    llm = get_llm_model_func()
    if not llm: return text # Fallback to raw
    
    prompt = f"Clean the following OCR text from a contract. Remove page headers, footers, and line numbers. Fix obvious typos but keep the legal wording EXACT. Return only the cleaned markdown:\n\n{text[:8000]}"
    try:
        cleaned = await llm(prompt, system_prompt="You are a precise contract editor. Only output the cleaned text.")
        return cleaned
    except:
        return text

import re

async def segment_into_clauses(text: str):
    """Segment contract markdown into list of clauses using Regex and AI."""
    # Pattern for Clause numbers: e.g. "1.1", "Clause 8.4", "Sub-Clause 10.1"
    pattern = r'(?m)^(?:Clause\s+|Sub-Clause\s+)?(\d+(?:\.\d+)+)\s+([A-Z][^\n]+)'
    
    matches = list(re.finditer(pattern, text))
    clauses = []
    
    for i, match in enumerate(matches):
        num = match.group(1)
        title = match.group(2).strip()
        start = match.start()
        end = matches[i+1].start() if i + 1 < len(matches) else len(text)
        content = text[start:end].strip()
        
        clauses.append({
            "number": num,
            "title": title,
            "text": content,
            "category": "Uncategorized"
        })
    
    # If no clauses found by regex, it might be a poor OCR or different format
    if not clauses and len(text) > 500:
        # Fallback: create large blocks or use AI to find headers
        pass
        
    return clauses

async def AI_tag_clauses(contract_id: str, clauses: list):
    """Use AI to categorize clauses (e.g. Risk, Delay, Payment)."""
    if not clauses: return []
    
    llm = get_llm_model_func()
    if not llm: return clauses
    
    # Process only first 20 clauses to avoid token limits for now
    sample = clauses[:25]
    
    prompt = """Analyze the following list of clause titles and numbers from a construction contract. 
    Assign each to one of these categories: [Contractual, Financial, Technical, Administrative, Legal, Risk].
    Return a JSON list of objects: [{"number": "...", "category": "..."}]
    
    List:
    """ + "\n".join([f"{c['number']}: {c['title']}" for c in sample])
    
    try:
        res = await llm(prompt, system_prompt="You are a construction contract expert. Output JSON ONLY.")
        # Simple extraction of JSON from response
        json_match = re.search(r'\[.*\]', res, re.DOTALL)
        if json_match:
            tags = json.loads(json_match.group())
            tag_map = {t['number']: t['category'] for t in tags}
            for c in clauses:
                if c['number'] in tag_map:
                    c['category'] = tag_map[c['number']]
    except Exception as e:
        print(f"AI Tagging Error: {e}")
        
    return clauses
async def extract_identity(text: str):
    """Fast extraction of key contract attributes using LLM."""
    if not text or len(text) < 100: return {}
    
    llm = get_llm_model_func()
    if not llm: return {}
    
    prompt = """Analyze the start of this contract and extract the following identity fields in JSON format:
    - company_name: (The main counterparty/contractor)
    - effective_date: (YYYY-MM-DD or null)
    - expiry_date: (YYYY-MM-DD or null)
    - contract_value: (Numeric value only or null)
    - currency: (3-letter code like AED, USD)
    - renewal_type: (Auto-renewal, Manual, or None)
    
    Contract Text:
    """ + text[:10000]
    
    try:
        res = await llm(prompt, system_prompt="You are a contract analyst. Output JSON ONLY.")
        json_match = re.search(r'\{.*\}', res, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        print(f"Identity Extraction Error: {e}")
    return {}

async def background_digest_task(contract_id: str, file_path: Path):
    """Complete Neural Digestion with Identity Extraction."""
    contract_folder = file_path.parent
    try:
        # 1. Update status
        db_manager.save_contract({"id": contract_id, "status": "processing", "ingestion_progress": 5})
        
        # 2. Convert with Docling
        print(f"[{contract_id}] Starting Neural Conversion...")
        result = await asyncio.to_thread(converter.convert, str(file_path))
        raw_md = result.document.export_to_markdown()
        
        db_manager.save_contract({"id": contract_id, "ingestion_progress": 40})
        
        # 3. IDENTITY EXTRACTION (Phase 4)
        print(f"[{contract_id}] Extracting Identity...")
        identity = await extract_identity(raw_md)
        # Immediate sync for the Repository View
        db_manager.save_contract({"id": contract_id, "status": "processing", "ingestion_progress": 50, **identity})
        
        # 4. Semantic Cleaning
        print(f"[{contract_id}] Running Semantic Cleaning...")
        cleaned_md = await semantic_cleaning_layer(raw_md)
        
        # 5. Clause Segmentation & Tagging
        print(f"[{contract_id}] Segmenting Clauses...")
        clauses = await segment_into_clauses(cleaned_md)
        
        db_manager.save_contract({"id": contract_id, "ingestion_progress": 80})
        
        # 6. Save and Sync
        extracted_path = contract_folder / "extracted.md"
        with open(extracted_path, "w", encoding="utf-8") as f:
            f.write(cleaned_md)
            
        db_manager.upload_file(contract_id, extracted_path, "extracted.md")
        db_manager.upload_file(contract_id, file_path, file_path.name)
        db_manager.sync_clauses(contract_id, clauses)
        
        # 7. Finalize
        final_meta = {
            "id": contract_id,
            "status": "processed",
            "ingestion_progress": 100,
            **identity,
            "metadata": {
                **identity,
                "clause_count": len(clauses)
            }
        }
        db_manager.save_contract(final_meta)
        print(f"[{contract_id}] Smart Digestion Complete.")
        
    except Exception as e:
        print(f"Background Job Failed ({contract_id}): {e}")
        traceback.print_exc()
        db_manager.save_contract({"id": contract_id, "status": "error"})


@app.post("/contracts/process/background")
async def start_background_digest(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Entry point for Clean Ingestion. Starts background job and returns immediately."""
    try:
        file_bytes = await file.read()
        original_name = file.filename or "contract.pdf"
        safe_name = "".join([c for c in Path(original_name).stem if c.isalnum() or c in (' ', '_', '-')]).strip().replace(' ', '_')
        contract_id = f"{safe_name}_{int(time.time() * 1000)}"
        
        contract_folder = contracts_dir / contract_id
        contract_folder.mkdir(parents=True, exist_ok=True)
        pdf_path = contract_folder / original_name
        with open(pdf_path, "wb") as f:
            f.write(file_bytes)
            
        # Register in DB
        db_manager.save_contract({
            "id": contract_id,
            "name": safe_name,
            "status": "queued",
            "ingestion_progress": 0,
            "timestamp": time.time()
        })
        
        # Start Background Task
        background_tasks.add_task(background_digest_task, contract_id, pdf_path)
        
        return {"id": contract_id, "message": "In-depth Neural Digestion started in background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
            
        # Update metadata
        meta_path = contract_folder / "metadata.json"
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
            
        meta.update({
            "status": "processed",
            "text_length": len(full_text),
            "finalized_at": time.time()
        })
        
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
            
        db_manager.save_contract(meta)
        return meta
    except Exception as e:
        print(f"Finalization Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/contracts/process")
async def process_contract(file: UploadFile = File(...)):
    """Upload a PDF, process it with Docling, and save to Database/contracts/[name]/"""
    try:
        file_bytes = await file.read()
        original_name = file.filename or "contract.pdf"
        safe_name = "".join([c for c in Path(original_name).stem if c.isalnum() or c in (' ', '_', '-')]).strip()
        contract_id = f"{safe_name}_{int(time.time() * 1000)}"
        
        # Create the contract folder
        contract_folder = contracts_dir / contract_id
        contract_folder.mkdir(parents=True, exist_ok=True)
        
        # Save original PDF
        pdf_path = contract_folder / original_name
        with open(pdf_path, "wb") as f:
            f.write(file_bytes)
        
        # Process with Docling
        extracted_text = ""
        pages_data = []
        page_count = 0
        
        if converter is not None:
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
            
            try:
                result = converter.convert(tmp_path)
                doc = result.document
                extracted_text = doc.export_to_markdown()
                
                # Try to get page-level data
                page_texts = {}
                for item in doc.iterate_items():
                    element = item[1] if isinstance(item, tuple) else item
                    page_no = 1
                    if hasattr(element, 'prov') and element.prov:
                        page_no = element.prov[0].page_no if hasattr(element.prov[0], 'page_no') else 1
                    text_content = element.text if hasattr(element, 'text') else str(element)
                    if text_content.strip():
                        if page_no not in page_texts:
                            page_texts[page_no] = []
                        page_texts[page_no].append(text_content)
                
                for pg_num in sorted(page_texts.keys()):
                    combined = "\n".join(page_texts[pg_num])
                    pages_data.append({
                        "page_number": pg_num,
                        "text": combined,
                        "line_count": len(combined.split("\n"))
                    })
                page_count = len(pages_data) if pages_data else 1
            except Exception as ex:
                print(f"Docling extraction error: {ex}")
                extracted_text = f"[Docling extraction failed: {ex}]"
                page_count = 0
            finally:
                os.unlink(tmp_path)
        else:
            extracted_text = "[Docling converter not available]"
        
        # Save extracted text as markdown
        md_path = contract_folder / "extracted.md"
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(extracted_text)
        
        # Save pages data
        pages_path = contract_folder / "pages.json"
        with open(pages_path, "w", encoding="utf-8") as f:
            json.dump(pages_data, f, indent=2, ensure_ascii=False)
        
        # Save metadata
        metadata = {
            "id": contract_id,
            "name": safe_name,
            "original_filename": original_name,
            "timestamp": time.time(),
            "page_count": page_count,
            "text_length": len(extracted_text),
            "status": "processed"
        }
        meta_path = contract_folder / "metadata.json"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        db_manager.save_contract(metadata)
        
        return {
            "status": "success",
            "id": contract_id,
            "name": safe_name,
            "page_count": page_count,
            "text_length": len(extracted_text)
        }
    except Exception as e:
        print(f"Process Contract Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/contracts/index/{contract_id}")
async def index_contract_rag(contract_id: str):
    """Simulate RAG indexing and deploy Senior Agent context."""
    import urllib.parse
    actual_id = urllib.parse.unquote(contract_id)
    contract_folder = contracts_dir / actual_id
    
    if not contract_folder.exists():
        # Fallback: check if it's partly encoded
        contract_folder = contracts_dir / contract_id
        
    if not contract_folder.exists():
        # Last resort: search for folder starting with the ID (to ignore potential encoding mismatches)
        matches = list(contracts_dir.glob(f"*{contract_id.split('_')[0]}*"))
        if matches:
            contract_folder = matches[0]
        else:
            raise HTTPException(status_code=404, detail=f"Contract folder not found for {contract_id}")
        
    try:
        # Load extracted text for 'indexing'
        md_path = contract_folder / "extracted.md"
        if not md_path.exists():
            raise HTTPException(status_code=400, detail="Contract not yet ocred")
            
        with open(md_path, "r", encoding="utf-8") as f:
            text = f.read()
            
        # Simulate neural indexing (in a real app, this would be vector embeddings)
        # For now, we create a 'Senior Engineer Knowledge' file
        knowledge = {
            "agent_id": "senior-engineer",
            "indexed_at": time.time(),
            "summary_preview": text[:500] + "...",
            "rag_status": "ready",
            "persona": "Senior Principal Contract Engineer"
        }
        
        with open(contract_folder / "ai_index.json", "w", encoding="utf-8") as f:
            json.dump(knowledge, f, indent=2)
            
        # Update metadata status
        meta_path = contract_folder / "metadata.json"
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        
        meta["status"] = "agentic_ready"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
            
        db_manager.save_contract(meta)
        return {"status": "success", "message": "Neural RAG Index built and Senior Agent deployed."}
    except Exception as e:
        print(f"Indexing Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Advanced RAG (RAG-Anything) Helpers ---

def get_llm_model_func():
    api_key = os.getenv("VITE_ANTHROPIC_API_KEY")
    if not api_key:
        return None
    client = anthropic.Anthropic(api_key=api_key)
    
    async def llm_model_func(prompt, system_prompt=None, messages=None, **kwargs):
        if messages:
            resp = await asyncio.to_thread(
                client.messages.create,
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                system=system_prompt if system_prompt else "",
                messages=messages
            )
            return resp.content[0].text
        else:
            resp = await asyncio.to_thread(
                client.messages.create,
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                system=system_prompt if system_prompt else "",
                messages=[{"role": "user", "content": prompt}]
            )
            return resp.content[0].text
    return llm_model_func

def get_embedding_func():
    api_key = os.getenv("VITE_OPENAI_API_KEY")
    if not api_key:
        return None
    client = OpenAI(api_key=api_key)
    
    async def embedding_func(texts, **kwargs):
        resp = await asyncio.to_thread(
            client.embeddings.create,
            model="text-embedding-3-small",
            input=texts
        )
        return [d.embedding for d in resp.data]
    return embedding_func


@app.post("/contracts/index/advanced/{contract_id}")
async def index_contract_advanced(contract_id: str):
    """Deploy Advanced Dual-Graph RAG using RAG-Anything."""
    if RAGAnything is None:
        raise HTTPException(status_code=500, detail="RAG-Anything not installed")
        
    import urllib.parse
    actual_id = urllib.parse.unquote(contract_id)
    contract_folder = contracts_dir / actual_id
    
    if not contract_folder.exists():
        # Fallback: check if it's partly encoded or raw
        contract_folder = contracts_dir / contract_id
        
    if not contract_folder.exists():
        # Search for folder starting with a portion of the ID to handle encoding mismatches
        prefix = actual_id.split('_')[0] if '_' in actual_id else actual_id[:10]
        matches = list(contracts_dir.glob(f"*{prefix}*"))
        if matches:
            contract_folder = matches[0]
            
    if not contract_folder.exists():
        raise HTTPException(status_code=404, detail=f"Contract folder not found for {contract_id}")

    pdf_files = list(contract_folder.glob("*.pdf"))
    if not pdf_files:
        raise HTTPException(status_code=404, detail="No PDF file found for indexing")
        
    pdf_path = pdf_files[0]
    rag_dir = contract_folder / "rag_advanced"
    rag_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        llm = get_llm_model_func()
        emb = get_embedding_func()
        
        if not llm or not emb:
            raise HTTPException(status_code=500, detail="API keys missing in .env.local")
            
        config = RAGAnythingConfig(
            working_dir=str(rag_dir),
            parser="docling",
            enable_image_processing=True,
            enable_table_processing=True
        )
        
        rag = RAGAnything(
            llm_model_func=llm,
            embedding_func=emb,
            config=config
        )
        
        # Process the file
        await rag.process_document_complete(str(pdf_path))
        await rag.finalize_storages()
        
        # Update metadata.json
        meta_path = contract_folder / "metadata.json"
        if meta_path.exists():
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            meta["status"] = "advanced_rag_ready"
            meta["agentic_ready"] = True
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(meta, f, indent=2)
            db_manager.save_contract(meta)
                
        return {"status": "success", "message": "Advanced Dual-Graph RAG Index built successfully."}
    except Exception as e:
        print(f"Advanced Indexing Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/contracts/query/advanced/{contract_id}")
async def query_contract_advanced(contract_id: str, req: AdvancedQueryRequest):
    """Query the Advanced RAG index for deep forensic reasoning."""
    if RAGAnything is None:
        raise HTTPException(status_code=500, detail="RAG-Anything not installed")
        
    import urllib.parse
    actual_id = urllib.parse.unquote(contract_id)
    contract_folder = contracts_dir / actual_id
    rag_dir = contract_folder / "rag_advanced"
    
    if not rag_dir.exists():
        # Fallback search
        rag_dir = contracts_dir / contract_id / "rag_advanced"
            
    if not rag_dir.exists():
        raise HTTPException(status_code=404, detail="Advanced RAG index not found for this contract")
        
    try:
        llm = get_llm_model_func()
        emb = get_embedding_func()
        
        config = RAGAnythingConfig(working_dir=str(rag_dir))
        rag = RAGAnything(llm_model_func=llm, embedding_func=emb, config=config)
        
        # We need to initialize storages before querying
        await rag._ensure_lightrag_initialized()
        
        result = await rag.aquery(req.query, mode=req.mode)
        await rag.finalize_storages()
        
        return {"response": result}
    except Exception as e:
        print(f"Advanced Query Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/contracts/save")
async def save_contract_direct(req: ContractSaveRequest):
    """Save or update a contract's metadata and data in its specific folder."""
    try:
        contract_folder = contracts_dir / req.id
        contract_folder.mkdir(parents=True, exist_ok=True)
        
        # Save the full data as contract.json
        data_path = contract_folder / "contract.json"
        with open(data_path, "w", encoding="utf-8") as f:
            json.dump(req.data, f, indent=2, ensure_ascii=False)
            
        # Update metadata.json if it exists or create it
        meta_path = contract_folder / "metadata.json"
        meta = {}
        if meta_path.exists():
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
        
        # Update meta with key fields from data
        meta.update({
            "id": req.id,
            "name": req.name,
            "timestamp": time.time(),
            "status": req.data.get("status", meta.get("status", "active"))
        })
        
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2, ensure_ascii=False)
            
        db_manager.save_contract(meta)
        return {"status": "success", "id": req.id}
    except Exception as e:
        print(f"Save Contract Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/contracts/list")
async def list_contracts():
    """List all contracts from Database/contracts/ folders."""
    try:
        return db_manager.list_contracts()
    except Exception as e:
        print(f"List Contracts Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/contracts/chat/save")
async def save_chat_message(req: dict):
    """Save a chat message to history."""
    try:
        db_manager.save_message(
            msg_id=req.get("id", str(time.time())),
            contract_id=req.get("contract_id"),
            role=req.get("role"),
            content=req.get("content"),
            agents=req.get("agents_used", [])
        )
        return {"status": "success"}
    except Exception as e:
        print(f"Save Message Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/contracts/chat/history/{contract_id}")
async def get_chat_history(contract_id: str):
    """Retrieve chat history for a contract."""
    try:
        return db_manager.get_history(contract_id)
    except Exception as e:
        print(f"Get History Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/contracts/get/{contract_id}")
async def get_contract(contract_id: str):
    """Get full contract data including extracted text."""
    contract_folder = contracts_dir / contract_id
    if not contract_folder.exists():
        raise HTTPException(status_code=404, detail="Contract not found")
    try:
        metadata = db_manager.get_contract(contract_id) or {}
        if not metadata:
            # Fallback to file system if not in DB
            meta_path = contract_folder / "metadata.json"
            if meta_path.exists():
                with open(meta_path, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
        
        # Load extracted text
        md_path = contract_folder / "extracted.md"
        extracted_text = ""
        if md_path.exists():
            with open(md_path, "r", encoding="utf-8") as f:
                extracted_text = f.read()
        
        # Load pages
        pages_path = contract_folder / "pages.json"
        pages = []
        if pages_path.exists():
            with open(pages_path, "r", encoding="utf-8") as f:
                pages = json.load(f)
        
        return {
            **metadata,
            "extracted_text": extracted_text,
            "pages": pages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/contracts/delete/{contract_id}")
async def delete_contract(contract_id: str):
    """Delete a contract folder."""
    contract_folder = contracts_dir / contract_id
    if contract_folder.exists():
        import shutil
        shutil.rmtree(contract_folder)
    db_manager.delete_contract(contract_id)
    return {"status": "deleted"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
