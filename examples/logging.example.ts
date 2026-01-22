/**
 * Example: Using Structured Logging
 * 
 * This example shows how to use the structured logging system
 * instead of console.log.
 */

import { logger } from '../src/shared/infrastructure/observability/Logger';
import { metrics } from '../src/shared/infrastructure/observability/Metrics';
import { tracer } from '../src/shared/infrastructure/observability/Tracer';

/**
 * Example: Basic logging
 */
function exampleBasicLogging() {
  // Info log
  logger.info('User logged in', {
    userId: 'user-123',
    email: 'user@example.com',
  });

  // Warning log
  logger.warn('Rate limit approaching', {
    userId: 'user-123',
    requestsRemaining: 5,
  });

  // Error log
  logger.error('Failed to save contract', new Error('Database error'), {
    contractId: 'contract-123',
    userId: 'user-123',
  });

  // Debug log (only in development)
  logger.debug('Processing contract', {
    contractId: 'contract-123',
    step: 'validation',
  });
}

/**
 * Example: Operation logging
 */
async function exampleOperationLogging() {
  const operation = 'saveContract';
  logger.startOperation(operation, { contractId: 'contract-123' });

  try {
    // Perform operation
    await performOperation();

    const duration = 150; // milliseconds
    logger.endOperation(operation, duration, {
      contractId: 'contract-123',
    });
  } catch (error) {
    logger.operationError(operation, error as Error, {
      contractId: 'contract-123',
    });
    throw error;
  }
}

/**
 * Example: Using metrics
 */
function exampleMetrics() {
  // Increment counter
  metrics.increment('contracts.created');
  metrics.increment('users.logged_in', 1, { source: 'web' });

  // Record gauge
  metrics.gauge('active_users', 42);

  // Record timing
  const startTime = Date.now();
  // ... perform operation
  const duration = Date.now() - startTime;
  metrics.timing('contract.save', duration);

  // Record histogram
  metrics.histogram('contract.size', 1024, { unit: 'bytes' });
}

/**
 * Example: Using tracing
 */
function exampleTracing() {
  // Start a new trace
  const traceId = tracer.startTrace();
  
  // Set trace ID in logger context
  logger.setTraceId(traceId);
  logger.setUserId('user-123');

  // All logs will now include traceId and userId
  logger.info('Operation started');

  // Clear context when done
  logger.clearContext();
}

async function performOperation() {
  // Placeholder
}

export {
  exampleBasicLogging,
  exampleOperationLogging,
  exampleMetrics,
  exampleTracing,
};
