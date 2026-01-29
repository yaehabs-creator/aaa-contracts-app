import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  transitionKey: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -20,
  },
};

const pageTransition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1], // Custom easing for smooth feel
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children, transitionKey }) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={transitionKey}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

// Fade-only transition for subtler effects
export const FadeTransition: React.FC<PageTransitionProps> = ({ children, transitionKey }) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={transitionKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

// Slide from right transition
export const SlideTransition: React.FC<PageTransitionProps> = ({ children, transitionKey }) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={transitionKey}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

export default PageTransition;
