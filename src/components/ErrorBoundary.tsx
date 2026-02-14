/**
 * ErrorBoundary — Global error boundary to catch component crashes
 * 
 * Without this, a single component crash takes down the entire application.
 * This provides a graceful fallback UI and allows recovery.
 */

import * as React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #0F1420 0%, #1A1F35 50%, #0F1420 100%)',
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    padding: '24px',
                }}>
                    <div style={{
                        maxWidth: '520px',
                        width: '100%',
                        background: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '48px 40px',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            margin: '0 auto 24px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #FF6B6B, #FF4757)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                        }}>
                            ⚠️
                        </div>

                        <h2 style={{
                            color: '#fff',
                            fontSize: '22px',
                            fontWeight: 700,
                            margin: '0 0 12px',
                        }}>
                            Something Went Wrong
                        </h2>

                        <p style={{
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            margin: '0 0 32px',
                        }}>
                            The application encountered an unexpected error. Your data is safe.
                            Click below to try recovering.
                        </p>

                        {this.state.error && (
                            <details style={{
                                textAlign: 'left',
                                marginBottom: '24px',
                                padding: '16px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}>
                                <summary style={{
                                    color: 'rgba(255,255,255,0.4)',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    marginBottom: '8px',
                                }}>
                                    Error Details
                                </summary>
                                <pre style={{
                                    color: '#FF6B6B',
                                    fontSize: '11px',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    margin: 0,
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}>
                                    {this.state.error.message}
                                    {this.state.errorInfo?.componentStack && (
                                        <>
                                            {'\n\nComponent Stack:'}
                                            {this.state.errorInfo.componentStack}
                                        </>
                                    )}
                                </pre>
                            </details>
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReset}
                                style={{
                                    padding: '12px 28px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #667EEA, #764BA2)',
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                }}
                            >
                                Try Again
                            </button>

                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: '12px 28px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.08)',
                                    color: 'rgba(255,255,255,0.7)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                }}
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
