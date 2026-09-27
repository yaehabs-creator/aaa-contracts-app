import sys
import csv
from typing import List

def find_relevant_chunks(csv_file: str, question: str, top_k: int = 3) -> List[str]:
    # Simple keyword matching: score by number of question words in chunk
    question_words = set(question.lower().split())
    results = []
    with open(csv_file, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            chunk_text = row['text'].lower()
            score = sum(1 for w in question_words if w in chunk_text)
            results.append((score, row['chunk_id'], row['text']))
    # Sort by score descending, then by chunk_id
    results.sort(key=lambda x: (-x[0], int(x[1])))
    return [text for score, chunk_id, text in results[:top_k] if score > 0]

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python search_chunks.py <chunks.csv> <your question>")
        sys.exit(1)
    csv_file = sys.argv[1]
    question = " ".join(sys.argv[2:])
    top_chunks = find_relevant_chunks(csv_file, question)
    if not top_chunks:
        print("No relevant chunks found.")
    else:
        print("Most relevant chunk(s):\n")
        for i, chunk in enumerate(top_chunks, 1):
            print(f"[{i}] {chunk}\n")
