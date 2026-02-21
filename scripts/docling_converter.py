from docling.document_converter import DocumentConverter
import sys
import os

def convert_pdf(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found.")
        return

    print(f"Converting {file_path} using Docling...")
    converter = DocumentConverter()
    result = converter.convert(file_path)
    
    # Save as Markdown
    output_path = os.path.splitext(file_path)[0] + "_docling.md"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(result.document.export_to_markdown())
    
    print(f"Done! Saved to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        convert_pdf(sys.argv[1])
    else:
        # Default to Atrium Full Contract.pdf if it exists
        default_file = "Atrium Full Contract.pdf"
        if os.path.exists(default_file):
            convert_pdf(default_file)
        else:
            print("Please provide a file path.")
