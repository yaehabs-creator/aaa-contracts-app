import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signIn } = useAuth();

  // Check for error messages from auth state changes
  useEffect(() => {
    const storedError = sessionStorage.getItem('loginError');
    if (storedError) {
      setError(storedError);
      sessionStorage.removeItem('loginError');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      const errorMsg = err.message || err.toString();
      
      let errorMessage = 'Failed to sign in';
      
      // Provide user-friendly error messages (Supabase errors)
      if (errorMsg.includes('Invalid login credentials') || errorMsg.includes('Invalid email or password')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (errorMsg.includes('Email not confirmed') || errorMsg.includes('email not confirmed')) {
        errorMessage = 'Please verify your email address before signing in.';
      } else if (errorMsg.includes('User not found') || errorMsg.includes('No account found')) {
        errorMessage = 'No account found with this email. Please contact your administrator.';
      } else if (errorMsg.includes('Invalid email')) {
        errorMessage = 'Invalid email address. Please check and try again.';
      } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (errorMsg) {
        errorMessage = errorMsg;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="animate-fade-in"
      style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F4F7FA', // aaa-bg
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Decorative background elements matching app theme */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-20%',
        width: '60%',
        height: '60%',
        background: 'radial-gradient(circle, rgba(15, 46, 107, 0.05) 0%, transparent 70%)',
        borderRadius: '50%'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-20%',
        width: '50%',
        height: '50%',
        background: 'radial-gradient(circle, rgba(30, 108, 232, 0.05) 0%, transparent 70%)',
        borderRadius: '50%'
      }} />

      <div 
        className="login-container animate-scale-in"
        style={{
        background: 'white',
        padding: '3rem 2.5rem',
        borderRadius: '12px', // aaa border radius
        boxShadow: '0 10px 30px -10px rgba(15, 46, 107, 0.1)', // premium shadow
        border: '1px solid #D1D9E6', // aaa-border
        width: '100%',
        maxWidth: '440px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo/Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 1.5rem',
            background: '#0F2E6B', // aaa-blue
            borderRadius: '20px', // More rounded corners for pill-like shape
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 30px -10px rgba(15, 46, 107, 0.2)' // premium shadow
          }}>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '28px',
              fontWeight: '900',
              color: 'white',
              letterSpacing: '-1px',
              lineHeight: '1'
            }}>
              AAA
            </span>
          </div>
          <h1 style={{
            margin: 0,
            fontSize: '1.75rem',
            fontWeight: '800',
            color: '#1A2333', // aaa-text
            letterSpacing: '-0.5px',
            marginBottom: '0.5rem'
          }}>
            AAA Contract Department
          </h1>
          <p style={{
            margin: 0,
            fontSize: '0.95rem',
            color: '#5C6B82', // aaa-muted
            fontWeight: '400'
          }}>
            Sign in to your account
          </p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'block', width: '100%' }}>
          <div style={{ marginBottom: '1.5rem', display: 'block', width: '100%' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#1A2333', // aaa-text
              fontSize: '0.875rem',
              fontWeight: '600',
              letterSpacing: '0.3px'
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              required
              placeholder="you@example.com"
              className="login-email-input"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: `2px solid ${focusedField === 'email' ? '#1E6CE8' : '#D1D9E6'}`, // aaa-accent / aaa-border
                borderRadius: '12px', // aaa border radius
                fontSize: '1rem',
                color: '#1A2333', // aaa-text
                transition: 'all 0.2s ease',
                outline: 'none',
                background: focusedField === 'email' ? '#F4F7FA' : '#fff', // aaa-bg
                boxShadow: focusedField === 'email' ? '0 0 0 3px rgba(30, 108, 232, 0.1)' : 'none',
                boxSizing: 'border-box',
                display: 'block',
                opacity: '1',
                visibility: 'visible',
                height: 'auto',
                minHeight: '44px',
                margin: '0',
                position: 'relative',
                zIndex: '10'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem', display: 'block', width: '100%' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#1A2333', // aaa-text
              fontSize: '0.875rem',
              fontWeight: '600',
              letterSpacing: '0.3px'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              required
              placeholder="Enter your password"
              className="login-password-input"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: `2px solid ${focusedField === 'password' ? '#1E6CE8' : '#D1D9E6'}`, // aaa-accent / aaa-border
                borderRadius: '12px', // aaa border radius
                fontSize: '1rem',
                color: '#1A2333', // aaa-text
                transition: 'all 0.2s ease',
                outline: 'none',
                background: focusedField === 'password' ? '#F4F7FA' : '#fff', // aaa-bg
                boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(30, 108, 232, 0.1)' : 'none',
                boxSizing: 'border-box',
                display: 'block',
                opacity: '1',
                visibility: 'visible',
                height: 'auto',
                minHeight: '44px',
                margin: '0',
                position: 'relative',
                zIndex: '10'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '0.875rem 1rem',
              marginBottom: '1.5rem',
              background: '#FEE2E2',
              border: '2px solid #FCA5A5',
              borderRadius: '12px', // aaa border radius
              color: '#DC2626',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500'
            }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem 1.5rem',
              background: loading 
                ? '#D1D9E6' // aaa-border (disabled)
                : '#0F2E6B', // aaa-blue
              color: 'white',
              border: 'none',
              borderRadius: '12px', // aaa border radius
              fontSize: '1rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: loading 
                ? 'none' 
                : '0 10px 30px -10px rgba(15, 46, 107, 0.2)', // premium shadow
              transform: loading ? 'none' : 'translateY(0)',
              letterSpacing: '0.3px'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#091B40'; // aaa-hover
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(15, 46, 107, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#0F2E6B'; // aaa-blue
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(15, 46, 107, 0.2)';
              }
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite'
                }} />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          paddingTop: '2rem',
          borderTop: '1px solid #D1D9E6', // aaa-border
          textAlign: 'center'
        }}>
          <p style={{
            margin: 0,
            color: '#5C6B82', // aaa-muted
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            fontStyle: 'italic'
          }}>
            <span style={{ opacity: 0.7 }}>Developed by</span>
            <span style={{
              color: '#1E6CE8', // aaa-accent
              fontWeight: '600',
              letterSpacing: '0.3px'
            }}>Abdelrhman Ehab</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .login-container input[type="email"],
        .login-container input[type="password"],
        .login-container input[type="text"],
        .login-container form input[type="email"],
        .login-container form input[type="password"],
        .login-container form input[type="text"],
        .login-email-input,
        .login-password-input,
        .login-name-input {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 100% !important;
          height: auto !important;
          min-height: 44px !important;
          max-height: none !important;
          color: #1a202c !important;
          background: #fff !important;
          border: 2px solid #D1D9E6 !important;
          padding: 0.875rem 1rem !important;
          font-size: 1rem !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          position: relative !important;
          z-index: 10 !important;
          overflow: visible !important;
          clip: auto !important;
          clip-path: none !important;
        }
        .login-container form {
          display: block !important;
          width: 100% !important;
        }
        .login-container form > div {
          display: block !important;
          width: 100% !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};
