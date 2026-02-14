import React, { useState } from 'react';
import { buildContractFromText, exportContractToJSONFile } from '@/services/contractBuilderService';
import { SavedContract } from '@/types';

export const ContractBuilder: React.FC = () => {
  const [generalText, setGeneralText] = useState('');
  const [particularText, setParticularText] = useState('');
  const [contractName, setContractName] = useState("Atrium's Contract");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [builtContract, setBuiltContract] = useState<SavedContract | null>(null);
  const [progress, setProgress] = useState('');

  const handleBuildContract = async () => {
    if (!generalText.trim() && !particularText.trim()) {
      setError('Please provide at least one of General or Particular condition text');
      return;
    }

    if (!contractName.trim()) {
      setError('Please provide a contract name');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setProgress('Processing text and extracting clauses...');
      setBuiltContract(null);

      const contract = await buildContractFromText(
        generalText.trim(),
        particularText.trim(),
        contractName.trim()
      );

      setBuiltContract(contract);
      setSuccess(`Contract built successfully! Found ${contract.clauses.length} clauses.`);
      setProgress('');
    } catch (err: any) {
      setError(err.message || 'Failed to build contract');
      setProgress('');
      setBuiltContract(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!builtContract) {
      setError('No contract built yet. Please build a contract first.');
      return;
    }

    try {
      exportContractToJSONFile(builtContract);
      setSuccess('JSON file downloaded successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to download JSON file');
    }
  };

  const handleReset = () => {
    setGeneralText('');
    setParticularText('');
    setContractName("Atrium's Contract");
    setError('');
    setSuccess('');
    setBuiltContract(null);
    setProgress('');
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '700', color: '#0F2E6B' }}>
          📄 Contract Builder
        </h2>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748B', maxWidth: '800px' }}>
          Build contracts from raw text inputs. Paste General and Particular condition text, and the system will extract clauses and generate a JSON file matching Hassan Allam's contract format.
        </p>
      </div>

      {/* Contract Name Input */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #E2E8F0',
        marginBottom: '1.5rem'
      }}>
        <label style={{
          display: 'block',
          marginBottom: '0.75rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#334155'
        }}>
          Contract Name
        </label>
        <input
          type="text"
          value={contractName}
          onChange={(e) => setContractName(e.target.value)}
          placeholder="Atrium's Contract"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.875rem 1.25rem',
            border: '2px solid #E2E8F0',
            borderRadius: '8px',
            fontSize: '0.9375rem',
            fontWeight: '500',
            color: '#1E293B',
            background: loading ? '#F1F5F9' : 'white',
            outline: 'none',
            transition: 'all 0.2s ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#1E6CE8';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 108, 232, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Text Input Areas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        {/* General Conditions */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #E2E8F0'
        }}>
          <label style={{
            display: 'block',
            marginBottom: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#334155'
          }}>
            General Conditions
          </label>
          <textarea
            value={generalText}
            onChange={(e) => setGeneralText(e.target.value)}
            placeholder="Paste General Conditions text here..."
            disabled={loading}
            rows={20}
            style={{
              width: '100%',
              padding: '1rem',
              border: '2px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              lineHeight: '1.6',
              color: '#1E293B',
              background: loading ? '#F1F5F9' : 'white',
              outline: 'none',
              resize: 'vertical',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#1E6CE8';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 108, 232, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Particular Conditions */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #E2E8F0'
        }}>
          <label style={{
            display: 'block',
            marginBottom: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#334155'
          }}>
            Particular Conditions
          </label>
          <textarea
            value={particularText}
            onChange={(e) => setParticularText(e.target.value)}
            placeholder="Paste Particular Conditions text here..."
            disabled={loading}
            rows={20}
            style={{
              width: '100%',
              padding: '1rem',
              border: '2px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              lineHeight: '1.6',
              color: '#1E293B',
              background: loading ? '#F1F5F9' : 'white',
              outline: 'none',
              resize: 'vertical',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#1E6CE8';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 108, 232, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={handleBuildContract}
          disabled={loading || (!generalText.trim() && !particularText.trim())}
          style={{
            padding: '0.875rem 2rem',
            background: loading || (!generalText.trim() && !particularText.trim()) ? '#CBD5E0' : '#1E6CE8',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9375rem',
            fontWeight: '700',
            cursor: loading || (!generalText.trim() && !particularText.trim()) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: loading || (!generalText.trim() && !particularText.trim()) ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!loading && (generalText.trim() || particularText.trim())) {
              e.currentTarget.style.background = '#0F2E6B';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && (generalText.trim() || particularText.trim())) {
              e.currentTarget.style.background = '#1E6CE8';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {loading ? 'Processing...' : '🏗️ Build Contract'}
        </button>

        {builtContract && (
          <button
            onClick={handleDownload}
            disabled={loading}
            style={{
              padding: '0.875rem 2rem',
              background: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#059669';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#10B981';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            📥 Download JSON
          </button>
        )}

        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            padding: '0.875rem 2rem',
            background: 'transparent',
            color: '#64748B',
            border: '2px solid #E2E8F0',
            borderRadius: '8px',
            fontSize: '0.9375rem',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: loading ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = '#CBD5E0';
              e.currentTarget.style.background = '#F8FAFC';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          🔄 Reset
        </button>
      </div>

      {/* Progress Message */}
      {progress && (
        <div style={{
          padding: '1rem 1.5rem',
          background: '#F0F4FF',
          border: '1px solid #D6E2FF',
          borderRadius: '8px',
          color: '#0F2E6B',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginBottom: '1rem'
        }}>
          {progress}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '1rem 1.5rem',
          background: '#FEE2E2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          color: '#991B1B',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '1rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div style={{
          padding: '1rem 1.5rem',
          background: '#D1FAE5',
          border: '1px solid #A7F3D0',
          borderRadius: '8px',
          color: '#065F46',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '1rem'
        }}>
          ✅ {success}
        </div>
      )}

      {/* Contract Summary */}
      {builtContract && (
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #E2E8F0'
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.125rem',
            fontWeight: '700',
            color: '#0F2E6B'
          }}>
            Contract Summary
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600', marginBottom: '0.25rem' }}>
                Total Clauses
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0F2E6B' }}>
                {builtContract.metadata.totalClauses}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600', marginBottom: '0.25rem' }}>
                General
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#3182ce' }}>
                {builtContract.metadata.generalCount}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600', marginBottom: '0.25rem' }}>
                Particular
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#38a169' }}>
                {builtContract.metadata.particularCount}
              </div>
            </div>
            {builtContract.metadata.conflictCount > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600', marginBottom: '0.25rem' }}>
                  Conflicts
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#e53e3e' }}>
                  {builtContract.metadata.conflictCount}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
