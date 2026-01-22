/**
 * Base application error class
 * Provides structured error handling with error codes and context
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AppError';
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert error to JSON for logging/API responses
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      name: this.name,
    };
  }
}

/**
 * Predefined error codes
 */
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Not found errors
  NOT_FOUND = 'NOT_FOUND',
  CONTRACT_NOT_FOUND = 'CONTRACT_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  QUERY_FAILED = 'QUERY_FAILED',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Helper functions to create specific error types
 */
export class AppErrors {
  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message, 401);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message, 403);
  }

  static notFound(resource: string, id?: string): AppError {
    const message = id 
      ? `${resource} with id ${id} not found`
      : `${resource} not found`;
    return new AppError(ErrorCode.NOT_FOUND, message, 404);
  }

  static validationError(message: string, details?: unknown): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }

  static databaseError(message: string, cause?: Error): AppError {
    return new AppError(ErrorCode.DATABASE_ERROR, message, 500, undefined, cause);
  }

  static externalServiceError(service: string, message: string, cause?: Error): AppError {
    return new AppError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      `${service}: ${message}`,
      502,
      { service },
      cause
    );
  }

  static rateLimitExceeded(service: string): AppError {
    return new AppError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded for ${service}`,
      429,
      { service }
    );
  }

  static timeout(operation: string, timeoutMs: number): AppError {
    return new AppError(
      ErrorCode.TIMEOUT,
      `Operation ${operation} timed out after ${timeoutMs}ms`,
      504,
      { operation, timeoutMs }
    );
  }

  static internalError(message: string, cause?: Error): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, 500, undefined, cause);
  }
}
