
import os
import asyncio
import json
import traceback
from pathlib import Path
from dotenv import load_dotenv
from raganything import RAGAnything
from raganything.config import RAGAnythingConfig
import anthropic
from openai import OpenAI

# Load env
BASE_DIR = Path(__file__).parent.parent
load_dotenv(BASE_DIR / ".env.local")

def get_llm_model_func():
    api_key = os.getenv("VITE_ANTHROPIC_API_KEY")
    if not api_key: return None
    client = anthropic.Anthropic(api_key=api_key)
    async def llm_model_func(prompt, system_prompt=None, messages=None, **kwargs):
        print(f"LLM call: {prompt[:50]}...")
        if messages:
            resp = await asyncio.to_thread(client.messages.create, model="claude-3-5-sonnet-20241022", max_tokens=1024, system=system_prompt if system_prompt else "", messages=messages)
            return resp.content[0].text
        else:
            resp = await asyncio.to_thread(client.messages.create, model="claude-3-5-sonnet-20241022", max_tokens=1024, system=system_prompt if system_prompt else "", messages=[{"role": "user", "content": prompt}])
            return resp.content[0].text
    return llm_model_func

def get_embedding_func():
    api_key = os.getenv("VITE_OPENAI_API_KEY")
    if not api_key: return None
    client = OpenAI(api_key=api_key)
    async def embedding_func(texts, **kwargs):
        print(f"Embedding call for {len(texts)} texts...")
        resp = await asyncio.to_thread(client.embeddings.create, model="text-embedding-3-small", input=texts)
        return [d.embedding for d in resp.data]
    return embedding_func

async def run_diagnostic():
    contracts_dir = BASE_DIR / "Database" / "contracts"
    # Find a contract folder
    folders = [f for f in contracts_dir.iterdir() if f.is_dir()]
    if not folders:
        print("No contracts found.")
        return
    
    contract_folder = folders[0]
    print(f"Testing with contract: {contract_folder.name}")
    
    pdf_files = list(contract_folder.glob("*.pdf"))
    if not pdf_files:
        print("No PDF found in folder.")
        return
    
    pdf_path = pdf_files[0]
    rag_dir = contract_folder / "rag_diag_test"
    rag_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        llm = get_llm_model_func()
        emb = get_embedding_func()
        
        config = RAGAnythingConfig(
            working_dir=str(rag_dir),
            parser="docling",
            enable_image_processing=True,
            enable_table_processing=True
        )
        
        rag = RAGAnything(llm_model_func=llm, embedding_func=emb, config=config)
        
        print("Starting process_file...")
        await rag.process_file(str(pdf_path))
        print("Finalizing...")
        await rag.finalize_storages()
        print("Success!")
    except Exception as e:
        print("DIAGNOSTIC FAILED")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_diagnostic())
