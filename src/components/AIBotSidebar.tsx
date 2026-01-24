import React, { useState, useEffect, useRef } from 'react';
import { Clause, BotMessage, SavedContract } from '../../types';
import { chatWithBot, getSuggestions, explainClause } from '../services/aiBotService';
import { isClaudeAvailable } from '../services/aiProvider';
import { scrollToClause } from '../utils/navigation';
import { getAllClausesFromContract } from '../../services/contractMigrationService';

interface AIBotSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  clauses: Clause[];
  selectedClause?: Clause | null;
  contracts?: SavedContract[];
  activeContractId?: string | null;
  onContractChange?: (contractId: string) => void;
}

export const AIBotSidebar: React.FC<AIBotSidebarProps> = ({
  isOpen,
  onClose,
  clauses,
  selectedClause,
  contracts = [],
  activeContractId,
  onContractChange
}) => {
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(activeContractId || null);
  const [showContractSelector, setShowContractSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const claudeAvailable = isClaudeAvailable();

  // Get the currently selected contract and its clauses
  const selectedContract = contracts.find(c => c.id === selectedContractId);
  const activeClauses = selectedContract 
    ? getAllClausesFromContract(selectedContract) 
    : clauses;

  // Update selected contract when activeContractId changes
  useEffect(() => {
    if (activeContractId && activeContractId !== selectedContractId) {
      setSelectedContractId(activeContractId);
    }
  }, [activeContractId]);

  const handleContractSelect = (contractId: string) => {
    setSelectedContractId(contractId);
    setShowContractSelector(false);
    // Clear messages when switching contracts
    setMessages([]);
    setSuggestions([]);
    // Notify parent if callback provided
    if (onContractChange) {
      onContractChange(contractId);
    }
  };

  useEffect(() => {
    // Load suggestions when clauses change
    if (activeClauses.length > 0 && isOpen && claudeAvailable) {
      loadSuggestions();
    }
  }, [activeClauses, isOpen, selectedContractId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Focus input when sidebar opens
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const loadSuggestions = async () => {
    if (!claudeAvailable) return;
    try {
      const suggs = await getSuggestions(activeClauses);
      setSuggestions(suggs);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const sendMessage = async (text?: string) => {
    const query = text || inputValue.trim();
    if (!query || isLoading || !claudeAvailable) return;

    const userMessage: BotMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Pass full conversation history including the new message
      const conversationHistory = [...messages, userMessage];
      const response = await chatWithBot(conversationHistory, activeClauses);

      const botMessage: BotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      setError(err.message || 'Failed to get response from Claude');
      const errorMessage: BotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message || 'Unknown error'}. Please check your ANTHROPIC_API_KEY environment variable.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplainClause = async () => {
    if (!selectedClause || !claudeAvailable) return;

    setIsLoading(true);
    setError(null);

    const query = `Explain Clause ${selectedClause.clause_number}: ${selectedClause.clause_title}`;

    const userMessage: BotMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const explanation = await explainClause(selectedClause);
      const botMessage: BotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: explanation,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      setError(err.message || 'Failed to explain clause');
      const errorMessage: BotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message || 'Unknown error'}. Please check your ANTHROPIC_API_KEY environment variable.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  // Clean and sanitize AI response text
  const sanitizeMessage = (content: string): string => {
    return content
      // Remove date notes like "Note: 06-27-2024..." or "06-27-2024 Note:..."
      .replace(/\d{2}-\d{2}-\d{4}\s*Note:?[^\n]*/gi, '')
      .replace(/Note:\s*\d{2}-\d{2}-\d{4}[^\n]*/gi, '')
      // Remove standalone date patterns
      .replace(/^\d{2}-\d{2}-\d{4}[^\n]*$/gm, '')
      // Remove messy bullet points and dashes at line start
      .replace(/^\s*[-•*]\s*/gm, '')
      // Remove excessive whitespace
      .replace(/\s{3,}/g, ' ')
      // Normalize line breaks (max 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Remove lines that are just dates or timestamps
      .replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}[^\n]*$/gm, '')
      // Clean up the text
      .trim();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="ai-bot-backdrop"
      />

      {/* Sidebar */}
      <div className="ai-bot-sidebar">
        {/* Header */}
        <div className="ai-bot-header">
          <div className="ai-bot-header-content">
            <h2 className="ai-bot-title">Claude AI Assistant</h2>
            <p className="ai-bot-subtitle">{activeClauses.length} clauses available</p>
          </div>
          <button
            onClick={onClose}
            className="ai-bot-close-btn"
            aria-label="Close assistant"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contract Selector */}
        {contracts.length > 0 && (
          <div className="ai-bot-contract-selector">
            <div className="ai-bot-contract-toggle" onClick={() => setShowContractSelector(!showContractSelector)}>
              <div className="ai-bot-contract-info">
                <span className="ai-bot-contract-label">Contract:</span>
                <span className="ai-bot-contract-name">
                  {selectedContract?.name || 'Select a contract'}
                </span>
              </div>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`ai-bot-contract-chevron ${showContractSelector ? 'rotated' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {showContractSelector && (
              <div className="ai-bot-contract-dropdown">
                {contracts.map((contract) => (
                  <button
                    key={contract.id}
                    onClick={() => handleContractSelect(contract.id)}
                    className={`ai-bot-contract-option ${contract.id === selectedContractId ? 'selected' : ''}`}
                  >
                    <span className="ai-bot-contract-option-name">{contract.name}</span>
                    <span className="ai-bot-contract-option-count">
                      {getAllClausesFromContract(contract).length} clauses
                    </span>
                    {contract.id === selectedContractId && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="ai-bot-contract-check" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status Indicator */}
        {!claudeAvailable && (
          <div className="ai-bot-status-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>Claude API key not configured. Please set ANTHROPIC_API_KEY in your .env.local file.</p>
          </div>
        )}

        {/* Quick Actions */}
        {selectedClause && claudeAvailable && (
          <div className="ai-bot-quick-actions">
            <button
              onClick={handleExplainClause}
              disabled={isLoading}
              className="ai-bot-explain-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Explain Clause {selectedClause.clause_number}
            </button>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && messages.length === 0 && claudeAvailable && (
          <div className="ai-bot-suggestions-wrapper">
            <div className="ai-bot-suggestions" ref={suggestionsRef}>
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isLoading}
                  className="ai-bot-suggestion-card"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Wrapper */}
        <div className="ai-bot-chat-wrapper">
          <div className="ai-bot-chat-window">
            {messages.length === 0 && (
              <div className="ai-bot-empty-state">
                <div className="ai-bot-empty-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="ai-bot-empty-title">Ask me anything about your contract!</h3>
                <p className="ai-bot-empty-text">I can explain clauses, answer questions, and provide suggestions.</p>
              </div>
            )}

            {messages.map((message) => {
              // Clean up the message content
              const cleanContent = sanitizeMessage(message.content);

              return (
                <div
                  key={message.id}
                  className={`ai-bot-message ai-bot-message-${message.role}`}
                >
                  <div className="ai-bot-bubble">
                    {cleanContent.split('\n').map((line, i) => {
                      const trimmed = line.trim();
                      if (!trimmed) return <div key={i} className="h-2" />;

                      let style: React.CSSProperties = {};
                      let content = trimmed;

                      // Style variants based on prefixes
                      if (trimmed.startsWith('🔵')) {
                        style = { fontWeight: 700, color: '#0F2E6B', marginTop: '1rem', marginBottom: '0.5rem' };
                      } else if (trimmed.startsWith('🔹')) {
                        style = { fontWeight: 600, marginBottom: '0.25rem' };
                      } else if (trimmed.startsWith('🔸')) {
                        style = { opacity: 0.8, marginBottom: '0.5rem', paddingLeft: '1rem' };
                      } else if (trimmed.startsWith('🔷')) {
                        style = { fontWeight: 600, color: '#1E6CE8', marginTop: '1rem', marginBottom: '0.5rem' };
                      }

                      // Split by Clause regex to create links
                      // Matches: Clause 1, Clause 1.1, Clause 2A, etc.
                      const parts = content.split(/(Clause\s+[0-9]+(?:[A-Za-z])?(?:\.[0-9]+[A-Za-z]?)*)/g);

                      return (
                        <p key={i} style={style}>
                          {parts.map((part, j) => {
                            if (part.match(/^Clause\s+[0-9]/)) {
                              const clauseNum = part.replace(/^Clause\s+/, '');
                              return (
                                <button
                                  key={j}
                                  onClick={() => scrollToClause(clauseNum)}
                                  className="text-aaa-accent hover:underline font-bold bg-blue-50 px-1 rounded cursor-pointer inline-block transition-colors hover:bg-blue-100"
                                  title={`Scroll to ${part}`}
                                >
                                  {part}
                                </button>
                              );
                            }
                            return <span key={j}>{part}</span>;
                          })}
                        </p>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="ai-bot-message ai-bot-message-ai">
                <div className="ai-bot-bubble">
                  <div className="ai-bot-typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="ai-bot-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="ai-bot-input-area">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything…"
              disabled={isLoading || !claudeAvailable}
              className="ai-bot-input"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !inputValue.trim() || !claudeAvailable}
              className="ai-bot-send-btn"
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .ai-bot-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 46, 107, 0.4);
          backdrop-filter: blur(6px);
          z-index: 999;
          animation: ai-bot-fadeIn 0.2s ease-out;
        }

        .ai-bot-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          width: 480px;
          height: 100vh;
          background: #F4F7FA;
          box-shadow: -8px 0 32px rgba(15, 46, 107, 0.15);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          animation: ai-bot-slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Header */
        .ai-bot-header {
          background: #0F2E6B;
          color: white;
          padding: 1.5rem 1.75rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .ai-bot-header-content {
          flex: 1;
        }

        .ai-bot-title {
          margin: 0;
          font-size: 1.375rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.3;
          color: white;
        }

        .ai-bot-subtitle {
          margin: 0.5rem 0 0;
          font-size: 0.8125rem;
          font-weight: 500;
          opacity: 0.85;
          letter-spacing: 0.01em;
        }

        .ai-bot-close-btn {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
          margin-left: 1rem;
        }

        .ai-bot-close-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: rotate(90deg);
        }

        .ai-bot-close-btn svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        /* Contract Selector */
        .ai-bot-contract-selector {
          background: white;
          border-bottom: 1px solid #E2E8F0;
          flex-shrink: 0;
          position: relative;
        }

        .ai-bot-contract-toggle {
          padding: 1rem 1.75rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .ai-bot-contract-toggle:hover {
          background: #F8FAFC;
        }

        .ai-bot-contract-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .ai-bot-contract-label {
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748B;
        }

        .ai-bot-contract-name {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #0F2E6B;
          max-width: 320px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ai-bot-contract-chevron {
          width: 1.25rem;
          height: 1.25rem;
          color: #64748B;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .ai-bot-contract-chevron.rotated {
          transform: rotate(180deg);
        }

        .ai-bot-contract-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #E2E8F0;
          border-top: none;
          box-shadow: 0 8px 24px rgba(15, 46, 107, 0.12);
          z-index: 10;
          max-height: 300px;
          overflow-y: auto;
        }

        .ai-bot-contract-option {
          width: 100%;
          padding: 1rem 1.75rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.2s ease;
        }

        .ai-bot-contract-option:hover {
          background: #F0F4FF;
        }

        .ai-bot-contract-option.selected {
          background: #E0EBFF;
        }

        .ai-bot-contract-option-name {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1E293B;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ai-bot-contract-option-count {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748B;
          background: #F1F5F9;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .ai-bot-contract-check {
          width: 1.25rem;
          height: 1.25rem;
          color: #1E6CE8;
          flex-shrink: 0;
        }

        /* Status Error */
        .ai-bot-status-error {
          padding: 1rem 1.75rem;
          background: #FEE2E2;
          border-bottom: 1px solid #FECACA;
          color: #991B1B;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .ai-bot-status-error svg {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .ai-bot-status-error p {
          margin: 0;
          font-size: 0.8125rem;
          font-weight: 600;
          line-height: 1.5;
        }

        /* Quick Actions */
        .ai-bot-quick-actions {
          padding: 1rem 1.75rem;
          background: white;
          border-bottom: 1px solid #E2E8F0;
          flex-shrink: 0;
        }

        .ai-bot-explain-btn {
          width: 100%;
          padding: 0.875rem 1.25rem;
          background: #1E6CE8;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          letter-spacing: 0.01em;
        }

        .ai-bot-explain-btn:hover:not(:disabled) {
          background: #0F2E6B;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 46, 107, 0.2);
        }

        .ai-bot-explain-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .ai-bot-explain-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ai-bot-explain-btn svg {
          width: 1rem;
          height: 1rem;
        }

        /* Suggestions */
        .ai-bot-suggestions-wrapper {
          padding: 1.25rem 1.75rem;
          background: white;
          border-bottom: 1px solid #E2E8F0;
          flex-shrink: 0;
          overflow: hidden;
        }

        .ai-bot-suggestions {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          scrollbar-width: thin;
          scrollbar-color: #CBD5E0 transparent;
        }

        .ai-bot-suggestions::-webkit-scrollbar {
          height: 6px;
        }

        .ai-bot-suggestions::-webkit-scrollbar-track {
          background: transparent;
        }

        .ai-bot-suggestions::-webkit-scrollbar-thumb {
          background: #CBD5E0;
          border-radius: 3px;
        }

        .ai-bot-suggestions::-webkit-scrollbar-thumb:hover {
          background: #A0AEC0;
        }

        .ai-bot-suggestion-card {
          background: #F0F4FF;
          border: 1.5px solid #D6E2FF;
          padding: 0.875rem 1.25rem;
          border-radius: 12px;
          cursor: pointer;
          color: #0F2E6B;
          font-size: 0.8125rem;
          font-weight: 600;
          line-height: 1.5;
          white-space: nowrap;
          transition: all 0.2s ease;
          flex-shrink: 0;
          max-width: 280px;
          text-align: left;
        }

        .ai-bot-suggestion-card:hover:not(:disabled) {
          background: #E0EBFF;
          border-color: #1E6CE8;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(15, 46, 107, 0.1);
        }

        .ai-bot-suggestion-card:active:not(:disabled) {
          transform: translateY(0);
        }

        .ai-bot-suggestion-card:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Chat Wrapper */
        .ai-bot-chat-wrapper {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: #F4F7FA;
          padding: 1.5rem 1.75rem;
          gap: 1rem;
        }

        .ai-bot-chat-window {
          flex: 1;
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(15, 46, 107, 0.08);
          padding: 1.5rem;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #CBD5E0 transparent;
        }

        .ai-bot-chat-window::-webkit-scrollbar {
          width: 8px;
        }

        .ai-bot-chat-window::-webkit-scrollbar-track {
          background: transparent;
        }

        .ai-bot-chat-window::-webkit-scrollbar-thumb {
          background: #CBD5E0;
          border-radius: 4px;
        }

        .ai-bot-chat-window::-webkit-scrollbar-thumb:hover {
          background: #A0AEC0;
        }

        /* Empty State */
        .ai-bot-empty-state {
          text-align: center;
          color: #64748B;
          padding: 3rem 1rem;
        }

        .ai-bot-empty-icon {
          width: 4rem;
          height: 4rem;
          margin: 0 auto 1.5rem;
          color: #CBD5E0;
        }

        .ai-bot-empty-title {
          margin: 0 0 0.5rem;
          font-size: 1.125rem;
          font-weight: 700;
          color: #334155;
          letter-spacing: -0.01em;
        }

        .ai-bot-empty-text {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 500;
          opacity: 0.8;
          line-height: 1.6;
        }

        /* Messages */
        .ai-bot-message {
          width: 100%;
          display: flex;
          margin-bottom: 1.25rem;
        }

        .ai-bot-message-user {
          justify-content: flex-end;
        }

        .ai-bot-message-ai {
          justify-content: flex-start;
        }

        .ai-bot-bubble {
          max-width: 80%;
          padding: 1rem 1.25rem;
          border-radius: 16px;
          line-height: 1.7;
          font-size: 0.9375rem;
          font-weight: 500;
          word-wrap: break-word;
          word-break: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
          text-align: left;
        }

        .ai-bot-message-user .ai-bot-bubble {
          background: #0F2E6B;
          color: white;
          border-bottom-right-radius: 4px;
          font-weight: 500;
          text-align: left;
        }

        .ai-bot-message-ai .ai-bot-bubble {
          background: #F0F4FF;
          color: #1E293B;
          border-bottom-left-radius: 4px;
          font-weight: 500;
          text-align: left;
        }

        .ai-bot-bubble p {
          margin: 0 0 0.875rem;
          text-align: left;
          line-height: 1.7;
        }

        .ai-bot-bubble p:last-child {
          margin-bottom: 0;
        }

        .ai-bot-bubble p:first-child {
          margin-top: 0;
        }

        .ai-bot-bubble ul,
        .ai-bot-bubble ol {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
          text-align: left;
        }

        .ai-bot-bubble li {
          margin: 0.375rem 0;
          line-height: 1.7;
        }

        .ai-bot-bubble code {
          background: rgba(15, 46, 107, 0.1);
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.875em;
          font-family: 'JetBrains Mono', monospace;
        }

        .ai-bot-bubble * {
          text-align: left;
        }

        /* Typing Indicator */
        .ai-bot-typing {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
        }

        .ai-bot-typing span {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #1E6CE8;
          border-radius: 50%;
          animation: ai-bot-typing 1.4s infinite ease-in-out;
        }

        .ai-bot-typing span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .ai-bot-typing span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes ai-bot-typing {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(-6px);
          }
        }

        /* Error Message */
        .ai-bot-error {
          padding: 1rem 1.25rem;
          background: #FEE2E2;
          color: #991B1B;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          border: 1px solid #FECACA;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          line-height: 1.5;
        }

        .ai-bot-error svg {
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        /* Input Area */
        .ai-bot-input-area {
          display: flex;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .ai-bot-input {
          flex: 1;
          padding: 1rem 1.25rem;
          border-radius: 14px;
          border: 2px solid #E2E8F0;
          font-size: 0.9375rem;
          font-weight: 500;
          background: white;
          outline: none;
          transition: all 0.2s ease;
          color: #1E293B;
        }

        .ai-bot-input::placeholder {
          color: #94A3B8;
          font-weight: 500;
        }

        .ai-bot-input:focus {
          border-color: #1E6CE8;
          box-shadow: 0 0 0 3px rgba(30, 108, 232, 0.1);
        }

        .ai-bot-input:disabled {
          background: #F1F5F9;
          cursor: not-allowed;
          color: #94A3B8;
        }

        .ai-bot-send-btn {
          padding: 1rem 1.5rem;
          background: #1E6CE8;
          color: white;
          border-radius: 14px;
          border: none;
          font-size: 0.9375rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .ai-bot-send-btn:hover:not(:disabled) {
          background: #0F2E6B;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 46, 107, 0.2);
        }

        .ai-bot-send-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .ai-bot-send-btn:disabled {
          background: #CBD5E0;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .ai-bot-send-btn svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        /* Animations */
        @keyframes ai-bot-slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes ai-bot-fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};
