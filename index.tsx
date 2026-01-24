
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppRouter } from './src/components/AppRouter';
import './index.css';
import { getMissingConfig } from './src/config/validators';
import Onboarding from './src/components/ConfigOnboarding';

// Proper React Error Boundary class component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state: { hasError: boolean; error: Error | null };
  props: { children: React.ReactNode };

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Check for Supabase configuration errors (preferred) or Firebase (legacy)
      const supabaseError = typeof window !== 'undefined' ? (window as any).__SUPABASE_CONFIG_ERROR__ : null;
      const firebaseError = typeof window !== 'undefined' ? (window as any).__FIREBASE_CONFIG_ERROR__ : null;
      const configError = supabaseError || firebaseError;
      const errorMessage = configError?.message || this.state.error?.message || 'An error occurred while loading the application.';
      const missingVars = configError?.missingVars || [];
      const instructions = configError?.instructions || 'Please check your configuration and try again.';

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F4F7FA',
          padding: '2rem',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 10px 30px -10px rgba(15, 46, 107, 0.1)',
            maxWidth: '700px',
            border: '2px solid #EF4444'
          }}>
            <h1 style={{ color: '#EF4444', marginTop: 0, marginBottom: '1rem', fontSize: '1.5rem' }}>
              ⚠️ Configuration Error
            </h1>
            <p style={{ color: '#1A2333', marginBottom: '1rem', lineHeight: '1.6', fontSize: '1rem' }}>
              {errorMessage}
            </p>
            
            {missingVars.length > 0 && (
              <div style={{
                background: '#FEE2E2',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.875rem',
                color: '#991B1B'
              }}>
                <strong>Missing Environment Variables:</strong>
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', marginBottom: 0 }}>
                  {missingVars.map((varName: string) => (
                    <li key={varName} style={{ marginBottom: '0.25rem' }}>{varName}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{
              background: '#FEF3C7',
              padding: '1rem',
              borderRadius: '8px',
              marginTop: '1rem',
              fontSize: '0.875rem',
              color: '#92400E'
            }}>
              <strong>How to Fix:</strong>
              <ol style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>{instructions}</li>
                <li style={{ marginBottom: '0.5rem' }}>Check browser console (F12) for detailed error messages</li>
                <li style={{ marginBottom: '0.5rem' }}>Verify <code style={{ background: '#FDE68A', padding: '2px 6px', borderRadius: '4px' }}>.env.local</code> exists and contains all required variables</li>
                <li style={{ marginBottom: '0.5rem' }}>Run <code style={{ background: '#FDE68A', padding: '2px 6px', borderRadius: '4px' }}>npm run build:check</code> to verify environment variables</li>
                <li style={{ marginBottom: '0.5rem' }}>Rebuild and redeploy: <code style={{ background: '#FDE68A', padding: '2px 6px', borderRadius: '4px' }}>npm run build && firebase deploy</code></li>
                <li>See <code style={{ background: '#FDE68A', padding: '2px 6px', borderRadius: '4px' }}>DEPLOYMENT_GUIDE.md</code> for detailed troubleshooting</li>
              </ol>
            </div>

            {this.state.error?.stack && (
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer', color: '#5C6B82', fontSize: '0.875rem' }}>
                  Technical Details (Click to expand)
                </summary>
                <pre style={{
                  background: '#F3F4F6',
                  padding: '1rem',
                  borderRadius: '8px',
                  overflow: 'auto',
                  fontSize: '0.75rem',
                  marginTop: '0.5rem',
                  color: '#374151'
                }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Determine config state early and render onboarding if missing
const missing = getMissingConfig();

if (missing.length > 0) {
  root.render(
    <React.StrictMode>
      <Onboarding missing={missing} />
    </React.StrictMode>
  );
} else {
  // Wrap in error boundary and render app as usual
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <AppRouter>
            <App />
          </AppRouter>
        </AuthProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
