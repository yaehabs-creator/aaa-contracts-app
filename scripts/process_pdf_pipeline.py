import os
import json
import requests
from pathlib import Path

# Anthropic API Key from .env.local
ANTHROPIC_API_KEY = "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"
PADDLE_URL = "http://localhost:8001/paddle-ocr"

PDF_PATH = r"c:\Users\hp\Desktop\Coding\aaa1.02\Mivida Gardens PKG#04- Scanned Contract.pdf"
OUTPUT_JSON_PATH = r"c:\Users\hp\Desktop\Coding\aaa1.02\Mivida_Gardens_Extracted_Clauses.json"

PROMPT = """You are an expert contract analysis assistant. I will provide you with pdf contract text, typically divided into sections. Your task is to convert each section into a structured JSON file ready for import into my web app. For each section, follow these steps:

1. Identify the section type (e.g., Letter of Acceptance, General Conditions, Particular Conditions).
2. Detect all clauses and sub-clauses by their numbering (e.g., Clause 1, Clause 1.1) and titles.
3. For each clause, extract the exact text and structure them hierarchically (e.g., main clauses with nested sub-clauses).
4. Preserve all numbering and clause titles exactly as found.

Return ONLY valid JSON format like this:
{
  "sectionType": "General Conditions",
  "sectionTitle": "General Conditions",
  "startPage": 1,
  "endPage": 20,
  "clauses": [
    {
      "number": "1",
      "title": "General Provisions",
      "text": "Full clause text here...",
      "children": [
        {
          "number": "1.1",
          "title": "Definitions",
          "text": "Full sub-clause text here...",
          "children": []
        }
      ]
    }
  ]
}

Ensure every section is clearly identified (e.g., Letter of Acceptance is separate) and that the JSON output is complete, valid, and contains ONLY the JSON object. Do not include markdown formatting or code blocks.

CONTRACT TEXT:
{text}"""

def extract_text_paddle():
    print(f"Sending {PDF_PATH} to local PaddleOCR backend...")
    with open(PDF_PATH, "rb") as f:
        # Increase timeout to 10 hours for massive contracts
        response = requests.post(PADDLE_URL, files={"file": f}, timeout=36000)
    
    response.raise_for_status()
    result = response.json()
    return result.get("text", "")

def parse_with_anthropic(text):
    print("Sending extracted text to Anthropic Claude 3.5 Sonnet...")
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    payload = {
        "model": "claude-3-5-sonnet-20241022",
        "max_tokens": 8192,
        "messages": [
            {
                "role": "user",
                "content": PROMPT.replace("{text}", text)
            }
        ]
    }
    
    response = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=900)
    
    if response.status_code != 200:
        print(f"Anthropic API Error: {response.status_code} - {response.text}")
        response.raise_for_status()
    
    result = response.json()
    content = result['content'][0]['text']
    
    # Clean up markdown if any
    if content.startswith('```json'):
        content = content[7:]
    if content.startswith('```'):
        content = content[3:]
    if content.endswith('```'):
        content = content[:-3]
        
    return json.loads(content.strip())

def main():
    if not os.path.exists(PDF_PATH):
        print(f"File not found: {PDF_PATH}")
        return
        
    try:
        # Check if we already have the raw text locally
        raw_text_cache = Path("raw_text.txt")
        if raw_text_cache.exists():
            print("Found local raw text cache (raw_text.txt), skipping OCR...")
            with open(raw_text_cache, "r", encoding="utf-8") as f:
                raw_text = f.read()
        else:
            raw_text = extract_text_paddle()
            if not raw_text:
                print("No text extracted from PaddleOCR.")
                return
            
            # Cache the raw text locally
            with open(raw_text_cache, "w", encoding="utf-8") as f:
                f.write(raw_text)
            
        print(f"Successfully obtained {len(raw_text)} characters.")
        
        # We might need to split if text is too long (Claude context window is large enough, but just in case)
        parsed_json = parse_with_anthropic(raw_text)
        
        with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(parsed_json, f, indent=2, ensure_ascii=False)
            
        print(f"Successfully structured and saved JSON to {OUTPUT_JSON_PATH}")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
