/**
 * Structured logging service
 * Replaces console.log with structured, contextual logging
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogContext {
  userId?: string;
  traceId?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private traceId: string | null = null;
  private userId: string | null = null;

  /**
   * Set trace ID for request correlation
   */
  setTraceId(traceId: string): void {
    this.traceId = traceId;
  }

  /**
   * Set user ID for user context
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.traceId = null;
    this.userId = null;
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        traceId: this.traceId || context?.traceId,
        userId: this.userId || context?.userId,
      },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
      console.debug('[DEBUG]', entry);
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    console.info('[INFO]', entry);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    console.warn('[WARN]', entry);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    console.error('[ERROR]', entry);
  }

  /**
   * Log operation start
   */
  startOperation(operation: string, context?: LogContext): void {
    this.info(`Starting operation: ${operation}`, { ...context, operation });
  }

  /**
   * Log operation end
   */
  endOperation(operation: string, duration: number, context?: LogContext): void {
    this.info(`Completed operation: ${operation}`, {
      ...context,
      operation,
      duration,
    });
  }

  /**
   * Log operation error
   */
  operationError(operation: string, error: Error, context?: LogContext): void {
    this.error(`Operation failed: ${operation}`, error, {
      ...context,
      operation,
    });
  }
}

// Export singleton instance
export const logger = new Logger();
