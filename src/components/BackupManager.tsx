import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SavedContract } from '@/types';
import {
  exportAllContractsToJSON,
  exportContractsToJSON,
  importContractsFromJSON,
  restoreContracts,
  downloadBackupFile,
  validateBackupFile,
  BackupFile,
  RestoreMode
} from '@/services/backupService';
import { getAllContracts } from '@/services/dbService';

export const BackupManager: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [allContracts, setAllContracts] = useState<SavedContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<BackupFile | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge');
  const [restoreProgress, setRestoreProgress] = useState<{ current: number; total: number } | null>(null);

  // Ref to prevent multiple simultaneous restores
  const isRestoringRef = useRef(false);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      const contracts = await getAllContracts();
      setAllContracts(contracts);
    } catch (err: any) {
      setError(err.message || 'Failed to load contracts');
    }
  };

  const handleExportAll = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const jsonContent = await exportAllContractsToJSON(currentUser?.email || 'admin');
      const filename = `contract-backup-all-${new Date().toISOString().split('T')[0]}.json`;
      downloadBackupFile(jsonContent, filename);

      setSuccess(`Successfully exported ${allContracts.length} contracts to backup file.`);
    } catch (err: any) {
      setError(err.message || 'Failed to export contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContracts = () => {
    setShowSelectModal(true);
    setSelectedContracts(new Set());
  };

  const handleExportSelected = async () => {
    if (selectedContracts.size === 0) {
      setError('Please select at least one contract to export');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const contractsToExport = allContracts.filter(c => selectedContracts.has(c.id));
      const jsonContent = await exportContractsToJSON(contractsToExport, currentUser?.email || 'admin');
      const filename = `contract-backup-selected-${new Date().toISOString().split('T')[0]}.json`;
      downloadBackupFile(jsonContent, filename);

      setSuccess(`Successfully exported ${contractsToExport.length} contracts to backup file.`);
      setShowSelectModal(false);
      setSelectedContracts(new Set());
    } catch (err: any) {
      setError(err.message || 'Failed to export contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('Please select a JSON backup file');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const backup = await importContractsFromJSON(file);
      const validation = validateBackupFile(backup);

      if (!validation.valid) {
        setError(`Invalid backup file: ${validation.errors.join(', ')}`);
        setLoading(false);
        return;
      }

      setRestoreFile(file);
      setRestorePreview(backup);
      setShowRestoreModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to read backup file');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restorePreview) return;

    // Prevent multiple simultaneous restores using ref
    if (isRestoringRef.current || loading) {
      console.warn('Restore already in progress, ignoring duplicate call');
      return;
    }

    if (!window.confirm(
      `Are you sure you want to restore ${restorePreview.contractCount} contracts?\n\n` +
      `Mode: ${restoreMode === 'replace' ? 'Replace All' : restoreMode === 'merge' ? 'Merge (Update Existing)' : 'Add Only (Skip Duplicates)'}\n\n` +
      `This action cannot be undone.`
    )) {
      return;
    }

    try {
      // Set both state and ref to prevent multiple calls
      isRestoringRef.current = true;
      setLoading(true);
      setError('');
      setSuccess('');
      setRestoreProgress({ current: 0, total: restorePreview.contractCount });

      const result = await restoreContracts(
        restorePreview.contracts,
        restoreMode,
        (current, total) => {
          setRestoreProgress({ current, total });
        }
      );

      setRestoreProgress(null);

      if (result.errors.length > 0) {
        setError(`Restore completed with errors: ${result.errors.join('; ')}`);
      } else {
        setSuccess(
          `Successfully restored ${result.restored} contracts. ` +
          (result.skipped > 0 ? `${result.skipped} contracts skipped (duplicates).` : '')
        );
      }

      // Reload contracts
      await loadContracts();

      // Close modal after a delay
      setTimeout(() => {
        setShowRestoreModal(false);
        setRestoreFile(null);
        setRestorePreview(null);
        setRestoreMode('merge');
        setLoading(false);
        isRestoringRef.current = false; // Reset ref
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to restore contracts');
      setRestoreProgress(null);
      setLoading(false);
      isRestoringRef.current = false; // Reset ref on error
    }
  };

  const toggleContractSelection = (contractId: string) => {
    const newSelected = new Set(selectedContracts);
    if (newSelected.has(contractId)) {
      newSelected.delete(contractId);
    } else {
      newSelected.add(contractId);
    }
    setSelectedContracts(newSelected);
  };

  const selectAll = () => {
    setSelectedContracts(new Set(allContracts.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedContracts(new Set());
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2>💾 Backup & Restore</h2>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#5C6B82', maxWidth: '600px' }}>
          Export contracts as JSON backups or restore from backup files. Backups include all contract data, clauses, and metadata.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          background: '#FEE2E2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          color: '#991B1B',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          background: '#D1FAE5',
          border: '1px solid #A7F3D0',
          borderRadius: '8px',
          color: '#065F46',
          fontSize: '0.875rem'
        }}>
          {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Export Section */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #E2E8F0'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem' }}>Export Backup</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1.5rem' }}>
            Create a JSON backup file of your contracts
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={handleExportAll}
              disabled={loading || allContracts.length === 0}
              style={{
                width: '100%',
                padding: '0.875rem 1.25rem',
                background: '#0F2E6B',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: loading || allContracts.length === 0 ? 'not-allowed' : 'pointer',
                opacity: loading || allContracts.length === 0 ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading && allContracts.length > 0) {
                  e.currentTarget.style.background = '#1E6CE8';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && allContracts.length > 0) {
                  e.currentTarget.style.background = '#0F2E6B';
                }
              }}
            >
              📥 Export All Contracts ({allContracts.length})
            </button>

            <button
              onClick={handleSelectContracts}
              disabled={loading || allContracts.length === 0}
              style={{
                width: '100%',
                padding: '0.875rem 1.25rem',
                background: 'white',
                color: '#0F2E6B',
                border: '2px solid #0F2E6B',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: loading || allContracts.length === 0 ? 'not-allowed' : 'pointer',
                opacity: loading || allContracts.length === 0 ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading && allContracts.length > 0) {
                  e.currentTarget.style.background = '#F0F4FF';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && allContracts.length > 0) {
                  e.currentTarget.style.background = 'white';
                }
              }}
            >
              📋 Select Contracts to Export
            </button>
          </div>
        </div>

        {/* Import Section */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #E2E8F0'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem' }}>Restore Backup</h3>
          <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '1.5rem' }}>
            Import contracts from a JSON backup file
          </p>

          <label style={{
            display: 'block',
            width: '100%',
            padding: '0.875rem 1.25rem',
            background: '#F0F4FF',
            color: '#0F2E6B',
            border: '2px dashed #0F2E6B',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            opacity: loading ? 0.6 : 1
          }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#E0EBFF';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#F0F4FF';
              }
            }}
          >
            📤 Choose Backup File
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              disabled={loading}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* Contract Selection Modal */}
      {showSelectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '700px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Select Contracts to Export</h3>
              <button
                onClick={() => {
                  setShowSelectModal(false);
                  setSelectedContracts(new Set());
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={selectAll}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#F0F4FF',
                  color: '#0F2E6B',
                  border: '1px solid #D6E2FF',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#F0F4FF',
                  color: '#0F2E6B',
                  border: '1px solid #D6E2FF',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Deselect All
              </button>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              {allContracts.map((contract) => (
                <label
                  key={contract.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.75rem',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    background: selectedContracts.has(contract.id) ? '#F0F4FF' : 'white'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedContracts.has(contract.id)}
                    onChange={() => toggleContractSelection(contract.id)}
                    style={{ marginRight: '0.75rem', width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{contract.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {contract.metadata.totalClauses} clauses • {new Date(contract.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowSelectModal(false);
                  setSelectedContracts(new Set());
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#E2E8F0',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExportSelected}
                disabled={selectedContracts.size === 0 || loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: selectedContracts.size === 0 || loading ? '#CBD5E0' : '#0F2E6B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: selectedContracts.size === 0 || loading ? 'not-allowed' : 'pointer'
                }}
              >
                Export Selected ({selectedContracts.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Preview Modal */}
      {showRestoreModal && restorePreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '700px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Restore Backup</h3>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#F0F4FF', borderRadius: '8px' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>File:</strong> {restoreFile?.name}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Exported:</strong> {new Date(restorePreview.exportDate).toLocaleString()}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Exported By:</strong> {restorePreview.exportedBy}
              </div>
              <div>
                <strong>Contracts:</strong> {restorePreview.contractCount}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Restore Mode:
              </label>
              <select
                value={restoreMode}
                onChange={(e) => setRestoreMode(e.target.value as RestoreMode)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="merge">Merge (Update existing, add new)</option>
                <option value="add-only">Add Only (Skip duplicates)</option>
                <option value="replace">Replace All (Warning: This will overwrite existing contracts)</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.5rem' }}>
                {restoreMode === 'merge' && 'Existing contracts will be updated, new ones will be added.'}
                {restoreMode === 'add-only' && 'Only new contracts will be added. Existing contracts will be skipped.'}
                {restoreMode === 'replace' && '⚠️ All existing contracts will be replaced with backup data.'}
              </p>
            </div>

            {restoreProgress && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#F0F4FF', borderRadius: '8px' }}>
                <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>
                  Restoring: {restoreProgress.current} / {restoreProgress.total}
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: '#E2E8F0',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(restoreProgress.current / restoreProgress.total) * 100}%`,
                    height: '100%',
                    background: '#0F2E6B',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestoreFile(null);
                  setRestorePreview(null);
                  setRestoreMode('merge');
                  setRestoreProgress(null);
                }}
                disabled={loading}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#E2E8F0',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRestore();
                }}
                disabled={loading || isRestoringRef.current || !restorePreview}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: (loading || isRestoringRef.current || !restorePreview) ? '#CBD5E0' : '#0F2E6B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: (loading || isRestoringRef.current || !restorePreview) ? 'not-allowed' : 'pointer',
                  opacity: (loading || isRestoringRef.current || !restorePreview) ? 0.6 : 1
                }}
              >
                {loading ? 'Restoring...' : 'Restore Backup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
