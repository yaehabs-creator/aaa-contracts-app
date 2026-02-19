import React, { useState, useEffect } from 'react';
import { ContractEditorPage } from '../pages/admin/ContractEditorPage';
import { PresentationPage } from '../pages/PresentationPage';
import { KnowledgeGraphPage } from '../pages/KnowledgeGraphPage';

interface AppRouterProps {
  children: React.ReactNode;
}

/**
 * Simple hash-based router for the application
 * Supports:
 * - #/admin/contract-editor -> Admin Contract Editor
 * - #presentation -> Presentation Page
 * - #/knowledge-graph -> GraphRAG Knowledge Graph Workbench
 * - Default (no hash or other) -> Main App
 */
export const AppRouter: React.FC<AppRouterProps> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Route matching
  if (currentRoute === '#/admin/contract-editor') {
    return <ContractEditorPage />;
  }

  if (currentRoute === '#presentation') {
    return <PresentationPage />;
  }

  if (currentRoute === '#/knowledge-graph') {
    return <KnowledgeGraphPage />;
  }

  // Default: render the main app
  return <>{children}</>;
};

/**
 * Navigation helper functions
 */
export const navigateTo = (route: string) => {
  window.location.hash = route;
};

export const navigateToAdminEditor = () => {
  navigateTo('#/admin/contract-editor');
};

export const navigateToKnowledgeGraph = () => {
  navigateTo('#/knowledge-graph');
};

export const navigateToHome = () => {
  window.location.hash = '';
};

export default AppRouter;
