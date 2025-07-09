import { IPCChannel, IPCRequest, IPCResponse } from '@/types/ipc';

// IPC Event Definitions and Constants
export class IPCEvents {
  // Request timeout duration (ms)
  static readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  
  // Request retry configuration
  static readonly MAX_RETRIES = 3;
  static readonly RETRY_DELAY = 1000; // 1 second
  
  // Event priorities
  static readonly HIGH_PRIORITY_CHANNELS = [
    IPCChannel.GET_TRADES,
    IPCChannel.SAVE_TRADE,
    IPCChannel.GET_CONFIG,
  ];
  
  static readonly LOW_PRIORITY_CHANNELS = [
    IPCChannel.GET_SYSTEM_INFO,
    IPCChannel.EXPORT_CSV,
  ];
  
  // Generate unique request ID
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Create IPC request
  static createRequest<T>(channel: IPCChannel, payload: T): IPCRequest<T> {
    return {
      id: this.generateRequestId(),
      channel,
      payload,
      timestamp: Date.now(),
    };
  }
  
  // Create IPC response
  static createResponse<T>(
    requestId: string,
    success: boolean,
    data?: T,
    error?: { code: string; message: string; details?: any }
  ): IPCResponse<T> {
    return {
      id: requestId,
      success,
      data,
      error,
      timestamp: Date.now(),
    };
  }
  
  // Validate channel name
  static isValidChannel(channel: string): channel is IPCChannel {
    return Object.values(IPCChannel).includes(channel as IPCChannel);
  }
  
  // Check if channel is high priority
  static isHighPriority(channel: IPCChannel): boolean {
    return this.HIGH_PRIORITY_CHANNELS.includes(channel);
  }
  
  // Check if channel is low priority
  static isLowPriority(channel: IPCChannel): boolean {
    return this.LOW_PRIORITY_CHANNELS.includes(channel);
  }
  
  // Get retry configuration for channel
  static getRetryConfig(channel: IPCChannel): { maxRetries: number; delay: number } {
    if (this.isHighPriority(channel)) {
      return { maxRetries: this.MAX_RETRIES, delay: this.RETRY_DELAY };
    }
    
    if (this.isLowPriority(channel)) {
      return { maxRetries: 1, delay: this.RETRY_DELAY * 2 };
    }
    
    return { maxRetries: 2, delay: this.RETRY_DELAY };
  }
}

// IPC Event Listeners
export interface IPCEventListeners {
  onRequest?: (request: IPCRequest) => void;
  onResponse?: (response: IPCResponse) => void;
  onError?: (error: Error) => void;
  onTimeout?: (requestId: string) => void;
  onRetry?: (requestId: string, attempt: number) => void;
}

// IPC Connection Status
export enum IPCConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
}

// IPC Statistics
export interface IPCStatistics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeoutRequests: number;
  averageResponseTime: number;
  connectionStatus: IPCConnectionStatus;
  lastError?: string;
  uptime: number;
}