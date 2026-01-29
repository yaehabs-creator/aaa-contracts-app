import React from 'react';
import { motion } from 'framer-motion';

// Single skeleton card with shimmer effect
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className={`skeleton rounded-mac-sm h-24 ${className}`}
  />
);

// Skeleton for clause cards
export const SkeletonClauseCard: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="bg-white rounded-mac border border-surface-border p-6 space-y-4"
  >
    <div className="flex items-center gap-4">
      <div className="skeleton w-16 h-10 rounded-mac-xs" />
      <div className="skeleton flex-1 h-6 rounded" />
    </div>
    <div className="space-y-2">
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="skeleton h-4 w-5/6 rounded" />
    </div>
    <div className="flex gap-2">
      <div className="skeleton w-20 h-6 rounded-full" />
      <div className="skeleton w-24 h-6 rounded-full" />
    </div>
  </motion.div>
);

// Staggered list of skeleton items
interface SkeletonListProps {
  count?: number;
  ItemComponent?: React.FC;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ 
  count = 5, 
  ItemComponent = SkeletonClauseCard 
}) => (
  <motion.div
    initial="hidden"
    animate="visible"
    exit="hidden"
    variants={{
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.08,
        },
      },
    }}
    className="space-y-4"
  >
    {Array(count)
      .fill(0)
      .map((_, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, x: -20 },
            visible: { opacity: 1, x: 0 },
          }}
          transition={{ duration: 0.3 }}
        >
          <ItemComponent />
        </motion.div>
      ))}
  </motion.div>
);

// Skeleton for sidebar items
export const SkeletonSidebarItem: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex items-center gap-2 px-3 py-2"
  >
    <div className="skeleton w-2 h-2 rounded-full" />
    <div className="skeleton flex-1 h-4 rounded" />
  </motion.div>
);

// Loading spinner with pulse
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center justify-center"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={`${sizeClasses[size]} border-mac-blue border-t-transparent rounded-full`}
      />
    </motion.div>
  );
};

// Full page loading state
export const PageLoader: React.FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col items-center justify-center min-h-[400px] gap-4"
  >
    <LoadingSpinner size="lg" />
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-mac-muted text-sm"
    >
      Loading...
    </motion.p>
  </motion.div>
);

export default SkeletonList;
