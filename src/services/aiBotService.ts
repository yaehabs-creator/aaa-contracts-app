/**
 * AI Bot Service (Legacy Wrapper)
 * This file is now a thin wrapper re-exporting logic from specialized services.
 * Please import from the specific services for new code.
 */

// Re-exports from Specialized Services
export * from './aiContextBuilder';
export * from './aiChatService';
export * from './aiSuggestionService';
export * from './aiDocumentService';
export * from './aiOrchestrationService';

// Re-exports from Provider (maintained for compatibility)
export { getRateLimitStatus, isRequestInFlight } from './aiProvider';
