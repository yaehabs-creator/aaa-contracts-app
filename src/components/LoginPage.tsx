import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// MacBook-Style Glass UI Components
// ============================================

interface GlassLayoutProps {
  children: React.ReactNode;
}

const GlassLayout: React.FC<GlassLayoutProps> = ({ children }) => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.25rem',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
      // Soft gradient background
      background: 'linear-gradient(135deg, #E8F0FE 0%, #F4F7FA 25%, #F8FAFC 50%, #EEF2FF 75%, #F0F4FF 100%)',
    }}
  >
    {/* Blur orb - top right */}
    <div
      style={{
        position: 'absolute',
        top: '-15%',
        right: '-10%',
        width: '50%',
        height: '50%',
        background: 'radial-gradient(circle, rgba(29, 78, 216, 0.15) 0%, rgba(29, 78, 216, 0.05) 40%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        pointerEvents: 'none',
      }}
    />

    {/* Blur orb - bottom left */}
    <div
      style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-15%',
        width: '55%',
        height: '55%',
        background: 'radial-gradient(circle, rgba(29, 78, 216, 0.12) 0%, rgba(30, 64, 175, 0.06) 40%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(50px)',
        pointerEvents: 'none',
      }}
    />

    {/* Subtle center glow */}
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        height: '60%',
        background: 'radial-gradient(ellipse, rgba(255, 255, 255, 0.6) 0%, transparent 60%)',
        pointerEvents: 'none',
      }}
    />

    {/* Noise texture overlay */}
    <div
      className="glass-noise"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    />

    {children}
  </div>
);

interface GlassCardProps {
  children: React.ReactNode;
}

const GlassCard: React.FC<GlassCardProps> = ({ children }) => (
  <div
    className="glass-card animate-glass-enter"
    style={{
      width: '100%',
      maxWidth: '420px',
      padding: '2.5rem 2rem',
      borderRadius: '24px',
      position: 'relative',
      zIndex: 1,
    }}
  >
    {children}
  </div>
);

// ============================================
// Form Components
// ============================================

interface FloatingInputProps {
  id: string;
  type: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  showPasswordToggle?: boolean;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  id,
  type: initialType,
  label,
  value,
  onChange,
  required = false,
  autoComplete,
  showPasswordToggle = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isActive = isFocused || value.length > 0;

  const type = showPasswordToggle && showPassword ? 'text' : initialType;

  return (
    <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
      {/* Floating Label */}
      <label
        htmlFor={id}
        style={{
          position: 'absolute',
          left: '1rem',
          top: isActive ? '0.5rem' : '1rem',
          fontSize: isActive ? '0.7rem' : '0.95rem',
          fontWeight: isActive ? 600 : 400,
          color: isFocused ? '#1D4ED8' : '#64748B',
          letterSpacing: isActive ? '0.02em' : '0',
          textTransform: isActive ? 'uppercase' : 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {label}
      </label>

      {/* Input Field */}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        required={required}
        autoComplete={autoComplete}
        className="glass-input"
        style={{
          width: '100%',
          height: '56px',
          padding: isActive ? '1.5rem 1rem 0.5rem 1rem' : '1rem',
          paddingRight: showPasswordToggle ? '3rem' : '1rem',
          fontSize: '1rem',
          fontWeight: 500,
          color: '#1A2333',
          background: isFocused ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)',
          border: `1.5px solid ${isFocused ? 'rgba(29, 78, 216, 0.5)' : 'rgba(0, 0, 0, 0.08)'}`,
          borderRadius: '14px',
          outline: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box',
        }}
      />

      {/* Password Toggle Button */}
      {showPasswordToggle && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            padding: '0.5rem',
            cursor: 'pointer',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#1D4ED8';
            e.currentTarget.style.background = 'rgba(29, 78, 216, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#64748B';
            e.currentTarget.style.background = 'none';
          }}
        >
          {showPassword ? (
            // Eye-off icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            // Eye icon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};

interface ErrorMessageProps {
  message: string;
  onAnimationEnd?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onAnimationEnd }) => {
  const [shouldShake, setShouldShake] = useState(true);

  useEffect(() => {
    setShouldShake(true);
    const timer = setTimeout(() => setShouldShake(false), 400);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      className={`animate-error-enter ${shouldShake ? 'animate-shake' : ''}`}
      onAnimationEnd={onAnimationEnd}
      style={{
        padding: '0.875rem 1rem',
        marginBottom: '1.25rem',
        background: 'rgba(254, 226, 226, 0.8)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(252, 165, 165, 0.5)',
        borderRadius: '12px',
        color: '#DC2626',
        fontSize: '0.875rem',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{message}</span>
    </div>
  );
};

interface SubmitButtonProps {
  loading: boolean;
  children: React.ReactNode;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ loading, children }) => (
  <button
    type="submit"
    disabled={loading}
    className="glass-button"
    style={{
      width: '100%',
      height: '52px',
      padding: '0 1.5rem',
      fontSize: '1rem',
      fontWeight: 600,
      color: 'white',
      border: 'none',
      borderRadius: '14px',
      cursor: loading ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      letterSpacing: '0.02em',
      boxShadow: loading ? 'none' : '0 4px 14px rgba(29, 78, 216, 0.25)',
    }}
  >
    {loading ? (
      <>
        <span
          style={{
            width: '18px',
            height: '18px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderTopColor: 'white',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
        <span>Signing in...</span>
      </>
    ) : (
      children
    )}
  </button>
);

// ============================================
// Main Login Page Component
// ============================================

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (errorMsg.includes('Email not confirmed') || errorMsg.includes('email not confirmed')) {
        errorMessage = 'Please verify your email address before signing in.';
      } else if (errorMsg.includes('User not found') || errorMsg.includes('No account found')) {
        errorMessage = 'No account found with this email.';
      } else if (errorMsg.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (errorMsg) {
        errorMessage = errorMsg;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassLayout>
      <GlassCard>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              margin: '0 auto 1.25rem',
              background: 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(29, 78, 216, 0.25)',
            }}
          >
            <span
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: 'white',
                letterSpacing: '-0.5px',
              }}
            >
              AE
            </span>
          </div>

          {/* Heading */}
          <h1
            style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#1A2333',
              letterSpacing: '-0.02em',
              marginBottom: '0.375rem',
            }}
          >
            AE Contract Department
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '0.9375rem',
              color: '#64748B',
              fontWeight: 400,
            }}
          >
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <FloatingInput
            id="email"
            type="email"
            label="Email Address"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />

          <FloatingInput
            id="password"
            type="password"
            label="Password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
            showPasswordToggle
          />

          {error && <ErrorMessage message={error} />}

          <SubmitButton loading={loading}>
            Sign In
          </SubmitButton>
        </form>

        {/* Footer */}
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(0, 0, 0, 0.06)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
            }}
          >
            <span>Developed by</span>
            <span
              style={{
                color: '#64748B',
                fontWeight: 500,
              }}
            >
              Abdelrhman Ehab
            </span>
          </p>
        </div>
      </GlassCard>

      {/* Keyframe for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </GlassLayout>
  );
};
