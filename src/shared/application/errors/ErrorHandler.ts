import { AppError, ErrorCode } from './AppError';

/**
 * Centralized error handler
 * Converts errors to user-friendly messages and handles error logging
 */

export interface ErrorContext {
  userId?: string;
  traceId?: string;
  operation?: string;
  [key: string]: unknown;
}

export class ErrorHandler {
  /**
   * Handle and normalize errors
   */
  static handle(error: unknown, context?: ErrorContext): AppError {
    // If already an AppError, return as-is
    if (error instanceof AppError) {
      return error;
    }

    // Handle standard Error objects
    if (error instanceof Error) {
      return this.normalizeError(error, context);
    }

    // Handle string errors
    if (typeof error === 'string') {
      return new AppError(
        ErrorCode.INTERNAL_ERROR,
        error,
        500,
        context
      );
    }

    // Handle unknown error types
    return new AppError(
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { originalError: error, ...context }
    );
  }

  /**
   * Normalize standard Error to AppError
   */
  private static normalizeError(error: Error, context?: ErrorContext): AppError {
    const message = error.message || 'An error occurred';
    
    // Check for common error patterns
    if (message.includes('permission denied') || message.includes('row-level security')) {
      return new AppError(
        ErrorCode.FORBIDDEN,
        'Permission denied. Please ensure you are logged in and have the required permissions.',
        403,
        context,
        error
      );
    }

    if (message.includes('not found') || message.includes('does not exist')) {
      return new AppError(
        ErrorCode.NOT_FOUND,
        message,
        404,
        context,
        error
      );
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('Failed to fetch')) {
      return new AppError(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        'Network error. Please check your connection and try again.',
        502,
        context,
        error
      );
    }

    if (message.includes('timeout')) {
      return new AppError(
        ErrorCode.TIMEOUT,
        'Request timed out. Please try again.',
        504,
        context,
        error
      );
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return new AppError(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded. Please wait a moment and try again.',
        429,
        context,
        error
      );
    }

    if (message.includes('authentication') || message.includes('JWT') || message.includes('not authenticated')) {
      return new AppError(
        ErrorCode.UNAUTHORIZED,
        'You are not authenticated. Please log in and try again.',
        401,
        context,
        error
      );
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return new AppError(
        ErrorCode.VALIDATION_ERROR,
        message,
        400,
        context,
        error
      );
    }

    // Default to internal error
    return new AppError(
      ErrorCode.INTERNAL_ERROR,
      message,
      500,
      context,
      error
    );
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: AppError): string {
    // Return the error message as-is for now
    // Can be enhanced with i18n support later
    return error.message;
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: AppError): boolean {
    return [
      ErrorCode.TIMEOUT,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      ErrorCode.RATE_LIMIT_EXCEEDED,
    ].includes(error.code as ErrorCode);
  }

  /**
   * Get retry delay in milliseconds
   */
  static getRetryDelay(error: AppError, attempt: number): number {
    if (error.code === ErrorCode.RATE_LIMIT_EXCEEDED) {
      // Exponential backoff for rate limits
      return Math.min(1000 * Math.pow(2, attempt), 30000);
    }
    
    if (error.code === ErrorCode.TIMEOUT) {
      return 1000 * attempt;
    }

    // Default exponential backoff
    return Math.min(1000 * Math.pow(2, attempt), 10000);
  }
}
