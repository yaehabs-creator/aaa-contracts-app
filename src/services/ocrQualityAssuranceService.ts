/**
 * OCR Quality Assurance and Confidence Scoring Service
 * Advanced quality assessment, validation, and confidence scoring for OCR results
 */

import { OCRResult, OCRWord, OCRLine, OCRBlock, PageLayout } from './advancedOCRService';

export interface QualityAssessment {
  overallScore: number; // 0-100
  confidenceScore: number;
  accuracyScore: number;
  completenessScore: number;
  consistencyScore: number;
  readabilityScore: number;
  structuralScore: number;
  issues: QualityIssue[];
  recommendations: QualityRecommendation[];
  metadata: QualityMetadata;
}

export interface QualityIssue {
  type: IssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    page: number;
    block?: number;
    line?: number;
    word?: number;
  };
  confidence: number;
  suggestedFix: string;
}

export interface QualityRecommendation {
  type: RecommendationType;
  priority: 'low' | 'medium' | 'high';
  description: string;
  expectedImprovement: number; // percentage points
  implementation: string;
}

export interface QualityMetadata {
  totalWords: number;
  totalLines: number;
  totalBlocks: number;
  totalPages: number;
  averageWordConfidence: number;
  lowConfidenceWords: number;
  veryLowConfidenceWords: number;
  suspiciousWords: number;
  detectedLanguages: string[];
  processingTime: number;
  engineUsed: string;
}

export type IssueType = 
  | 'low_confidence'
  | 'suspicious_character'
  | 'missing_text'
  | 'garbled_text'
  | 'inconsistent_formatting'
  | 'layout_issue'
  | 'language_mismatch'
  | 'font_inconsistency'
  | 'spacing_issue'
  | 'punctuation_error';

export type RecommendationType = 
  | 'increase_resolution'
  | 'adjust_preprocessing'
  | 'change_ocr_engine'
  | 'manual_review'
  | 'reprocess_region'
  | 'language_correction'
  | 'font_training'
  | 'post_processing_correction';

/**
 * OCR Quality Assurance Service
 */
export class OCRQualityAssuranceService {
  private qualityThresholds = {
    excellent: 90,
    good: 75,
    acceptable: 60,
    poor: 40,
    very_poor: 0,
  };

  private confidenceThresholds = {
    high: 0.9,
    medium: 0.7,
    low: 0.5,
    very_low: 0.3,
  };

  /**
   * Perform comprehensive quality assessment
   */
  async assessQuality(ocrResult: OCRResult): Promise<QualityAssessment> {
    const issues: QualityIssue[] = [];
    const recommendations: QualityRecommendation[] = [];

    // Assess different quality dimensions
    const confidenceScore = this.assessConfidence(ocrResult, issues);
    const accuracyScore = this.assessAccuracy(ocrResult, issues);
    const completenessScore = this.assessCompleteness(ocrResult, issues);
    const consistencyScore = this.assessConsistency(ocrResult, issues);
    const readabilityScore = this.assessReadability(ocrResult, issues);
    const structuralScore = this.assessStructuralIntegrity(ocrResult, issues);

    // Generate recommendations based on issues
    this.generateRecommendations(issues, recommendations);

    // Calculate overall score
    const overallScore = this.calculateOverallScore({
      confidenceScore,
      accuracyScore,
      completenessScore,
      consistencyScore,
      readabilityScore,
      structuralScore,
    });

    // Create metadata
    const metadata = this.createQualityMetadata(ocrResult);

    return {
      overallScore,
      confidenceScore,
      accuracyScore,
      completenessScore,
      consistencyScore,
      readabilityScore,
      structuralScore,
      issues,
      recommendations,
      metadata,
    };
  }

  /**
   * Assess confidence scores
   */
  private assessConfidence(ocrResult: OCRResult, issues: QualityIssue[]): number {
    const allWords = this.extractAllWords(ocrResult);
    const totalWords = allWords.length;
    
    if (totalWords === 0) return 0;

    // Calculate confidence distribution
    const highConfidenceWords = allWords.filter(w => w.confidence >= this.confidenceThresholds.high).length;
    const mediumConfidenceWords = allWords.filter(w => w.confidence >= this.confidenceThresholds.medium).length;
    const lowConfidenceWords = allWords.filter(w => w.confidence < this.confidenceThresholds.medium).length;
    const veryLowConfidenceWords = allWords.filter(w => w.confidence < this.confidenceThresholds.low).length;

    // Create issues for low confidence words
    allWords.forEach((word, index) => {
      if (word.confidence < this.confidenceThresholds.low) {
        const location = this.findWordLocation(ocrResult, index);
        issues.push({
          type: 'low_confidence',
          severity: word.confidence < this.confidenceThresholds.very_low ? 'critical' : 'high',
          description: `Word "${word.text}" has very low confidence (${(word.confidence * 100).toFixed(1)}%)`,
          location,
          confidence: word.confidence,
          suggestedFix: 'Consider manual review or reprocessing with different settings',
        });
      }
    });

    // Calculate confidence score
    const weightedScore = (
      (highConfidenceWords * 1.0) +
      (mediumConfidenceWords * 0.8) +
      (lowConfidenceWords * 0.5) +
      (veryLowConfidenceWords * 0.2)
    ) / totalWords;

    return Math.min(100, weightedScore * 100);
  }

  /**
   * Assess text accuracy
   */
  private assessAccuracy(ocrResult: OCRResult, issues: QualityIssue[]): number {
    const allWords = this.extractAllWords(ocrResult);
    let accuracyScore = 100;
    let errorCount = 0;

    allWords.forEach((word, index) => {
      const wordIssues = this.checkWordAccuracy(word);
      errorCount += wordIssues.length;

      wordIssues.forEach(issue => {
        const location = this.findWordLocation(ocrResult, index);
        issues.push({
          ...issue,
          location,
        });
      });
    });

    // Penalize score based on error count
    const errorRate = allWords.length > 0 ? errorCount / allWords.length : 0;
    accuracyScore = Math.max(0, 100 - (errorRate * 50)); // Each error reduces score by up to 50 points

    return accuracyScore;
  }

  /**
   * Assess completeness of text extraction
   */
  private assessCompleteness(ocrResult: OCRResult, issues: QualityIssue[]): number {
    let completenessScore = 100;
    const totalPages = ocrResult.layout.pages.length;

    // Check for empty pages
    const emptyPages = ocrResult.layout.pages.filter(page => 
      page.blocks.length === 0 || page.blocks.every(block => block.text.trim().length === 0)
    ).length;

    if (emptyPages > 0) {
      completenessScore -= (emptyPages / totalPages) * 30;
      
      for (let i = 0; i < totalPages; i++) {
        const page = ocrResult.layout.pages[i];
        if (page.blocks.length === 0) {
          issues.push({
            type: 'missing_text',
            severity: 'high',
            description: `Page ${i + 1} appears to be empty or no text was extracted`,
            location: { page: i + 1 },
            confidence: 0.5,
            suggestedFix: 'Check if page contains images or try different OCR engine',
          });
        }
      }
    }

    // Check for suspiciously short pages
    const avgWordsPerPage = this.extractAllWords(ocrResult).length / totalPages;
    const shortPages = ocrResult.layout.pages.filter(page => {
      const pageWords = this.extractPageWords(page);
      return pageWords.length < avgWordsPerPage * 0.3; // Less than 30% of average
    }).length;

    if (shortPages > 0) {
      completenessScore -= (shortPages / totalPages) * 15;
    }

    return Math.max(0, completenessScore);
  }

  /**
   * Assess consistency of formatting and structure
   */
  private assessConsistency(ocrResult: OCRResult, issues: QualityIssue[]): number {
    let consistencyScore = 100;
    const allLines = this.extractAllLines(ocrResult);

    // Check font size consistency
    const fontSizes = this.extractFontSizes(allLines);
    if (fontSizes.length > 1) {
      const fontSizeVariance = this.calculateVariance(fontSizes);
      if (fontSizeVariance > 0.3) {
        consistencyScore -= 20;
        issues.push({
          type: 'font_inconsistency',
          severity: 'medium',
          description: 'Significant variation in font sizes detected',
          location: { page: 1 },
          confidence: 0.7,
          suggestedFix: 'Consider normalizing font sizes or check document quality',
        });
      }
    }

    // Check spacing consistency
    const spacingIssues = this.checkSpacingConsistency(allLines);
    consistencyScore -= spacingIssues.length * 5;

    spacingIssues.forEach((issue, index) => {
      const location = this.findLineLocation(ocrResult, index);
      issues.push({
        ...issue,
        location,
      });
    });

    // Check text alignment consistency
    const alignmentIssues = this.checkAlignmentConsistency(ocrResult);
    consistencyScore -= alignmentIssues.length * 10;

    return Math.max(0, consistencyScore);
  }

  /**
   * Assess text readability
   */
  private assessReadability(ocrResult: OCRResult, issues: QualityIssue[]): number {
    const allWords = this.extractAllWords(ocrResult);
    let readabilityScore = 100;

    // Check for garbled text
    const garbledWords = allWords.filter(word => this.isGarbledText(word.text));
    if (garbledWords.length > 0) {
      readabilityScore -= (garbledWords.length / allWords.length) * 30;
      
      garbledWords.forEach((word, index) => {
        const location = this.findWordLocation(ocrResult, index);
        issues.push({
          type: 'garbled_text',
          severity: 'high',
          description: `Garbled text detected: "${word.text}"`,
          location,
          confidence: 0.8,
          suggestedFix: 'Manual correction required or reprocess with better preprocessing',
        });
      });
    }

    // Check for suspicious characters
    const suspiciousWords = allWords.filter(word => this.hasSuspiciousCharacters(word.text));
    if (suspiciousWords.length > 0) {
      readabilityScore -= (suspiciousWords.length / allWords.length) * 20;
      
      suspiciousWords.forEach((word, index) => {
        const location = this.findWordLocation(ocrResult, index);
        issues.push({
          type: 'suspicious_character',
          severity: 'medium',
          description: `Suspicious characters in: "${word.text}"`,
          location,
          confidence: 0.6,
          suggestedFix: 'Review and correct suspicious characters',
        });
      });
    }

    // Check punctuation and formatting
    const punctuationIssues = this.checkPunctuationQuality(allWords);
    readabilityScore -= punctuationIssues.length * 3;

    return Math.max(0, readabilityScore);
  }

  /**
   * Assess structural integrity
   */
  private assessStructuralIntegrity(ocrResult: OCRResult, issues: QualityIssue[]): number {
    let structuralScore = 100;

    // Check page layout consistency
    const pageLayouts = ocrResult.layout.pages;
    const layoutIssues = this.checkLayoutConsistency(pageLayouts);
    structuralScore -= layoutIssues.length * 15;

    layoutIssues.forEach((issue, index) => {
      issues.push({
        ...issue,
        location: { page: index + 1 },
      });
    });

    // Check block structure
    const blockIssues = this.checkBlockStructure(ocrResult);
    structuralScore -= blockIssues.length * 10;

    blockIssues.forEach(issue => {
      issues.push(issue);
    });

    // Check for missing headers/footers
    const headerFooterIssues = this.checkHeaderFooterPresence(pageLayouts);
    structuralScore -= headerFooterIssues.length * 5;

    return Math.max(0, structuralScore);
  }

  /**
   * Check word accuracy issues
   */
  private checkWordAccuracy(word: OCRWord): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check for numeric errors
    if (this.hasNumericErrors(word.text)) {
      issues.push({
        type: 'garbled_text',
        severity: 'medium',
        description: `Possible numeric error in: "${word.text}"`,
        location: { page: 0, word: 0 }, // Will be updated by caller
        confidence: word.confidence,
        suggestedFix: 'Verify numeric values',
      });
    }

    // Check for character substitution errors
    if (this.hasCharacterSubstitution(word.text)) {
      issues.push({
        type: 'suspicious_character',
        severity: 'low',
        description: `Character substitution detected in: "${word.text}"`,
        location: { page: 0, word: 0 },
        confidence: word.confidence,
        suggestedFix: 'Review for character substitutions',
      });
    }

    return issues;
  }

  /**
   * Check if text is garbled
   */
  private isGarbledText(text: string): boolean {
    // Check for unusual character combinations
    const nonAlphaNumeric = text.replace(/[a-zA-Z0-9\s]/g, '').length;
    const totalChars = text.length;
    
    // If more than 30% non-alphanumeric, likely garbled
    if (totalChars > 0 && nonAlphaNumeric / totalChars > 0.3) {
      return true;
    }

    // Check for repeated unusual characters
    const repeatedChars = text.match(/([^\w\s])\1{2,}/);
    if (repeatedChars) {
      return true;
    }

    // Check for random character sequences
    const randomPattern = /^[^\w\s]{3,}$/;
    if (randomPattern.test(text)) {
      return true;
    }

    return false;
  }

  /**
   * Check for suspicious characters
   */
  private hasSuspiciousCharacters(text: string): boolean {
    // Characters that often indicate OCR errors
    const suspiciousChars = /[|~`^_<>{}[\]\\]/g;
    const matches = text.match(suspiciousChars);
    return matches ? matches.length > 0 : false;
  }

  /**
   * Check for numeric errors
   */
  private hasNumericErrors(text: string): boolean {
    // Common OCR substitutions in numbers
    const numericErrors = [
      /[O0]/g, // O for 0
      /[I1l]/g, // I, l for 1
      /[S5]/g, // S for 5
      /[S8]/g, // S for 8
      /[Z2]/g, // Z for 2
      /[G6]/g, // G for 6
    ];

    return numericErrors.some(pattern => pattern.test(text));
  }

  /**
   * Check for character substitution
   */
  private hasCharacterSubstitution(text: string): boolean {
    // Common character substitutions
    const substitutions = [
      /rn/g, // Often read as m
      /vv/g, // Often read as w
      /cl/g, // Often read as d
      /ci/g, // Often read as a
    ];

    return substitutions.some(pattern => pattern.test(text));
  }

  /**
   * Extract all words from OCR result
   */
  private extractAllWords(ocrResult: OCRResult): OCRWord[] {
    return ocrResult.layout.pages.flatMap(page =>
      page.blocks.flatMap(block =>
        block.lines.flatMap(line => line.words)
      )
    );
  }

  /**
   * Extract all lines from OCR result
   */
  private extractAllLines(ocrResult: OCRResult): OCRLine[] {
    return ocrResult.layout.pages.flatMap(page =>
      page.blocks.flatMap(block => block.lines)
    );
  }

  /**
   * Extract words from specific page
   */
  private extractPageWords(page: PageLayout): OCRWord[] {
    return page.blocks.flatMap(block =>
      block.lines.flatMap(line => line.words)
    );
  }

  /**
   * Extract font sizes from lines
   */
  private extractFontSizes(lines: OCRLine[]): number[] {
    return lines
      .flatMap(line => line.words)
      .map(word => word.fontSize || 12)
      .filter(size => size > 0);
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return variance;
  }

  /**
   * Check spacing consistency
   */
  private checkSpacingConsistency(lines: OCRLine[]): QualityIssue[] {
    const issues: QualityIssue[] = [];
    
    // This would analyze spacing patterns between words and lines
    // Simplified implementation for now
    
    return issues;
  }

  /**
   * Check alignment consistency
   */
  private checkAlignmentConsistency(ocrResult: OCRResult): QualityIssue[] {
    const issues: QualityIssue[] = [];
    
    // This would analyze text alignment across pages
    // Simplified implementation for now
    
    return issues;
  }

  /**
   * Check layout consistency
   */
  private checkLayoutConsistency(pages: PageLayout[]): QualityIssue[] {
    const issues: QualityIssue[] = [];
    
    if (pages.length < 2) return issues;
    
    // Check for consistent page dimensions
    const firstPage = pages[0];
    const dimensionIssues = pages.filter((page, index) => {
      if (index === 0) return false;
      return Math.abs(page.width - firstPage.width) > 50 || 
             Math.abs(page.height - firstPage.height) > 50;
    });

    if (dimensionIssues.length > 0) {
      issues.push({
        type: 'layout_issue',
        severity: 'medium',
        description: 'Inconsistent page dimensions detected',
        location: { page: 1 },
        confidence: 0.7,
        suggestedFix: 'Check document quality and scanning consistency',
      });
    }

    return issues;
  }

  /**
   * Check block structure
   */
  private checkBlockStructure(ocrResult: OCRResult): QualityIssue[] {
    const issues: QualityIssue[] = [];
    
    // This would analyze paragraph structure, headings, etc.
    // Simplified implementation for now
    
    return issues;
  }

  /**
   * Check header/footer presence
   */
  private checkHeaderFooterPresence(pages: PageLayout[]): QualityIssue[] {
    const issues: QualityIssue[] = [];
    
    const pagesWithoutHeaders = pages.filter(page => page.headers.length === 0).length;
    const pagesWithoutFooters = pages.filter(page => page.footers.length === 0).length;
    
    if (pagesWithoutHeaders > pages.length * 0.8) {
      issues.push({
        type: 'missing_text',
        severity: 'low',
        description: 'Most pages lack headers - this may be normal or indicate missing content',
        location: { page: 1 },
        confidence: 0.5,
        suggestedFix: 'Verify if headers should be present in this document type',
      });
    }

    return issues;
  }

  /**
   * Check punctuation quality
   */
  private checkPunctuationQuality(words: OCRWord[]): QualityIssue[] {
    const issues: QualityIssue[] = [];
    
    // This would analyze punctuation accuracy
    // Simplified implementation for now
    
    return issues;
  }

  /**
   * Find word location in OCR result
   */
  private findWordLocation(ocrResult: OCRResult, wordIndex: number): { page: number; block?: number; line?: number; word?: number } {
    let currentWordIndex = 0;
    
    for (let pageIndex = 0; pageIndex < ocrResult.layout.pages.length; pageIndex++) {
      const page = ocrResult.layout.pages[pageIndex];
      
      for (let blockIndex = 0; blockIndex < page.blocks.length; blockIndex++) {
        const block = page.blocks[blockIndex];
        
        for (let lineIndex = 0; lineIndex < block.lines.length; lineIndex++) {
          const line = block.lines[lineIndex];
          
          if (currentWordIndex + line.words.length > wordIndex) {
            return {
              page: pageIndex + 1,
              block: blockIndex + 1,
              line: lineIndex + 1,
              word: (wordIndex - currentWordIndex) + 1,
            };
          }
          
          currentWordIndex += line.words.length;
        }
      }
    }
    
    return { page: 0 };
  }

  /**
   * Find line location in OCR result
   */
  private findLineLocation(ocrResult: OCRResult, lineIndex: number): { page: number; block?: number; line?: number } {
    let currentLineIndex = 0;
    
    for (let pageIndex = 0; pageIndex < ocrResult.layout.pages.length; pageIndex++) {
      const page = ocrResult.layout.pages[pageIndex];
      
      for (let blockIndex = 0; blockIndex < page.blocks.length; blockIndex++) {
        const block = page.blocks[blockIndex];
        
        if (currentLineIndex + block.lines.length > lineIndex) {
          return {
            page: pageIndex + 1,
            block: blockIndex + 1,
            line: (lineIndex - currentLineIndex) + 1,
          };
        }
        
        currentLineIndex += block.lines.length;
      }
    }
    
    return { page: 0 };
  }

  /**
   * Calculate overall score
   */
  private calculateOverallScore(scores: {
    confidenceScore: number;
    accuracyScore: number;
    completenessScore: number;
    consistencyScore: number;
    readabilityScore: number;
    structuralScore: number;
  }): number {
    const weights = {
      confidenceScore: 0.25,
      accuracyScore: 0.25,
      completenessScore: 0.15,
      consistencyScore: 0.15,
      readabilityScore: 0.1,
      structuralScore: 0.1,
    };

    return Object.entries(scores).reduce((total, [key, score]) => {
      return total + (score * weights[key as keyof typeof weights]);
    }, 0);
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(issues: QualityIssue[], recommendations: QualityRecommendation[]): void {
    const issueTypes = new Map<string, QualityIssue[]>();
    
    // Group issues by type
    issues.forEach(issue => {
      if (!issueTypes.has(issue.type)) {
        issueTypes.set(issue.type, []);
      }
      issueTypes.get(issue.type)!.push(issue);
    });

    // Generate recommendations for each issue type
    issueTypes.forEach((typeIssues, issueType) => {
      const recommendation = this.createRecommendation(issueType, typeIssues);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });
  }

  /**
   * Create recommendation for issue type
   */
  private createRecommendation(issueType: string, issues: QualityIssue[]): QualityRecommendation | null {
    const highSeverityCount = issues.filter(i => i.severity === 'high' || i.severity === 'critical').length;
    const totalIssues = issues.length;

    switch (issueType) {
      case 'low_confidence':
        return {
          type: 'manual_review',
          priority: highSeverityCount > 0 ? 'high' : 'medium',
          description: `${totalIssues} words have low confidence. Manual review recommended.`,
          expectedImprovement: Math.min(30, totalIssues * 2),
          implementation: 'Review highlighted words and correct as needed',
        };

      case 'garbled_text':
        return {
          type: 'reprocess_region',
          priority: 'high',
          description: `${totalIssues} instances of garbled text detected.`,
          expectedImprovement: Math.min(40, totalIssues * 3),
          implementation: 'Reprocess affected regions with enhanced preprocessing',
        };

      case 'layout_issue':
        return {
          type: 'increase_resolution',
          priority: 'medium',
          description: 'Layout inconsistencies detected. Higher resolution scanning may help.',
          expectedImprovement: 15,
          implementation: 'Rescan document at higher DPI (300+ recommended)',
        };

      case 'font_inconsistency':
        return {
          type: 'adjust_preprocessing',
          priority: 'low',
          description: 'Font inconsistencies detected. Preprocessing adjustment may help.',
          expectedImprovement: 10,
          implementation: 'Apply font normalization or adjust contrast settings',
        };

      default:
        return null;
    }
  }

  /**
   * Create quality metadata
   */
  private createQualityMetadata(ocrResult: OCRResult): QualityMetadata {
    const allWords = this.extractAllWords(ocrResult);
    const allLines = this.extractAllLines(ocrResult);
    const allBlocks = ocrResult.layout.pages.flatMap(page => page.blocks);

    const avgWordConfidence = allWords.length > 0 
      ? allWords.reduce((sum, word) => sum + word.confidence, 0) / allWords.length 
      : 0;

    const lowConfidenceWords = allWords.filter(w => w.confidence < 0.7).length;
    const veryLowConfidenceWords = allWords.filter(w => w.confidence < 0.5).length;
    const suspiciousWords = allWords.filter(w => this.hasSuspiciousCharacters(w.text)).length;

    return {
      totalWords: allWords.length,
      totalLines: allLines.length,
      totalBlocks: allBlocks.length,
      totalPages: ocrResult.layout.pages.length,
      averageWordConfidence: avgWordConfidence,
      lowConfidenceWords,
      veryLowConfidenceWords,
      suspiciousWords,
      detectedLanguages: ocrResult.metadata.detectedLanguages,
      processingTime: ocrResult.metadata.processingTime,
      engineUsed: ocrResult.metadata.engine,
    };
  }
}

/**
 * Quality Assurance Hook for React Components
 */
export const useOCRQualityAssurance = () => {
  const qaService = new OCRQualityAssuranceService();

  const assessQuality = async (ocrResult: OCRResult) => {
    return await qaService.assessQuality(ocrResult);
  };

  const getQualityGrade = (score: number): string => {
    if (score >= 90) return 'A+ (Excellent)';
    if (score >= 80) return 'A (Very Good)';
    if (score >= 70) return 'B (Good)';
    if (score >= 60) return 'C (Acceptable)';
    if (score >= 50) return 'D (Poor)';
    return 'F (Very Poor)';
  };

  const getQualityColor = (score: number): string => {
    if (score >= 90) return '#10b981'; // Green
    if (score >= 80) return '#3b82f6'; // Blue
    if (score >= 70) return '#f59e0b'; // Yellow
    if (score >= 60) return '#f97316'; // Orange
    if (score >= 50) return '#ef4444'; // Red
    return '#991b1b'; // Dark Red
  };

  return {
    assessQuality,
    getQualityGrade,
    getQualityColor,
  };
};

export default OCRQualityAssuranceService;