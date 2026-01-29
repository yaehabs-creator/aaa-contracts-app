import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clause, BotMessage, SavedContract } from '../../types';
import { 
  chatWithBot, 
  getSuggestions, 
  explainClause, 
  chatWithDocuments, 
  getDocumentSummary, 
  searchContractDocuments,
  chatWithDualAgents,
  getAgentStatus,
  isDualAgentModeAvailable,
  getAgentCapabilitiesSummary
} from '../services/aiBotService';
import { isClaudeAvailable } from '../services/aiProvider';
import { scrollToClause } from '../utils/navigation';
import { getAllClausesFromContract } from '../../services/contractMigrationService';

// Thinking messages for Apple-style calm UX
const THINKING_MESSAGES = [
  'Reading the contract…',
  'Analyzing clauses…',
  'Checking relevant sections…',
];

// Extended message type to track which agents contributed
interface ExtendedBotMessage extends BotMessage {
  agentsUsed?: ('openai' | 'claude')[];
  isDualMode?: boolean;
}

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
  const [messages, setMessages] = useState<ExtendedBotMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState<string>(THINKING_MESSAGES[0]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(activeContractId || null);
  const [showContractSelector, setShowContractSelector] = useState(false);
  const [documentCount, setDocumentCount] = useState<number>(0);
  const [dualAgentMode, setDualAgentMode] = useState<boolean>(false);
  const [agentStatusInfo, setAgentStatusInfo] = useState<{
    openai: { available: boolean; name: string };
    claude: { available: boolean; name: string };
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const requestInFlightRef = useRef<boolean>(false);

  const claudeAvailable = isClaudeAvailable();
  
  // Check for dual-agent mode availability
  useEffect(() => {
    const status = getAgentStatus();
    setAgentStatusInfo({
      openai: { available: status.openai.available, name: status.openai.name },
      claude: { available: status.claude.available, name: status.claude.name }
    });
    setDualAgentMode(status.dualAgentMode);
  }, []);

  // Get the currently selected contract and its clauses
  const selectedContract = contracts.find(c => c.id === selectedContractId);
  
  // Safely get clauses from contract with fallback
  const getClausesSafe = (contract: SavedContract | null | undefined): Clause[] => {
    if (!contract) return [];
    try {
      return getAllClausesFromContract(contract);
    } catch (e) {
      console.warn('Failed to get clauses from contract:', contract.name, e);
      return [];
    }
  };
  
  const activeClauses = selectedContract 
    ? getClausesSafe(selectedContract) 
    : clauses;

  // Update selected contract when activeContractId changes
  useEffect(() => {
    if (activeContractId && activeContractId !== selectedContractId) {
      setSelectedContractId(activeContractId);
    }
  }, [activeContractId]);

  // Check for uploaded documents when contract changes
  useEffect(() => {
    const checkDocuments = async () => {
      if (selectedContractId) {
        try {
          const summary = await getDocumentSummary(selectedContractId);
          // Parse the summary to extract document count
          const match = summary.match(/Total: (\d+) documents/);
          if (match) {
            setDocumentCount(parseInt(match[1], 10));
          } else {
            setDocumentCount(0);
          }
        } catch {
          setDocumentCount(0);
        }
      } else {
        setDocumentCount(0);
      }
    };
    checkDocuments();
  }, [selectedContractId]);

  const handleContractSelect = (contractId: string) => {
    setSelectedContractId(contractId);
    setShowContractSelector(false);
    // Clear messages when switching contracts
    setMessages([]);
    setSuggestions([]);
    setDocumentCount(0);
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

  // Safety timeout: reset loading state after 60 seconds to prevent permanent lock
  useEffect(() => {
    if (!isLoading) return;

    const timeout = setTimeout(() => {
      setIsLoading(false);
      requestInFlightRef.current = false;
    }, 60000); // 60s safety

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Rotate thinking messages while loading
  useEffect(() => {
    if (!isLoading) {
      setThinkingMessage(THINKING_MESSAGES[0]);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % THINKING_MESSAGES.length;
      setThinkingMessage(THINKING_MESSAGES[index]);
    }, 2500);

    return () => clearInterval(interval);
  }, [isLoading]);

  const loadSuggestions = async () => {
    if (!claudeAvailable) return;
    try {
      const suggs = await getSuggestions(activeClauses);
      setSuggestions(suggs);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const sendMessage = useCallback(async (text?: string) => {
    const query = text || inputValue.trim();
    
    // Silent ignore if empty, already loading, or request in flight
    // MacBook-style: no error, no toast, just ignore
    if (!query || isLoading || requestInFlightRef.current) return;
    
    // Check if at least one agent is available
    const anyAgentAvailable = claudeAvailable || (agentStatusInfo?.openai.available ?? false);
    if (!anyAgentAvailable) return;

    // Lock the request
    requestInFlightRef.current = true;

    const userMessage: ExtendedBotMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Pass full conversation history including the new message
      const conversationHistory = [...messages, userMessage];
      
      let response: string;
      let agentsUsed: ('openai' | 'claude')[] = [];
      let isDualModeResponse = false;
      
      // Use dual-agent mode if available and contract is selected
      if (dualAgentMode && selectedContractId) {
        try {
          const dualResult = await chatWithDualAgents(
            conversationHistory,
            activeClauses,
            selectedContractId
          );
          response = dualResult.response;
          agentsUsed = dualResult.agentsUsed;
          isDualModeResponse = dualResult.isDualMode;
        } catch (dualErr) {
          console.warn('Dual-agent mode failed, falling back to single agent:', dualErr);
          // Fall back to single-agent mode
          response = await chatWithBot(conversationHistory, activeClauses, selectedContractId);
          agentsUsed = ['claude'];
        }
      } else if (selectedContractId) {
        // Use chatWithBot with contractId - this triggers full context loading
        // including document chunks from Supabase
        response = await chatWithBot(conversationHistory, activeClauses, selectedContractId);
        agentsUsed = ['claude'];
      } else {
        // No contract selected - use basic clause-based chat
        response = await chatWithBot(conversationHistory, activeClauses);
        agentsUsed = ['claude'];
      }

      const botMessage: ExtendedBotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        agentsUsed,
        isDualMode: isDualModeResponse
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      // Show error as a subtle assistant message, not a harsh error banner
      const errorMessage: ExtendedBotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I couldn't complete that request. ${err.message?.includes('rate') ? 'The service is busy — please try again in a moment.' : 'Please try again.'}`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      requestInFlightRef.current = false;
    }
  }, [inputValue, isLoading, claudeAvailable, agentStatusInfo, messages, dualAgentMode, selectedContractId, activeClauses]);

  // Show agent status
  const showAgentStatus = () => {
    const statusMessage: ExtendedBotMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: getAgentCapabilitiesSummary(),
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, statusMessage]);
  };

  // Show document summary
  const showDocuments = useCallback(async () => {
    // Silent ignore if already loading
    if (!selectedContractId || isLoading || requestInFlightRef.current) return;
    
    requestInFlightRef.current = true;
    setIsLoading(true);
    
    const userMessage: ExtendedBotMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: '📁 Show uploaded documents',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const summary = await getDocumentSummary(selectedContractId);
      const botMessage: BotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: summary,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      const errorMessage: BotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I couldn\'t load the documents right now. Please try again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      requestInFlightRef.current = false;
    }
  }, [selectedContractId, isLoading]);

  const handleExplainClause = useCallback(async () => {
    // Silent ignore if already loading
    if (!selectedClause || !claudeAvailable || isLoading || requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    setIsLoading(true);

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
      const errorMessage: BotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I couldn\'t explain that clause right now. Please try again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      requestInFlightRef.current = false;
    }
  }, [selectedClause, claudeAvailable, isLoading]);

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
            <h2 className="ai-bot-title">
              {dualAgentMode ? 'Dual AI Contract Experts' : 'Claude AI Assistant'}
            </h2>
            <p className="ai-bot-subtitle">
              {activeClauses.length} clauses{documentCount > 0 ? ` + ${documentCount} docs` : ''} available
            </p>
            {dualAgentMode && (
              <div className="ai-bot-dual-mode-badge">
                <span className="ai-bot-agent-dot openai"></span>
                <span className="ai-bot-agent-dot claude"></span>
                Dual-Agent Mode Active
              </div>
            )}
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
                      {getClausesSafe(contract).length} clauses
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
        {!claudeAvailable && !agentStatusInfo?.openai.available && (
          <div className="ai-bot-status-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>No AI agents configured. Please set VITE_ANTHROPIC_API_KEY and/or VITE_OPENAI_API_KEY in your .env.local file.</p>
          </div>
        )}

        {/* Agent Status Bar */}
        {agentStatusInfo && (
          <div className="ai-bot-agent-status-bar">
            <div className={`ai-bot-agent-indicator ${agentStatusInfo.claude.available ? 'active' : 'inactive'}`}>
              <span className="ai-bot-agent-icon claude-icon">C</span>
              <span className="ai-bot-agent-label">GC/PC Expert</span>
              <span className={`ai-bot-agent-status ${agentStatusInfo.claude.available ? 'online' : 'offline'}`}>
                {agentStatusInfo.claude.available ? '●' : '○'}
              </span>
            </div>
            <div className={`ai-bot-agent-indicator ${agentStatusInfo.openai.available ? 'active' : 'inactive'}`}>
              <span className="ai-bot-agent-icon openai-icon">O</span>
              <span className="ai-bot-agent-label">Doc Expert</span>
              <span className={`ai-bot-agent-status ${agentStatusInfo.openai.available ? 'online' : 'offline'}`}>
                {agentStatusInfo.openai.available ? '●' : '○'}
              </span>
            </div>
            <button 
              className="ai-bot-agent-info-btn"
              onClick={showAgentStatus}
              title="Show AI agent details"
            >
              ?
            </button>
          </div>
        )}

        {/* Quick Actions */}
        {(claudeAvailable || agentStatusInfo?.openai.available) && (
          <div className="ai-bot-quick-actions">
            {selectedClause && (
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
            )}
            {selectedContractId && (
              <button
                onClick={showDocuments}
                disabled={isLoading}
                className="ai-bot-docs-btn"
                title="Show uploaded documents from Supabase"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                📁 Show Documents
              </button>
            )}
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
                <p className="ai-bot-empty-text">
                  {dualAgentMode 
                    ? 'Two AI experts collaborate: Claude analyzes GC/PC conditions while OpenAI examines your documents.' 
                    : 'I can explain clauses, answer questions, and provide suggestions.'}
                </p>
              </div>
            )}

            {messages.map((message) => {
              // Clean up the message content
              const cleanContent = sanitizeMessage(message.content);
              const extendedMsg = message as ExtendedBotMessage;

              return (
                <div
                  key={message.id}
                  className={`ai-bot-message ai-bot-message-${message.role}`}
                >
                  {/* Agent attribution badge for AI responses */}
                  {message.role === 'assistant' && extendedMsg.agentsUsed && extendedMsg.agentsUsed.length > 0 && (
                    <div className="ai-bot-agent-attribution">
                      {extendedMsg.isDualMode && (
                        <span className="ai-bot-attribution-badge dual">
                          <span className="badge-icon">🔄</span> Dual-Agent Response
                        </span>
                      )}
                      {extendedMsg.agentsUsed.includes('claude') && (
                        <span className="ai-bot-attribution-badge claude">
                          <span className="badge-icon">C</span> GC/PC Expert
                        </span>
                      )}
                      {extendedMsg.agentsUsed.includes('openai') && (
                        <span className="ai-bot-attribution-badge openai">
                          <span className="badge-icon">O</span> Doc Expert
                        </span>
                      )}
                    </div>
                  )}
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

            {/* Subtle thinking indicator - MacBook style */}
            {isLoading && (
              <div className="ai-bot-thinking-indicator">
                <div className="ai-bot-thinking-dot"></div>
                <span className="ai-bot-thinking-text">{thinkingMessage}</span>
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
              placeholder={isLoading ? thinkingMessage : "Ask anything…"}
              disabled={!claudeAvailable}
              className={`ai-bot-input ${isLoading ? 'ai-bot-input-thinking' : ''}`}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !inputValue.trim() || !claudeAvailable}
              className={`ai-bot-send-btn ${isLoading ? 'ai-bot-send-btn-loading' : ''}`}
              aria-label={isLoading ? 'Analyzing' : 'Send message'}
            >
              {isLoading ? (
                <div className="ai-bot-btn-spinner"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
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
          width: 460px;
          height: 100vh;
          background: #F8FAFC;
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.1);
          border-left: 1px solid rgba(0, 0, 0, 0.06);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          animation: ai-bot-slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Header - Modern Indigo style */
        .ai-bot-header {
          background: linear-gradient(180deg, #6366F1 0%, #4F46E5 100%);
          color: white;
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
        }

        .ai-bot-header-content {
          flex: 1;
        }

        .ai-bot-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          letter-spacing: -0.01em;
          line-height: 1.3;
          color: white;
        }

        .ai-bot-subtitle {
          margin: 0.375rem 0 0;
          font-size: 0.8125rem;
          font-weight: 400;
          opacity: 0.8;
        }

        .ai-bot-dual-mode-badge {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          margin-top: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          width: fit-content;
        }

        .ai-bot-agent-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .ai-bot-agent-dot.openai {
          background: #10B981;
        }

        .ai-bot-agent-dot.claude {
          background: #F59E0B;
        }

        /* Agent Status Bar */
        .ai-bot-agent-status-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.75rem;
          background: #F8FAFC;
          border-bottom: 1px solid #E2E8F0;
          flex-shrink: 0;
        }

        .ai-bot-agent-indicator {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.625rem;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          font-size: 0.75rem;
          transition: all 0.2s ease;
        }

        .ai-bot-agent-indicator.active {
          border-color: #10B981;
          background: #ECFDF5;
        }

        .ai-bot-agent-indicator.inactive {
          opacity: 0.5;
        }

        .ai-bot-agent-icon {
          width: 1.25rem;
          height: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 800;
          color: white;
        }

        .ai-bot-agent-icon.claude-icon {
          background: linear-gradient(135deg, #F59E0B, #D97706);
        }

        .ai-bot-agent-icon.openai-icon {
          background: linear-gradient(135deg, #10B981, #059669);
        }

        .ai-bot-agent-label {
          font-weight: 600;
          color: #475569;
        }

        .ai-bot-agent-status {
          font-size: 0.625rem;
        }

        .ai-bot-agent-status.online {
          color: #10B981;
        }

        .ai-bot-agent-status.offline {
          color: #94A3B8;
        }

        .ai-bot-agent-info-btn {
          margin-left: auto;
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #E2E8F0;
          border: none;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748B;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ai-bot-agent-info-btn:hover {
          background: #CBD5E1;
          color: #334155;
        }

        /* Agent Attribution Badges */
        .ai-bot-agent-attribution {
          display: flex;
          gap: 0.375rem;
          margin-bottom: 0.375rem;
          flex-wrap: wrap;
        }

        .ai-bot-attribution-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .ai-bot-attribution-badge .badge-icon {
          font-size: 0.5rem;
          width: 0.875rem;
          height: 0.875rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }

        .ai-bot-attribution-badge.dual {
          background: linear-gradient(135deg, #8B5CF6, #6366F1);
          color: white;
        }

        .ai-bot-attribution-badge.claude {
          background: #FEF3C7;
          color: #92400E;
        }

        .ai-bot-attribution-badge.openai {
          background: #D1FAE5;
          color: #065F46;
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

        .ai-bot-docs-btn {
          width: 100%;
          padding: 0.75rem 1rem;
          margin-top: 0.5rem;
          background: #f59e0b;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .ai-bot-docs-btn:hover:not(:disabled) {
          background: #d97706;
          transform: translateY(-1px);
        }

        .ai-bot-docs-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ai-bot-docs-btn svg {
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

        /* Subtle Thinking Indicator - MacBook style */
        .ai-bot-thinking-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          color: #64748B;
          font-size: 0.8125rem;
          font-weight: 500;
        }

        .ai-bot-thinking-dot {
          width: 8px;
          height: 8px;
          background: #1E6CE8;
          border-radius: 50%;
          animation: ai-bot-pulse 1.5s ease-in-out infinite;
        }

        .ai-bot-thinking-text {
          animation: ai-bot-fade-text 0.3s ease-out;
        }

        @keyframes ai-bot-pulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        @keyframes ai-bot-fade-text {
          from {
            opacity: 0;
            transform: translateY(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
        }

        /* MacBook-style loading button */
        .ai-bot-send-btn-loading {
          opacity: 0.7;
          cursor: not-allowed;
          background: #94A3B8;
        }

        .ai-bot-send-btn-loading:hover {
          transform: none !important;
          box-shadow: none !important;
        }

        .ai-bot-send-btn svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        /* Button spinner */
        .ai-bot-btn-spinner {
          width: 1.125rem;
          height: 1.125rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: ai-bot-spin 0.6s linear infinite;
        }

        @keyframes ai-bot-spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Input thinking state */
        .ai-bot-input-thinking {
          background: #F8FAFC;
          color: #94A3B8;
        }

        .ai-bot-input-thinking::placeholder {
          color: #64748B;
          font-style: italic;
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
