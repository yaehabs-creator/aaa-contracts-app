import { PaddleOcrService } from './paddleOcrService';

export interface OCRResult {
  text: string;
  confidence: number;
  words: OCRWord[];
  lines: OCRLine[];
  blocks: OCRBlock[];
  layout: DocumentLayout;
  metadata: OCRMetadata;
}

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  baseline: number;
  fontName?: string;
  fontSize?: number;
  language?: string;
}

export interface OCRLine {
  text: string;
  confidence: number;
  words: OCRWord[];
  bbox: BoundingBox;
  baseline: number;
  isHeader: boolean;
  isFooter: boolean;
  lineNumber: number;
}

export interface OCRBlock {
  text: string;
  confidence: number;
  lines: OCRLine[];
  words: OCRWord[];
  bbox: BoundingBox;
  type: BlockType;
  order: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DocumentLayout {
  pages: PageLayout[];
  columns: ColumnLayout[];
  margins: Margins;
  orientation: 'portrait' | 'landscape';
  detectedLanguage: string;
  detectedFonts: string[];
}

export interface PageLayout {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  blocks: OCRBlock[];
  headers: OCRBlock[];
  footers: OCRBlock[];
  tables: TableBlock[];
  images: ImageBlock[];
}

export interface ColumnLayout {
  startIndex: number;
  endIndex: number;
  bbox: BoundingBox;
  columnNumber: number;
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TableBlock {
  bbox: BoundingBox;
  rows: number;
  columns: number;
  cells: TableCell[];
  confidence: number;
}

export interface TableCell {
  text: string;
  bbox: BoundingBox;
  row: number;
  column: number;
  confidence: number;
}

export interface ImageBlock {
  bbox: BoundingBox;
  type: 'logo' | 'signature' | 'stamp' | 'chart' | 'other';
  confidence: number;
}

export interface OCRMetadata {
  engine: string;
  processingTime: number;
  totalPages: number;
  totalWords: number;
  averageConfidence: number;
  detectedLanguages: string[];
  qualityScore: number;
  preprocessingApplied: string[];
}

export type BlockType = 'text' | 'title' | 'subtitle' | 'paragraph' | 'list' | 'table' | 'header' | 'footer' | 'signature' | 'stamp';

export type OCREngine = 'paddle' | 'cloud-vision';

export interface OCRConfig {
  engine: OCREngine;
  languages: string[];
  preprocessing: PreprocessingConfig;
  quality: QualityConfig;
  performance: PerformanceConfig;
}

export interface PreprocessingConfig {
  enhanceContrast: boolean;
  removeNoise: boolean;
  sharpenImage: boolean;
  correctSkew: boolean;
  detectColumns: boolean;
  removeHeaders: boolean;
  removeFooters: boolean;
  enhanceResolution: boolean;
}

export interface QualityConfig {
  minConfidence: number;
  enableQualityCheck: boolean;
  autoCorrect: boolean;
  validateResults: boolean;
}

export interface PerformanceConfig {
  enableCaching: boolean;
  batchSize: number;
  maxConcurrency: number;
  enableStreaming: boolean;
  compressionLevel: number;
}

/**
 * Advanced OCR Service with PaddleOCR as primary engine
 */
export class AdvancedOCRService {
  private cache = new Map<string, OCRResult>();
  private config: OCRConfig;

  constructor(config: Partial<OCRConfig> = {}) {
    this.config = {
      engine: 'paddle',
      languages: ['eng'],
      preprocessing: {
        enhanceContrast: true,
        removeNoise: true,
        sharpenImage: true,
        correctSkew: true,
        detectColumns: true,
        removeHeaders: true,
        removeFooters: true,
        enhanceResolution: true,
      },
      quality: {
        minConfidence: 0.7,
        enableQualityCheck: true,
        autoCorrect: true,
        validateResults: true,
      },
      performance: {
        enableCaching: true,
        batchSize: 5,
        maxConcurrency: 3,
        enableStreaming: true,
        compressionLevel: 0.8,
      },
      ...config,
    };
  }

  /**
   * Initialize OCR engines
   */
  async initialize(): Promise<void> {
    const isPaddleAvailable = await PaddleOcrService.checkAvailability();
    if (!isPaddleAvailable) {
      console.warn('PaddleOCR backend not detected at http://localhost:8000. Please start the ocr_backend.py script.');
    }
  }

  /**
   * Process document with PaddleOCR
   */
  async processDocument(
    file: File | ArrayBuffer,
    onProgress?: (progress: number, currentPage: number, totalPages: number) => void
  ): Promise<OCRResult> {
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = this.generateCacheKey(file);
    if (this.config.performance.enableCaching && this.cache.has(cacheKey)) {
      if (onProgress) onProgress(100, 1, 1);
      return this.cache.get(cacheKey)!;
    }

    if (onProgress) onProgress(10, 1, 1);

    try {
      const paddleResult = await PaddleOcrService.processFile(file, file instanceof File ? file.name : 'document.pdf');

      if (onProgress) onProgress(80, 1, 1);

      // Map PaddleOCR results to our enterprise format
      const blocks: OCRBlock[] = (paddleResult.results || []).map((r: any, index: number) => ({
        text: r.text,
        confidence: r.confidence,
        lines: [],
        words: [],
        bbox: {
          x: r.box[0][0],
          y: r.box[0][1],
          width: r.box[1][0] - r.box[0][0],
          height: r.box[2][1] - r.box[0][1],
        },
        type: 'text' as BlockType,
        order: index
      }));

      const result: OCRResult = {
        text: paddleResult.text,
        confidence: paddleResult.results?.length > 0
          ? paddleResult.results.reduce((acc: number, r: any) => acc + r.confidence, 0) / paddleResult.results.length
          : 0,
        words: [],
        lines: [],
        blocks: blocks,
        layout: {
          pages: [{
            pageNumber: 1,
            width: 0,
            height: 0,
            rotation: 0,
            blocks: blocks,
            headers: [],
            footers: [],
            tables: [],
            images: [],
          }],
          columns: [],
          margins: { top: 0, right: 0, bottom: 0, left: 0 },
          orientation: 'portrait',
          detectedLanguage: 'en',
          detectedFonts: [],
        },
        metadata: {
          engine: 'paddle',
          processingTime: Date.now() - startTime,
          totalPages: 1,
          totalWords: paddleResult.results?.length || 0,
          averageConfidence: 0.9,
          detectedLanguages: ['en'],
          qualityScore: 0.9,
          preprocessingApplied: [],
        },
      };

      if (this.config.performance.enableCaching) {
        this.cache.set(cacheKey, result);
      }

      if (onProgress) onProgress(100, 1, 1);
      return result;

    } catch (error) {
      console.error('PaddleOCR Error:', error);
      throw error;
    }
  }

  /**
   * Generate cache key for file
   */
  private generateCacheKey(file: File | ArrayBuffer): string {
    if (file instanceof File) {
      return `${file.name}-${file.size}-${file.lastModified}`;
    }
    return `buffer-${file.byteLength}`;
  }
}