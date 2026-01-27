/**
 * MacBook-Style UI Components
 * 
 * A collection of reusable, polished UI components following
 * Apple's design language: clean, minimal, and premium.
 */

import React, { forwardRef, ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes } from 'react';

// ============================================
// Card Component
// ============================================

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, hover = false, padding = 'md', className = '', ...props }, ref) => {
    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={`
          bg-white rounded-mac border border-surface-border shadow-mac
          ${hover ? 'mac-card-hover cursor-pointer' : ''}
          ${paddingClasses[padding]}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// ============================================
// Button Component
// ============================================

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    icon,
    children, 
    className = '', 
    disabled,
    ...props 
  }, ref) => {
    const baseClasses = `
      inline-flex items-center justify-center gap-2
      font-medium transition-all duration-200 ease-mac
      focus:outline-none focus:ring-2 focus:ring-mac-blue/20 focus:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-[0.98]
    `;

    const variantClasses = {
      primary: `
        bg-gradient-to-b from-mac-blue to-mac-blue-hover text-white
        border-none shadow-sm
        hover:shadow-md hover:-translate-y-px
      `,
      secondary: `
        bg-white text-mac-blue border border-surface-border
        hover:border-mac-blue hover:bg-mac-blue-subtle
      `,
      ghost: `
        bg-transparent text-mac-muted
        hover:bg-surface-bg-subtle hover:text-mac-navy
      `,
      danger: `
        bg-gradient-to-b from-red-500 to-red-600 text-white
        border-none shadow-sm
        hover:shadow-md hover:-translate-y-px
      `,
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs rounded-mac-xs',
      md: 'px-4 py-2 text-sm rounded-mac-sm',
      lg: 'px-6 py-3 text-base rounded-mac-sm',
    };

    return (
      <button
        ref={ref}
        className={`
          ${baseClasses}
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <LoadingSpinner size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============================================
// Input Component
// ============================================

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, size = 'md', className = '', ...props }, ref) => {
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm rounded-mac-xs',
      md: 'px-4 py-2.5 text-sm rounded-mac-sm',
      lg: 'px-4 py-3 text-base rounded-mac-sm',
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-mac-navy mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-white border transition-all duration-200 ease-mac
            placeholder:text-mac-muted-light
            focus:outline-none focus:border-mac-blue focus:shadow-mac-focus
            disabled:bg-surface-bg-subtle disabled:cursor-not-allowed
            ${error ? 'border-red-400 focus:border-red-500 focus:shadow-red-500/15' : 'border-surface-border'}
            ${sizeClasses[size]}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-mac-muted">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================
// Badge Component
// ============================================

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'blue' | 'green' | 'amber' | 'red' | 'muted';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const variantClasses = {
    default: 'bg-surface-bg-subtle text-mac-charcoal',
    blue: 'bg-mac-blue-subtle text-mac-blue',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    muted: 'bg-slate-100 text-mac-muted',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
};

// ============================================
// Modal Component
// ============================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 mac-modal-backdrop modal-backdrop"
        onClick={onClose}
      />
      
      {/* Content */}
      <div 
        className={`
          relative w-full ${sizeClasses[size]}
          mac-modal-content modal-content
          flex flex-col max-h-[90vh]
        `}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
            {title && (
              <h2 className="text-lg font-semibold text-mac-navy">{title}</h2>
            )}
            {showClose && (
              <button
                onClick={onClose}
                className="p-2 text-mac-muted hover:text-mac-navy hover:bg-surface-bg-subtle rounded-mac-xs transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Skeleton Component
// ============================================

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  className = '',
  ...props
}) => {
  const baseClasses = 'skeleton';

  const variantClasses = {
    text: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-mac-sm',
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : variant === 'circular' ? width : undefined),
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={{ 
              ...style, 
              width: i === lines - 1 ? '75%' : '100%',
              height: '1em',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      {...props}
    />
  );
};

// ============================================
// Loading Spinner Component
// ============================================

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 16, 
  className = '' 
}) => (
  <svg
    className={`animate-spin ${className}`}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// ============================================
// Divider Component
// ============================================

interface DividerProps {
  className?: string;
  label?: string;
}

export const Divider: React.FC<DividerProps> = ({ className = '', label }) => {
  if (label) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="flex-1 h-px bg-surface-border" />
        <span className="text-xs font-medium text-mac-muted uppercase tracking-wider">{label}</span>
        <div className="flex-1 h-px bg-surface-border" />
      </div>
    );
  }

  return <div className={`h-px bg-surface-border my-4 ${className}`} />;
};

// ============================================
// Section Header Component
// ============================================

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => (
  <div className={`flex items-center justify-between ${className}`}>
    <div>
      <h3 className="text-sm font-semibold text-mac-navy uppercase tracking-wide">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-xs text-mac-muted">{subtitle}</p>
      )}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// ============================================
// Empty State Component
// ============================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
    {icon && (
      <div className="w-12 h-12 rounded-full bg-surface-bg-subtle flex items-center justify-center text-mac-muted mb-4">
        {icon}
      </div>
    )}
    <h3 className="text-sm font-medium text-mac-navy mb-1">{title}</h3>
    {description && (
      <p className="text-xs text-mac-muted max-w-xs">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: 'default' | 'blue' | 'green' | 'amber';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  variant = 'default',
  className = '',
}) => {
  const variantClasses = {
    default: 'bg-white border-surface-border',
    blue: 'bg-mac-blue-subtle border-mac-blue/10',
    green: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
  };

  return (
    <div
      className={`
        p-4 rounded-mac border shadow-mac-sm
        ${variantClasses[variant]}
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-mac-muted uppercase tracking-wider">
          {label}
        </span>
        {icon && <span className="text-mac-muted">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-mac-navy tracking-tight">{value}</div>
      {trend && (
        <div className={`mt-1 text-xs font-medium ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend.value >= 0 ? '+' : ''}{trend.value}%
          {trend.label && <span className="text-mac-muted ml-1">{trend.label}</span>}
        </div>
      )}
    </div>
  );
};

// ============================================
// Dashboard Skeleton Component
// ============================================

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 mb-8">
    {/* Stats Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white p-6 rounded-mac-lg shadow-mac border border-surface-border">
          <Skeleton variant="text" width="40%" height="0.75rem" className="mb-4" />
          <Skeleton variant="text" width="50%" height="2.5rem" className="mb-3" />
          <Skeleton variant="text" width="60%" height="0.75rem" />
        </div>
      ))}
    </div>
    
    {/* Info Cards Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white p-6 rounded-mac-lg shadow-mac border border-surface-border">
          <Skeleton variant="text" width="30%" height="0.75rem" className="mb-6" />
          <div className="space-y-3">
            <Skeleton variant="rectangular" height="3rem" />
            <Skeleton variant="rectangular" height="3rem" />
            <Skeleton variant="rectangular" height="3rem" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// Clause Card Skeleton Component
// ============================================

export const ClauseCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-mac-lg shadow-mac border border-surface-border overflow-hidden">
    {/* Header Skeleton */}
    <div className="px-8 py-5 border-b border-surface-border bg-surface-bg/50">
      <div className="flex items-center gap-4">
        <Skeleton variant="rectangular" width="4rem" height="2rem" className="rounded-mac-xs" />
        <Skeleton variant="text" width="40%" height="1.5rem" />
      </div>
    </div>
    
    {/* Content Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-surface-border">
      <div className="p-8">
        <Skeleton variant="text" width="30%" height="0.75rem" className="mb-4" />
        <Skeleton variant="text" lines={5} />
      </div>
      <div className="p-8 bg-surface-bg/30">
        <Skeleton variant="text" width="35%" height="0.75rem" className="mb-4" />
        <Skeleton variant="text" lines={5} />
      </div>
    </div>
  </div>
);

// ============================================
// Sidebar Skeleton Component
// ============================================

export const SidebarSkeleton: React.FC = () => (
  <div className="space-y-6 p-6">
    {/* Stats Skeleton */}
    <div className="p-5 bg-surface-bg rounded-mac border border-surface-border">
      <Skeleton variant="text" width="40%" height="0.75rem" className="mb-4" />
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rectangular" height="4rem" className="rounded-mac-sm" />
        ))}
      </div>
    </div>
    
    {/* Filters Skeleton */}
    <div className="space-y-3">
      <Skeleton variant="text" width="30%" height="0.75rem" />
      <Skeleton variant="rectangular" height="2.5rem" className="rounded-mac-sm" />
      <Skeleton variant="rectangular" height="2.5rem" className="rounded-mac-sm" />
    </div>
    
    {/* Clause List Skeleton */}
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} variant="rectangular" height="2.5rem" className="rounded-mac-xs" />
      ))}
    </div>
  </div>
);

// Export all components
export default {
  Card,
  Button,
  Input,
  Badge,
  Modal,
  Skeleton,
  LoadingSpinner,
  Divider,
  SectionHeader,
  EmptyState,
  StatCard,
  DashboardSkeleton,
  ClauseCardSkeleton,
  SidebarSkeleton,
};
