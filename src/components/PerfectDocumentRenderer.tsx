/**
 * Perfect Document Display Renderer
 * Renders OCR results with perfect formatting, layout preservation, and interactive features
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { JSX } from 'react';
import { OCRResult, OCRBlock, OCRLine, OCRWord, PageLayout, DocumentLayout } from '@/services/advancedOCRService';

export interface DocumentRendererProps {
  ocrResult: OCRResult;
  onTextSelect?: (selectedText: string, bbox: any) => void;
  onWordClick?: (word: OCRWord, event: React.MouseEvent) => void;
  onBlockClick?: (block: OCRBlock, event: React.MouseEvent) => void;
  showConfidence?: boolean;
  showBoundingBoxes?: boolean;
  highlightMode?: 'none' | 'low-confidence' | 'search' | 'custom';
  searchTerm?: string;
  customHighlightPredicate?: (word: OCRWord) => boolean;
  fontSize?: number;
  lineHeight?: number;
  fontFamily?: string;
  maxWidth?: number;
  className?: string;
}

export interface RenderedPage {
  pageNumber: number;
  width: number;
  height: number;
  scale: number;
  content: JSX.Element;
  blocks: RenderedBlock[];
}

export interface RenderedBlock {
  block: OCRBlock;
  element: JSX.Element;
  bbox: any;
  confidence: number;
}

export interface TextSelection {
  text: string;
  bbox: any;
  words: OCRWord[];
  startWord: OCRWord;
  endWord: OCRWord;
}

/**
 * Perfect Document Renderer Component
 */
export const PerfectDocumentRenderer: React.FC<DocumentRendererProps> = ({
  ocrResult,
  onTextSelect,
  onWordClick,
  onBlockClick,
  showConfidence = false,
  showBoundingBoxes = false,
  highlightMode = 'none',
  searchTerm = '',
  customHighlightPredicate,
  fontSize = 14,
  lineHeight = 1.5,
  fontFamily = 'Inter, system-ui, sans-serif',
  maxWidth = 800,
  className = '',
}) => {
  const [selectedText, setSelectedText] = useState<TextSelection | null>(null);
  const [hoveredWord, setHoveredWord] = useState<OCRWord | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<OCRBlock | null>(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);

  // Calculate optimal scale for container
  useEffect(() => {
    if (containerRef.current && ocrResult.layout.pages.length > 0) {
      const containerWidth = containerRef.current.clientWidth;
      const firstPage = ocrResult.layout.pages[0];
      const optimalScale = Math.min(1, (containerWidth - 40) / firstPage.width);
      setScale(optimalScale);
    }
  }, [ocrResult, maxWidth]);

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectedText(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedTextContent = selection.toString();
    
    if (selectedTextContent.trim()) {
      // Find bounding box of selection
      const rects = range.getClientRects();
      const bbox = {
        x: Math.min(...Array.from(rects).map(r => r.left)),
        y: Math.min(...Array.from(rects).map(r => r.top)),
        width: Math.max(...Array.from(rects).map(r => r.right)) - Math.min(...Array.from(rects).map(r => r.left)),
        height: Math.max(...Array.from(rects).map(r => r.bottom)) - Math.min(...Array.from(rects).map(r => r.top)),
      };

      // Find selected words (simplified - would need more sophisticated logic)
      const selectedWords: OCRWord[] = [];
      // TODO: Implement word selection logic

      const textSelection: TextSelection = {
        text: selectedTextContent,
        bbox,
        words: selectedWords,
        startWord: selectedWords[0],
        endWord: selectedWords[selectedWords.length - 1],
      };

      setSelectedText(textSelection);
      onTextSelect?.(selectedTextContent, bbox);
    }
  };

  // Check if word should be highlighted
  const shouldHighlightWord = (word: OCRWord): boolean => {
    switch (highlightMode) {
      case 'low-confidence':
        return word.confidence < 0.8;
      case 'search':
        return searchTerm && word.text.toLowerCase().includes(searchTerm.toLowerCase());
      case 'custom':
        return customHighlightPredicate?.(word) || false;
      default:
        return false;
    }
  };

  // Get highlight color for word
  const getHighlightColor = (word: OCRWord): string => {
    if (word.confidence < 0.6) return '#fee2e2'; // Red for very low confidence
    if (word.confidence < 0.8) return '#fef3c7'; // Yellow for low confidence
    if (highlightMode === 'search' && searchTerm && word.text.toLowerCase().includes(searchTerm.toLowerCase())) {
      return '#dbeafe'; // Blue for search matches
    }
    if (highlightMode === 'custom' && customHighlightPredicate?.(word)) {
      return '#e9d5ff'; // Purple for custom highlights
    }
    return 'transparent';
  };

  // Render single word with perfect positioning
  const renderWord = (word: OCRWord, wordIndex: number, lineIndex: number, blockIndex: number): JSX.Element => {
    const isHighlighted = shouldHighlightWord(word);
    const isHovered = hoveredWord === word;
    const isSelected = selectedText?.words.includes(word);

    return (
      <span
        key={`word-${blockIndex}-${lineIndex}-${wordIndex}`}
        className={`ocr-word ${isHighlighted ? 'highlighted' : ''} ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
        style={{
          position: 'absolute',
          left: `${word.bbox.x}px`,
          top: `${word.bbox.y}px`,
          fontSize: `${fontSize * scale}px`,
          fontFamily,
          lineHeight: `${lineHeight}`,
          color: word.confidence > 0.8 ? '#1a1a1a' : word.confidence > 0.6 ? '#666' : '#999',
          backgroundColor: getHighlightColor(word),
          padding: '2px 1px',
          borderRadius: '2px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          border: isSelected ? '2px solid #3b82f6' : isHovered ? '1px solid #6b7280' : 'none',
          zIndex: isHovered ? 10 : 1,
        }}
        onMouseEnter={(e) => {
          setHoveredWord(word);
          e.stopPropagation();
        }}
        onMouseLeave={(e) => {
          setHoveredWord(null);
          e.stopPropagation();
        }}
        onClick={(e) => {
          onWordClick?.(word, e);
          e.stopPropagation();
        }}
        title={`Confidence: ${(word.confidence * 100).toFixed(1)}%${word.fontName ? ` | Font: ${word.fontName}` : ''}`}
      >
        {word.text}
        {showConfidence && word.confidence < 0.9 && (
          <span
            style={{
              fontSize: '10px',
              color: '#ef4444',
              marginLeft: '2px',
            }}
          >
            *
          </span>
        )}
      </span>
    );
  };

  // Render single line
  const renderLine = (line: OCRLine, lineIndex: number, blockIndex: number): JSX.Element => {
    return (
      <div
        key={`line-${blockIndex}-${lineIndex}`}
        className="ocr-line"
        style={{
          position: 'absolute',
          left: `${line.bbox.x}px`,
          top: `${line.bbox.y}px`,
          width: `${line.bbox.width}px`,
          height: `${line.bbox.height}px`,
        }}
      >
        {line.words.map((word, wordIndex) => renderWord(word, wordIndex, lineIndex, blockIndex))}
      </div>
    );
  };

  // Render single block
  const renderBlock = (block: OCRBlock, blockIndex: number, pageIndex: number): JSX.Element => {
    const isHovered = hoveredBlock === block;
    const blockTypeColor = {
      text: '#1a1a1a',
      title: '#111827',
      subtitle: '#374151',
      paragraph: '#1a1a1a',
      list: '#1a1a1a',
      table: '#1a1a1a',
      header: '#6b7280',
      footer: '#6b7280',
      signature: '#059669',
      stamp: '#dc2626',
    }[block.type] || '#1a1a1a';

    return (
      <div
        key={`block-${pageIndex}-${blockIndex}`}
        className={`ocr-block ocr-block-${block.type} ${isHovered ? 'hovered' : ''}`}
        style={{
          position: 'absolute',
          left: `${block.bbox.x}px`,
          top: `${block.bbox.y}px`,
          width: `${block.bbox.width}px`,
          height: `${block.bbox.height}px`,
          backgroundColor: showBoundingBoxes ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          border: showBoundingBoxes ? '1px dashed #3b82f6' : 'none',
          borderRadius: '4px',
          padding: '4px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          setHoveredBlock(block);
          e.stopPropagation();
        }}
        onMouseLeave={(e) => {
          setHoveredBlock(null);
          e.stopPropagation();
        }}
        onClick={(e) => {
          onBlockClick?.(block, e);
          e.stopPropagation();
        }}
        title={`Block Type: ${block.type} | Confidence: ${(block.confidence * 100).toFixed(1)}%`}
      >
        {block.lines.map((line, lineIndex) => renderLine(line, lineIndex, blockIndex))}
      </div>
    );
  };

  // Render single page
  const renderPage = (page: PageLayout, pageIndex: number): JSX.Element => {
    return (
      <div
        key={`page-${pageIndex}`}
        className="ocr-page"
        style={{
          position: 'relative',
          width: `${page.width * scale}px`,
          height: `${page.height * scale}px`,
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          margin: '20px auto',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Render blocks */}
        {page.blocks.map((block, blockIndex) => renderBlock(block, blockIndex, pageIndex))}
        
        {/* Render headers */}
        {page.headers.map((header, headerIndex) => renderBlock(header, `header-${headerIndex}` as any, pageIndex))}
        
        {/* Render footers */}
        {page.footers.map((footer, footerIndex) => renderBlock(footer, `footer-${footerIndex}` as any, pageIndex))}

        {/* Page number overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            fontSize: '12px',
            color: '#6b7280',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          Page {page.pageNumber}
        </div>
      </div>
    );
  };

  // Render quality indicator
  const renderQualityIndicator = (): JSX.Element => {
    const qualityScore = ocrResult.metadata.qualityScore;
    const qualityColor = qualityScore > 0.9 ? '#10b981' : qualityScore > 0.8 ? '#f59e0b' : '#ef4444';
    const qualityText = qualityScore > 0.9 ? 'Excellent' : qualityScore > 0.8 ? 'Good' : 'Poor';

    return (
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: qualityColor,
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
      >
        OCR Quality: {qualityText} ({(qualityScore * 100).toFixed(1)}%)
      </div>
    );
  };

  // Render statistics panel
  const renderStatisticsPanel = (): JSX.Element => {
    return (
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '12px',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          minWidth: '200px',
        }}
      >
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>Document Statistics</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>Pages: {ocrResult.metadata.totalPages}</div>
          <div>Words: {ocrResult.metadata.totalWords}</div>
          <div>Avg Confidence: {(ocrResult.metadata.averageConfidence * 100).toFixed(1)}%</div>
          <div>Processing Time: {(ocrResult.metadata.processingTime / 1000).toFixed(2)}s</div>
          <div>Engine: {ocrResult.metadata.engine}</div>
          <div>Languages: {ocrResult.metadata.detectedLanguages.join(', ')}</div>
        </div>
      </div>
    );
  };

  // Render controls panel
  const renderControlsPanel = (): JSX.Element => {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          onClick={() => setScale(Math.min(2, scale + 0.1))}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          Zoom In
        </button>
        <button
          onClick={() => setScale(Math.max(0.5, scale - 0.1))}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          Zoom Out
        </button>
        <button
          onClick={() => setScale(1)}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
        <div
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: '#f9fafb',
          }}
        >
          {(scale * 100).toFixed(0)}%
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`perfect-document-renderer ${className}`}
      style={{
        backgroundColor: '#f9fafb',
        minHeight: '100vh',
        padding: '20px',
        fontFamily,
        fontSize: `${fontSize}px`,
        lineHeight: lineHeight,
        color: '#1a1a1a',
      }}
      onMouseUp={handleTextSelection}
      onSelect={handleTextSelection}
    >
      {/* Quality Indicator */}
      {renderQualityIndicator()}

      {/* Statistics Panel */}
      {renderStatisticsPanel()}

      {/* Controls Panel */}
      {renderControlsPanel()}

      {/* Document Pages */}
      <div className="document-pages">
        {ocrResult.layout.pages.map((page, pageIndex) => renderPage(page, pageIndex))}
      </div>

      {/* Selection Info */}
      {selectedText && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1f2937',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            zIndex: 1000,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          Selected: "{selectedText.text}" ({selectedText.words.length} words)
        </div>
      )}

      {/* Hover Info */}
      {hoveredWord && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            backgroundColor: '#1f2937',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            zIndex: 1000,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div>Word: "{hoveredWord.text}"</div>
          <div>Confidence: {(hoveredWord.confidence * 100).toFixed(1)}%</div>
          {hoveredWord.fontName && <div>Font: {hoveredWord.fontName}</div>}
          {hoveredWord.fontSize && <div>Size: {hoveredWord.fontSize}px</div>}
        </div>
      )}
    </div>
  );
};

/**
 * Hook for document rendering utilities
 */
export const useDocumentRenderer = (ocrResult: OCRResult) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightMode, setHighlightMode] = useState<'none' | 'low-confidence' | 'search'>('none');
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false);
  const [showConfidence, setShowConfidence] = useState(false);

  // Search functionality
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    
    const results: OCRWord[] = [];
    ocrResult.layout.pages.forEach(page => {
      page.blocks.forEach(block => {
        block.lines.forEach(line => {
          line.words.forEach(word => {
            if (word.text.toLowerCase().includes(searchTerm.toLowerCase())) {
              results.push(word);
            }
          });
        });
      });
    });
    
    return results;
  }, [ocrResult, searchTerm]);

  // Low confidence words
  const lowConfidenceWords = useMemo(() => {
    const results: OCRWord[] = [];
    ocrResult.layout.pages.forEach(page => {
      page.blocks.forEach(block => {
        block.lines.forEach(line => {
          line.words.forEach(word => {
            if (word.confidence < 0.8) {
              results.push(word);
            }
          });
        });
      });
    });
    return results;
  }, [ocrResult]);

  // Export functionality
  const exportText = () => {
    return ocrResult.text;
  };

  const exportJSON = () => {
    return JSON.stringify(ocrResult, null, 2);
  };

  const exportStructuredText = () => {
    let structuredText = '';
    ocrResult.layout.pages.forEach((page, pageIndex) => {
      structuredText += `\n=== PAGE ${page.pageNumber} ===\n\n`;
      page.blocks.forEach(block => {
        structuredText += `[${block.type.toUpperCase()}] ${block.text}\n\n`;
      });
    });
    return structuredText;
  };

  return {
    searchTerm,
    setSearchTerm,
    highlightMode,
    setHighlightMode,
    showBoundingBoxes,
    setShowBoundingBoxes,
    showConfidence,
    setShowConfidence,
    searchResults,
    lowConfidenceWords,
    exportText,
    exportJSON,
    exportStructuredText,
  };
};

export default PerfectDocumentRenderer;
