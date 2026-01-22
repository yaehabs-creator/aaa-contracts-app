/**
 * Metrics collection service
 * Tracks application metrics for monitoring
 */

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

class Metrics {
  private metrics: Metric[] = [];

  /**
   * Record a counter metric
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.record({
      name,
      value,
      timestamp: Date.now(),
      tags,
    });
  }

  /**
   * Record a gauge metric
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record({
      name,
      value,
      timestamp: Date.now(),
      tags,
    });
  }

  /**
   * Record a histogram metric
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.record({
      name,
      value,
      timestamp: Date.now(),
      tags,
    });
  }

  /**
   * Record timing metric
   */
  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.histogram(`${name}.duration`, durationMs, tags);
  }

  /**
   * Record metric
   */
  private record(metric: Metric): void {
    this.metrics.push(metric);
    
    // In production, this would send to a metrics service
    // For now, just log in development
    if (process.env.NODE_ENV === 'development') {
      console.debug('[METRIC]', metric);
    }
  }

  /**
   * Get all metrics (for testing/debugging)
   */
  getAll(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics (for testing)
   */
  clear(): void {
    this.metrics = [];
  }
}

// Export singleton instance
export const metrics = new Metrics();
