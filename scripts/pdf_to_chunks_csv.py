import sys
import os
import csv
from pathlib import Path
from typing import List

try:
    from PyPDF2 import PdfReader
except ImportError:
    print("PyPDF2 not found. Please install with: pip install PyPDF2")
    sys.exit(1)

def extract_text_from_pdf(pdf_path: str) -> str:
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

def chunk_text(text: str, chunk_size: int = 500) -> List[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i+chunk_size])
        chunks.append(chunk)
    return chunks

def write_chunks_to_csv(chunks: List[str], output_csv: str):
    with open(output_csv, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['chunk_id', 'text'])
        for idx, chunk in enumerate(chunks):
            writer.writerow([idx, chunk])

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python pdf_to_chunks_csv.py <input.pdf> <output.csv>")
        sys.exit(1)
    pdf_path = sys.argv[1]
    output_csv = sys.argv[2]
    if not Path(pdf_path).exists():
        print(f"File not found: {pdf_path}")
        sys.exit(1)
    print(f"Extracting text from {pdf_path} ...")
    text = extract_text_from_pdf(pdf_path)
    print(f"Chunking text ...")
    chunks = chunk_text(text, chunk_size=500)
    print(f"Writing {len(chunks)} chunks to {output_csv} ...")
    write_chunks_to_csv(chunks, output_csv)
    print("Done.")
