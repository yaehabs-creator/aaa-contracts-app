import React, { useState, useEffect } from 'react';
import { detectClausesFromText, DetectedClause } from '../services/clauseDetectionService';
import { Clause } from '../types';

interface ClauseData {
  number: string;
  title: string;
  generalText: string;
  particularText: string;
}

interface AddClauseModalProps {
  onClose: () => void;
  onSave: (clauseData: {
    number: string;
    title: string;
    generalText: string;
    particularText: string;
    contractId: string;
  }) => Promise<void>;
  contractId: string;
  editingClause?: Clause | null;
}

type ModalMode = 'single' | 'bulk';
type ModalStep = 'input' | 'detecting' | 'review';

export const AddClauseModal: React.FC<AddClauseModalProps> = ({ onClose, onSave, contractId, editingClause }) => {
  const [mode, setMode] = useState<ModalMode>('single');
  const [step, setStep] = useState<ModalStep>('input');
  
  // Single mode state
  const [formData, setFormData] = useState<ClauseData>({
    number: '',
    title: '',
    generalText: '',
    particularText: ''
  });
  
  // Pre-fill form if editing
  useEffect(() => {
    if (editingClause) {
      setFormData({
        number: editingClause.clause_number,
        title: editingClause.clause_title,
        generalText: editingClause.general_condition || '',
        particularText: editingClause.particular_condition || ''
      });
      setMode('single');
      setStep('input');
      setHasUnsavedChanges(false);
      setSaveStatus('idle');
    }
  }, [editingClause]);

  // Track initial form data to prevent auto-save on mount
  const [initialFormData, setInitialFormData] = useState<ClauseData | null>(null);

  // Update initial form data when editingClause changes
  useEffect(() => {
    if (editingClause) {
      const initial = {
        number: editingClause.clause_number,
        title: editingClause.clause_title,
        generalText: editingClause.general_condition || '',
        particularText: editingClause.particular_condition || ''
      };
      setInitialFormData(initial);
      setHasUnsavedChanges(false);
    } else {
      setInitialFormData(null);
      setHasUnsavedChanges(false);
    }
  }, [editingClause]);

  // Auto-save when editing clause (debounced)
  useEffect(() => {
    if (!editingClause || step !== 'input' || mode !== 'single' || !initialFormData) return;
    
    // Don't auto-save if form is invalid or empty
    if (!formData.number.trim() || (!formData.generalText.trim() && !formData.particularText.trim())) {
      return;
    }

    // Check if form data actually changed from initial
    const hasChanged = 
      formData.number !== initialFormData.number ||
      formData.title !== initialFormData.title ||
      formData.generalText !== initialFormData.generalText ||
      formData.particularText !== initialFormData.particularText;

    if (!hasChanged) {
      setHasUnsavedChanges(false);
      return;
    }

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Set new timeout for auto-save (2 seconds after user stops typing)
    const timeout = setTimeout(async () => {
      await handleAutoSave();
      // Update initial form data after successful save
      setInitialFormData({ ...formData });
    }, 2000);

    setAutoSaveTimeout(timeout);

    // Cleanup
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [formData, editingClause, step, mode, initialFormData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, []);
  
  // Bulk mode state
  const [bulkGeneralText, setBulkGeneralText] = useState('');
  const [bulkParticularText, setBulkParticularText] = useState('');
  const [detectedClauses, setDetectedClauses] = useState<DetectedClause[]>([]);
  const [reviewClauses, setReviewClauses] = useState<ClauseData[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Auto-save state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const validateSingle = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.number.trim()) newErrors.number = "Clause number is required";
    if (!formData.generalText.trim() && !formData.particularText.trim()) {
      newErrors.text = "At least one condition text is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDetectClauses = async () => {
    if (!bulkGeneralText.trim() && !bulkParticularText.trim()) {
      setErrors({ bulk: 'Please paste text in at least one field' });
      return;
    }

    setIsDetecting(true);
    setErrors({});
    setStep('detecting');

    try {
      const isDual = bulkGeneralText.trim() && bulkParticularText.trim();
      const detected = await detectClausesFromText(
        isDual ? '' : (bulkGeneralText || bulkParticularText),
        isDual,
        bulkGeneralText.trim() || undefined,
        bulkParticularText.trim() || undefined
      );

      if (detected.length === 0) {
        setErrors({ bulk: 'No clauses detected. Please ensure your text contains clause numbers (e.g., "1.1", "2.3", "Article 5") and clause titles. You can also add clauses manually using the "Add Clause" button below.' });
        setStep('input');
      } else {
        // Group sub-clauses with their parent clauses
        const grouped: typeof detected = [];
        const subClauseMap = new Map<string, typeof detected>();
        const parentClauses = new Set<string>();
        
        // First pass: identify parent clauses and collect sub-clauses
        detected.forEach(d => {
          const clauseNum = d.clause_number;
          // Check if it's a sub-clause (contains parentheses like "4.1(a)")
          const subClauseMatch = clauseNum.match(/^(.+?)\s*\(([a-z0-9]+)\)$/i);
          
          if (subClauseMatch) {
            const parentNum = subClauseMatch[1].trim();
            if (!subClauseMap.has(parentNum)) {
              subClauseMap.set(parentNum, []);
            }
            subClauseMap.get(parentNum)!.push(d);
          } else {
            // This is a parent clause
            parentClauses.add(clauseNum);
            grouped.push(d);
          }
        });
        
        // Second pass: merge sub-clauses into parent clauses
        grouped.forEach(parent => {
          const subClauses = subClauseMap.get(parent.clause_number);
          if (subClauses && subClauses.length > 0) {
            // Append sub-clause text to parent's general/particular conditions
            subClauses.forEach(sub => {
              if (sub.general_condition) {
                parent.general_condition = (parent.general_condition || '') + '\n\n' + sub.general_condition;
              }
              if (sub.particular_condition) {
                parent.particular_condition = (parent.particular_condition || '') + '\n\n' + sub.particular_condition;
              }
            });
          }
        });
        
        // Add any orphaned sub-clauses (parent not found) as standalone
        subClauseMap.forEach((subs, parentNum) => {
          if (!parentClauses.has(parentNum)) {
            // Create a parent clause from the first sub-clause
            const firstSub = subs[0];
            const parent: typeof firstSub = {
              clause_number: parentNum,
              clause_title: firstSub.clause_title.split(' - ')[0] || firstSub.clause_title,
              general_condition: '',
              particular_condition: '',
              confidence: firstSub.confidence
            };
            
            subs.forEach(sub => {
              if (sub.general_condition) {
                parent.general_condition = (parent.general_condition || '') + '\n\n' + sub.general_condition;
              }
              if (sub.particular_condition) {
                parent.particular_condition = (parent.particular_condition || '') + '\n\n' + sub.particular_condition;
              }
            });
            
            grouped.push(parent);
          }
        });
        
        // Convert grouped clauses to review format
        const review = grouped.map(d => ({
          number: d.clause_number,
          title: d.clause_title,
          generalText: d.general_condition || '',
          particularText: d.particular_condition || ''
        }));
        setReviewClauses(review);
        setDetectedClauses(grouped);
        setStep('review');
      }
    } catch (err: any) {
      console.error("Clause detection failed:", err);
      setErrors({ bulk: err.message || 'Failed to detect clauses. Please try again.' });
      setStep('input');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleUpdateReviewClause = (index: number, field: keyof ClauseData, value: string) => {
    const updated = [...reviewClauses];
    updated[index] = { ...updated[index], [field]: value };
    setReviewClauses(updated);
  };

  const handleRemoveReviewClause = (index: number) => {
    setReviewClauses(reviewClauses.filter((_, i) => i !== index));
  };

  const handleAddManualClause = () => {
    setReviewClauses([...reviewClauses, {
      number: '',
      title: '',
      generalText: '',
      particularText: ''
    }]);
  };

  const handleSaveAll = async () => {
    // Validate all review clauses
    const invalidClauses = reviewClauses.filter(c => !c.number.trim() || (!c.generalText.trim() && !c.particularText.trim()));
    if (invalidClauses.length > 0) {
      setErrors({ review: 'Please fill in clause number and at least one condition text for all clauses' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      
      // Save all clauses sequentially
      for (let i = 0; i < reviewClauses.length; i++) {
        const clause = reviewClauses[i];
        
        await onSave({
          number: clause.number,
          title: clause.title,
          generalText: clause.generalText,
          particularText: clause.particularText,
          contractId: contractId
        });
      }
      
      
      onClose();
    } catch (err) {
      console.error("Bulk save failed:", err);
      setErrors({ review: 'Failed to save some clauses. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-save function (doesn't close modal)
  const handleAutoSave = async () => {
    if (!editingClause || !validateSingle()) return;

    setSaveStatus('saving');
    try {
      await onSave({
        number: formData.number,
        title: formData.title,
        generalText: formData.generalText,
        particularText: formData.particularText,
        contractId: contractId
      });
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      
      // Clear saved status after 2 seconds
      setTimeout(() => {
        setSaveStatus((prev) => prev === 'saved' ? 'idle' : prev);
      }, 2000);
    } catch (err) {
      console.error("Auto-save failed:", err);
      setSaveStatus('error');
      
      // Clear error status after 3 seconds
      setTimeout(() => {
        setSaveStatus((prev) => prev === 'error' ? 'idle' : prev);
      }, 3000);
    }
  };

  // Manual save function (explicit save button)
  const handleManualSave = async () => {
    if (!validateSingle()) return;

    setIsSubmitting(true);
    setSaveStatus('saving');
    try {
      await onSave({
        number: formData.number,
        title: formData.title,
        generalText: formData.generalText,
        particularText: formData.particularText,
        contractId: contractId
      });
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      setIsSubmitting(false);
      
      // Update initial form data after successful save
      setInitialFormData({ ...formData });
      
      // Clear saved status after 2 seconds
      setTimeout(() => {
        setSaveStatus((prev) => prev === 'saved' ? 'idle' : prev);
      }, 2000);
    } catch (err) {
      console.error("Manual save failed:", err);
      setSaveStatus('error');
      setIsSubmitting(false);
      
      // Clear error status after 3 seconds
      setTimeout(() => {
        setSaveStatus((prev) => prev === 'error' ? 'idle' : prev);
      }, 3000);
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSingle()) return;

    setIsSubmitting(true);
    setSaveStatus('saving');
    try {
        await onSave({
          number: formData.number,
          title: formData.title,
          generalText: formData.generalText,
          particularText: formData.particularText,
          contractId: contractId
        });
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      
      // If editing, don't close modal - let user continue editing
      if (editingClause) {
        setIsSubmitting(false);
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } else {
        // If creating new clause, close modal
        onClose();
      }
    } catch (err) {
      console.error("Manual Injection Failed:", err);
      setSaveStatus('error');
      setIsSubmitting(false);
      setTimeout(() => {
        setSaveStatus((prev) => prev === 'error' ? 'idle' : prev);
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 mac-modal-backdrop modal-backdrop">
      <div className="bg-white w-full max-w-6xl rounded-mac-lg shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden modal-content border border-surface-border max-h-[90vh]">
        
        {/* Header - MacBook style */}
        <div className="px-8 py-6 border-b border-surface-border flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 ${editingClause ? 'bg-emerald-500' : 'bg-mac-blue'} rounded-mac-xs flex items-center justify-center`}>
              {editingClause ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-mac-navy">{editingClause ? 'Edit Clause' : 'Add Clause'}</h3>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-xs font-medium text-mac-muted">{editingClause ? 'Modify clause content' : 'Add new clause to contract'}</p>
                {editingClause && (
                  <div className="flex items-center gap-2">
                    {saveStatus === 'saving' && (
                      <span className="text-[10px] font-medium text-mac-blue flex items-center gap-1">
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    )}
                    {saveStatus === 'saved' && (
                      <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Saved
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-[10px] font-medium text-red-500 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Error
                      </span>
                    )}
                    {hasUnsavedChanges && saveStatus === 'idle' && (
                      <span className="text-[10px] font-medium text-amber-600">Unsaved changes</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-surface-bg rounded-mac-xs transition-all border border-surface-border">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-mac-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Toggle - MacBook style */}
        {step === 'input' && !editingClause && (
          <div className="px-8 py-4 border-b border-surface-border bg-surface-bg/30">
            <div className="flex gap-2">
              <button
                onClick={() => setMode('single')}
                className={`px-4 py-2 rounded-mac-xs text-sm font-medium transition-all ${
                  mode === 'single' 
                    ? 'bg-mac-blue text-white' 
                    : 'bg-white text-mac-muted hover:text-mac-blue border border-surface-border'
                }`}
              >
                Single Clause
              </button>
              <button
                onClick={() => setMode('bulk')}
                className={`px-4 py-2 rounded-mac-xs text-sm font-medium transition-all ${
                  mode === 'bulk' 
                    ? 'bg-mac-blue text-white' 
                    : 'bg-white text-mac-muted hover:text-mac-blue border border-surface-border'
                }`}
              >
                Bulk Import
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {step === 'input' && mode === 'single' && (
            <form onSubmit={handleSingleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-aaa-blue uppercase tracking-widest px-1">Clause Number *</label>
                  <input 
                    type="text"
                    placeholder="e.g. 14.1"
                    value={formData.number}
                    onChange={(e) => setFormData({...formData, number: e.target.value})}
                    className={`w-full px-5 py-4 bg-aaa-bg/30 border rounded-2xl font-mono text-sm focus:ring-4 focus:ring-aaa-blue/5 outline-none transition-all ${errors.number ? 'border-red-500' : 'border-aaa-border focus:border-aaa-blue'}`}
                  />
                  {errors.number && <p className="text-[9px] font-bold text-red-500 uppercase px-1">{errors.number}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-aaa-blue uppercase tracking-widest px-1">Clause Title</label>
                  <input 
                    type="text"
                    placeholder="Heading text..."
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-5 py-4 bg-aaa-bg/30 border border-aaa-border rounded-2xl font-semibold text-sm focus:border-aaa-blue focus:ring-4 focus:ring-aaa-blue/5 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-aaa-blue uppercase tracking-widest px-1">Baseline: General Conditions</label>
                  <textarea 
                    placeholder="Paste baseline verbatim text here..."
                    value={formData.generalText}
                    onChange={(e) => setFormData({...formData, generalText: e.target.value})}
                    rows={10}
                    className="w-full px-6 py-5 bg-aaa-bg/30 border border-aaa-border rounded-2xl font-mono text-[13px] leading-relaxed focus:ring-4 focus:ring-aaa-blue/5 focus:border-aaa-blue outline-none transition-all custom-scrollbar"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-aaa-accent uppercase tracking-widest px-1">Revision: Particular Conditions</label>
                  <textarea 
                    placeholder="Paste modification verbatim text here..."
                    value={formData.particularText}
                    onChange={(e) => setFormData({...formData, particularText: e.target.value})}
                    rows={10}
                    className="w-full px-6 py-5 bg-aaa-bg/30 border border-aaa-border rounded-2xl font-mono text-[13px] leading-relaxed focus:ring-4 focus:ring-aaa-accent/5 focus:border-aaa-accent outline-none transition-all custom-scrollbar"
                  />
                </div>
              </div>
              {errors.text && <p className="text-center text-[10px] font-black text-red-500 uppercase">{errors.text}</p>}
            </form>
          )}

          {step === 'input' && mode === 'bulk' && (
            <div className="p-10 space-y-6">
              <div className="bg-aaa-bg/30 p-4 rounded-2xl border border-aaa-border">
                <p className="text-xs font-bold text-aaa-text">
                  Paste your contract text below. The AI will automatically detect clause numbers and titles.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-aaa-blue uppercase tracking-widest px-1">Baseline: General Conditions</label>
                  <textarea 
                    placeholder="Paste all general conditions text here..."
                    value={bulkGeneralText}
                    onChange={(e) => setBulkGeneralText(e.target.value)}
                    rows={15}
                    className="w-full px-6 py-5 bg-aaa-bg/30 border border-aaa-border rounded-2xl font-mono text-[13px] leading-relaxed focus:ring-4 focus:ring-aaa-blue/5 focus:border-aaa-blue outline-none transition-all custom-scrollbar"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-aaa-accent uppercase tracking-widest px-1">Revision: Particular Conditions</label>
                  <textarea 
                    placeholder="Paste all particular conditions text here..."
                    value={bulkParticularText}
                    onChange={(e) => setBulkParticularText(e.target.value)}
                    rows={15}
                    className="w-full px-6 py-5 bg-aaa-bg/30 border border-aaa-border rounded-2xl font-mono text-[13px] leading-relaxed focus:ring-4 focus:ring-aaa-accent/5 focus:border-aaa-accent outline-none transition-all custom-scrollbar"
                  />
                </div>
              </div>
              {errors.bulk && (
                <div className="text-center space-y-3">
                  <p className="text-[10px] font-black text-red-500 uppercase">{errors.bulk}</p>
                  <button
                    onClick={() => {
                      handleAddManualClause();
                      setStep('review');
                    }}
                    className="px-6 py-2 bg-aaa-blue text-white text-xs font-black rounded-xl hover:bg-aaa-hover transition-all"
                  >
                    Add Clause Manually Instead
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'detecting' && (
            <div className="p-20 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-aaa-blue border-t-transparent rounded-full animate-spin mb-6"></div>
              <p className="text-lg font-bold text-aaa-text">Detecting clauses...</p>
              <p className="text-sm text-aaa-muted mt-2">AI is analyzing your text</p>
            </div>
          )}

          {step === 'review' && (
            <div className="p-10 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-black text-aaa-blue">Review Detected Clauses</h4>
                  <p className="text-xs text-aaa-muted mt-1">{reviewClauses.length} clause(s) detected</p>
                </div>
                <button
                  onClick={handleAddManualClause}
                  className="px-4 py-2 bg-aaa-bg border border-aaa-border text-aaa-blue rounded-xl text-xs font-bold hover:bg-aaa-blue hover:text-white transition-all"
                >
                  + Add Manual Clause
                </button>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                {reviewClauses.map((clause, index) => (
                  <div key={index} className="bg-aaa-bg/30 border border-aaa-border rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-aaa-blue uppercase">Clause #{index + 1}</span>
                      <button
                        onClick={() => handleRemoveReviewClause(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-aaa-blue uppercase tracking-widest">Clause Number *</label>
                        <input
                          type="text"
                          value={clause.number}
                          onChange={(e) => handleUpdateReviewClause(index, 'number', e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-aaa-border rounded-xl font-mono text-sm mt-1 focus:border-aaa-blue focus:ring-2 focus:ring-aaa-blue/5 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-aaa-blue uppercase tracking-widest">Clause Title</label>
                        <input
                          type="text"
                          value={clause.title}
                          onChange={(e) => handleUpdateReviewClause(index, 'title', e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-aaa-border rounded-xl font-semibold text-sm mt-1 focus:border-aaa-blue focus:ring-2 focus:ring-aaa-blue/5 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-aaa-blue uppercase tracking-widest">General Conditions</label>
                        <textarea
                          value={clause.generalText}
                          onChange={(e) => handleUpdateReviewClause(index, 'generalText', e.target.value)}
                          rows={4}
                          className="w-full px-4 py-2 bg-white border border-aaa-border rounded-xl font-mono text-xs mt-1 focus:border-aaa-blue focus:ring-2 focus:ring-aaa-blue/5 outline-none custom-scrollbar"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-aaa-accent uppercase tracking-widest">Particular Conditions</label>
                        <textarea
                          value={clause.particularText}
                          onChange={(e) => handleUpdateReviewClause(index, 'particularText', e.target.value)}
                          rows={4}
                          className="w-full px-4 py-2 bg-white border border-aaa-border rounded-xl font-mono text-xs mt-1 focus:border-aaa-accent focus:ring-2 focus:ring-aaa-accent/5 outline-none custom-scrollbar"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {errors.review && <p className="text-center text-[10px] font-black text-red-500 uppercase">{errors.review}</p>}
            </div>
          )}
        </div>

        {/* Footer Actions - MacBook style */}
        <div className="px-8 py-5 border-t border-surface-border bg-surface-bg/50 flex items-center justify-between shrink-0">
          <button 
            type="button"
            onClick={() => {
              if (step === 'review') {
                setStep('input');
                setReviewClauses([]);
              } else {
                onClose();
              }
            }}
            className="px-4 py-2.5 text-sm font-medium text-mac-muted hover:text-mac-navy transition-all"
          >
            {step === 'review' ? 'Back' : 'Cancel'}
          </button>
          
          <div className="flex gap-3">
            {step === 'input' && mode === 'bulk' && (
              <button
                onClick={handleDetectClauses}
                disabled={isDetecting}
                className="px-5 py-2.5 bg-mac-blue text-white rounded-mac-sm text-sm font-medium hover:bg-mac-blue-hover transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
              >
                {isDetecting ? 'Detecting...' : 'Detect Clauses'}
                {!isDetecting && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
              </button>
            )}
            
            {step === 'review' && (
              <button
                onClick={handleSaveAll}
                disabled={isSubmitting || reviewClauses.length === 0}
                className="px-6 py-2.5 bg-mac-blue text-white rounded-mac-sm text-sm font-medium hover:bg-mac-blue-hover transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? `Saving ${reviewClauses.length}...` : `Save All (${reviewClauses.length})`}
                {!isSubmitting && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )}
            
            {step === 'input' && mode === 'single' && (
              <>
                {editingClause && (
                  <button 
                    onClick={handleManualSave}
                    disabled={isSubmitting || saveStatus === 'saving'}
                    className="px-5 py-2.5 bg-emerald-500 text-white rounded-mac-sm text-sm font-medium hover:bg-emerald-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save
                      </>
                    )}
                  </button>
                )}
                <button 
                  type={editingClause ? "button" : "submit"}
                  onClick={editingClause ? undefined : handleSingleSubmit}
                  disabled={isSubmitting || saveStatus === 'saving'}
                  className="px-6 py-2.5 bg-mac-blue text-white rounded-mac-sm text-sm font-medium hover:bg-mac-blue-hover transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (editingClause ? 'Updating...' : 'Saving...') : (editingClause ? 'Done' : 'Save Clause')}
                  {!isSubmitting && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
