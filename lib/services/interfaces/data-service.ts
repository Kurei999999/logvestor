import type { Trade } from '@/types/trade';
import type { CSVMapping } from '@/types/csv';
import type { AppConfig } from '@/types/app';

// Base response interface for all service operations
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

// Data service interface - unified API for both browser and Electron environments
export interface IDataService {
  // === Trade Operations ===
  
  /**
   * Get all trades
   */
  getTrades(): Promise<ServiceResponse<Trade[]>>;
  
  /**
   * Get a specific trade by ID
   */
  getTrade(tradeId: string): Promise<ServiceResponse<Trade | null>>;
  
  /**
   * Save a new trade or update existing trade
   */
  saveTrade(trade: Trade): Promise<ServiceResponse<Trade>>;
  
  /**
   * Update an existing trade
   */
  updateTrade(tradeId: string, updates: Partial<Trade>): Promise<ServiceResponse<Trade>>;
  
  /**
   * Delete a trade by ID
   */
  deleteTrade(tradeId: string): Promise<ServiceResponse<boolean>>;
  
  /**
   * Bulk update multiple trades
   */
  bulkUpdateTrades(trades: Trade[]): Promise<ServiceResponse<Trade[]>>;
  
  /**
   * Delete multiple trades by IDs
   */
  bulkDeleteTrades(tradeIds: string[]): Promise<ServiceResponse<boolean>>;
  
  // === CSV Mapping Operations ===
  
  /**
   * Get all CSV mappings
   */
  getCSVMappings(): Promise<ServiceResponse<CSVMapping[]>>;
  
  /**
   * Get a specific CSV mapping by ID
   */
  getCSVMapping(mappingId: string): Promise<ServiceResponse<CSVMapping | null>>;
  
  /**
   * Save a new CSV mapping
   */
  saveCSVMapping(mapping: CSVMapping): Promise<ServiceResponse<CSVMapping>>;
  
  /**
   * Update an existing CSV mapping
   */
  updateCSVMapping(mappingId: string, updates: Partial<CSVMapping>): Promise<ServiceResponse<CSVMapping>>;
  
  /**
   * Delete a CSV mapping by ID
   */
  deleteCSVMapping(mappingId: string): Promise<ServiceResponse<boolean>>;
  
  // === Configuration Operations ===
  
  /**
   * Get application configuration
   */
  getConfig(): Promise<ServiceResponse<AppConfig>>;
  
  /**
   * Save application configuration
   */
  saveConfig(config: AppConfig): Promise<ServiceResponse<AppConfig>>;
  
  /**
   * Update specific configuration values
   */
  updateConfig(updates: Partial<AppConfig>): Promise<ServiceResponse<AppConfig>>;
  
  /**
   * Reset configuration to defaults
   */
  resetConfig(): Promise<ServiceResponse<AppConfig>>;
  
  // === File System Operations ===
  
  /**
   * Read file content as string
   */
  readFile(path: string): Promise<ServiceResponse<string>>;
  
  /**
   * Write content to file
   */
  writeFile(path: string, content: string): Promise<ServiceResponse<boolean>>;
  
  /**
   * Check if file exists
   */
  fileExists(path: string): Promise<ServiceResponse<boolean>>;
  
  /**
   * Delete a file
   */
  deleteFile(path: string): Promise<ServiceResponse<boolean>>;
  
  /**
   * List directory contents
   */
  listDirectory(path: string): Promise<ServiceResponse<string[]>>;
  
  /**
   * Create directory
   */
  createDirectory(path: string): Promise<ServiceResponse<boolean>>;
  
  // === State Management Operations ===
  
  /**
   * Get selected trades state
   */
  getSelectedTrades(): Promise<ServiceResponse<string[]>>;
  
  /**
   * Save selected trades state
   */
  saveSelectedTrades(tradeIds: string[]): Promise<ServiceResponse<boolean>>;
  
  /**
   * Clear selected trades
   */
  clearSelectedTrades(): Promise<ServiceResponse<boolean>>;
  
  // === Utility Operations ===
  
  /**
   * Export data in various formats
   */
  exportData(format: 'csv' | 'json' | 'xlsx', options?: any): Promise<ServiceResponse<Blob | string>>;
  
  /**
   * Import data from various formats
   */
  importData(data: string | File, format: 'csv' | 'json', options?: any): Promise<ServiceResponse<Trade[]>>;
  
  /**
   * Get service health status
   */
  getHealthStatus(): Promise<ServiceResponse<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    memoryUsage?: number;
    lastError?: string;
  }>>;
}

// Service factory interface
export interface IServiceFactory {
  /**
   * Create appropriate data service based on environment
   */
  createDataService(): IDataService;
  
  /**
   * Check if running in Electron environment
   */
  isElectronEnvironment(): boolean;
  
  /**
   * Check if running in browser environment
   */
  isBrowserEnvironment(): boolean;
}

// Service configuration
export interface ServiceConfig {
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
  enableMetrics: boolean;
}

// Default service configuration
export const DEFAULT_SERVICE_CONFIG: ServiceConfig = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  enableLogging: true,
  enableMetrics: true,
};