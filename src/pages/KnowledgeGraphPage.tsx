import React, { useState, useEffect } from 'react';

/**
 * KnowledgeGraphPage - Embeds the GraphRAG Workbench (Next.js app)
 * in an iframe, providing a seamless integration within the main app.
 * 
 * The GraphRAG Workbench runs on port 3001 as a separate Next.js server.
 */
export const KnowledgeGraphPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const GRAPHRAG_URL = 'http://localhost:3001';

    useEffect(() => {
        // Check if GraphRAG server is running
        const checkServer = async () => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                await fetch(GRAPHRAG_URL, {
                    mode: 'no-cors',
                    signal: controller.signal
                });
                clearTimeout(timeout);
                setHasError(false);
            } catch {
                setHasError(true);
            }
        };
        checkServer();
    }, [retryCount]);

    const handleGoBack = () => {
        window.location.hash = '';
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            background: '#0a0a0a',
            zIndex: 9999,
        }}>
            {/* Top Bar */}
            <div style={{
                height: '48px',
                background: 'linear-gradient(135deg, #0F2E6B 0%, #1a3a7a 50%, #0F2E6B 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={handleGoBack}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '8px',
                            color: 'rgba(255,255,255,0.85)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            letterSpacing: '0.04em',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5" />
                            <path d="M12 19l-7-7 7-7" />
                        </svg>
                        BACK
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M12 2v4" />
                                <path d="M12 18v4" />
                                <path d="M4.93 4.93l2.83 2.83" />
                                <path d="M16.24 16.24l2.83 2.83" />
                                <path d="M2 12h4" />
                                <path d="M18 12h4" />
                                <path d="M4.93 19.07l2.83-2.83" />
                                <path d="M16.24 7.76l2.83-2.83" />
                            </svg>
                        </div>
                        <div>
                            <h1 style={{
                                margin: 0,
                                fontSize: '14px',
                                fontWeight: 800,
                                color: 'white',
                                letterSpacing: '-0.01em',
                            }}>
                                GraphRAG Workbench
                            </h1>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        background: hasError ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                        border: `1px solid ${hasError ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                        borderRadius: '20px',
                    }}>
                        <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: hasError ? '#ef4444' : '#10b981',
                            animation: hasError ? 'none' : 'pulse 2s infinite',
                        }} />
                        <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: hasError ? '#fca5a5' : '#6ee7b7',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                        }}>
                            {hasError ? 'Server Offline' : 'Connected'}
                        </span>
                    </div>

                    <a
                        href={GRAPHRAG_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: '11px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Open Full Window
                    </a>
                </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, position: 'relative' }}>
                {/* Loading State */}
                {isLoading && !hasError && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#0a0a0a',
                        zIndex: 10,
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            border: '3px solid rgba(99,102,241,0.2)',
                            borderTopColor: '#6366f1',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                        }} />
                        <p style={{
                            marginTop: '16px',
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: '13px',
                            fontWeight: 600,
                        }}>
                            Loading GraphRAG Workbench...
                        </p>
                    </div>
                )}

                {/* Error State */}
                {hasError && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#0a0a0a',
                        zIndex: 10,
                    }}>
                        <div style={{
                            maxWidth: '480px',
                            padding: '32px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '16px',
                            textAlign: 'center',
                        }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                margin: '0 auto 16px',
                                borderRadius: '14px',
                                background: 'rgba(239,68,68,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <h2 style={{
                                margin: '0 0 8px',
                                color: 'white',
                                fontSize: '18px',
                                fontWeight: 800,
                            }}>
                                GraphRAG Workbench Not Running
                            </h2>
                            <p style={{
                                margin: '0 0 20px',
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: '13px',
                                lineHeight: '1.6',
                            }}>
                                The GraphRAG Workbench server needs to be started on port 3001.
                                Run the following command in a new terminal:
                            </p>
                            <div style={{
                                padding: '12px 16px',
                                background: 'rgba(99,102,241,0.08)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: '10px',
                                marginBottom: '20px',
                            }}>
                                <code style={{
                                    color: '#a5b4fc',
                                    fontSize: '13px',
                                    fontFamily: "'Fira Code', 'Consolas', monospace",
                                    fontWeight: 600,
                                }}>
                                    cd graphrag-workbench && npm run dev -- -p 3001
                                </code>
                            </div>
                            <div style={{
                                padding: '12px 16px',
                                background: 'rgba(245,158,11,0.08)',
                                border: '1px solid rgba(245,158,11,0.2)',
                                borderRadius: '10px',
                                marginBottom: '20px',
                            }}>
                                <p style={{
                                    margin: 0,
                                    color: 'rgba(253,224,71,0.8)',
                                    fontSize: '11px',
                                    lineHeight: '1.5',
                                }}>
                                    <strong>First time?</strong> Run <code style={{ color: '#fbbf24' }}>npm install</code> inside the
                                    <code style={{ color: '#fbbf24' }}> graphrag-workbench</code> folder first, then also install the Python package:
                                    <code style={{ color: '#fbbf24' }}> pip install graphrag</code>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setRetryCount(c => c + 1)}
                                    style={{
                                        padding: '10px 24px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                        border: 'none',
                                        borderRadius: '10px',
                                        color: 'white',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    Retry Connection
                                </button>
                                <button
                                    onClick={handleGoBack}
                                    style={{
                                        padding: '10px 24px',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '10px',
                                        color: 'rgba(255,255,255,0.7)',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Iframe */}
                {!hasError && (
                    <iframe
                        src={GRAPHRAG_URL}
                        title="GraphRAG Workbench"
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            display: isLoading ? 'none' : 'block',
                        }}
                        onLoad={() => setIsLoading(false)}
                        onError={() => setHasError(true)}
                        allow="clipboard-read; clipboard-write"
                    />
                )}
            </div>

            {/* CSS Animations */}
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
        </div>
    );
};

export default KnowledgeGraphPage;
