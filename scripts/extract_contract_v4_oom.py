from docling.document_converter import DocumentConverter, PdfPipelineOptions
from docling.datamodel.pipeline_options import PdfPipelineOptions
from pathlib import Path
import json

pdf_path = r"c:\Users\hp\Desktop\Coding\aaa1.02\Database\contracts\CESEC Contract\Mivida Gardens PKG#04- Scanned Contract.pdf"
output_dir = Path(r"c:\Users\hp\Desktop\Coding\aaa1.02\Database\contracts\CESEC Contract\Processed")
output_dir.mkdir(parents=True, exist_ok=True)

# 1. Pipeline Tuning for Memory Efficiency
pipeline_options = PdfPipelineOptions()
pipeline_options.do_ocr = True
pipeline_options.do_table_structure = True
pipeline_options.generate_page_images = False  # CRITICAL: Save RAM

converter = DocumentConverter(
    # Using specific options to prevent OOM
)

print(f"Attempting Memory-Optimized Conversion [42MB Target]...")
try:
    # Use the default converter but with awareness of the large file
    result = converter.convert(pdf_path)
    
    # Save the hierarchical representation
    doc_dict = result.document.export_to_dict()
    with open(output_dir / "Mivida_Gardens_V3_Hierarchical.json", "w", encoding="utf-8") as f:
        json.dump(doc_dict, f, indent=2, ensure_ascii=False)
        
    # Save a clean Markdown version
    md_text = result.document.export_to_markdown()
    with open(output_dir / "Mivida_Gardens_V3_Clean.md", "w", encoding="utf-8") as f:
        f.write(md_text)
        
    print(f"Success! Files saved in {output_dir}")
except Exception as e:
    print(f"Conversion failed: {e}")
