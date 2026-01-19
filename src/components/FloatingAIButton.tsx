import React from 'react';

interface FloatingAIButtonProps {
  onClick: () => void;
  isOpen: boolean;
  className?: string;
}

export const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({ onClick, isOpen, className = '' }) => {
  return (
    <>
      <button
        onClick={onClick}
        className={`floating-ai-button ${isOpen ? 'floating-ai-button-active' : ''} ${className}`}
        aria-label={isOpen ? 'Close Claude AI Assistant' : 'Open Claude AI Assistant'}
        title={isOpen ? 'Close Claude AI Assistant' : 'Open Claude AI Assistant'}
      >
        <div className="floating-ai-button-content">
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="floating-ai-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="floating-ai-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
          {!isOpen && <span className="floating-ai-text">Ask AI</span>}
        </div>
      </button>

      <style>{`
        .floating-ai-button {
          position: fixed;
          bottom: 24px;
          right: 24px;
          height: 56px;
          padding: 0 20px;
          border-radius: 9999px;
          background: #0F2E6B;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(15, 46, 107, 0.25);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 50;
          outline: none;
          min-width: 56px;
        }

        .floating-ai-button:hover {
          background: #1E6CE8;
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(15, 46, 107, 0.35);
        }

        .floating-ai-button:active {
          transform: translateY(0);
        }

        .floating-ai-button:focus {
          outline: 3px solid rgba(30, 108, 232, 0.3);
          outline-offset: 4px;
        }

        .floating-ai-button-active {
          background: #1E6CE8;
          border-radius: 50%;
          padding: 0;
          width: 56px;
          min-width: 56px;
        }

        .floating-ai-button-active:hover {
          background: #0F2E6B;
        }

        .floating-ai-button-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          white-space: nowrap;
        }

        .floating-ai-icon {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          transition: transform 0.3s ease;
        }

        .floating-ai-button:hover .floating-ai-icon {
          transform: scale(1.1);
        }

        .floating-ai-text {
          font-size: 0.9375rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          transition: opacity 0.3s ease;
        }

        .floating-ai-button-active .floating-ai-text {
          display: none;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .floating-ai-button {
            bottom: 20px;
            right: 20px;
            height: 52px;
            padding: 0 16px;
          }

          .floating-ai-button-active {
            width: 52px;
            min-width: 52px;
          }

          .floating-ai-icon {
            width: 20px;
            height: 20px;
          }

          .floating-ai-text {
            font-size: 0.875rem;
          }
        }

        /* Animation for initial appearance */
        @keyframes floating-ai-fade-in {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .floating-ai-button {
          animation: floating-ai-fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </>
  );
};
