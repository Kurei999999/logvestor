import type { ServiceResponse } from '../services/interfaces/data-service';

// Error codes for different types of failures
export enum ErrorCode {
  // Network/Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  IPC_NOT_AVAILABLE = 'IPC_NOT_AVAILABLE',
  
  // Data errors
  INVALID_DATA = 'INVALID_DATA',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  DUPLICATE_DATA = 'DUPLICATE_DATA',
  
  // File system errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  STORAGE_FULL = 'STORAGE_FULL',
  
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // System errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  OPERATION_CANCELLED = 'OPERATION_CANCELLED',
}

// Custom error class for service operations
export class ServiceError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: any;
  public readonly timestamp: number;

  constructor(code: ErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

// Error handler utility class
export class ErrorHandler {
  private static errorHistory: ServiceError[] = [];
  private static readonly MAX_ERROR_HISTORY = 100;

  /**
   * Create a success response
   */
  static createSuccessResponse<T>(data: T): ServiceResponse<T> {
    return {
      success: true,
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * Create an error response from a ServiceError
   */
  static createErrorResponse(error: ServiceError): ServiceResponse<never> {
    this.logError(error);
    
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Create an error response from unknown error
   */
  static createErrorResponseFromUnknown(error: unknown): ServiceResponse<never> {
    let serviceError: ServiceError;

    if (error instanceof ServiceError) {
      serviceError = error;
    } else if (error instanceof Error) {
      serviceError = new ServiceError(
        ErrorCode.UNKNOWN_ERROR,
        error.message,
        { originalError: error.name }
      );
    } else {
      serviceError = new ServiceError(
        ErrorCode.UNKNOWN_ERROR,
        'An unknown error occurred',
        { originalError: String(error) }
      );
    }

    return this.createErrorResponse(serviceError);
  }

  /**
   * Wrap a function with error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<ServiceResponse<T>> {
    try {
      const result = await operation();
      return this.createSuccessResponse(result);
    } catch (error) {
      if (context) {
        console.error(`Error in ${context}:`, error);
      }
      return this.createErrorResponseFromUnknown(error);
    }
  }

  /**
   * Log error to history
   */
  private static logError(error: ServiceError): void {
    this.errorHistory.push(error);
    
    // Keep only the latest errors
    if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
      this.errorHistory = this.errorHistory.slice(-this.MAX_ERROR_HISTORY);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ServiceError]', {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date(error.timestamp).toISOString(),
      });
    }
  }

  /**
   * Get error history
   */
  static getErrorHistory(): ServiceError[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  static clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: ServiceError): boolean {
    const retryableCodes = [
      ErrorCode.CONNECTION_FAILED,
      ErrorCode.TIMEOUT,
      ErrorCode.SERVICE_UNAVAILABLE,
    ];
    
    return retryableCodes.includes(error.code);
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: ServiceError): string {
    const messages: Record<ErrorCode, string> = {
      [ErrorCode.CONNECTION_FAILED]: 'Connection failed. Please check your network.',
      [ErrorCode.TIMEOUT]: 'Operation timed out. Please try again.',
      [ErrorCode.IPC_NOT_AVAILABLE]: 'Communication service is not available.',
      [ErrorCode.INVALID_DATA]: 'The provided data is invalid.',
      [ErrorCode.DATA_NOT_FOUND]: 'The requested data was not found.',
      [ErrorCode.DUPLICATE_DATA]: 'This data already exists.',
      [ErrorCode.FILE_NOT_FOUND]: 'The requested file was not found.',
      [ErrorCode.FILE_ACCESS_DENIED]: 'Access to the file was denied.',
      [ErrorCode.DIRECTORY_NOT_FOUND]: 'The requested folder was not found.',
      [ErrorCode.STORAGE_FULL]: 'Storage is full. Please free up some space.',
      [ErrorCode.VALIDATION_FAILED]: 'Data validation failed.',
      [ErrorCode.REQUIRED_FIELD_MISSING]: 'Required information is missing.',
      [ErrorCode.INVALID_FORMAT]: 'The data format is invalid.',
      [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred.',
      [ErrorCode.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable.',
      [ErrorCode.OPERATION_CANCELLED]: 'The operation was cancelled.',
    };

    return messages[error.code] || error.message;
  }
}

// Retry utility for failed operations
export class RetryHandler {
  /**
   * Retry an operation with exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<ServiceResponse<T>>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<ServiceResponse<T>> {
    let lastResponse: ServiceResponse<T>;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      lastResponse = await operation();
      
      if (lastResponse.success) {
        return lastResponse;
      }
      
      // Check if error is retryable
      if (lastResponse.error) {
        const serviceError = new ServiceError(
          lastResponse.error.code as ErrorCode,
          lastResponse.error.message,
          lastResponse.error.details
        );
        
        if (!ErrorHandler.isRetryableError(serviceError) || attempt === maxAttempts) {
          break;
        }
        
        // Wait before retry with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return lastResponse!;
  }
}