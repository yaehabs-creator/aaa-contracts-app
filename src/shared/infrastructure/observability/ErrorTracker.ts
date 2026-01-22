import { AppError } from '../../application/errors/AppError';
import { logger } from './Logger';
import { metrics } from './Metrics';

/**
 * Error tracking service
 * Tracks and reports errors for monitoring
 */

export interface ErrorReport {
  error: AppError;
  context?: {
    userId?: string;
    traceId?: string;
    operation?: string;
    [key: string]: unknown;
  };
  timestamp: number;
}

class ErrorTracker {
  /**
   * Track an error
   */
  track(error: AppError, context?: ErrorReport['context']): void {
    const report: ErrorReport = {
      error,
      context,
      timestamp: Date.now(),
    };

    // Log the error
    logger.error(error.message, error.cause, context);

    // Record metrics
    metrics.increment('errors.total', 1, {
      code: error.code,
      statusCode: error.statusCode.toString(),
    });

    // In production, this would send to an error tracking service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error tracking service
      console.error('[ERROR_TRACKER]', report);
    } else {
      console.error('[ERROR_TRACKER]', report);
    }
  }

  /**
   * Track unhandled error
   */
  trackUnhandledError(error: Error, context?: ErrorReport['context']): void {
    const appError = new AppError(
      'UNHANDLED_ERROR',
      error.message,
      500,
      context,
      error
    );
    this.track(appError, context);
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();
