import sys
import csv
import json
from pathlib import Path

def csv_chunks_to_json(csv_file: str, json_file: str):
    chunks = []
    with open(csv_file, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            chunks.append({
                'chunk_id': row['chunk_id'],
                'text': row['text']
            })
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python csv_to_json_chunks.py <input.csv> <output.json>")
        sys.exit(1)
    csv_file = sys.argv[1]
    json_file = sys.argv[2]
    if not Path(csv_file).exists():
        print(f"File not found: {csv_file}")
        sys.exit(1)
    csv_chunks_to_json(csv_file, json_file)
    print(f"Converted {csv_file} to {json_file}")
