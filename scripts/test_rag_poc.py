
import asyncio
import os
from raganything import RAGAnything
from raganything.config import RAGAnythingConfig
import anthropic
import openai

# Use keys from .env.local (simulated here for the POC from my knowledge)
OPENAI_API_KEY = "sk-proj-..." # I will use the real ones in the actual implementation
ANTHROPIC_API_KEY = "sk-ant-..."

async def test_rag():
    print("Testing RAGAnything initialization...")
    
    # Define adapter functions for RAGAnything
    async def llm_model_func(prompt, system_prompt=None, messages=None, **kwargs):
        # Implementation using Anthropic or OpenAI
        print(f"LLM called with prompt: {prompt[:50]}...")
        return "This is a POC response."

    async def embedding_func(texts, **kwargs):
        # Implementation using OpenAI embeddings
        print(f"Embedding called for {len(texts)} texts.")
        return [[0.1] * 1536 for _ in texts]

    config = RAGAnythingConfig(
        working_dir="./test_rag_dir",
        parser="docling",
        enable_image_processing=False,
        enable_table_processing=True
    )
    
    rag = RAGAnything(
        llm_model_func=llm_model_func,
        embedding_func=embedding_func,
        config=config
    )
    
    print("RAGAnything initialized.")
    # In a real test, we would run process_file
    # await rag.process_file("some_sample.pdf")
    
    # Cleanup
    await rag.finalize_storages()
    print("Test complete.")

if __name__ == "__main__":
    asyncio.run(test_rag())
