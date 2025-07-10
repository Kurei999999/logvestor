import type { Trade } from '@/types/trade';
import type { CSVMapping } from '@/types/csv';
import type { AppConfig } from '@/types/app';
import type { IDataService, ServiceResponse } from '../interfaces/data-service';
import { LocalStorage } from '@/lib/file-system/storage';
import { ErrorHandler, ServiceError, ErrorCode } from '@/lib/ipc/error-handler';

/**
 * Browser implementation of IDataService using existing LocalStorage
 * This service wraps the existing LocalStorage class to provide a unified API
 */
export class BrowserDataService implements IDataService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  // === Trade Operations ===

  async getTrades(): Promise<ServiceResponse<Trade[]>> {
    return ErrorHandler.withErrorHandling(async () => {
      const trades = LocalStorage.loadTrades();
      return trades;
    }, 'BrowserDataService.getTrades');
  }

  async getTrade(tradeId: string): Promise<ServiceResponse<Trade | null>> {
    return ErrorHandler.withErrorHandling(async () => {
      const trades = LocalStorage.loadTrades();
      const trade = trades.find(t => t.id === tradeId) || null;
      return trade;
    }, 'BrowserDataService.getTrade');
  }

  async saveTrade(trade: Trade): Promise<ServiceResponse<Trade>> {
    return ErrorHandler.withErrorHandling(async () => {
      if (!trade.id || !trade.ticker || !trade.buyDate) {
        throw new ServiceError(
          ErrorCode.VALIDATION_FAILED,
          'Trade must have id, ticker, and buyDate',
          { trade }
        );
      }

      const trades = LocalStorage.loadTrades();
      const existingIndex = trades.findIndex(t => t.id === trade.id);
      
      if (existingIndex >= 0) {
        trades[existingIndex] = trade;
      } else {
        trades.push(trade);
      }
      
      LocalStorage.saveTrades(trades);
      return trade;
    }, 'BrowserDataService.saveTrade');
  }

  async updateTrade(tradeId: string, updates: Partial<Trade>): Promise<ServiceResponse<Trade>> {
    return ErrorHandler.withErrorHandling(async () => {
      const trades = LocalStorage.loadTrades();
      const tradeIndex = trades.findIndex(t => t.id === tradeId);
      
      if (tradeIndex === -1) {
        throw new ServiceError(
          ErrorCode.DATA_NOT_FOUND,
          `Trade with ID ${tradeId} not found`,
          { tradeId }
        );
      }
      
      const updatedTrade = { ...trades[tradeIndex], ...updates };
      trades[tradeIndex] = updatedTrade;
      
      LocalStorage.saveTrades(trades);
      return updatedTrade;
    }, 'BrowserDataService.updateTrade');
  }

  async deleteTrade(tradeId: string): Promise<ServiceResponse<boolean>> {
    return ErrorHandler.withErrorHandling(async () => {
      const trades = LocalStorage.loadTrades();
      const initialLength = trades.length;
      const filteredTrades = trades.filter(t => t.id !== tradeId);
      
      if (filteredTrades.length === initialLength) {
        throw new ServiceError(
          ErrorCode.DATA_NOT_FOUND,
          `Trade with ID ${tradeId} not found`,
          { tradeId }
        );
      }
      
      LocalStorage.saveTrades(filteredTrades);
      return true;
    }, 'BrowserDataService.deleteTrade');
  }

  async bulkUpdateTrades(trades: Trade[]): Promise<ServiceResponse<Trade[]>> {
    return ErrorHandler.withErrorHandling(async () => {
      if (!Array.isArray(trades)) {
        throw new ServiceError(
          ErrorCode.INVALID_DATA,
          'Expected an array of trades',
          { trades }
        );
      }

      // Validate all trades
      for (const trade of trades) {
        if (!trade.id || !trade.ticker || !trade.buyDate) {
          throw new ServiceError(
            ErrorCode.VALIDATION_FAILED,
            'All trades must have id, ticker, and buyDate',
            { invalidTrade: trade }
          );
        }
      }
      
      LocalStorage.saveTrades(trades);
      return trades;
    }, 'BrowserDataService.bulkUpdateTrades');
  }

  async bulkDeleteTrades(tradeIds: string[]): Promise<ServiceResponse<boolean>> {
    return ErrorHandler.withErrorHandling(async () => {
      if (!Array.isArray(tradeIds)) {
        throw new ServiceError(
          ErrorCode.INVALID_DATA,
          'Expected an array of trade IDs',
          { tradeIds }
        );
      }

      const trades = LocalStorage.loadTrades();
      const filteredTrades = trades.filter(t => !tradeIds.includes(t.id));
      
      LocalStorage.saveTrades(filteredTrades);
      return true;
    }, 'BrowserDataService.bulkDeleteTrades');
  }

  // === CSV Mapping Operations ===

  async getCSVMappings(): Promise<ServiceResponse<CSVMapping[]>> {
    return ErrorHandler.withErrorHandling(async () => {
      const mappings = LocalStorage.loadCSVMappings();
      return mappings;
    }, 'BrowserDataService.getCSVMappings');
  }

  async getCSVMapping(mappingId: string): Promise<ServiceResponse<CSVMapping | null>> {
    return ErrorHandler.withErrorHandling(async () => {
      const mappings = LocalStorage.loadCSVMappings();
      const mapping = mappings.find(m => m.id === mappingId) || null;
      return mapping;
    }, 'BrowserDataService.getCSVMapping');
  }

  async saveCSVMapping(mapping: CSVMapping): Promise<ServiceResponse<CSVMapping>> {
    return ErrorHandler.withErrorHandling(async () => {
      if (!mapping.id || !mapping.name) {
        throw new ServiceError(
          ErrorCode.VALIDATION_FAILED,
          'CSV mapping must have id and name',
          { mapping }
        );
      }

      const mappings = LocalStorage.loadCSVMappings();
      const existingIndex = mappings.findIndex(m => m.id === mapping.id);
      
      if (existingIndex >= 0) {
        mappings[existingIndex] = mapping;
      } else {
        mappings.push(mapping);
      }
      
      LocalStorage.saveCSVMappings(mappings);
      return mapping;
    }, 'BrowserDataService.saveCSVMapping');
  }

  async updateCSVMapping(mappingId: string, updates: Partial<CSVMapping>): Promise<ServiceResponse<CSVMapping>> {
    return ErrorHandler.withErrorHandling(async () => {
      const mappings = LocalStorage.loadCSVMappings();
      const mappingIndex = mappings.findIndex(m => m.id === mappingId);
      
      if (mappingIndex === -1) {
        throw new ServiceError(
          ErrorCode.DATA_NOT_FOUND,
          `CSV mapping with ID ${mappingId} not found`,
          { mappingId }
        );
      }
      
      const updatedMapping = { ...mappings[mappingIndex], ...updates };
      mappings[mappingIndex] = updatedMapping;
      
      LocalStorage.saveCSVMappings(mappings);
      return updatedMapping;
    }, 'BrowserDataService.updateCSVMapping');
  }

  async deleteCSVMapping(mappingId: string): Promise<ServiceResponse<boolean>> {
    return ErrorHandler.withErrorHandling(async () => {
      const mappings = LocalStorage.loadCSVMappings();
      const initialLength = mappings.length;
      const filteredMappings = mappings.filter(m => m.id !== mappingId);
      
      if (filteredMappings.length === initialLength) {
        throw new ServiceError(
          ErrorCode.DATA_NOT_FOUND,
          `CSV mapping with ID ${mappingId} not found`,
          { mappingId }
        );
      }
      
      LocalStorage.saveCSVMappings(filteredMappings);
      return true;
    }, 'BrowserDataService.deleteCSVMapping');
  }

  // === Configuration Operations ===

  async getConfig(): Promise<ServiceResponse<AppConfig>> {
    return ErrorHandler.withErrorHandling(async () => {
      const config = LocalStorage.loadConfig();
      return config;
    }, 'BrowserDataService.getConfig');
  }

  async saveConfig(config: AppConfig): Promise<ServiceResponse<AppConfig>> {
    return ErrorHandler.withErrorHandling(async () => {
      if (!config || typeof config !== 'object') {
        throw new ServiceError(
          ErrorCode.INVALID_DATA,
          'Invalid configuration object',
          { config }
        );
      }

      LocalStorage.saveConfig(config);
      return config;
    }, 'BrowserDataService.saveConfig');
  }

  async updateConfig(updates: Partial<AppConfig>): Promise<ServiceResponse<AppConfig>> {
    return ErrorHandler.withErrorHandling(async () => {
      const config = LocalStorage.loadConfig();
      const updatedConfig = { ...config, ...updates };
      
      LocalStorage.saveConfig(updatedConfig);
      return updatedConfig;
    }, 'BrowserDataService.updateConfig');
  }

  async resetConfig(): Promise<ServiceResponse<AppConfig>> {
    return ErrorHandler.withErrorHandling(async () => {
      LocalStorage.clearConfig();
      const defaultConfig = LocalStorage.loadConfig();
      return defaultConfig;
    }, 'BrowserDataService.resetConfig');
  }

  // === File System Operations ===

  async readFile(path: string): Promise<ServiceResponse<string>> {
    return ErrorHandler.withErrorHandling(async () => {
      throw new ServiceError(
        ErrorCode.SERVICE_UNAVAILABLE,
        'File system operations not available in browser environment',
        { path, operation: 'readFile' }
      );
    }, 'BrowserDataService.readFile');
  }

  async writeFile(path: string, content: string): Promise<ServiceResponse<boolean>> {
    return ErrorHandler.withErrorHandling(async () => {
      throw new ServiceError(
        ErrorCode.SERVICE_UNAVAILABLE,
        'File system operations not available in browser environment',
        { path, operation: 'writeFile' }
      );
    }, 'BrowserDataService.writeFile');
  }

  async fileExists(path: string): Promise<ServiceResponse<boolean>> {
    return ErrorHandler.withErrorHandling(async () => {
      throw new ServiceError(
        ErrorCode.SERVICE_UNAVAILABLE,
        'File system operations not available in browser environment',
        { path, operation: 'fileExists' }
      );
    }, 'BrowserDataService.fileExists');
  }

  async deleteFile(path: string): Promise<ServiceResponse<boolean>> {
    return ErrorHandler.withErrorHandling(async () => {
      throw new ServiceError(
        ErrorCode.SERVICE_UNAVAILABLE,
        'File system operations not available in browser environment',
        { path, operation: 'deleteFile' }
      );
    }, 'BrowserDataService.deleteFile');
  }

  async listDirectory(path: string): Promise<ServiceResponse<string[]>> {
    return ErrorHandler.withErrorHandling(async () => {
      throw new ServiceError(
        ErrorCode.SERVICE_UNAVAILABLE,
        'File system operations not available in browser environment',
        { path, operation: 'listDirectory' }
      );
    }, 'BrowserDataService.listDirectory');
  }

  async createDirectory(path: string): Promise<ServiceResponse<boolean>> {
    return ErrorHandler.withErrorHandling(async () => {
      throw new ServiceError(
        ErrorCode.SERVICE_UNAVAILABLE,
        'File system operations not available in browser environment',
        { path, operation: 'createDirectory' }
      );
    }, 'BrowserDataService.createDirectory');
  }

  // === State Management Operations ===

  async getSelectedTrades(): Promise<ServiceResponse<string[]>> {
    return ErrorHandler.withErrorHandling(async () => {
      const selectedTrades = LocalStorage.getSelectedTrades();
      return selectedTrades;
    }, 'BrowserDataService.getSelectedTrades');
  }

  async saveSelectedTrades(tradeIds: string[]): Promise<ServiceResponse<boolean>> {
    return ErrorHandler.withErrorHandling(async () => {
      if (!Array.isArray(tradeIds)) {
        throw new ServiceError(
          ErrorCode.INVALID_DATA,
          'Expected an array of trade IDs',
          { tradeIds }
        );
      }

      LocalStorage.setSelectedTrades(tradeIds);
      return true;
    }, 'BrowserDataService.saveSelectedTrades');
  }

  async clearSelectedTrades(): Promise<ServiceResponse<boolean>> {
    return ErrorHandler.withErrorHandling(async () => {
      LocalStorage.setSelectedTrades([]);
      return true;
    }, 'BrowserDataService.clearSelectedTrades');
  }

  // === Utility Operations ===

  async exportData(format: 'csv' | 'json' | 'xlsx', options?: any): Promise<ServiceResponse<Blob | string>> {
    return ErrorHandler.withErrorHandling(async () => {
      const trades = LocalStorage.loadTrades();
      
      if (format === 'json') {
        const jsonData = JSON.stringify(trades, null, 2);
        return jsonData;
      }
      
      if (format === 'csv') {
        // Basic CSV export implementation
        if (trades.length === 0) {
          return '';
        }
        
        const headers = Object.keys(trades[0]).join(',');
        const rows = trades.map(trade => 
          Object.values(trade).map(value => 
            typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : String(value)
          ).join(',')
        );
        
        return [headers, ...rows].join('\n');
      }
      
      throw new ServiceError(
        ErrorCode.INVALID_FORMAT,
        `Export format '${format}' is not supported`,
        { format, supportedFormats: ['json', 'csv'] }
      );
    }, 'BrowserDataService.exportData');
  }

  async importData(data: string | File, format: 'csv' | 'json', options?: any): Promise<ServiceResponse<Trade[]>> {
    return ErrorHandler.withErrorHandling(async () => {
      throw new ServiceError(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Import functionality not implemented in basic browser service',
        { format }
      );
    }, 'BrowserDataService.importData');
  }

  async getHealthStatus(): Promise<ServiceResponse<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    memoryUsage?: number;
    lastError?: string;
  }>> {
    return ErrorHandler.withErrorHandling(async () => {
      const uptime = Date.now() - this.startTime;
      const errorHistory = ErrorHandler.getErrorHistory();
      const lastError = errorHistory.length > 0 
        ? errorHistory[errorHistory.length - 1].message 
        : undefined;
      
      // Basic health check
      try {
        LocalStorage.loadTrades();
        LocalStorage.loadConfig();
        
        return {
          status: 'healthy' as const,
          uptime,
          lastError,
        };
      } catch (error) {
        return {
          status: 'unhealthy' as const,
          uptime,
          lastError: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }, 'BrowserDataService.getHealthStatus');
  }
}