/**
 * Example: Using Error Handling
 * 
 * This example shows how to use the centralized error handling system.
 */

import { AppErrors, ErrorHandler } from '../src/shared/application/errors';
import { logger } from '../src/shared/infrastructure/observability/Logger';
import { errorTracker } from '../src/shared/infrastructure/observability/ErrorTracker';

/**
 * Example: Throwing structured errors
 */
function exampleThrowError() {
  // Use helper functions for common errors
  throw AppErrors.notFound('Contract', 'contract-123');
  
  // Or create custom errors
  throw new AppErrors.validationError('Invalid input', {
    field: 'name',
    value: '',
  });
}

/**
 * Example: Handling errors
 */
async function exampleHandleError() {
  try {
    // Some operation that might fail
    await someOperation();
  } catch (error) {
    // Normalize error to AppError
    const appError = ErrorHandler.handle(error, {
      operation: 'someOperation',
      userId: 'user-123',
    });

    // Log the error
    logger.error('Operation failed', appError.cause || appError, {
      operation: 'someOperation',
    });

    // Track the error
    errorTracker.track(appError, {
      userId: 'user-123',
      operation: 'someOperation',
    });

    // Get user-friendly message
    const userMessage = ErrorHandler.getUserMessage(appError);
    
    // Check if retryable
    if (ErrorHandler.isRetryable(appError)) {
      const delay = ErrorHandler.getRetryDelay(appError, 1);
      // Retry after delay
    }

    throw appError;
  }
}

/**
 * Example: Handling specific error types
 */
async function exampleSpecificErrors() {
  try {
    await someOperation();
  } catch (error) {
    const appError = ErrorHandler.handle(error);

    switch (appError.code) {
      case 'NOT_FOUND':
        // Handle not found
        break;
      case 'VALIDATION_ERROR':
        // Handle validation error
        break;
      case 'UNAUTHORIZED':
        // Handle unauthorized
        break;
      default:
        // Handle other errors
    }
  }
}

async function someOperation() {
  // Placeholder
}

export {
  exampleThrowError,
  exampleHandleError,
  exampleSpecificErrors,
};
