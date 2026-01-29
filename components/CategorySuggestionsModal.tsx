import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { CategorySuggestion } from '../services/categorySuggestionService';
import { Clause } from '../types';

interface CategorySuggestionsModalProps {
  suggestions: CategorySuggestion[];
  clauses: Clause[];
  onAccept: (suggestion: CategorySuggestion) => void;
  onReject: (suggestion: CategorySuggestion) => void;
  onAcceptAll: () => void;
  onDismiss: () => void;
}

export const CategorySuggestionsModal: React.FC<CategorySuggestionsModalProps> = ({
  suggestions,
  clauses,
  onAccept,
  onReject,
  onAcceptAll,
  onDismiss
}) => {
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<string>>(new Set());

  const handleAccept = (suggestion: CategorySuggestion) => {
    setAcceptedSuggestions(prev => new Set(prev).add(suggestion.categoryName));
    setRejectedSuggestions(prev => {
      const next = new Set(prev);
      next.delete(suggestion.categoryName);
      return next;
    });
    onAccept(suggestion);
  };

  const handleReject = (suggestion: CategorySuggestion) => {
    setRejectedSuggestions(prev => new Set(prev).add(suggestion.categoryName));
    setAcceptedSuggestions(prev => {
      const next = new Set(prev);
      next.delete(suggestion.categoryName);
      return next;
    });
    onReject(suggestion);
  };

  const handleAcceptAll = () => {
    suggestions.forEach(s => {
      if (!rejectedSuggestions.has(s.categoryName)) {
        handleAccept(s);
      }
    });
    onAcceptAll();
  };

  const getClauseTitle = (clauseNumber: string): string => {
    const clause = clauses.find(c => c.clause_number === clauseNumber);
    return clause?.clause_title || 'Untitled';
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return createPortal(
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-aaa-border bg-gradient-to-r from-aaa-blue to-aaa-accent">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Category Suggestions</h2>
              <p className="text-sm text-white/80 mt-1">
                AI has analyzed your clauses and suggested {suggestions.length} categories
              </p>
            </div>
            <button
              onClick={onDismiss}
              className="text-white hover:text-white/80 transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => {
              const isAccepted = acceptedSuggestions.has(suggestion.categoryName);
              const isRejected = rejectedSuggestions.has(suggestion.categoryName);

              return (
                <div
                  key={index}
                  className={`border-2 rounded-2xl p-5 transition-all ${
                    isAccepted
                      ? 'border-green-500 bg-green-50'
                      : isRejected
                      ? 'border-red-300 bg-red-50 opacity-60'
                      : 'border-aaa-border bg-white hover:border-aaa-blue'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-aaa-text">
                          {suggestion.categoryName}
                        </h3>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${getConfidenceColor(
                            suggestion.confidence
                          )} bg-current/10`}
                        >
                          {getConfidenceLabel(suggestion.confidence)} Confidence (
                          {Math.round(suggestion.confidence * 100)}%)
                        </span>
                      </div>
                      {suggestion.reasoning && (
                        <p className="text-sm text-aaa-muted mb-3">{suggestion.reasoning}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {suggestion.suggestedClauseNumbers.map((num) => (
                          <span
                            key={num}
                            className="text-xs font-semibold px-2 py-1 bg-aaa-bg rounded-lg text-aaa-text border border-aaa-border"
                            title={getClauseTitle(num)}
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-aaa-muted mt-2">
                        {suggestion.suggestedClauseNumbers.length} clause
                        {suggestion.suggestedClauseNumbers.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {!isAccepted && !isRejected && (
                        <>
                          <button
                            onClick={() => handleAccept(suggestion)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleReject(suggestion)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {isAccepted && (
                        <span className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm">
                          ✓ Accepted
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold text-sm">
                          ✗ Rejected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-aaa-border bg-aaa-bg/30 flex items-center justify-between">
          <button
            onClick={onDismiss}
            className="px-6 py-2 text-aaa-text font-semibold hover:text-aaa-blue transition-colors"
          >
            Dismiss
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleAcceptAll}
              className="px-6 py-2 bg-aaa-blue text-white rounded-xl font-semibold hover:bg-aaa-hover transition-colors"
            >
              Accept All
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};
