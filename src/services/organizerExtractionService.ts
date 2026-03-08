/**
 * Contract Organizer — AI Extraction Service
 *
 * Extracts structured data from OCR text using a user-defined schema.
 * Routes requests through `/api/ai-proxy` so API keys remain server-side.
 */

import type { FolderSchemaField } from '@/types';
import { callAIProxy } from "@/services/aiProxyClient";

export interface OrganizerExtractedField {
  key: string;
  value: any;
  page_number?: number;
  evidence_text?: string;
}

export interface OrganizerExtractionResult {
  extracted_fields: OrganizerExtractedField[];
  confidence_score: number;
}

const SYSTEM_INSTRUCTION = `You are a high-precision information extraction engine.

You will be given:
1) OCR_TEXT (unstructured, may contain OCR errors)
2) SCHEMA (a list of fields with key, label, type, required, and sometimes allowed_values)

Your job:
- Extract the best value for each schema field from OCR_TEXT.
- If a value cannot be found, set value to "" (empty string).
- Provide short evidence_text (a verbatim snippet from OCR_TEXT) for each extracted value when possible.
- If page numbers are not available, set page_number to 1.

CRITICAL OUTPUT RULES:
- Output ONLY valid JSON (no markdown, no code fences, no commentary).
- Output must match this exact shape:
{
  "extracted_fields": [
    { "key": "field_key", "value": "", "page_number": 1, "evidence_text": "" }
  ],
  "confidence_score": 0.0
}

TYPE RULES:
- For type "date": output ISO format YYYY-MM-DD when possible, otherwise raw string.
- For type "number" or "currency": output a number when possible, otherwise raw string.
- For type "boolean": output true/false when possible, otherwise raw string.
- For type "select": choose one of allowed_values if present; otherwise raw string.
- For type "list": output an array when possible; otherwise raw string.
- For type "object": output an object when possible; otherwise raw string.`;

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```[a-zA-Z]*\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
  }
  return trimmed;
}

function extractJsonObject(text: string): string {
  const s = stripCodeFences(text);
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return s;
  return s.slice(first, last + 1);
}

export async function extractDataForSchema(
  ocrText: string,
  schema: FolderSchemaField[],
  options?: { model?: string; max_tokens?: number }
): Promise<OrganizerExtractionResult> {
  if (!ocrText || !ocrText.trim()) {
    return { extracted_fields: schema.map(f => ({ key: f.key, value: "", page_number: 1, evidence_text: "" })), confidence_score: 0.0 };
  }

  const schemaSummary = schema.map(f => ({
    key: f.key,
    label: f.label,
    type: f.type,
    required: f.required,
    allowed_values: f.allowed_values || undefined,
    help_text: f.help_text || undefined,
  }));

  const prompt = `SCHEMA:\n${JSON.stringify(schemaSummary, null, 2)}\n\nOCR_TEXT:\n${ocrText}`;

  const response = await callAIProxy({
    provider: "anthropic",
    model: options?.model || "claude-sonnet-4-5",
    system: SYSTEM_INSTRUCTION,
    max_tokens: options?.max_tokens || 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find(c => c.type === "text");
  const resultText = textBlock?.text || "";
  if (!resultText) {
    throw new Error("AI extraction returned an empty response.");
  }

  const jsonText = extractJsonObject(resultText);

  try {
    const parsed = JSON.parse(jsonText) as OrganizerExtractionResult;
    const extractedByKey = new Map((parsed.extracted_fields || []).map(f => [f.key, f]));

    // Ensure every schema key exists exactly once in output (stable for UI mapping)
    const normalizedFields: OrganizerExtractedField[] = schema.map(f => {
      const found = extractedByKey.get(f.key);
      return {
        key: f.key,
        value: found?.value ?? "",
        page_number: found?.page_number ?? 1,
        evidence_text: found?.evidence_text ?? "",
      };
    });

    const confidence =
      typeof parsed.confidence_score === "number"
        ? Math.max(0, Math.min(1, parsed.confidence_score))
        : 0.75;

    return {
      extracted_fields: normalizedFields,
      confidence_score: confidence,
    };
  } catch (err: any) {
    console.error("Organizer extraction JSON parse error:", err);
    console.error("Organizer extraction raw response (first 800 chars):", jsonText.slice(0, 800));
    throw new Error(`Failed to parse AI extraction response as JSON: ${err.message}`);
  }
}

