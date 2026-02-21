"""
Docling Batch Converter for Large PDFs
=======================================
Processes large PDFs in page-range batches to avoid memory exhaustion.
Supports resume if interrupted, and merges all batches into a single output.

Usage:
  python scripts/docling_batch_converter.py "Atrium Full Contract.pdf"
  python scripts/docling_batch_converter.py "Atrium Full Contract.pdf" --batch-size 10
  python scripts/docling_batch_converter.py "Atrium Full Contract.pdf" --resume
  python scripts/docling_batch_converter.py "Atrium Full Contract.pdf" --format json
"""

import sys
import os
import json
import time
import gc
import argparse
import traceback
from pathlib import Path


def get_page_count(file_path: str) -> int:
    """Get total page count using pypdfium2 (lightweight)."""
    try:
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(file_path)
        count = len(pdf)
        pdf.close()
        return count
    except ImportError:
        # Fallback: use PyMuPDF
        try:
            import fitz
            doc = fitz.open(file_path)
            count = len(doc)
            doc.close()
            return count
        except ImportError:
            print("ERROR: Need pypdfium2 or PyMuPDF to count pages.")
            print("  pip install pypdfium2")
            sys.exit(1)


def convert_batch(file_path: str, start_page: int, end_page: int, output_format: str = "md"):
    """
    Convert a range of pages using Docling with memory-optimized settings.
    page_range is 1-indexed, inclusive on both ends.
    Returns the converted text/content for the batch.
    """
    from docling.document_converter import DocumentConverter, PdfFormatOption
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend

    # Memory-optimized pipeline options
    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = True
    pipeline_options.do_table_structure = True
    # Disable heavy enrichments to save memory
    pipeline_options.generate_parsed_pages = False

    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(
                pipeline_options=pipeline_options,
                backend=PyPdfiumDocumentBackend,
            )
        }
    )

    # Convert with page range (1-indexed, inclusive)
    result = converter.convert(
        source=file_path,
        page_range=(start_page, end_page),
    )

    if output_format == "json":
        content = json.dumps(result.document.export_to_dict(), indent=2, ensure_ascii=False)
    else:
        content = result.document.export_to_markdown()

    # Explicit cleanup
    del result
    del converter
    gc.collect()

    return content


def main():
    parser = argparse.ArgumentParser(description="Batch-process large PDFs with Docling")
    parser.add_argument("file", help="Path to the PDF file")
    parser.add_argument("--batch-size", type=int, default=20,
                        help="Number of pages per batch (default: 20)")
    parser.add_argument("--resume", action="store_true",
                        help="Resume from last completed batch")
    parser.add_argument("--format", choices=["md", "json"], default="md",
                        help="Output format: md (Markdown) or json")
    parser.add_argument("--start-page", type=int, default=1,
                        help="Start from this page (1-indexed)")
    parser.add_argument("--end-page", type=int, default=None,
                        help="End at this page (inclusive, 1-indexed)")
    args = parser.parse_args()

    file_path = args.file
    if not os.path.exists(file_path):
        print(f"ERROR: File not found: {file_path}")
        sys.exit(1)

    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
    print(f"=" * 60)
    print(f"Docling Batch Converter")
    print(f"=" * 60)
    print(f"File: {file_path}")
    print(f"Size: {file_size_mb:.1f} MB")

    # Get page count
    print(f"Counting pages...")
    total_pages = get_page_count(file_path)
    print(f"Total pages: {total_pages}")

    batch_size = args.batch_size
    ext = "md" if args.format == "md" else "json"
    base_name = Path(file_path).stem

    # Output directories
    batch_dir = Path(f"{base_name}_docling_batches")
    batch_dir.mkdir(exist_ok=True)

    # Progress file for resume
    progress_file = batch_dir / "progress.json"

    start_page = args.start_page
    end_page = args.end_page or total_pages

    # Check for resume
    completed_batches = set()
    if args.resume and progress_file.exists():
        with open(progress_file, "r") as f:
            progress = json.load(f)
            completed_batches = set(progress.get("completed_batches", []))
        print(f"Resuming: {len(completed_batches)} batches already completed")

    # Calculate batches
    batches = []
    page = start_page
    while page <= end_page:
        batch_end = min(page + batch_size - 1, end_page)
        batches.append((page, batch_end))
        page = batch_end + 1

    total_batches = len(batches)
    print(f"Batch size: {batch_size} pages")
    print(f"Total batches: {total_batches}")
    print(f"Output format: {args.format.upper()}")
    print(f"Output directory: {batch_dir}")
    print(f"=" * 60)

    # Process each batch
    overall_start = time.time()
    success_count = 0

    for idx, (b_start, b_end) in enumerate(batches):
        batch_key = f"{b_start}-{b_end}"
        batch_file = batch_dir / f"batch_{b_start:04d}_{b_end:04d}.{ext}"

        if batch_key in completed_batches:
            print(f"[{idx+1}/{total_batches}] Skipping pages {b_start}-{b_end} (already done)")
            success_count += 1
            continue

        print(f"\n[{idx+1}/{total_batches}] Processing pages {b_start}-{b_end}...")
        batch_start_time = time.time()

        try:
            content = convert_batch(file_path, b_start, b_end, args.format)

            # Save batch output
            with open(batch_file, "w", encoding="utf-8") as f:
                f.write(content)

            elapsed = time.time() - batch_start_time
            success_count += 1
            total_elapsed = time.time() - overall_start
            remaining_batches = total_batches - (idx + 1)
            avg_per_batch = total_elapsed / success_count if success_count > 0 else elapsed
            eta = avg_per_batch * remaining_batches

            print(f"    Done in {elapsed:.1f}s | "
                  f"Total: {total_elapsed:.0f}s | "
                  f"ETA: {eta:.0f}s ({eta/60:.1f} min)")

            # Update progress
            completed_batches.add(batch_key)
            with open(progress_file, "w") as f:
                json.dump({
                    "completed_batches": list(completed_batches),
                    "total_pages": total_pages,
                    "batch_size": batch_size,
                    "format": args.format,
                    "last_updated": time.strftime("%Y-%m-%d %H:%M:%S"),
                }, f, indent=2)

            # Force garbage collection between batches
            gc.collect()

        except Exception as e:
            print(f"    ERROR on pages {b_start}-{b_end}: {e}")
            traceback.print_exc()
            print(f"    Saving progress... You can --resume later.")

            # Save progress even on error
            with open(progress_file, "w") as f:
                json.dump({
                    "completed_batches": list(completed_batches),
                    "total_pages": total_pages,
                    "batch_size": batch_size,
                    "format": args.format,
                    "last_updated": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "last_error": {
                        "batch": batch_key,
                        "error": str(e),
                    }
                }, f, indent=2)
            # Force cleanup on error too
            gc.collect()
            continue

    # Merge all batches
    print(f"\n{'=' * 60}")
    print(f"Merging {len(completed_batches)} batches...")

    final_output = Path(f"{base_name}_docling.{ext}")
    batch_files = sorted(batch_dir.glob(f"batch_*.{ext}"))

    if args.format == "md":
        with open(final_output, "w", encoding="utf-8") as out:
            for bf in batch_files:
                with open(bf, "r", encoding="utf-8") as inp:
                    content = inp.read()
                    if content.strip():
                        out.write(content)
                        out.write("\n\n---\n\n")
    else:
        # For JSON, merge into a list of batch results
        all_data = []
        for bf in batch_files:
            with open(bf, "r", encoding="utf-8") as inp:
                try:
                    data = json.load(inp)
                    all_data.append(data)
                except json.JSONDecodeError:
                    print(f"  Warning: Could not parse {bf.name}")
        with open(final_output, "w", encoding="utf-8") as out:
            json.dump(all_data, out, indent=2, ensure_ascii=False)

    total_time = time.time() - overall_start
    print(f"\nDone! Final output: {final_output}")
    print(f"Total time: {total_time:.0f}s ({total_time/60:.1f} min)")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
