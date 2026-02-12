/**
 * Streaming OCR Service for Large Documents
 * Refactored to use PaddleOCR via AdvancedOCRService
 */

import { AdvancedOCRService, OCRResult, OCRConfig } from './advancedOCRService';
import { useState } from 'react';

export interface StreamingOCRConfig extends OCRConfig {
  chunkSize: number;
  maxMemoryUsage: number;
  enableProgressTracking: boolean;
  enablePartialResults: boolean;
}

export interface OCRProgress {
  stage: 'loading' | 'ocr' | 'completed';
  progress: number;
  currentPage: number;
  totalPages: number;
}

/**
 * Simplified Streaming OCR Service
 */
export class StreamingOCRService {
  private ocrService: AdvancedOCRService;
  private config: StreamingOCRConfig;

  constructor(config: Partial<StreamingOCRConfig> = {}) {
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
      chunkSize: 5,
      maxMemoryUsage: 512,
      enableProgressTracking: true,
      enablePartialResults: true,
      ...config,
    };

    this.ocrService = new AdvancedOCRService(this.config);
  }

  /**
   * Process document (Forwarding to AdvancedOCRService which uses PaddleOCR)
   */
  async processLargeDocument(
    file: File | ArrayBuffer,
    options: { onProgress?: (progress: OCRProgress) => void } = {}
  ): Promise<OCRResult> {
    try {
      await this.ocrService.initialize();

      const result = await this.ocrService.processDocument(file, (progress) => {
        if (options.onProgress) {
          options.onProgress({
            stage: 'ocr',
            progress,
            currentPage: 1,
            totalPages: 1
          });
        }
      });

      return result;
    } catch (error) {
      console.error('Streaming OCR Error:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    // No-op for now
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
        onProgress: (p) => setProgress(p),
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