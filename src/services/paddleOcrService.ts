import { Clause, ContractSection, SectionItem, ItemType, SectionType } from '@/types';
import { detectClausesFromText, detectHierarchicalSectionsFromText, DetectedSection, DetectedMainClause, DetectedSubClause } from './clauseDetectionService';
import { APP_CONFIG } from '@/config/appConfig';

/**
 * Maps AI hierarchical clauses to our app's SectionItem structure
 */
function mapDetectedClauseToSectionItem(clause: DetectedMainClause | DetectedSubClause, idx: number, conditionType: string): SectionItem {
  return {
    itemType: ItemType.CLAUSE,
    clause_number: clause.number,
    clause_title: clause.title,
    clause_text: clause.text,
    general_condition: conditionType === 'General' ? clause.text : '',
    particular_condition: conditionType === 'Particular' ? clause.text : '',
    condition_type: (conditionType as any) || 'General',
    orderIndex: idx,
    children: (clause.children || []).map((child, cIdx) => 
      mapDetectedClauseToSectionItem(child, cIdx, conditionType)
    )
  };
}

export async function extractHierarchicalContract(file: File): Promise<ContractSection[]> {
  console.log(`[Hierarchical] Sending ${file.name} to PaddleOCR extraction pipeline...`);
  
  try {
    const formData = new FormData();
    formData.append('file', file);

    const ocrResponse = await fetch(`${APP_CONFIG.BACKEND_URL}/paddle-ocr`, {
      method: 'POST',
      body: formData,
    });

    if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        throw new Error(`PaddleOCR backend error: ${errorText}`);
    }

    const ocrResult = await ocrResponse.json();
    const rawText = ocrResult.text;

    if (!rawText) return [];

    console.log("PaddleOCR text extracted, calling AI for hierarchical structure...");
    const sections = await detectHierarchicalSectionsFromText(rawText);

    return sections.map(section => {
      const type = section.sectionType.toLowerCase().includes('particular') ? SectionType.PARTICULAR 
                 : section.sectionType.toLowerCase().includes('general') ? SectionType.GENERAL
                 : section.sectionType as SectionType;

      return {
        sectionType: type,
        title: section.sectionTitle,
        items: section.clauses.map((c, i) => mapDetectedClauseToSectionItem(c, i, type === SectionType.PARTICULAR ? 'Particular' : 'General'))
      };
    });
  } catch (error) {
    console.error("Hierarchical extraction failed:", error);
    throw error;
  }
}

export async function extractClausesWithPaddleOCR(file: File): Promise<Clause[]> {
  console.log(`Sending ${file.name} to PaddleOCR extraction pipeline...`);
  
  try {
    const formData = new FormData();
    formData.append('file', file);

    // Call our Python PaddleOCR backend
    const ocrResponse = await fetch(`${APP_CONFIG.BACKEND_URL}/paddle-ocr`, {
      method: 'POST',
      body: formData,
    });

    if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        throw new Error(`PaddleOCR backend error: ${errorText}`);
    }

    const ocrResult = await ocrResponse.json();
    const rawText = ocrResult.text;

    if (!rawText) {
      console.warn("PaddleOCR returned empty text.");
      return [];
    }

    console.log("PaddleOCR text extracted, passing to AI for hierarchical structure parsing...");

    // Pass the raw text to our updated AI service which handles the hierarchical JSON mapping
    // It automatically flattens it for the standard UI
    const extractedClauses = await detectClausesFromText(rawText);

    // Map AI DetectedClause back into the app's standard Clause format
    const appClauses: Clause[] = extractedClauses.map(c => ({
      clause_number: c.clause_number,
      clause_title: c.clause_title,
      condition_type: (c.condition_type as any) || 'General',
      clause_text: c.general_condition || c.particular_condition || '',
      general_condition: c.general_condition,
      particular_condition: c.particular_condition,
      comparison: [],
      time_frames: []
    }));

    return appClauses;
  } catch (error) {
    console.error("Failed to extract clauses with PaddleOCR:", error);
    throw error;
  }
}
