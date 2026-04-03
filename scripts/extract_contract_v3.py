from docling.document_converter import DocumentConverter
import json
import os
from pathlib import Path

pdf_path = r"c:\Users\hp\Desktop\Coding\aaa1.02\Database\contracts\CESEC Contract\Mivida Gardens PKG#04- Scanned Contract.pdf"
output_dir = Path(r"c:\Users\hp\Desktop\Coding\aaa1.02\Database\contracts\CESEC Contract\Processed")
output_dir.mkdir(parents=True, exist_ok=True)

print(f"Starting conversion for {pdf_path}...")
try:
    converter = DocumentConverter()
    result = converter.convert(pdf_path)

    # 1. Save Markdown
    md_text = result.document.export_to_markdown()
    with open(output_dir / "Mivida_Gardens_Clean.md", "w", encoding="utf-8") as f:
        f.write(md_text)

    # 2. Save JSON
    # Correct method for export to dict
    with open(output_dir / "Mivida_Gardens_Clean.json", "w", encoding="utf-8") as f:
        json.dump(result.document.export_to_dict(), f, indent=2, ensure_ascii=False)

    print(f"Extraction complete. Files saved to {output_dir}")
except Exception as e:
    print(f"Error during extraction: {e}")
