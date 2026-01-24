import React, { useState, useRef, useEffect } from 'react';
import { ContractSummary } from '../../services/adminEditorService';
import { EditorLoadingState } from '../../hooks/useAdminEditor';

interface ContractPickerProps {
  contracts: ContractSummary[];
  selectedContractId: string | null;
  loading: EditorLoadingState;
  onSelect: (contractId: string) => void;
}

/**
 * ContractPicker Component
 * Dropdown to select a contract for editing
 */
export const ContractPicker: React.FC<ContractPickerProps> = ({
  contracts,
  selectedContractId,
  loading,
  onSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedContract = contracts.find(c => c.id === selectedContractId);

  const filteredContracts = contracts.filter(contract =>
    contract.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (contractId: string) => {
    onSelect(contractId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading === 'loading'}
        className={`
          w-full flex items-center justify-between gap-3 px-4 py-3
          bg-white border border-aaa-border rounded-xl
          hover:border-aaa-blue transition-all
          ${loading === 'loading' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'border-aaa-blue ring-2 ring-aaa-blue/10' : ''}
        `}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-aaa-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-aaa-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-left min-w-0">
            {loading === 'loading' ? (
              <span className="text-aaa-muted text-sm">Loading contracts...</span>
            ) : selectedContract ? (
              <>
                <p className="font-semibold text-aaa-text truncate">{selectedContract.name}</p>
                <p className="text-xs text-aaa-muted">{formatDate(selectedContract.timestamp)}</p>
              </>
            ) : (
              <span className="text-aaa-muted">Select a contract...</span>
            )}
          </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-5 h-5 text-aaa-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-aaa-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-aaa-border">
            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aaa-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contracts..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-aaa-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aaa-blue/20 focus:border-aaa-blue"
              />
            </div>
          </div>

          {/* Contract List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredContracts.length === 0 ? (
              <div className="p-4 text-center text-aaa-muted text-sm">
                {searchQuery ? 'No contracts match your search' : 'No contracts available'}
              </div>
            ) : (
              filteredContracts.map((contract) => (
                <button
                  key={contract.id}
                  onClick={() => handleSelect(contract.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left
                    hover:bg-slate-50 transition-colors
                    ${contract.id === selectedContractId ? 'bg-aaa-blue/5' : ''}
                  `}
                >
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${contract.id === selectedContractId ? 'bg-aaa-blue text-white' : 'bg-slate-100 text-aaa-muted'}
                  `}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium truncate ${contract.id === selectedContractId ? 'text-aaa-blue' : 'text-aaa-text'}`}>
                      {contract.name}
                    </p>
                    <p className="text-xs text-aaa-muted">{formatDate(contract.timestamp)}</p>
                  </div>
                  {contract.id === selectedContractId && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-aaa-blue flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-aaa-border bg-slate-50">
            <p className="text-xs text-aaa-muted text-center">
              {contracts.length} contract{contracts.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractPicker;
