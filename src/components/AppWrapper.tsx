import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginPage } from './LoginPage';
import { UserManagement } from './UserManagement';
import { AppHeader } from './AppHeader';

interface AppWrapperProps {
  children: React.ReactNode;
}

export const AppWrapper: React.FC<AppWrapperProps> = ({ children }) => {
  const { user, loading, canEdit, canView, authError, checkHealth } = useAuth();
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);

  const handleManualHealthCheck = async () => {
    setIsCheckingHealth(true);
    setHealthStatus('Checking connectivity...');
    try {
      const isHealthy = await checkHealth();
      setHealthStatus(isHealthy ? '✅ Connection to vault is active.' : '❌ Vault is unreachable. Possible firewall block.');
    } catch (err) {
      setHealthStatus('❌ Error during health check.');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  if (loading || authError) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4F7FA',
        padding: '2rem'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          {authError ? (
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '24px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
              border: '1.5px solid #FEE2E2'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
              <h2 style={{ color: '#1A2333', marginBottom: '0.5rem' }}>Authentication Issue</h2>
              <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                The application encountered an issue while connecting to the secure vault.
              </p>

              <div style={{
                textAlign: 'left',
                background: '#F8FAFC',
                padding: '1rem',
                borderRadius: '12px',
                marginBottom: '1rem',
                border: '1px solid #E2E8F0',
                fontSize: '0.8rem',
                color: '#475569',
                fontFamily: 'monospace',
                overflowWrap: 'break-word'
              }}>
                <strong>Error Details:</strong><br />
                {authError}
              </div>

              {healthStatus && (
                <div style={{
                  padding: '0.75rem',
                  background: healthStatus.includes('✅') ? '#F0FDF4' : '#FEF2F2',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  color: healthStatus.includes('✅') ? '#166534' : '#991B1B',
                  marginBottom: '1.5rem',
                  border: `1px solid ${healthStatus.includes('✅') ? '#BBF7D0' : '#FECACA'}`,
                  textAlign: 'left'
                }}>
                  {healthStatus}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    padding: '0.75rem',
                    background: '#1e3a8a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Try Again
                </button>
                <button
                  onClick={handleManualHealthCheck}
                  disabled={isCheckingHealth}
                  style={{
                    padding: '0.75rem',
                    background: '#F8FAFC',
                    color: '#475569',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: isCheckingHealth ? 'not-allowed' : 'pointer',
                    opacity: isCheckingHealth ? 0.7 : 1
                  }}
                >
                  {isCheckingHealth ? 'Checking...' : 'Check Health'}
                </button>
                <button
                  onClick={async () => {
                    const hStatus = await checkHealth();
                    const info = {
                      url: window.location.href,
                      userAgent: navigator.userAgent,
                      timestamp: new Date().toISOString(),
                      error: authError,
                      vaultHealthy: hStatus,
                      supabaseUrl: (import.meta as any).env.VITE_SUPABASE_URL || 'Not Set',
                      isSecureContext: window.isSecureContext,
                      connection: (navigator as any).connection ? {
                        effectiveType: (navigator as any).connection.effectiveType,
                        saveData: (navigator as any).connection.saveData
                      } : 'Unknown'
                    };

                    const diagnosticText = JSON.stringify(info, null, 2);
                    navigator.clipboard.writeText(diagnosticText).then(() => {
                      alert("Diagnostic info copied to clipboard! Share this with your developer.");
                    }).catch(() => {
                      alert("Diagnostic Info:\n\n" + diagnosticText);
                    });
                  }}
                  style={{
                    padding: '0.75rem',
                    background: 'white',
                    color: '#1e3a8a',
                    border: '1.5px solid #1e3a8a',
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    gridColumn: 'span 2'
                  }}
                >
                  Copy Diagnostic Info
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{
                width: '60px',
                height: '60px',
                border: '5px solid rgba(30, 58, 138, 0.1)',
                borderTop: '5px solid #1e3a8a',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1.5rem'
              }} />
              <p style={{ color: '#1A2333', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
                Loading AE Contract Department...
              </p>
              <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Synchronizing with secure vault...
              </p>
            </>
          )}
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Check if user has permission to view (all authenticated users with a profile)
  if (!canView() && !showUserManagement) {
    return (
      <div>
        <AppHeader
          onShowUserManagement={() => setShowUserManagement(!showUserManagement)}
          showingUserManagement={showUserManagement}
        />
        <div style={{
          minHeight: 'calc(100vh - 80px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7fafc',
          padding: '2rem'
        }}>
          <div style={{
            background: 'white',
            padding: '3rem',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#fee2e2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 2rem',
              fontSize: '2rem'
            }}>
              🚫
            </div>
            <h2 style={{ marginBottom: '1rem', color: '#2d3748' }}>Access Restricted</h2>
            <p style={{ color: '#718096', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              Your account does not have permission to view the Contract Department.
            </p>
            <p style={{ color: '#718096', fontSize: '0.875rem' }}>
              Please contact your administrator to request access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppHeader />

      <main className="flex-1 flex overflow-hidden">
        {showUserManagement ? <UserManagement /> : children}
      </main>
    </div>
  );
};
