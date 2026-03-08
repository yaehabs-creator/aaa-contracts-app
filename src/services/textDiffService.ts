export interface SentenceDiff {
  sentence: string;
  type: 'unchanged' | 'deleted' | 'added' | 'modified';
  index: number;
  similarity?: number;
  originalIndex?: number; // For tracking which sentence it matched with
}

export interface DiffResult {
  generalSentences: SentenceDiff[];
  particularSentences: SentenceDiff[];
  summary: {
    added: number;
    deleted: number;
    modified: number;
    unchanged: number;
  };
}

/**
 * Split text into sentences while preserving HTML tags
 */
function splitIntoSentences(text: string): string[] {
  if (!text || !text.trim()) return [];
  
  // Extract plain text for sentence detection
  let plainText = text;
  if (typeof document !== 'undefined') {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      plainText = tempDiv.textContent || tempDiv.innerText || text;
    } catch {
      // Fallback if DOM manipulation fails
      plainText = text.replace(/<[^>]*>/g, '');
    }
  } else {
    plainText = text.replace(/<[^>]*>/g, '');
  }
  
  if (!plainText.trim()) return [text];
  
  // Simple sentence splitting: split on . ! ? followed by space and capital letter
  const abbreviations = ['dr', 'mr', 'mrs', 'ms', 'prof', 'inc', 'ltd', 'co', 'corp', 'etc', 'vs', 'i.e', 'e.g'];
  const sentences: string[] = [];
  
  // Find sentence boundaries in plain text
  const boundaries: number[] = [0];
  for (let i = 0; i < plainText.length - 1; i++) {
    const char = plainText[i];
    const nextChar = plainText[i + 1];
    
    if ((char === '.' || char === '!' || char === '?') && /\s/.test(nextChar)) {
      // Check if next word starts with capital (likely new sentence)
      const afterSpace = plainText.substring(i + 2, i + 3);
      if (/[A-Z]/.test(afterSpace)) {
        // Check if it's an abbreviation
        const before = plainText.substring(Math.max(0, i - 10), i).toLowerCase();
        const isAbbreviation = abbreviations.some(abbr => before.endsWith(abbr + '.'));
        const isDecimal = /[\d]\.[\d]/.test(plainText.substring(Math.max(0, i - 2), i + 2));
        
        if (!isAbbreviation && !isDecimal) {
          boundaries.push(i + 1);
        }
      }
    }
  }
  boundaries.push(plainText.length);
  
  // Now map boundaries back to HTML text
  // Simple approach: split HTML text proportionally or by finding closest match
  if (boundaries.length <= 2) {
    return [text.trim()];
  }
  
  // For each sentence boundary in plain text, find corresponding position in HTML
  let htmlPos = 0;
  let plainPos = 0;
  let currentSentence = '';
  
  for (let i = 0; i < boundaries.length - 1; i++) {
    const targetPlainEnd = boundaries[i + 1];
    currentSentence = '';
    
    // Collect HTML until we've covered the plain text range
    while (htmlPos < text.length && plainPos < targetPlainEnd) {
      const char = text[htmlPos];
      
      if (char === '<') {
        // Skip entire HTML tag
        const tagEnd = text.indexOf('>', htmlPos);
        if (tagEnd !== -1) {
          currentSentence += text.substring(htmlPos, tagEnd + 1);
          htmlPos = tagEnd + 1;
        } else {
          currentSentence += char;
          htmlPos++;
        }
      } else {
        currentSentence += char;
        htmlPos++;
        plainPos++;
      }
    }
    
    const trimmed = currentSentence.trim();
    if (trimmed.length > 0) {
      sentences.push(trimmed);
    }
  }
  
  return sentences.length > 0 ? sentences : [text.trim()];
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Simple word-based similarity
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Remove HTML tags for comparison
 */
function stripHTML(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
}

/**
 * Extract actual replacement content from deletion/substitution instructions
 * Handles patterns like "Delete paragraph (b) and substitute by the following:"
 */
function extractReplacementContent(particularText: string): { instructions: string[]; replacements: string[] } {
  const instructions: string[] = [];
  const replacements: string[] = [];
  
  // Pattern: "Delete [paragraph/clause/sub-clause] X and substitute by the following:"
  // or "Delete [paragraph/clause/sub-clause] X and replace with:"
  const deletePattern = /delete\s+(?:paragraph|clause|sub-clause|subclause)\s+([^\s]+(?:\s+[^\s]+)*)\s+(?:and\s+)?(?:substitute|replace)\s+(?:by|with)\s+the\s+following:?/gi;
  
  let lastIndex = 0;
  let match;
  
  while ((match = deletePattern.exec(particularText)) !== null) {
    const instructionEnd = match.index + match[0].length;
    instructions.push(match[0]);
    
    // Find the replacement content after the instruction
    // Look for the next paragraph/clause marker or end of text
    const afterInstruction = particularText.substring(instructionEnd);
    const nextMarker = afterInstruction.match(/(?:^|\n)\s*(?:paragraph|clause|sub-clause|subclause)\s+[^\s]+/i);
    const replacementEnd = nextMarker ? nextMarker.index! : afterInstruction.length;
    const replacement = afterInstruction.substring(0, replacementEnd).trim();
    
    if (replacement.length > 0) {
      replacements.push(replacement);
    }
  }
  
  return { instructions, replacements };
}

/**
 * Find paragraph/sub-clause markers in text (e.g., "1.6 (a)", "(b)", "1.6(a)")
 */
function findParagraphMarkers(text: string): Array<{ marker: string; index: number; content: string }> {
  const markers: Array<{ marker: string; index: number; content: string }> = [];
  
  // Pattern: clause number followed by (letter) or just (letter) at start of line/sentence
  const markerPattern = /(?:^|\n|\.)\s*(\d+[A-Za-z]*(?:\.[\dA-Za-z]+)*\s*\([a-z0-9]+\)|\([a-z0-9]+\))/gi;
  
  let match;
  while ((match = markerPattern.exec(text)) !== null) {
    const marker = match[1].trim();
    const startIndex = match.index + match[0].indexOf(marker);
    
    // Find content until next marker or end
    const afterMarker = text.substring(startIndex + marker.length);
    const nextMatch = markerPattern.exec(text.substring(startIndex + marker.length));
    const contentEnd = nextMatch ? nextMatch.index : afterMarker.length;
    const content = afterMarker.substring(0, contentEnd).trim();
    
    markers.push({ marker, index: startIndex, content });
    
    // Reset regex lastIndex to continue from after this match
    markerPattern.lastIndex = startIndex + marker.length + contentEnd;
  }
  
  return markers;
}

/**
 * Compute sentence-level diff between General and Particular text
 */
export function computeSentenceDiff(
  generalText: string,
  particularText: string
): DiffResult {
  if (!generalText && !particularText) {
    return {
      generalSentences: [],
      particularSentences: [],
      summary: { added: 0, deleted: 0, modified: 0, unchanged: 0 }
    };
  }
  
  // Check if Particular contains deletion/substitution instructions
  const { instructions, replacements } = extractReplacementContent(particularText);
  const hasInstructions = instructions.length > 0;
  
  
  // If Particular has deletion instructions, we need special handling
  // Extract paragraph markers from both texts
  const generalMarkers = findParagraphMarkers(generalText);
  const particularMarkers = findParagraphMarkers(particularText);
  
  
  // Split into sentences
  const generalSentences = splitIntoSentences(generalText || '');
  const particularSentences = splitIntoSentences(particularText || '');
  
  
  // Create diff arrays
  const generalDiff: SentenceDiff[] = [];
  const particularDiff: SentenceDiff[] = [];
  
  // Track which sentences have been matched
  const generalMatched = new Set<number>();
  const particularMatched = new Set<number>();
  
  // If we have deletion instructions, handle paragraph-level matching first
  if (hasInstructions && generalMarkers.length > 0) {
    // Match paragraphs by their markers (e.g., "(a)", "(b)")
    const generalParagraphs = new Map<string, { sentences: string[]; startIdx: number }>();
    const particularParagraphs = new Map<string, { sentences: string[]; startIdx: number }>();
    
    // Group sentences by paragraph markers in General
    generalMarkers.forEach(marker => {
      const markerKey = marker.marker.toLowerCase().replace(/\s+/g, '');
      const sentencesInParagraph = generalSentences.filter((sent, idx) => {
        const sentPlain = stripHTML(sent).toLowerCase();
        return sentPlain.includes(marker.marker.toLowerCase()) || 
               (idx >= marker.index && idx < marker.index + 10); // Approximate grouping
      });
      if (sentencesInParagraph.length > 0) {
        generalParagraphs.set(markerKey, { sentences: sentencesInParagraph, startIdx: 0 });
      }
    });
    
    // Group sentences by paragraph markers in Particular
    particularMarkers.forEach(marker => {
      const markerKey = marker.marker.toLowerCase().replace(/\s+/g, '');
      const sentencesInParagraph = particularSentences.filter((sent, idx) => {
        const sentPlain = stripHTML(sent).toLowerCase();
        return sentPlain.includes(marker.marker.toLowerCase()) || 
               (idx >= marker.index && idx < marker.index + 10);
      });
      if (sentencesInParagraph.length > 0) {
        particularParagraphs.set(markerKey, { sentences: sentencesInParagraph, startIdx: 0 });
      }
    });
    
    
    // Match paragraphs: if a paragraph exists in both, mark sentences as potentially unchanged/modified
    // If a paragraph is only in General but mentioned in deletion instruction, mark as deleted
    generalParagraphs.forEach((genPara, genKey) => {
      const partPara = particularParagraphs.get(genKey);
      
      // Check if this paragraph is mentioned in deletion instructions
      const isDeleted = instructions.some(inst => {
        const instLower = inst.toLowerCase();
        return instLower.includes(genKey) || instLower.includes(genKey.replace(/[()]/g, ''));
      });
      
      if (isDeleted && !partPara) {
        // This paragraph is deleted - mark all its sentences as deleted
        genPara.sentences.forEach(genSent => {
          const genIdx = generalSentences.indexOf(genSent);
          if (genIdx !== -1 && !generalMatched.has(genIdx)) {
            generalDiff.push({
              sentence: genSent,
              type: 'deleted',
              index: genIdx
            });
            generalMatched.add(genIdx);
          }
        });
      } else if (partPara) {
        // Paragraph exists in both - do sentence-level matching within this paragraph
        genPara.sentences.forEach(genSent => {
          const genIdx = generalSentences.indexOf(genSent);
          if (genIdx === -1 || generalMatched.has(genIdx)) return;
          
          const genPlain = stripHTML(genSent);
          const matchIdx = partPara.sentences.findIndex(partSent => {
            const partIdx = particularSentences.indexOf(partSent);
            if (partIdx === -1 || particularMatched.has(partIdx)) return false;
            const partPlain = stripHTML(partSent);
            return genPlain.toLowerCase().trim() === partPlain.toLowerCase().trim();
          });
          
          if (matchIdx !== -1) {
            const partSent = partPara.sentences[matchIdx];
            const partIdx = particularSentences.indexOf(partSent);
            generalDiff.push({
              sentence: genSent,
              type: 'unchanged',
              index: genIdx,
              originalIndex: partIdx
            });
            particularDiff.push({
              sentence: partSent,
              type: 'unchanged',
              index: partIdx,
              originalIndex: genIdx
            });
            generalMatched.add(genIdx);
            particularMatched.add(partIdx);
          }
        });
      }
    });
  }
  
  // First pass: Find exact matches
  generalSentences.forEach((genSent, genIdx) => {
    const genPlain = stripHTML(genSent);
    const matchIdx = particularSentences.findIndex((partSent, partIdx) => {
      if (particularMatched.has(partIdx)) return false;
      const partPlain = stripHTML(partSent);
      const isMatch = genPlain.toLowerCase().trim() === partPlain.toLowerCase().trim();
      return isMatch;
    });
    
    if (matchIdx !== -1) {
      // Exact match
      generalDiff.push({
        sentence: genSent,
        type: 'unchanged',
        index: genIdx,
        originalIndex: matchIdx
      });
      particularDiff.push({
        sentence: particularSentences[matchIdx],
        type: 'unchanged',
        index: matchIdx,
        originalIndex: genIdx
      });
      generalMatched.add(genIdx);
      particularMatched.add(matchIdx);
    } else {
      // No exact match found
    }
  });
  
  // Second pass: Find similar matches (modified sentences)
  generalSentences.forEach((genSent, genIdx) => {
    if (generalMatched.has(genIdx)) return;
    
    const genPlain = stripHTML(genSent);
    let bestMatch: { idx: number; similarity: number } | null = null;
    
    particularSentences.forEach((partSent, partIdx) => {
      if (particularMatched.has(partIdx)) return;
      
      const partPlain = stripHTML(partSent);
      const similarity = calculateSimilarity(genPlain, partPlain);
      
      if (similarity > 0.6 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { idx: partIdx, similarity };
      }
    });
    
    if (bestMatch && bestMatch.similarity >= 0.6) {
      // Modified sentence
      generalDiff.push({
        sentence: genSent,
        type: 'modified',
        index: genIdx,
        similarity: bestMatch.similarity,
        originalIndex: bestMatch.idx
      });
      particularDiff.push({
        sentence: particularSentences[bestMatch.idx],
        type: 'modified',
        index: bestMatch.idx,
        similarity: bestMatch.similarity,
        originalIndex: genIdx
      });
      generalMatched.add(genIdx);
      particularMatched.add(bestMatch.idx);
    }
  });
  
  // Third pass: Mark remaining as deleted or added
  generalSentences.forEach((genSent, genIdx) => {
    if (!generalMatched.has(genIdx)) {
      const genPlain = stripHTML(genSent);
      generalDiff.push({
        sentence: genSent,
        type: 'deleted',
        index: genIdx
      });
    }
  });
  
  particularSentences.forEach((partSent, partIdx) => {
    if (!particularMatched.has(partIdx)) {
      const partPlain = stripHTML(partSent);
      particularDiff.push({
        sentence: partSent,
        type: 'added',
        index: partIdx
      });
    }
  });
  
  // Sort by original index to maintain order
  generalDiff.sort((a, b) => a.index - b.index);
  particularDiff.sort((a, b) => a.index - b.index);
  
  // Calculate summary
  const summary = {
    added: particularDiff.filter(s => s.type === 'added').length,
    deleted: generalDiff.filter(s => s.type === 'deleted').length,
    modified: generalDiff.filter(s => s.type === 'modified').length,
    unchanged: generalDiff.filter(s => s.type === 'unchanged').length
  };
  
  return {
    generalSentences: generalDiff,
    particularSentences: particularDiff,
    summary
  };
}

/**
 * Apply highlighting to sentences based on diff result
 */
export function applyDiffHighlighting(
  sentences: SentenceDiff[],
  showDiff: boolean
): string {
  if (!showDiff || !sentences || sentences.length === 0) {
    // Return sentences without highlighting
    return sentences.map(s => s.sentence).join(' ');
  }
  
  return sentences.map(s => {
    const sentence = s.sentence;
    
    switch (s.type) {
      case 'deleted':
        return `<mark class="diff-deleted" style="background-color: #FEE2E2; color: #991B1B; text-decoration: line-through; padding: 2px 4px; border-radius: 3px; display: inline-block;">${sentence}</mark>`;
      case 'added':
        return `<mark class="diff-added" style="background-color: #D1FAE5; color: #065F46; padding: 2px 4px; border-radius: 3px; display: inline-block;">${sentence}</mark>`;
      case 'modified':
        return `<mark class="diff-modified" style="background-color: #FEF3C7; color: #92400E; padding: 2px 4px; border-radius: 3px; display: inline-block;">${sentence}</mark>`;
      default:
        return sentence;
    }
  }).join(' ');
}
