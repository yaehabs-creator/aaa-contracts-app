
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './src/contexts/AuthContext';
import './index.css';

// Proper React Error Boundary class component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
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
            maxWidth: '600px',
            border: '2px solid #EF4444'
          }}>
            <h1 style={{ color: '#EF4444', marginTop: 0, marginBottom: '1rem' }}>⚠️ Configuration Error</h1>
            <p style={{ color: '#1A2333', marginBottom: '1rem', lineHeight: '1.6' }}>
              {this.state.error?.message || 'An error occurred while loading the application.'}
            </p>
            <div style={{
              background: '#FEF3C7',
              padding: '1rem',
              borderRadius: '8px',
              marginTop: '1rem',
              fontSize: '0.875rem',
              color: '#92400E'
            }}>
              <strong>Quick Fix:</strong>
              <ol style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li>Check browser console (F12) for detailed error messages</li>
                <li>Verify Firebase configuration in environment variables</li>
                <li>Try refreshing the page</li>
              </ol>
            </div>
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

// Wrap in error boundary and always render something
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
