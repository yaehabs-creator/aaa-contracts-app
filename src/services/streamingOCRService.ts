/**
 * Streaming OCR Service for Large Documents
 * Processes large contracts in chunks with progress tracking and memory optimization
 */

import { AdvancedOCRService, OCRResult, OCRConfig } from './advancedOCRService';
import { languageFontService } from './languageFontRecognitionService';
import { useState } from 'react';

export interface StreamingOCRConfig extends OCRConfig {
  chunkSize: number;
  maxMemoryUsage: number; // MB
  enableProgressTracking: boolean;
  enablePartialResults: boolean;
  compressionLevel: number;
  streamToStorage: boolean;
}

export interface ChunkResult {
  chunkIndex: number;
  totalPages: number;
  result: PartialOCRResult;
  processingTime: number;
  memoryUsage: number;
}

export interface PartialOCRResult {
  text: string;
  confidence: number;
  words: any[];
  lines: any[];
  blocks: any[];
  pages: any[];
  metadata: any;
}

export interface OCRProgress {
  stage: 'loading' | 'preprocessing' | 'ocr' | 'analysis' | 'finalizing' | 'completed';
  progress: number; // 0-100
  currentPage: number;
  totalPages: number;
  currentChunk: number;
  totalChunks: number;
  processingTime: number;
  estimatedTimeRemaining: number;
  memoryUsage: number;
  qualityScore: number;
}

export interface StreamingOCROptions {
  onProgress?: (progress: OCRProgress) => void;
  onChunkComplete?: (chunkResult: ChunkResult) => void;
  onPartialResult?: (partialResult: PartialOCRResult) => void;
  onError?: (error: Error, chunkIndex?: number) => void;
  enableMemoryOptimization?: boolean;
  enableCompression?: boolean;
  storageProvider?: 'memory' | 'indexeddb' | 'local';
}

/**
 * Streaming OCR Service for Large Documents
 */
export class StreamingOCRService {
  private ocrService: AdvancedOCRService;
  private config: StreamingOCRConfig;
  private chunks: Map<number, ChunkResult> = new Map();
  private partialResults: PartialOCRResult[] = [];
  private startTime: number = 0;
  private memoryMonitor: MemoryMonitor;

  constructor(config: Partial<StreamingOCRConfig> = {}) {
    this.config = {
      // Default OCR config
      engine: 'hybrid',
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
        batchSize: 3,
        maxConcurrency: 2,
        enableStreaming: true,
        compressionLevel: 0.8,
      },
      // Streaming-specific config
      chunkSize: 5, // Process 5 pages at a time
      maxMemoryUsage: 512, // 512MB max
      enableProgressTracking: true,
      enablePartialResults: true,
      compressionLevel: 0.8,
      streamToStorage: true,
      ...config,
    };

    this.ocrService = new AdvancedOCRService(this.config);
    this.memoryMonitor = new MemoryMonitor(this.config.maxMemoryUsage);
  }

  /**
   * Process large document with streaming
   */
  async processLargeDocument(
    file: File | ArrayBuffer,
    options: StreamingOCROptions = {}
  ): Promise<OCRResult> {
    this.startTime = Date.now();
    
    try {
      await this.ocrService.initialize();
      
      // Load document and get page count
      const { pdfDoc, totalPages } = await this.loadDocument(file);
      
      // Calculate chunks
      const totalChunks = Math.ceil(totalPages / this.config.chunkSize);
      
      // Report initial progress
      this.reportProgress({
        stage: 'loading',
        progress: 0,
        currentPage: 0,
        totalPages,
        currentChunk: 0,
        totalChunks,
        processingTime: 0,
        estimatedTimeRemaining: 0,
        memoryUsage: this.memoryMonitor.getCurrentUsage(),
        qualityScore: 0,
      }, options.onProgress);

      // Process chunks
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        await this.processChunk(pdfDoc, chunkIndex, totalPages, options);
        
        // Check memory usage
        if (this.memoryMonitor.isMemoryLimitExceeded()) {
          await this.optimizeMemoryUsage();
        }
      }

      // Combine all chunk results
      const finalResult = await this.combineChunkResults(totalPages);
      
      // Report completion
      this.reportProgress({
        stage: 'completed',
        progress: 100,
        currentPage: totalPages,
        totalPages,
        currentChunk: totalChunks,
        totalChunks,
        processingTime: Date.now() - this.startTime,
        estimatedTimeRemaining: 0,
        memoryUsage: this.memoryMonitor.getCurrentUsage(),
        qualityScore: finalResult.metadata.qualityScore,
      }, options.onProgress);

      return finalResult;

    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Process individual chunk
   */
  private async processChunk(
    pdfDoc: any,
    chunkIndex: number,
    totalPages: number,
    options: StreamingOCROptions
  ): Promise<void> {
    const chunkStartTime = Date.now();
    const startPage = chunkIndex * this.config.chunkSize + 1;
    const endPage = Math.min(startPage + this.config.chunkSize - 1, totalPages);
    
    // Report chunk start
    this.reportProgress({
      stage: 'ocr',
      progress: (chunkIndex / Math.ceil(totalPages / this.config.chunkSize)) * 80,
      currentPage: startPage - 1,
      totalPages,
      currentChunk: chunkIndex + 1,
      totalChunks: Math.ceil(totalPages / this.config.chunkSize),
      processingTime: Date.now() - this.startTime,
      estimatedTimeRemaining: this.calculateEstimatedTime(chunkIndex, totalPages, Date.now() - this.startTime),
      memoryUsage: this.memoryMonitor.getCurrentUsage(),
      qualityScore: 0,
    }, options.onProgress);

    // Process pages in chunk
    const chunkPages: any[] = [];
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const pageResult = await this.ocrService.processPage(page, pageNum);
      chunkPages.push(pageResult);
      
      // Update progress
      this.reportProgress({
        stage: 'ocr',
        progress: (chunkIndex / Math.ceil(totalPages / this.config.chunkSize)) * 80 + 
                 ((pageNum - startPage + 1) / this.config.chunkSize) * 20,
        currentPage: pageNum,
        totalPages,
        currentChunk: chunkIndex + 1,
        totalChunks: Math.ceil(totalPages / this.config.chunkSize),
        processingTime: Date.now() - this.startTime,
        estimatedTimeRemaining: this.calculateEstimatedTime(chunkIndex, totalPages, Date.now() - this.startTime),
        memoryUsage: this.memoryMonitor.getCurrentUsage(),
        qualityScore: 0,
      }, options.onProgress);
    }

    // Create partial result for chunk
    const partialResult = await this.createPartialResult(chunkPages, chunkIndex);
    
    // Store chunk result
    const chunkResult: ChunkResult = {
      chunkIndex,
      totalPages: chunkPages.length,
      result: partialResult,
      processingTime: Date.now() - chunkStartTime,
      memoryUsage: this.memoryMonitor.getCurrentUsage(),
    };
    
    this.chunks.set(chunkIndex, chunkResult);
    this.partialResults.push(partialResult);

    // Report chunk completion
    options.onChunkComplete?.(chunkResult);
    options.onPartialResult?.(partialResult);

    // Optimize memory if needed
    if (options.enableMemoryOptimization) {
      await this.optimizeChunkMemory(chunkIndex);
    }
  }

  /**
   * Load document and get metadata
   */
  private async loadDocument(file: File | ArrayBuffer): Promise<{ pdfDoc: any; totalPages: number }> {
    let documentData: string | ArrayBuffer | URL;
    
    if (file instanceof File) {
      documentData = await file.arrayBuffer();
    } else {
      documentData = file;
    }

    const pdfjsLib = await import('pdfjs-dist');
    const pdfDoc = await pdfjsLib.getDocument(documentData).promise;
    const totalPages = pdfDoc.numPages;

    return { pdfDoc, totalPages };
  }

  /**
   * Create partial result from chunk pages
   */
  private async createPartialResult(pages: any[], chunkIndex: number): Promise<PartialOCRResult> {
    // Extract text from pages
    const text = pages.map(page => 
      page.blocks.map((block: any) => block.text).join('\n')
    ).join('\n\n');

    // Calculate confidence
    const allBlocks = pages.flatMap(page => page.blocks);
    const confidence = allBlocks.reduce((sum: number, block: any) => sum + block.confidence, 0) / allBlocks.length;

    // Extract words, lines, blocks
    const words = pages.flatMap(page => 
      page.blocks.flatMap((block: any) => 
        block.lines.flatMap((line: any) => line.words)
      )
    );

    const lines = pages.flatMap(page => 
      page.blocks.flatMap((block: any) => block.lines)
    );

    const blocks = allBlocks;

    // Create page layouts
    const pageLayouts = pages.map(page => ({
      pageNumber: page.pageNumber,
      width: page.width,
      height: page.height,
      rotation: page.rotation,
      blocks: page.blocks,
      headers: page.headers || [],
      footers: page.footers || [],
      tables: page.tables || [],
      images: page.images || [],
    }));

    // Create metadata
    const metadata = {
      chunkIndex,
      totalPages: pages.length,
      totalWords: words.length,
      averageConfidence: confidence,
      processingTime: Date.now() - this.startTime,
      qualityScore: this.calculateQualityScore(confidence, words.length),
      detectedLanguages: ['eng'], // Would be detected by language service
      preprocessingApplied: ['contrast', 'noise', 'sharpen'],
    };

    return {
      text,
      confidence,
      words,
      lines,
      blocks,
      pages: pageLayouts,
      metadata,
    };
  }

  /**
   * Combine all chunk results into final OCR result
   */
  private async combineChunkResults(totalPages: number): Promise<OCRResult> {
    // Combine all text
    const combinedText = this.partialResults.map(result => result.text).join('\n\n');

    // Combine all words, lines, blocks
    const combinedWords = this.partialResults.flatMap(result => result.words);
    const combinedLines = this.partialResults.flatMap(result => result.lines);
    const combinedBlocks = this.partialResults.flatMap(result => result.blocks);

    // Combine pages
    const combinedPages = this.partialResults.flatMap(result => result.pages);

    // Create document layout
    const layout = {
      pages: combinedPages,
      columns: [], // Would be analyzed
      margins: { top: 0, right: 0, bottom: 0, left: 0 }, // Would be calculated
      orientation: 'portrait' as const,
      detectedLanguage: 'eng',
      detectedFonts: [],
    };

    // Calculate final confidence
    const finalConfidence = combinedBlocks.reduce((sum, block) => sum + block.confidence, 0) / combinedBlocks.length;

    // Create final metadata
    const finalMetadata = {
      engine: this.config.engine,
      processingTime: Date.now() - this.startTime,
      totalPages,
      totalWords: combinedWords.length,
      averageConfidence: finalConfidence,
      detectedLanguages: ['eng'],
      qualityScore: this.calculateQualityScore(finalConfidence, combinedWords.length),
      preprocessingApplied: this.getAppliedPreprocessing(),
    };

    return {
      text: combinedText,
      confidence: finalConfidence,
      words: combinedWords,
      lines: combinedLines,
      blocks: combinedBlocks,
      layout,
      metadata: finalMetadata,
    };
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(confidence: number, wordCount: number): number {
    const confidenceScore = confidence;
    const wordCountScore = Math.min(1, wordCount / 100); // Normalize by expected word count
    return (confidenceScore * 0.7 + wordCountScore * 0.3);
  }

  /**
   * Get applied preprocessing steps
   */
  private getAppliedPreprocessing(): string[] {
    const applied: string[] = [];
    
    if (this.config.preprocessing.enhanceContrast) applied.push('contrast');
    if (this.config.preprocessing.removeNoise) applied.push('noise');
    if (this.config.preprocessing.sharpenImage) applied.push('sharpen');
    if (this.config.preprocessing.correctSkew) applied.push('skew');
    
    return applied;
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateEstimatedTime(
    currentChunk: number,
    totalPages: number,
    elapsedTime: number
  ): number {
    const totalChunks = Math.ceil(totalPages / this.config.chunkSize);
    const avgTimePerChunk = elapsedTime / (currentChunk + 1);
    const remainingChunks = totalChunks - currentChunk - 1;
    return remainingChunks * avgTimePerChunk;
  }

  /**
   * Report progress
   */
  private reportProgress(progress: OCRProgress, onProgress?: (progress: OCRProgress) => void): void {
    if (this.config.enableProgressTracking && onProgress) {
      onProgress(progress);
    }
  }

  /**
   * Optimize memory usage
   */
  private async optimizeMemoryUsage(): Promise<void> {
    // Compress stored results
    if (this.config.compressionLevel > 0) {
      for (const [chunkIndex, chunk] of this.chunks) {
        chunk.result = await this.compressPartialResult(chunk.result);
      }
    }

    // Clear old partial results if memory is still high
    if (this.memoryMonitor.isMemoryLimitExceeded()) {
      const chunksToKeep = Math.floor(this.chunks.size / 2);
      const sortedChunks = Array.from(this.chunks.entries()).sort((a, b) => b[0] - a[0]);
      
      for (let i = chunksToKeep; i < sortedChunks.length; i++) {
        this.chunks.delete(sortedChunks[i][0]);
      }
    }
  }

  /**
   * Optimize memory for specific chunk
   */
  private async optimizeChunkMemory(chunkIndex: number): Promise<void> {
    const chunk = this.chunks.get(chunkIndex);
    if (chunk && this.config.compressionLevel > 0) {
      chunk.result = await this.compressPartialResult(chunk.result);
    }
  }

  /**
   * Compress partial result
   */
  private async compressPartialResult(result: PartialOCRResult): Promise<PartialOCRResult> {
    // Simple compression - remove redundant data
    return {
      ...result,
      words: result.words.slice(0, Math.floor(result.words.length * (1 - this.config.compressionLevel))),
      lines: result.lines.slice(0, Math.floor(result.lines.length * (1 - this.config.compressionLevel))),
    };
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    await this.ocrService.cleanup();
    this.chunks.clear();
    this.partialResults = [];
  }
}

/**
 * Memory Monitor for OCR Processing
 */
class MemoryMonitor {
  private maxMemoryUsage: number;
  private memoryCheckInterval: NodeJS.Timeout | null = null;

  constructor(maxMemoryUsage: number) {
    this.maxMemoryUsage = maxMemoryUsage * 1024 * 1024; // Convert MB to bytes
  }

  startMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      if (this.isMemoryLimitExceeded()) {
        console.warn('Memory limit exceeded in OCR processing');
      }
    }, 5000); // Check every 5 seconds
  }

  stopMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  getCurrentUsage(): number {
    // Estimate memory usage (simplified)
    if ((performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  isMemoryLimitExceeded(): boolean {
    return this.getCurrentUsage() > this.maxMemoryUsage / 1024 / 1024;
  }
}

/**
 * Streaming OCR Hook for React Components
 */
export const useStreamingOCR = () => {
  const [progress, setProgress] = useState<OCRProgress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);

  const processDocument = async (
    file: File | ArrayBuffer,
    config?: Partial<StreamingOCRConfig>
  ) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const streamingOCR = new StreamingOCRService(config);
      
      const ocrResult = await streamingOCR.processLargeDocument(file, {
        onProgress: (progress) => setProgress(progress),
        onChunkComplete: (chunkResult) => {
          console.log('Chunk completed:', chunkResult);
        },
        onPartialResult: (partialResult) => {
          console.log('Partial result available:', partialResult);
        },
        onError: (err) => {
          setError(err);
        },
      });

      setResult(ocrResult);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    progress,
    isProcessing,
    error,
    result,
    processDocument,
  };
};

export default StreamingOCRService;