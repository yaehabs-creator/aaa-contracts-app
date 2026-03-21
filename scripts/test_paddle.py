import sys
from paddleocr import PaddleOCR
import PyPDF2

def test_paddle():
    print("Initializing PaddleOCR...")
    ocr = PaddleOCR(use_angle_cls=True, lang='en')
    print("Done")

if __name__ == "__main__":
    test_paddle()
