import { Clause } from '@/types';

/**
 * Mock Service representing a PaddleOCR-based clause extraction backend.
 * In a real implementation, this would send the PDF to a Python backend running PaddleOCR,
 * run layout analysis, extract text, and use NLP/LLM to classify General vs Particular conditions.
 */
export async function extractClausesWithPaddleOCR(file: File): Promise<Clause[]> {
  console.log(`Sending ${file.name} to PaddleOCR extraction pipeline...`);
  
  // Simulate network delay for OCR and layout parsing
  await new Promise(resolve => setTimeout(resolve, 3500));

  // Return realistic mock data demonstrating side-by-side GC and PC extracted from the PDF
  return [
    {
      clause_number: "1.1",
      clause_title: "Definitions",
      condition_type: "Both",
      clause_text: "In the Conditions of Contract ('these Conditions'), which include Particular Conditions and these General Conditions, the following words and expressions shall have the meanings stated.",
      general_condition: "In the Conditions of Contract ('these Conditions'), which include Particular Conditions and these General Conditions, the following words and expressions shall have the meanings stated. Words indicating persons or parties include corporations and other legal entities.",
      particular_condition: "Add the following to Sub-Clause 1.1: 'The Employer means the Ministry of Public Works. The Engineer means XYZ Consultants. The Time for Completion shall be strictly 24 months.'",
      comparison: [],
      time_frames: []
    },
    {
      clause_number: "4.2",
      clause_title: "Performance Security",
      condition_type: "Both",
      clause_text: "The Contractor shall obtain (at his cost) a Performance Security for proper performance, in the amount and currencies stated in the Appendix to Tender.",
      general_condition: "The Contractor shall obtain (at his cost) a Performance Security for proper performance, in the amount and currencies stated in the Appendix to Tender. If an amount is not stated, this Sub-Clause shall not apply.",
      particular_condition: "Override Sub-Clause 4.2 with the following: 'The Contractor shall provide a Performance Security equivalent to exactly 10% of the Accepted Contract Amount, issued by a Tier 1 Bank approved by the Employer.'",
      comparison: [],
      time_frames: []
    },
    {
      clause_number: "8.4",
      clause_title: "Extension of Time for Completion",
      condition_type: "Both",
      clause_text: "The Contractor shall be entitled subject to Sub-Clause 20.1 to an extension of the Time for Completion if and to the extent that completion is or will be delayed.",
      general_condition: "The Contractor shall be entitled subject to Sub-Clause 20.1 to an extension of the Time for Completion if and to the extent that completion is or will be delayed by any of the following causes: a) a Variation, b) exceptionally adverse climatic conditions, c) Unforeseeable shortages.",
      particular_condition: "Delete 'exceptionally adverse climatic conditions' from the grounds of Extension of Time. Add: 'Only delays caused strictly by the Employer's failure to provide site access within 30 days shall be considered.'",
      comparison: [],
      time_frames: []
    },
    {
      clause_number: "14.2",
      clause_title: "Advance Payment",
      condition_type: "General",
      clause_text: "The Employer shall make an advance payment, as an interest-free loan for mobilisation, when the Contractor submits a guarantee in accordance with this Sub-Clause.",
      general_condition: "The Employer shall make an advance payment, as an interest-free loan for mobilisation, when the Contractor submits a guarantee in accordance with this Sub-Clause. The total advance payment shall be as stated in the Appendix to Tender.",
      particular_condition: "",
      comparison: [],
      time_frames: []
    },
    {
      clause_number: "14.2.1",
      clause_title: "Advance Payment Limitations",
      condition_type: "Particular",
      clause_text: "No advance payment will be made under any circumstances for this Project Phase.",
      general_condition: "",
      particular_condition: "No advance payment will be made under any circumstances for this Project Phase. The Contractor is required to fully self-fund initial mobilization.",
      comparison: [],
      time_frames: []
    }
  ];
}
