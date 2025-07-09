import { IPCChannel, IPCRequest, IPCResponse } from '@/types/ipc';
import { IPCStatistics, IPCConnectionStatus } from './events';

// Performance metrics interface
export interface PerformanceMetrics {
  requestId: string;
  channel: IPCChannel;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  retryCount: number;
  payloadSize: number;
  responseSize?: number;
}

// Performance statistics
export interface PerformanceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  slowestChannel: string;
  fastestChannel: string;
  errorRate: number;
  totalDataTransferred: number;
  channelStats: Record<string, {
    count: number;
    averageTime: number;
    errorCount: number;
    totalSize: number;
  }>;
}

// Debug log entry
export interface DebugLogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: 'ipc' | 'service' | 'cache' | 'validation' | 'general';
  message: string;
  data?: any;
  requestId?: string;
  channel?: string;
}

/**
 * Performance monitoring and debugging utility for IPC communication
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private debugLogs: DebugLogEntry[] = [];
  private readonly maxMetrics = 1000;
  private readonly maxLogs = 500;
  private startTime = Date.now();
  private enabled = false;

  private constructor() {
    this.enabled = process.env.NODE_ENV === 'development' || 
                  localStorage.getItem('ipc-monitoring') === 'true';
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ipc-monitoring', enabled.toString());
    }
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Start tracking a request
   */
  startRequest(request: IPCRequest, payloadSize: number = 0): void {
    if (!this.enabled) return;

    const metric: PerformanceMetrics = {
      requestId: request.id,
      channel: request.channel as IPCChannel,
      startTime: Date.now(),
      success: false,
      retryCount: 0,
      payloadSize,
    };

    this.metrics.push(metric);
    this.trimMetrics();

    this.log('debug', 'ipc', `Started request ${request.id} to ${request.channel}`, {
      requestId: request.id,
      channel: request.channel,
      payloadSize,
    });
  }

  /**
   * End tracking a request
   */
  endRequest(
    requestId: string, 
    success: boolean, 
    error?: string, 
    responseSize: number = 0
  ): void {
    if (!this.enabled) return;

    const metric = this.metrics.find(m => m.requestId === requestId);
    if (!metric) return;

    const endTime = Date.now();
    metric.endTime = endTime;
    metric.duration = endTime - metric.startTime;
    metric.success = success;
    metric.error = error;
    metric.responseSize = responseSize;

    const level = success ? 'debug' : 'error';
    const message = success 
      ? `Completed request ${requestId} in ${metric.duration}ms`
      : `Failed request ${requestId} after ${metric.duration}ms: ${error}`;

    this.log(level, 'ipc', message, {
      requestId,
      channel: metric.channel,
      duration: metric.duration,
      success,
      error,
      responseSize,
    });
  }

  /**
   * Record a retry attempt
   */
  recordRetry(requestId: string): void {
    if (!this.enabled) return;

    const metric = this.metrics.find(m => m.requestId === requestId);
    if (metric) {
      metric.retryCount++;
      this.log('warn', 'ipc', `Retry attempt ${metric.retryCount} for request ${requestId}`, {
        requestId,
        channel: metric.channel,
        retryCount: metric.retryCount,
      });
    }
  }

  /**
   * Log a debug message
   */
  log(
    level: DebugLogEntry['level'], 
    category: DebugLogEntry['category'], 
    message: string, 
    data?: any
  ): void {
    if (!this.enabled) return;

    const entry: DebugLogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      requestId: data?.requestId,
      channel: data?.channel,
    };

    this.debugLogs.push(entry);
    this.trimLogs();

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const logMethod = level === 'error' ? console.error : 
                       level === 'warn' ? console.warn : 
                       console.log;
      
      logMethod(`[${category.toUpperCase()}] ${message}`, data);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): PerformanceStats {
    const completedMetrics = this.metrics.filter(m => m.duration !== undefined);
    
    if (completedMetrics.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        slowestChannel: '',
        fastestChannel: '',
        errorRate: 0,
        totalDataTransferred: 0,
        channelStats: {},
      };
    }

    const successful = completedMetrics.filter(m => m.success);
    const failed = completedMetrics.filter(m => !m.success);
    const durations = completedMetrics.map(m => m.duration!);
    const totalDataTransferred = completedMetrics.reduce(
      (sum, m) => sum + m.payloadSize + (m.responseSize || 0), 
      0
    );

    // Channel statistics
    const channelStats: Record<string, any> = {};
    completedMetrics.forEach(metric => {
      const channel = metric.channel;
      if (!channelStats[channel]) {
        channelStats[channel] = {
          count: 0,
          totalTime: 0,
          errorCount: 0,
          totalSize: 0,
        };
      }
      
      channelStats[channel].count++;
      channelStats[channel].totalTime += metric.duration!;
      channelStats[channel].totalSize += metric.payloadSize + (metric.responseSize || 0);
      if (!metric.success) {
        channelStats[channel].errorCount++;
      }
    });

    // Calculate averages and find extremes
    Object.keys(channelStats).forEach(channel => {
      const stats = channelStats[channel];
      stats.averageTime = stats.totalTime / stats.count;
    });

    const channelAverages = Object.entries(channelStats).map(([channel, stats]) => ({
      channel,
      averageTime: (stats as any).averageTime,
    }));

    const slowestChannel = channelAverages.reduce((prev, curr) => 
      prev.averageTime > curr.averageTime ? prev : curr, channelAverages[0]
    )?.channel || '';

    const fastestChannel = channelAverages.reduce((prev, curr) => 
      prev.averageTime < curr.averageTime ? prev : curr, channelAverages[0]
    )?.channel || '';

    return {
      totalRequests: completedMetrics.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageResponseTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      maxResponseTime: Math.max(...durations),
      minResponseTime: Math.min(...durations),
      slowestChannel,
      fastestChannel,
      errorRate: (failed.length / completedMetrics.length) * 100,
      totalDataTransferred,
      channelStats: Object.fromEntries(
        Object.entries(channelStats).map(([channel, stats]) => [
          channel,
          {
            count: (stats as any).count,
            averageTime: (stats as any).averageTime,
            errorCount: (stats as any).errorCount,
            totalSize: (stats as any).totalSize,
          }
        ])
      ),
    };
  }

  /**
   * Get IPC statistics for service health
   */
  getIPCStatistics(): IPCStatistics {
    const stats = this.getPerformanceStats();
    const uptime = Date.now() - this.startTime;
    const lastError = this.debugLogs
      .filter(log => log.level === 'error')
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    return {
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      timeoutRequests: this.debugLogs.filter(log => 
        log.message.includes('timeout') || log.message.includes('Timeout')
      ).length,
      averageResponseTime: stats.averageResponseTime,
      connectionStatus: this.determineConnectionStatus(stats),
      lastError: lastError?.message,
      uptime,
    };
  }

  /**
   * Get debug logs
   */
  getDebugLogs(
    level?: DebugLogEntry['level'], 
    category?: DebugLogEntry['category'],
    since?: number
  ): DebugLogEntry[] {
    let logs = [...this.debugLogs];

    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    if (category) {
      logs = logs.filter(log => log.category === category);
    }

    if (since) {
      logs = logs.filter(log => log.timestamp >= since);
    }

    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear all metrics and logs
   */
  clear(): void {
    this.metrics = [];
    this.debugLogs = [];
    this.log('info', 'general', 'Performance monitor cleared');
  }

  /**
   * Export data for analysis
   */
  exportData(): {
    metrics: PerformanceMetrics[];
    logs: DebugLogEntry[];
    stats: PerformanceStats;
    exportTime: number;
  } {
    return {
      metrics: [...this.metrics],
      logs: [...this.debugLogs],
      stats: this.getPerformanceStats(),
      exportTime: Date.now(),
    };
  }

  /**
   * Get metrics for a specific channel
   */
  getChannelMetrics(channel: IPCChannel): PerformanceMetrics[] {
    return this.metrics.filter(m => m.channel === channel);
  }

  /**
   * Get slow requests (above threshold)
   */
  getSlowRequests(thresholdMs: number = 5000): PerformanceMetrics[] {
    return this.metrics.filter(m => 
      m.duration !== undefined && m.duration > thresholdMs
    );
  }

  /**
   * Get failed requests
   */
  getFailedRequests(): PerformanceMetrics[] {
    return this.metrics.filter(m => !m.success && m.duration !== undefined);
  }

  private trimMetrics(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  private trimLogs(): void {
    if (this.debugLogs.length > this.maxLogs) {
      this.debugLogs = this.debugLogs.slice(-this.maxLogs);
    }
  }

  private determineConnectionStatus(stats: PerformanceStats): IPCConnectionStatus {
    if (stats.totalRequests === 0) {
      return IPCConnectionStatus.DISCONNECTED;
    }

    const recentErrors = this.debugLogs
      .filter(log => log.level === 'error' && log.timestamp > Date.now() - 30000) // Last 30 seconds
      .length;

    if (recentErrors === 0 && stats.errorRate < 5) {
      return IPCConnectionStatus.CONNECTED;
    }

    if (stats.errorRate > 50) {
      return IPCConnectionStatus.ERROR;
    }

    return IPCConnectionStatus.CONNECTED; // Assume connected but possibly degraded
  }
}

// Global instance for convenience
export const performanceMonitor = PerformanceMonitor.getInstance();

// Convenience functions
export function startRequestTracking(request: IPCRequest, payloadSize?: number): void {
  performanceMonitor.startRequest(request, payloadSize);
}

export function endRequestTracking(
  requestId: string, 
  success: boolean, 
  error?: string, 
  responseSize?: number
): void {
  performanceMonitor.endRequest(requestId, success, error, responseSize);
}

export function recordRetryAttempt(requestId: string): void {
  performanceMonitor.recordRetry(requestId);
}

export function logDebug(
  level: DebugLogEntry['level'], 
  category: DebugLogEntry['category'], 
  message: string, 
  data?: any
): void {
  performanceMonitor.log(level, category, message, data);
}