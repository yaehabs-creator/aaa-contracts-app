import React from 'react';
import { SaveStatus } from '../../hooks/useDebouncedSave';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  error?: Error | null;
  onRetry?: () => void;
}

/**
 * SaveStatusIndicator Component
 * Shows the current save status with appropriate styling
 */
export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  status,
  error,
  onRetry
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          text: 'Pending...',
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-600',
          borderColor: 'border-amber-200'
        };
      case 'saving':
        return {
          icon: (
            <div className="w-4 h-4 border-2 border-aaa-blue border-t-transparent rounded-full animate-spin"></div>
          ),
          text: 'Saving...',
          bgColor: 'bg-blue-50',
          textColor: 'text-aaa-blue',
          borderColor: 'border-indigo-200'
        };
      case 'saved':
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          text: 'Saved',
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-600',
          borderColor: 'border-emerald-200'
        };
      case 'error':
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          text: 'Error',
          bgColor: 'bg-red-50',
          textColor: 'text-red-600',
          borderColor: 'border-red-200'
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  if (!config) {
    return null;
  }

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        transition-all duration-200
      `}
    >
      {config.icon}
      <span className="text-xs font-medium">{config.text}</span>
      
      {status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="ml-1 px-2 py-0.5 bg-red-100 hover:bg-red-200 rounded text-[10px] font-bold uppercase transition-colors"
        >
          Retry
        </button>
      )}
      
      {status === 'error' && error && (
        <span className="text-[10px] opacity-75 max-w-32 truncate" title={error.message}>
          {error.message}
        </span>
      )}
    </div>
  );
};

/**
 * Compact version for inline use
 */
export const SaveStatusDot: React.FC<{ status: SaveStatus }> = ({ status }) => {
  const getColor = () => {
    switch (status) {
      case 'pending':
        return 'bg-amber-400';
      case 'saving':
        return 'bg-blue-400 animate-pulse';
      case 'saved':
        return 'bg-emerald-400';
      case 'error':
        return 'bg-red-400';
      default:
        return 'bg-transparent';
    }
  };

  if (status === 'idle') {
    return null;
  }

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${getColor()}`}
      title={status}
    />
  );
};

export default SaveStatusIndicator;
