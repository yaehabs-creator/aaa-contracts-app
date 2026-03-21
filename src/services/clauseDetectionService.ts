import { callAIProxy } from "@/services/aiProxyClient";

export interface DetectedSubClause {
  number: string;
  title: string;
  text: string;
  children?: DetectedSubClause[];
}

export interface DetectedMainClause {
  number: string;
  title: string;
  text: string;
  children?: DetectedSubClause[];
}

export interface DetectedSection {
  sectionType: string;
  sectionTitle: string;
  startPage?: number;
  endPage?: number;
  clauses: DetectedMainClause[];
}

export interface DetectedClause {
  clause_number: string;
  clause_title: string;
  general_condition?: string;
  particular_condition?: string;
  condition_type?: string;
  confidence: number;
  children?: DetectedClause[];
}

const CLAUSE_DETECTION_SYSTEM_PROMPT = `You are an expert contract analysis assistant. I will provide you with pdf contract text, typically divided into sections. Your task is to convert each section into a structured JSON file ready for import into my web app. For each section, follow these steps:

1. Identify the section type (e.g., Letter of Acceptance, General Conditions, Particular Conditions).
2. Detect all clauses and sub-clauses by their numbering (e.g., Clause 1, Clause 1.1) and titles.
3. For each clause, extract the exact text and structure them hierarchically (e.g., main clauses with nested sub-clauses).
4. Preserve all numbering and clause titles exactly as found.

Return ONLY valid JSON format like this:
{
  "sectionType": "General Conditions",
  "sectionTitle": "General Conditions",
  "startPage": 1,
  "endPage": 20,
  "clauses": [
    {
      "number": "1",
      "title": "General Provisions",
      "text": "Full clause text here...",
      "children": [
        {
          "number": "1.1",
          "title": "Definitions",
          "text": "Full sub-clause text here...",
          "children": []
        }
      ]
    }
  ]
}

Ensure every section is clearly identified (e.g., Letter of Acceptance is separate) and that the JSON output is complete, valid, and contains ONLY the JSON object. Do not include markdown formatting or code blocks.`;

// Helper to flatten the hierarchical structure into our app's flat Clause format
function flattenDetectedSection(section: DetectedSection): DetectedClause[] {
  const flatClauses: DetectedClause[] = [];
  const conditionType = section.sectionType.toLowerCase().includes('particular') ? 'Particular' 
                      : section.sectionType.toLowerCase().includes('general') ? 'General'
                      : section.sectionType;

  function processClause(clause: DetectedMainClause | DetectedSubClause) {
    if (clause.number && clause.title) {
      flatClauses.push({
        clause_number: clause.number,
        clause_title: clause.title,
        general_condition: conditionType === 'General' ? clause.text : '',
        particular_condition: conditionType === 'Particular' ? clause.text : '',
        condition_type: conditionType,
        confidence: 0.95 // Default confidence for now as the prompt doesn't ask for it
      });
    }

    if (clause.children && Array.isArray(clause.children)) {
      clause.children.forEach(processClause);
    }
  }

  if (section.clauses && Array.isArray(section.clauses)) {
    section.clauses.forEach(processClause);
  }

  return flatClauses;
}

export async function detectClausesFromText(
  text: string,
  isDualInput: boolean = false,
  generalText?: string,
  particularText?: string
): Promise<DetectedClause[]> {
  if (!text && !generalText && !particularText) {
    return [];
  }

  let prompt = '';
  if (isDualInput && generalText && particularText) {
    prompt = `Analyze the following contract texts and extract all sections/clauses following the required JSON structure.
    
GENERAL TEXT:
${generalText}

PARTICULAR TEXT:
${particularText}`;
  } else {
    prompt = `Analyze the following contract text and extract all sections/clauses following the required JSON structure.
    
CONTRACT TEXT:
${text}`;
  }

  try {
    const response = await callAIProxy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      max_tokens: 8192, // Increased for larger outputs
      system: CLAUSE_DETECTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const textBlock = response.content.find(c => c.type === 'text');
    const resultText = textBlock?.text || '';

    if (!resultText) {
      return [];
    }

    // Extract JSON from response
    let jsonText = resultText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const parsed = JSON.parse(jsonText);
      let allFlatClauses: DetectedClause[] = [];

      // Handle both single section object or array of section objects
      if (Array.isArray(parsed)) {
        parsed.forEach(section => {
          allFlatClauses = allFlatClauses.concat(flattenDetectedSection(section));
        });
      } else if (parsed.sectionType || parsed.clauses) {
        allFlatClauses = flattenDetectedSection(parsed);
      }

      // Merge particular and general clauses if they have the same number
      const mergedMap = new Map<string, DetectedClause>();
      
      allFlatClauses.forEach(clause => {
        const existing = mergedMap.get(clause.clause_number);
        if (existing) {
          if (clause.particular_condition) existing.particular_condition = clause.particular_condition;
          if (clause.general_condition) existing.general_condition = clause.general_condition;
          if (existing.general_condition && existing.particular_condition) existing.condition_type = 'Both';
        } else {
          mergedMap.set(clause.clause_number, clause);
        }
      });

      const finalClauses = Array.from(mergedMap.values()).sort((a, b) => {
        return a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true });
      });

      return finalClauses;

    } catch (parseError: any) {
      console.error('Failed to parse clause detection response:', parseError);
      console.error('Response text:', jsonText.substring(0, 500));
      return [];
    }
  } catch (error: any) {
    console.error('Failed to detect clauses:', error);
    return [];
  }
}
export async function detectHierarchicalSectionsFromText(
  text: string
): Promise<DetectedSection[]> {
  if (!text) return [];

  const prompt = `Analyze the following contract text and extract all sections/clauses following the required JSON structure.
    
CONTRACT TEXT:
${text}`;

  try {
    const response = await callAIProxy({
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      max_tokens: 8192,
      system: CLAUSE_DETECTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    });

    const textBlock = response.content.find(c => c.type === 'text');
    let jsonText = (textBlock?.text || '').trim();

    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonText);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error('Failed to detect hierarchical sections:', error);
    return [];
  }
}
