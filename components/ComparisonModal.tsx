
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clause, TimeFrame, TimeFrameType, ObligationParty, FinancialAsset } from '../types';
import Anthropic from "@anthropic-ai/sdk";

interface AIAnalysisResult {
  clause_id: string;
  has_time_frames: boolean;
  time_frames: Array<{
    raw_text: string;
    numeric_value: number;
    unit: string;
    category: string;
    trigger_event: string;
    deadline_description: string;
  }>;
  particular_vs_general: {
    has_particular: boolean;
    effect_type: string;
    primary_risk_owner: string;
    short_explanation: string;
  };
  dashboard_summary: {
    headline: string;
    key_points: string[];
  };
}

interface ComparisonModalProps {
  baseClause: Clause;
  allClauses: Clause[];
  onClose: () => void;
  onUpdateClause: (updatedClause: Clause) => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ baseClause, allClauses, onClose, onUpdateClause }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingFinancials, setIsGeneratingFinancials] = useState(false);
  const [financialError, setFinancialError] = useState<string | null>(null);

  // Map AI categories to our defined TimeFrameType
  const mapCategoryToType = (category: string): TimeFrameType => {
    const cat = category.toUpperCase();
    if (cat.includes('NOTICE')) return 'NOTICE_PERIOD';
    if (cat.includes('PAYMENT')) return 'PAYMENT_PERIOD';
    if (cat.includes('PERFORMANCE')) return 'TIME_FOR_COMPLETION';
    if (cat.includes('DEFECT')) return 'DEFECTS_LIABILITY_PERIOD';
    if (cat.includes('EXTENSION')) return 'EXTENSION_OF_TIME';
    if (cat.includes('RESPONSE')) return 'RESPONSE_TIME';
    return 'GENERAL_DURATION';
  };

  const mapRiskToParty = (risk: string): ObligationParty => {
    if (risk.includes('Contractor')) return 'Contractor';
    if (risk.includes('Employer')) return 'Employer';
    if (risk.includes('Engineer') || risk.includes('Manager')) return 'Engineer/Project Manager';
    return 'Other/Unclear';
  };

  const analyzeClauseWithAI = async () => {
    setIsAnalyzing(true);
    setError(null);

    // API key for timeframe/temporal extraction
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      setError('Anthropic API key not configured. Please set ANTHROPIC_API_KEY in your environment variables.');
      setIsAnalyzing(false);
      return;
    }
    
    const client = new Anthropic({ 
      apiKey,
      dangerouslyAllowBrowser: true 
    });
    const model = 'claude-sonnet-4-5-20250929';

    const systemInstruction = `You are the Contract Intelligence Engine for the AAA Contract Department.
Your ONLY job is to analyze construction contract clauses and return a STRICT JSON object.

Rules:
- Use ONLY the text provided.
- Return ONLY valid JSON. No extra text.
- Return JSON with this exact structure:
{
  "clause_id": "string",
  "has_time_frames": boolean,
  "time_frames": [{
    "raw_text": "string",
    "numeric_value": number,
    "unit": "string",
    "category": "string",
    "trigger_event": "string",
    "deadline_description": "string"
  }],
  "particular_vs_general": {
    "has_particular": boolean,
    "effect_type": "string",
    "primary_risk_owner": "string",
    "short_explanation": "string"
  },
  "dashboard_summary": {
    "headline": "string",
    "key_points": ["string"]
  }
}`;

    const promptInput = {
      clause_id: `C.${baseClause.clause_number}`,
      clause_title: baseClause.clause_title,
      general_clause_text: baseClause.general_condition || baseClause.clause_text || "",
      particular_clause_text: baseClause.particular_condition || ""
    };

    try {
      const message = await client.messages.create({
        model: model,
        max_tokens: 4096,
        temperature: 0.1,
        system: systemInstruction,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(promptInput)
          }
        ]
      });

      const content = message.content.find(c => c.type === 'text');
      const resultText = content && 'text' in content ? content.text : '';
      
      // Extract JSON from response (might be wrapped in markdown)
      let jsonText = resultText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      const result: AIAnalysisResult = JSON.parse(jsonText);
      setAnalysisResult(result);

      // Automatically add new analyzed timeframes to the clause's permanent state
      if (result.has_time_frames && result.time_frames.length > 0) {
        const newFrames: TimeFrame[] = result.time_frames.map(tf => ({
          original_phrase: tf.raw_text,
          type: mapCategoryToType(tf.category),
          applies_to: mapRiskToParty(result.particular_vs_general.primary_risk_owner),
          short_explanation: `${tf.trigger_event} - ${tf.deadline_description}`
        }));

        const currentFrames = baseClause.time_frames || [];
        // Filter out duplicates based on phrase
        const uniqueNewFrames = newFrames.filter(nf => !currentFrames.some(cf => cf.original_phrase === nf.original_phrase));
        
        if (uniqueNewFrames.length > 0) {
          onUpdateClause({
            ...baseClause,
            time_frames: [...currentFrames, ...uniqueNewFrames],
            has_time_frame: true
          });
        }
      }
    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      // Provide more specific error messages
      if (err.message?.includes('401') || err.message?.includes('authentication')) {
        setError("API authentication failed. Please check API key.");
      } else if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        setError("Rate limit exceeded. Please try again in a moment.");
      } else if (err.message?.includes('JSON') || err.name === 'SyntaxError') {
        setError("Invalid response format. Please try again.");
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        setError("Network error. Please check your connection.");
      } else {
        setError(`AI analysis failed: ${err.message || 'Unknown error'}. Please try again.`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteTimeFrame = (index: number) => {
    if (!baseClause.time_frames) return;
    const updatedFrames = baseClause.time_frames.filter((_, i) => i !== index);
    onUpdateClause({
      ...baseClause,
      time_frames: updatedFrames,
      has_time_frame: updatedFrames.length > 0
    });
  };

  const generateFinancialAssets = async () => {
    setIsGeneratingFinancials(true);
    setFinancialError(null);

    // API key for financial/cost extraction
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      setFinancialError('Anthropic API key not configured. Please set ANTHROPIC_API_KEY in your environment variables.');
      setIsGeneratingFinancials(false);
      return;
    }
    
    const client = new Anthropic({ 
      apiKey,
      dangerouslyAllowBrowser: true 
    });
    const model = 'claude-sonnet-4-5-20250929';

    const systemInstruction = `You analyze one contract clause at a time and extract ONLY financial information.
Do NOT extract: timeframes, durations, notices, deadlines, or temporal data.

Your job is to identify all financial assets in the clause, including:

- who pays (cost responsibility)
- who receives payment
- deductions from payment
- penalties or damages
- extra payment entitlements
- reimbursements
- percentage-based or capped amounts
- cost limits or financial conditions

You must NOT infer or invent anything not explicitly stated in the clause.

For each financial asset, return the following fields:

- source: "GC" or "PC"
- raw_text: the exact financial wording from the clause (no rewriting)
- type: one of "cost_responsibility", "deduction", "penalty_or_damages", "payment_entitlement", "reimbursement", "limit_or_cap", "other"
- payer: who pays (Contractor, Employer, Engineer, Subcontractor, etc.)
- payee: who receives money, if stated
- amount: numeric value if clearly stated, otherwise null
- currency_or_basis: "percent", "lump_sum", "contract_price", or "N/A"
- condition: short plain-language explanation of when this cost/payment applies

Output Rules:
- ALWAYS output valid JSON.
- If no financial data exists, return "financial_assets": [].
- Do NOT return any text outside the JSON.

Output Format:
{
  "clause_id": "",
  "clause_title": "",
  "financial_assets": []
}`;

    const generalText = baseClause.general_condition || (baseClause.condition_type === 'General' ? baseClause.clause_text : '') || '';
    const particularText = baseClause.particular_condition || (baseClause.condition_type === 'Particular' ? baseClause.clause_text : '') || '';

    const promptInput = {
      clause_id: baseClause.clause_number,
      clause_title: baseClause.clause_title,
      general_clause_text: generalText,
      particular_clause_text: particularText
    };

    try {
      const message = await client.messages.create({
        model: model,
        max_tokens: 4096,
        temperature: 0.1,
        system: systemInstruction,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(promptInput)
          }
        ]
      });

      const content = message.content.find(c => c.type === 'text');
      const resultText = content && 'text' in content ? content.text : '';
      
      // Extract JSON from response (might be wrapped in markdown)
      let jsonText = resultText.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      const result = JSON.parse(jsonText);
      
      // Process financial assets and determine source
      const financialAssets: FinancialAsset[] = (result.financial_assets || []).map((fa: any) => {
        // Determine source based on which text contains the raw_text
        let source: "GC" | "PC" = "GC";
        if (particularText && particularText.includes(fa.raw_text)) {
          source = "PC";
        } else if (generalText && generalText.includes(fa.raw_text)) {
          source = "GC";
        } else if (particularText && !generalText) {
          source = "PC";
        }

        return {
          source,
          raw_text: fa.raw_text || '',
          type: fa.type || 'other',
          payer: fa.payer || '',
          payee: fa.payee || null,
          amount: fa.amount || null,
          currency_or_basis: fa.currency_or_basis || 'N/A',
          condition: fa.condition || ''
        };
      });

      // Update clause with extracted financial assets
      const currentAssets = baseClause.financial_assets || [];
      // Filter out duplicates based on raw_text
      const uniqueNewAssets = financialAssets.filter(na => 
        !currentAssets.some(ca => ca.raw_text === na.raw_text)
      );
      
      if (uniqueNewAssets.length > 0 || financialAssets.length === 0) {
        onUpdateClause({
          ...baseClause,
          financial_assets: financialAssets.length > 0 ? [...currentAssets, ...uniqueNewAssets] : []
        });
      }
    } catch (err: any) {
      console.error("Financial Extraction Error:", err);
      // Provide more specific error messages
      if (err.message?.includes('401') || err.message?.includes('authentication')) {
        setFinancialError("API authentication failed. Please check API key.");
      } else if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        setFinancialError("Rate limit exceeded. Please try again in a moment.");
      } else if (err.message?.includes('JSON') || err.name === 'SyntaxError') {
        setFinancialError("Invalid response format. Please try again.");
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        setFinancialError("Network error. Please check your connection.");
      } else {
        setFinancialError(`Financial extraction failed: ${err.message || 'Unknown error'}. Please try again.`);
      }
    } finally {
      setIsGeneratingFinancials(false);
    }
  };

  const deleteFinancialAsset = (index: number) => {
    if (!baseClause.financial_assets) return;
    const updatedAssets = baseClause.financial_assets.filter((_, i) => i !== index);
    onUpdateClause({
      ...baseClause,
      financial_assets: updatedAssets
    });
  };

  const getTimeTypeColor = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('PAYMENT')) return 'text-purple-600 bg-purple-50 border-purple-100';
    if (t.includes('NOTICE')) return 'text-orange-600 bg-orange-50 border-orange-100';
    if (t.includes('COMPLETION')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    return 'text-aaa-blue bg-aaa-bg border-aaa-blue/10';
  };

  const getFinancialTypeColor = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('COST_RESPONSIBILITY')) return 'text-red-600 bg-red-50 border-red-100';
    if (t.includes('DEDUCTION')) return 'text-orange-600 bg-orange-50 border-orange-100';
    if (t.includes('PENALTY') || t.includes('DAMAGES')) return 'text-red-700 bg-red-100 border-red-200';
    if (t.includes('PAYMENT_ENTITLEMENT')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (t.includes('REIMBURSEMENT')) return 'text-blue-600 bg-blue-50 border-blue-100';
    if (t.includes('LIMIT') || t.includes('CAP')) return 'text-purple-600 bg-purple-50 border-purple-100';
    return 'text-aaa-blue bg-aaa-bg border-aaa-blue/10';
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 mac-modal-backdrop"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full max-w-[1650px] h-[95vh] rounded-mac-lg shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden border border-surface-border">
        
        {/* Header - MacBook style */}
        <div className="px-8 py-6 border-b border-surface-border flex items-center justify-between bg-white shrink-0 relative z-10">
          <div className="flex items-center gap-6">
             <div className="w-12 h-12 bg-mac-blue rounded-mac-sm flex items-center justify-center">
                <span className="text-white font-bold text-sm">AAA</span>
             </div>
             <div>
                <h3 className="text-2xl font-semibold text-mac-navy">Clause Analysis</h3>
                <div className="flex items-center gap-3 mt-1">
                   <div className="px-2.5 py-1 bg-mac-blue-subtle rounded-md">
                      <span className="text-xs font-medium text-mac-blue mono">Clause {baseClause.clause_number}</span>
                   </div>
                   <span className="text-mac-muted text-sm">{baseClause.clause_title}</span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            {error && <span className="text-red-500 text-xs font-medium">{error}</span>}
            <button 
              onClick={analyzeClauseWithAI}
              disabled={isAnalyzing}
              className={`px-5 py-2.5 rounded-mac-sm text-sm font-medium transition-all flex items-center gap-2 ${
                isAnalyzing ? 'bg-mac-muted cursor-not-allowed text-white/60' : 'bg-mac-blue text-white hover:bg-mac-blue-hover active:scale-[0.98]'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Analyze Timeframes
                </>
              )}
            </button>

            <button onClick={onClose} className="p-2.5 hover:bg-surface-bg rounded-mac-xs transition-all border border-surface-border hover:border-mac-blue">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-mac-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex divide-x divide-surface-border bg-surface-bg/30 shrink-0 border-b border-surface-border">
            {/* GC/PC Content Panels - MacBook style */}
            <div className="w-2/3 flex divide-x divide-surface-border">
              <div className="w-1/2 flex flex-col">
                <div className="px-6 py-3 bg-surface-bg border-b border-surface-border">
                  <span className="text-[10px] font-medium text-mac-navy uppercase tracking-wider">General Conditions</span>
                </div>
                <div className="flex-1 p-6 font-mono text-sm leading-relaxed text-mac-charcoal">
                  <div className="font-semibold text-mac-navy mb-3">{baseClause.clause_number} {baseClause.clause_title}</div>
                  {baseClause.general_condition ? (
                    <div dangerouslySetInnerHTML={{ __html: baseClause.general_condition }} className="verbatim-content" />
                  ) : baseClause.condition_type === 'General' ? (
                    <div dangerouslySetInnerHTML={{ __html: baseClause.clause_text }} className="verbatim-content" />
                  ) : (
                    <div className="h-32 flex items-center justify-center border border-dashed border-surface-border rounded-mac-sm bg-surface-bg text-xs font-medium text-mac-muted">Not in baseline</div>
                  )}
                </div>
              </div>
              <div className="w-1/2 flex flex-col bg-white">
                <div className="px-6 py-3 bg-white border-b border-surface-border">
                  <span className="text-[10px] font-medium text-mac-blue uppercase tracking-wider">Particular Conditions</span>
                </div>
                <div className="flex-1 p-6 font-mono text-sm leading-relaxed text-mac-charcoal">
                  <div className="font-semibold text-mac-blue mb-3">{baseClause.clause_number} {baseClause.clause_title}</div>
                  {baseClause.particular_condition ? (
                    <div dangerouslySetInnerHTML={{ __html: baseClause.particular_condition }} className="verbatim-content" />
                  ) : baseClause.condition_type === 'Particular' ? (
                    <div dangerouslySetInnerHTML={{ __html: baseClause.clause_text }} className="verbatim-content" />
                  ) : (
                    <div className="h-32 flex items-center justify-center border border-dashed border-surface-border rounded-mac-sm bg-surface-bg text-xs font-medium text-mac-muted">No particular revision</div>
                  )}
                </div>
              </div>
            </div>

            {/* Temporal Assets Panel - MacBook style */}
            <div className="w-1/3 flex flex-col bg-surface-bg overflow-hidden">
               <div className="px-6 py-4 border-b border-surface-border bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-mac-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     <span className="text-xs font-medium text-mac-navy">Temporal Assets</span>
                  </div>
                  <span className="px-2 py-0.5 bg-mac-blue-subtle text-mac-blue text-[10px] font-medium rounded-md">{(baseClause.time_frames || []).length}</span>
               </div>
               
               <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
                  {(baseClause.time_frames || []).map((tf, i) => (
                    <div key={i} className="bg-white p-4 rounded-mac-sm border border-surface-border shadow-mac-sm hover:shadow-mac transition-all group relative">
                       <button 
                         onClick={() => deleteTimeFrame(i)}
                         className="absolute top-3 right-3 p-1.5 text-mac-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-red-50"
                         title="Remove"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                         </svg>
                       </button>
                       <div className="flex items-center justify-between mb-4">
                          <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${getTimeTypeColor(tf.type)}`}>
                            {tf.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[9px] font-bold text-aaa-muted uppercase pr-8">{tf.applies_to}</span>
                       </div>
                       <div className="p-3 bg-aaa-bg rounded-lg border border-aaa-blue/5 mb-4">
                          <p className="text-[12px] font-mono font-bold text-aaa-blue leading-relaxed">"{tf.original_phrase}"</p>
                       </div>
                       <p className="text-[11px] font-semibold text-aaa-text leading-tight group-hover:text-aaa-blue transition-colors">{tf.short_explanation}</p>
                    </div>
                  ))}
                  {(!baseClause.time_frames || baseClause.time_frames.length === 0) && (
                    <div className="h-40 flex flex-col items-center justify-center opacity-40 text-center"><p className="text-xs font-black uppercase tracking-widest">No Temporal Nodes</p></div>
                  )}
               </div>
            </div>
          </div>

          {/* Financial Assets Section */}
          <div className="border-t border-aaa-border bg-white">
            <div className="px-8 py-5 border-b border-aaa-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Financial Assets</span>
              </div>
              <div className="flex items-center gap-4">
                {financialError && <span className="text-red-500 text-[9px] font-bold uppercase animate-pulse">{financialError}</span>}
                <span className="px-2 py-0.5 bg-emerald-600/5 text-emerald-600 text-[9px] font-bold rounded">
                  {(baseClause.financial_assets || []).length} Assets
                </span>
                <button
                  onClick={generateFinancialAssets}
                  disabled={isGeneratingFinancials}
                  className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${
                    isGeneratingFinancials 
                      ? 'bg-aaa-muted cursor-not-allowed text-white/50' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                  }`}
                >
                  {isGeneratingFinancials ? (
                    <>
                      <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar max-h-[400px]">
              {(baseClause.financial_assets || []).map((fa, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-aaa-border shadow-sm hover:border-emerald-600 transition-all group relative">
                  <button
                    onClick={() => deleteFinancialAsset(i)}
                    className="absolute top-4 right-4 p-2 text-aaa-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove Asset"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${getFinancialTypeColor(fa.type)}`}>
                      {fa.type.replace(/_/g, ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${
                      fa.source === 'GC' ? 'text-aaa-blue bg-aaa-bg border-aaa-blue/20' : 'text-emerald-600 bg-emerald-50 border-emerald-200'
                    }`}>
                      {fa.source}
                    </span>
                  </div>

                  <div className="p-3 bg-aaa-bg rounded-lg border border-emerald-600/5 mb-4">
                    <p className="text-[12px] font-mono font-bold text-aaa-blue leading-relaxed">"{fa.raw_text}"</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-[8px] font-black text-aaa-muted uppercase tracking-widest">Payer</span>
                      <p className="text-[11px] font-semibold text-aaa-text mt-1">{fa.payer || 'N/A'}</p>
                    </div>
                    {fa.payee && (
                      <div>
                        <span className="text-[8px] font-black text-aaa-muted uppercase tracking-widest">Payee</span>
                        <p className="text-[11px] font-semibold text-aaa-text mt-1">{fa.payee}</p>
                      </div>
                    )}
                  </div>

                  {(fa.amount !== null || fa.currency_or_basis !== 'N/A') && (
                    <div className="mb-4">
                      <span className="text-[8px] font-black text-aaa-muted uppercase tracking-widest">Amount</span>
                      <p className="text-[11px] font-semibold text-emerald-600 mt-1">
                        {fa.amount !== null ? `${fa.amount} ` : ''}
                        {fa.currency_or_basis !== 'N/A' && fa.currency_or_basis}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="text-[8px] font-black text-aaa-muted uppercase tracking-widest">Condition</span>
                    <p className="text-[11px] font-semibold text-aaa-text leading-tight group-hover:text-emerald-600 transition-colors mt-1">
                      {fa.condition}
                    </p>
                  </div>
                </div>
              ))}
              {(!baseClause.financial_assets || baseClause.financial_assets.length === 0) && (
                <div className="h-40 flex flex-col items-center justify-center opacity-40 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-aaa-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-black uppercase tracking-widest text-aaa-muted">No Financial Assets</p>
                  <p className="text-[9px] text-aaa-muted mt-2">Click Generate to extract financial information</p>
                </div>
              )}
            </div>
          </div>

          {analysisResult && (
            <div className="p-12 bg-white animate-in slide-in-from-bottom-8 duration-500">
              <div className="max-w-7xl mx-auto space-y-12">
                <div className="flex items-center gap-6 border-b border-aaa-border pb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-aaa-blue to-aaa-accent rounded-2xl flex items-center justify-center shadow-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-3xl font-black text-aaa-blue tracking-tighter">AI Analysis Insights</h4>
                    <p className="text-[10px] font-bold text-aaa-muted uppercase tracking-[0.3em] mt-1">Deep Intelligence Layer v3.2</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-8">
                    <div>
                      <h5 className="text-[11px] font-black text-aaa-muted uppercase tracking-widest mb-4">Headline Overview</h5>
                      <p className="text-2xl font-black text-aaa-text leading-tight tracking-tight">
                        {analysisResult.dashboard_summary.headline}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-[11px] font-black text-aaa-muted uppercase tracking-widest mb-4">Key Observations</h5>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analysisResult.dashboard_summary.key_points.map((pt, i) => (
                          <li key={i} className="flex gap-4 p-4 bg-aaa-bg/30 rounded-2xl border border-aaa-border/50 text-[13px] font-semibold text-aaa-text leading-relaxed">
                            <div className="w-2 h-2 rounded-full bg-aaa-blue mt-1.5 shrink-0" />
                            {pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-8 rounded-[32px] border border-aaa-border shadow-inner-soft space-y-8">
                    <h5 className="text-[11px] font-black text-aaa-blue uppercase tracking-widest mb-2">Modification Impact</h5>
                    
                    {analysisResult.particular_vs_general.has_particular ? (
                      <div className="space-y-6">
                        <div className="flex flex-wrap gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-aaa-muted uppercase px-1">Effect Type</span>
                            <span className="px-4 py-1.5 bg-aaa-blue text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md">
                              {analysisResult.particular_vs_general.effect_type}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-aaa-muted uppercase px-1">Risk Owner</span>
                            <span className="px-4 py-1.5 bg-white border border-aaa-blue text-aaa-blue rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm">
                              {analysisResult.particular_vs_general.primary_risk_owner}
                            </span>
                          </div>
                        </div>
                        <p className="text-[13px] font-medium text-aaa-muted leading-relaxed">
                          {analysisResult.particular_vs_general.short_explanation}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] font-black text-aaa-muted uppercase tracking-widest text-center py-10 opacity-40">
                        No Particular Condition revision for this clause.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - MacBook style */}
        <div className="px-8 py-3 bg-surface-bg border-t border-surface-border text-xs font-medium text-mac-muted flex justify-between items-center shrink-0">
          <span>AAA Contract Analysis</span>
          <span>Changes auto-saved</span>
        </div>
      </motion.div>
    </motion.div>
  );
};
