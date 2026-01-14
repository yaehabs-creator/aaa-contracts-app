import React, { useState, useEffect, useRef } from 'react';
import { Clause, BotMessage } from '../../types';
import { chatWithBot, getSuggestions, explainClause } from '../services/aiBotService';
import { isClaudeAvailable } from '../services/aiProvider';

interface AIBotSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  clauses: Clause[];
  selectedClause?: Clause | null;
}

export const AIBotSidebar: React.FC<AIBotSidebarProps> = ({
  isOpen,
  onClose,
  clauses,
  selectedClause
}) => {
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const claudeAvailable = isClaudeAvailable();

  useEffect(() => {
    // Load suggestions when clauses change
    if (clauses.length > 0 && isOpen && claudeAvailable) {
      loadSuggestions();
    }
  }, [clauses, isOpen]);

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
      const suggs = await getSuggestions(clauses);
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
      const response = await chatWithBot(query, clauses);
      
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
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 999,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '420px',
          height: '100vh',
          background: '#F4F7FA',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#0F2E6B',
            color: 'white',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
              🧠 Claude AI Assistant
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
              {clauses.length} clauses available
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Status Indicator */}
        {!claudeAvailable && (
          <div
            style={{
              padding: '1rem 1.5rem',
              background: '#FEE2E2',
              borderBottom: '1px solid #FECACA',
              color: '#991B1B'
            }}
          >
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600' }}>
              ⚠️ Claude API key not configured. Please set ANTHROPIC_API_KEY in your .env.local file.
            </p>
          </div>
        )}

        {/* Quick Actions */}
        {selectedClause && claudeAvailable && (
          <div
            style={{
              padding: '1rem 1.5rem',
              background: 'white',
              borderTop: '1px solid #D1D9E6',
              borderBottom: '1px solid #D1D9E6'
            }}
          >
            <button
              onClick={handleExplainClause}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#1E6CE8',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.background = '#0F2E6B';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.background = '#1E6CE8';
              }}
            >
              📖 Explain Clause {selectedClause.clause_number}
            </button>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && messages.length === 0 && claudeAvailable && (
          <div className="suggestions">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isLoading}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Chat Wrapper - Contains chat-window and input-area */}
        <div className="chat-wrapper" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="chat-window" id="chat">
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#5C6B82', marginTop: '2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
                <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Ask me anything about your contract!
                </p>
                <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  I can explain clauses, answer questions, and provide suggestions.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.role}`}
              >
                <div className="bubble" dangerouslySetInnerHTML={{ __html: message.content }} />
              </div>
            ))}

            {isLoading && (
              <div className="message ai">
                <div className="bubble">
                  <div className="typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: '#FEE2E2',
                  color: '#991B1B',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  border: '1px solid #FECACA',
                  marginBottom: '18px'
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <input
              ref={inputRef}
              id="input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything…"
              disabled={isLoading || !claudeAvailable}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !inputValue.trim() || !claudeAvailable}
              style={{
                opacity: (isLoading || !inputValue.trim() || !claudeAvailable) ? 0.6 : 1,
                cursor: (isLoading || !inputValue.trim() || !claudeAvailable) ? 'not-allowed' : 'pointer'
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .chat-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #f5f7fb;
          padding: 20px;
          align-items: center;
        }

        .chat-window {
          width: 100%;
          max-width: 900px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          padding: 20px 30px;
          overflow-y: auto;
          flex: 1;
          margin-bottom: 0;
        }

        .message {
          width: 100%;
          display: flex;
          margin-bottom: 18px;
        }

        .message.user {
          justify-content: flex-end;
        }

        .message.ai {
          justify-content: flex-start;
        }

        .bubble {
          max-width: 75%;
          padding: 14px 18px;
          border-radius: 14px;
          line-height: 1.5;
          font-size: 15px;
        }

        .message.user .bubble {
          background: #1a73e8;
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message.ai .bubble {
          background: #f0f4ff;
          color: #222;
          border-bottom-left-radius: 4px;
        }

        .input-area {
          width: 100%;
          max-width: 900px;
          display: flex;
          margin-top: 20px;
        }

        .input-area input {
          flex: 1;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid #c8d4f0;
          font-size: 15px;
          background: white;
          outline: none;
        }

        .input-area input:focus {
          border-color: #1a73e8;
        }

        .input-area input:disabled {
          background: #f5f7fb;
          cursor: not-allowed;
        }

        .input-area button {
          margin-left: 10px;
          padding: 14px 22px;
          background: #1a73e8;
          color: white;
          border-radius: 12px;
          border: none;
          font-size: 15px;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .input-area button:hover:not(:disabled) {
          background: #1557b0;
        }

        .input-area button:disabled {
          background: #c8d4f0;
          cursor: not-allowed;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .typing {
          display: inline-block;
          width: 60px;
          height: 12px;
        }

        .typing span {
          display: inline-block;
          width: 8px;
          height: 8px;
          margin: 0 3px;
          background: #1a73e8;
          border-radius: 50%;
          animation: typing 1.2s infinite ease-in-out;
        }

        .typing span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0% { opacity: .2; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-4px); }
          100% { opacity: .2; transform: translateY(0); }
        }

        .suggestions {
          margin-top: 15px;
          display: flex;
          gap: 10px;
        }

        .suggestions button {
          background: #f0f4ff;
          border: 1px solid #d6e2ff;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
          color: #1a73e8;
          font-size: 14px;
        }

        .suggestions button:hover:not(:disabled) {
          background: #e0ebff;
          border-color: #1a73e8;
        }

        .suggestions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
};
