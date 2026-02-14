/**
 * Multi-Language and Font Recognition Service
 * Advanced language detection and font analysis for OCR enhancement
 */

export interface LanguageDetectionResult {
  detectedLanguages: DetectedLanguage[];
  primaryLanguage: string;
  confidence: number;
  mixedLanguageDocument: boolean;
  languageDistribution: Map<string, number>;
}

export interface DetectedLanguage {
  language: string;
  confidence: number;
  script: string;
  regions: TextRegion[];
}

export interface TextRegion {
  bbox: any;
  text: string;
  confidence: number;
  language: string;
}

export interface FontRecognitionResult {
  detectedFonts: DetectedFont[];
  fontDistribution: Map<string, number>;
  fontConsistency: number;
  serifSansRatio: number;
}

export interface DetectedFont {
  fontFamily: string;
  confidence: number;
  isSerif: boolean;
  weight: string;
  style: string;
  size: number;
  usage: number; // percentage of document
  regions: TextRegion[];
}

export interface ScriptDetection {
  script: string;
  confidence: number;
  languageFamily: string;
}

/**
 * Multi-Language and Font Recognition Service
 */
export class LanguageFontRecognitionService {
  private languagePatterns: Map<string, RegExp[]> = new Map();
  private fontPatterns: Map<string, FontPattern> = new Map();
  private scriptDetectors: Map<string, ScriptDetector> = new Map();

  constructor() {
    this.initializeLanguagePatterns();
    this.initializeFontPatterns();
    this.initializeScriptDetectors();
  }

  /**
   * Detect languages in OCR result
   */
  async detectLanguages(ocrResult: any): Promise<LanguageDetectionResult> {
    const textRegions = this.extractTextRegions(ocrResult);
    const detectedLanguages: DetectedLanguage[] = [];
    const languageDistribution = new Map<string, number>();

    // Analyze each text region for language
    for (const region of textRegions) {
      const languageResult = await this.detectRegionLanguage(region);
      detectedLanguages.push(languageResult);
      
      // Update distribution
      const current = languageDistribution.get(languageResult.language) || 0;
      languageDistribution.set(languageResult.language, current + region.text.length);
    }

    // Calculate primary language and confidence
    const totalText = Array.from(languageDistribution.values()).reduce((sum, count) => sum + count, 0);
    const primaryLanguage = Array.from(languageDistribution.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';
    
    const primaryLanguageCount = languageDistribution.get(primaryLanguage) || 0;
    const confidence = totalText > 0 ? primaryLanguageCount / totalText : 0;
    
    const mixedLanguageDocument = languageDistribution.size > 1 && confidence < 0.9;

    return {
      detectedLanguages,
      primaryLanguage,
      confidence,
      mixedLanguageDocument,
      languageDistribution,
    };
  }

  /**
   * Recognize fonts in OCR result
   */
  async recognizeFonts(ocrResult: any): Promise<FontRecognitionResult> {
    const textRegions = this.extractTextRegions(ocrResult);
    const detectedFonts: DetectedFont[] = [];
    const fontDistribution = new Map<string, number>();

    // Analyze font characteristics
    for (const region of textRegions) {
      const fontResult = await this.detectRegionFont(region);
      if (fontResult) {
        detectedFonts.push(fontResult);
        
        // Update distribution
        const current = fontDistribution.get(fontResult.fontFamily) || 0;
        fontDistribution.set(fontResult.fontFamily, current + region.text.length);
      }
    }

    // Calculate font consistency
    const totalText = Array.from(fontDistribution.values()).reduce((sum, count) => sum + count, 0);
    const dominantFontCount = Math.max(...Array.from(fontDistribution.values()));
    const fontConsistency = totalText > 0 ? dominantFontCount / totalText : 0;

    // Calculate serif/sans ratio
    const serifFonts = detectedFonts.filter(f => f.isSerif).reduce((sum, f) => sum + f.usage, 0);
    const serifSansRatio = serifFonts > 0 ? serifFonts / (serifFonts + (100 - serifFonts)) : 0;

    return {
      detectedFonts,
      fontDistribution,
      fontConsistency,
      serifSansRatio,
    };
  }

  /**
   * Extract text regions from OCR result
   */
  private extractTextRegions(ocrResult: any): TextRegion[] {
    const regions: TextRegion[] = [];
    
    if (ocrResult.layout && ocrResult.layout.pages) {
      ocrResult.layout.pages.forEach((page: any) => {
        page.blocks.forEach((block: any) => {
          block.lines.forEach((line: any) => {
            regions.push({
              bbox: line.bbox,
              text: line.text,
              confidence: line.confidence,
              language: 'unknown', // Will be detected
            });
          });
        });
      });
    }

    return regions;
  }

  /**
   * Detect language for a specific text region
   */
  private async detectRegionLanguage(region: TextRegion): Promise<DetectedLanguage> {
    const text = region.text;
    let bestMatch = { language: 'unknown', confidence: 0, script: 'unknown' };

    // Test against language patterns
    for (const [language, patterns] of this.languagePatterns) {
      let totalMatches = 0;
      let totalTests = 0;

      for (const pattern of patterns) {
        const matches = text.match(pattern);
        totalMatches += matches ? matches.length : 0;
        totalTests += 1;
      }

      const confidence = totalTests > 0 ? totalMatches / totalTests : 0;
      if (confidence > bestMatch.confidence) {
        bestMatch = { language, confidence, script: this.detectScript(text) };
      }
    }

    // Use character frequency analysis for better accuracy
    const charAnalysis = this.analyzeCharacterFrequency(text);
    if (charAnalysis.confidence > bestMatch.confidence) {
      bestMatch = {
        language: charAnalysis.language,
        confidence: charAnalysis.confidence,
        script: charAnalysis.script,
      };
    }

    return {
      ...bestMatch,
      regions: [region],
    };
  }

  /**
   * Detect font for a specific text region
   */
  private async detectRegionFont(region: TextRegion): Promise<DetectedFont | null> {
    const text = region.text;
    let bestMatch: DetectedFont | null = null;

    // Analyze text characteristics
    const characteristics = this.analyzeTextCharacteristics(text);
    
    // Match against font patterns
    for (const [fontFamily, pattern] of this.fontPatterns) {
      const matchScore = this.calculateFontMatch(characteristics, pattern);
      
      if (matchScore > 0.7 && (!bestMatch || matchScore > bestMatch.confidence)) {
        bestMatch = {
          fontFamily,
          confidence: matchScore,
          isSerif: pattern.isSerif,
          weight: characteristics.weight,
          style: characteristics.style,
          size: characteristics.size,
          usage: 0, // Will be calculated globally
          regions: [region],
        };
      }
    }

    return bestMatch;
  }

  /**
   * Detect script from text
   */
  private detectScript(text: string): string {
    // Unicode range detection for scripts
    const scripts = [
      { name: 'Latin', ranges: [[0x0000, 0x007F], [0x0080, 0x00FF], [0x0100, 0x017F]] },
      { name: 'Cyrillic', ranges: [[0x0400, 0x04FF], [0x0500, 0x052F]] },
      { name: 'Greek', ranges: [[0x0370, 0x03FF], [0x1F00, 0x1FFF]] },
      { name: 'Arabic', ranges: [[0x0600, 0x06FF], [0x0750, 0x077F]] },
      { name: 'Hebrew', ranges: [[0x0590, 0x05FF]] },
      { name: 'Chinese', ranges: [[0x4E00, 0x9FFF], [0x3400, 0x4DBF]] },
      { name: 'Japanese', ranges: [[0x3040, 0x309F], [0x30A0, 0x30FF]] },
      { name: 'Korean', ranges: [[0xAC00, 0xD7AF], [0x1100, 0x11FF]] },
      { name: 'Devanagari', ranges: [[0x0900, 0x097F]] },
      { name: 'Thai', ranges: [[0x0E00, 0x0E7F]] },
    ];

    let bestScript = 'Latin';
    let maxMatches = 0;

    for (const script of scripts) {
      let matches = 0;
      for (const [start, end] of script.ranges) {
        for (let i = 0; i < text.length; i++) {
          const code = text.charCodeAt(i);
          if (code >= start && code <= end) {
            matches++;
          }
        }
      }
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestScript = script.name;
      }
    }

    return bestScript;
  }

  /**
   * Analyze character frequency for language detection
   */
  private analyzeCharacterFrequency(text: string): { language: string; confidence: number; script: string } {
    // Character frequency patterns for different languages
    const languagePatterns = {
      english: { e: 12.7, t: 9.1, a: 8.2, o: 7.5, i: 7.0, n: 6.7, s: 6.3, h: 6.1, r: 6.0, d: 4.3 },
      spanish: { e: 13.7, a: 12.2, o: 9.5, s: 7.2, n: 6.8, r: 6.4, i: 6.3, l: 5.6, d: 5.0, t: 4.6 },
      french: { e: 17.7, a: 8.2, s: 8.1, i: 7.3, t: 7.2, n: 6.8, r: 6.4, u: 6.2, l: 5.3, o: 5.1 },
      german: { e: 16.4, n: 9.8, s: 7.3, r: 7.0, i: 6.8, a: 6.5, t: 6.2, d: 5.1, h: 4.8, u: 4.4 },
      russian: { о: 11.7, е: 8.5, а: 8.0, и: 7.5, н: 6.3, т: 6.2, с: 5.4, р: 5.2, в: 4.5, л: 4.3 },
    };

    // Calculate character frequencies in the text
    const freq: { [key: string]: number } = {};
    let totalChars = 0;

    for (const char of text.toLowerCase()) {
      if (char.match(/[a-zа-яё]/)) {
        freq[char] = (freq[char] || 0) + 1;
        totalChars++;
      }
    }

    // Compare with language patterns
    let bestMatch = { language: 'unknown', confidence: 0, script: 'Latin' };

    for (const [language, pattern] of Object.entries(languagePatterns)) {
      let score = 0;
      let totalScore = 0;

      for (const [char, expectedFreq] of Object.entries(pattern)) {
        const actualFreq = freq[char] || 0;
        const normalizedActual = totalChars > 0 ? (actualFreq / totalChars) * 100 : 0;
        const diff = Math.abs(normalizedActual - expectedFreq);
        score += Math.max(0, 100 - diff * 2); // Penalty for difference
        totalScore += 100;
      }

      const confidence = totalScore > 0 ? score / totalScore : 0;
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          language,
          confidence,
          script: this.detectScript(text),
        };
      }
    }

    return bestMatch;
  }

  /**
   * Analyze text characteristics for font detection
   */
  private analyzeTextCharacteristics(text: string): TextCharacteristics {
    const characteristics: TextCharacteristics = {
      weight: 'normal',
      style: 'normal',
      size: 12,
      serif: false,
      monospace: false,
      proportional: true,
    };

    // Detect serif vs sans-serif (simplified - would need image analysis in real implementation)
    characteristics.serif = this.detectSerifFromText(text);
    
    // Detect monospace
    characteristics.monospace = this.detectMonospaceFromText(text);
    characteristics.proportional = !characteristics.monospace;

    return characteristics;
  }

  /**
   * Detect serif from text patterns (heuristic)
   */
  private detectSerifFromText(text: string): boolean {
    // This is a simplified heuristic - real implementation would need image analysis
    const serifIndicators = ['Times', 'Georgia', 'serif'];
    return serifIndicators.some(indicator => 
      text.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Detect monospace from text patterns
   */
  private detectMonospaceFromText(text: string): boolean {
    // Check if characters have consistent spacing
    const lines = text.split('\n');
    if (lines.length < 2) return false;

    // Sample characters from different lines
    const sampleChars = lines.slice(0, 3).map(line => line.trim()).filter(line => line.length > 0);
    if (sampleChars.length < 2) return false;

    // In a real implementation, this would analyze actual character widths
    // For now, use common monospace font indicators
    const monospaceIndicators = ['Courier', 'mono', 'Consolas', 'Monaco'];
    return monospaceIndicators.some(indicator => 
      text.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Calculate font match score
   */
  private calculateFontMatch(characteristics: TextCharacteristics, pattern: FontPattern): number {
    let score = 0;
    let totalTests = 0;

    // Test serif/sans-serif
    if (characteristics.serif === pattern.isSerif) {
      score += 0.3;
    }
    totalTests += 0.3;

    // Test weight
    if (characteristics.weight === pattern.weight) {
      score += 0.2;
    }
    totalTests += 0.2;

    // Test style
    if (characteristics.style === pattern.style) {
      score += 0.2;
    }
    totalTests += 0.2;

    // Test monospace/proportional
    if (characteristics.monospace === pattern.monospace) {
      score += 0.3;
    }
    totalTests += 0.3;

    return totalTests > 0 ? score / totalTests : 0;
  }

  /**
   * Initialize language patterns
   */
  private initializeLanguagePatterns(): void {
    // English patterns
    this.languagePatterns.set('english', [
      /\bthe\b/gi,
      /\band\b/gi,
      /\bto\b/gi,
      /\bof\b/gi,
      /\ba\b/gi,
      /\bin\b/gi,
      /\bis\b/gi,
      /\bit\b/gi,
      /\byou\b/gi,
      /\bthat\b/gi,
    ]);

    // Spanish patterns
    this.languagePatterns.set('spanish', [
      /\bel\b/gi,
      /\bla\b/gi,
      /\bde\b/gi,
      /\bque\b/gi,
      /\by\b/gi,
      /\ben\b/gi,
      /\bun\b/gi,
      /\bcon\b/gi,
      /\bsu\b/gi,
      /\bpara\b/gi,
    ]);

    // French patterns
    this.languagePatterns.set('french', [
      /\ble\b/gi,
      /\bde\b/gi,
      /\bet\b/gi,
      /\bà\b/gi,
      /\bun\b/gi,
      /\bil\b/gi,
      /\belle\b/gi,
      /\bne\b/gi,
      /\bse\b/gi,
      /\bsi\b/gi,
    ]);

    // German patterns
    this.languagePatterns.set('german', [
      /\bder\b/gi,
      /\bdie\b/gi,
      /\bund\b/gi,
      /\bin\b/gi,
      /\bden\b/gi,
      /\bvon\b/gi,
      /\bzu\b/gi,
      /\bdas\b/gi,
      /\bsich\b/gi,
      /\bmit\b/gi,
    ]);

    // Russian patterns
    this.languagePatterns.set('russian', [
      /\bи\b/gi,
      /\bв\b/gi,
      /\bне\b/gi,
      /\bна\b/gi,
      /\bя\b/gi,
      /\bс\b/gi,
      /\bто\b/gi,
      /\bк\b/gi,
      /\bа\b/gi,
      /\bпо\b/gi,
    ]);
  }

  /**
   * Initialize font patterns
   */
  private initializeFontPatterns(): void {
    // Common serif fonts
    this.fontPatterns.set('Times New Roman', {
      isSerif: true,
      weight: 'normal',
      style: 'normal',
      monospace: false,
    });

    this.fontPatterns.set('Georgia', {
      isSerif: true,
      weight: 'normal',
      style: 'normal',
      monospace: false,
    });

    // Common sans-serif fonts
    this.fontPatterns.set('Arial', {
      isSerif: false,
      weight: 'normal',
      style: 'normal',
      monospace: false,
    });

    this.fontPatterns.set('Helvetica', {
      isSerif: false,
      weight: 'normal',
      style: 'normal',
      monospace: false,
    });

    this.fontPatterns.set('Calibri', {
      isSerif: false,
      weight: 'normal',
      style: 'normal',
      monospace: false,
    });

    // Monospace fonts
    this.fontPatterns.set('Courier New', {
      isSerif: false,
      weight: 'normal',
      style: 'normal',
      monospace: true,
    });

    this.fontPatterns.set('Consolas', {
      isSerif: false,
      weight: 'normal',
      style: 'normal',
      monospace: true,
    });
  }

  /**
   * Initialize script detectors
   */
  private initializeScriptDetectors(): void {
    // Script-specific detectors would be implemented here
    // For now, we'll use basic Unicode range detection
  }
}

// Supporting interfaces
interface TextCharacteristics {
  weight: string;
  style: string;
  size: number;
  serif: boolean;
  monospace: boolean;
  proportional: boolean;
}

interface FontPattern {
  isSerif: boolean;
  weight: string;
  style: string;
  monospace: boolean;
}

interface ScriptDetector {
  detectScript: (text: string) => string;
  confidence: (text: string) => number;
}

/**
 * Singleton instance for global use
 */
export const languageFontService = new LanguageFontRecognitionService();
