import type { Trade } from '@/types/trade';
import type { CSVMapping } from '@/types/csv';
import type { AppConfig } from '@/types/app';
import type { IDataService, ServiceResponse } from '../interfaces/data-service';
import { ErrorHandler, ServiceError, ErrorCode, RetryHandler } from '@/lib/ipc/error-handler';
import { IPCChannel, IPCRequest, IPCResponse } from '@/types/ipc';
import { IPCEvents } from '@/lib/ipc/events';

/**
 * Electron implementation of IDataService using IPC communication
 * This service communicates with Electron main process through IPC
 */
export class ElectronDataService implements IDataService {
  private startTime: number;
  private electronAPI: any;

  constructor() {
    this.startTime = Date.now();
    this.electronAPI = this.getElectronAPI();
  }

  /**
   * Get Electron API from window object
   */
  private getElectronAPI(): any {
    if (typeof window === 'undefined') {
      throw new ServiceError(
        ErrorCode.IPC_NOT_AVAILABLE,
        'Electron API not available: not in browser environment'
      );
    }

    const api = (window as any).electron || (window as any).electronAPI;
    if (!api || !api.ipcRenderer) {
      throw new ServiceError(
        ErrorCode.IPC_NOT_AVAILABLE,
        'Electron API not available: ipcRenderer not found'
      );
    }

    return api;
  }

  /**
   * Send IPC request and wait for response
   */
  private async sendIPCRequest<T, R>(
    channel: IPCChannel,
    payload: T,
    options: { timeout?: number; retryAttempts?: number } = {}
  ): Promise<ServiceResponse<R>> {
    const { timeout = IPCEvents.REQUEST_TIMEOUT, retryAttempts = 3 } = options;

    const operation = async (): Promise<ServiceResponse<R>> => {
      return new Promise((resolve, reject) => {
        const request = IPCEvents.createRequest(channel, payload);
        const timeoutId = setTimeout(() => {
          reject(new ServiceError(
            ErrorCode.TIMEOUT,
            `IPC request timeout after ${timeout}ms`,
            { channel, requestId: request.id }
          ));
        }, timeout);

        // Send request
        this.electronAPI.ipcRenderer.invoke(channel, request)
          .then((response: IPCResponse<R>) => {
            clearTimeout(timeoutId);
            
            if (response.success) {
              resolve(ErrorHandler.createSuccessResponse(response.data!));
            } else {
              const error = new ServiceError(
                response.error?.code as ErrorCode || ErrorCode.UNKNOWN_ERROR,
                response.error?.message || 'Unknown IPC error',
                response.error?.details
              );
              resolve(ErrorHandler.createErrorResponse(error));
            }
          })
          .catch((error: any) => {
            clearTimeout(timeoutId);
            const serviceError = new ServiceError(
              ErrorCode.CONNECTION_FAILED,
              'IPC communication failed',
              { channel, error: error.message }
            );
            resolve(ErrorHandler.createErrorResponse(serviceError));
          });
      });
    };

    return RetryHandler.withRetry(operation, retryAttempts);
  }

  // === Trade Operations ===

  async getTrades(): Promise<ServiceResponse<Trade[]>> {
    return this.sendIPCRequest<void, Trade[]>(IPCChannel.GET_TRADES, undefined);
  }

  async getTrade(tradeId: string): Promise<ServiceResponse<Trade | null>> {
    return this.sendIPCRequest<{ tradeId: string }, Trade | null>(
      IPCChannel.GET_TRADES,
      { tradeId }
    );
  }

  async saveTrade(trade: Trade): Promise<ServiceResponse<Trade>> {
    return this.sendIPCRequest<{ trade: Trade }, Trade>(
      IPCChannel.SAVE_TRADE,
      { trade }
    );
  }

  async updateTrade(tradeId: string, updates: Partial<Trade>): Promise<ServiceResponse<Trade>> {
    return this.sendIPCRequest<{ tradeId: string; updates: Partial<Trade> }, Trade>(
      IPCChannel.UPDATE_TRADE,
      { tradeId, updates }
    );
  }

  async deleteTrade(tradeId: string): Promise<ServiceResponse<boolean>> {
    return this.sendIPCRequest<{ tradeId: string }, boolean>(
      IPCChannel.DELETE_TRADE,
      { tradeId }
    );
  }

  async bulkUpdateTrades(trades: Trade[]): Promise<ServiceResponse<Trade[]>> {
    return this.sendIPCRequest<{ trades: Trade[] }, Trade[]>(
      IPCChannel.BULK_UPDATE_TRADES,
      { trades }
    );
  }

  async bulkDeleteTrades(tradeIds: string[]): Promise<ServiceResponse<boolean>> {
    return this.sendIPCRequest<{ tradeIds: string[] }, boolean>(
      IPCChannel.DELETE_TRADE,
      { tradeIds }
    );
  }

  // === CSV Mapping Operations ===

  async getCSVMappings(): Promise<ServiceResponse<CSVMapping[]>> {
    return this.sendIPCRequest<void, CSVMapping[]>(IPCChannel.GET_CSV_MAPPINGS, undefined);
  }

  async getCSVMapping(mappingId: string): Promise<ServiceResponse<CSVMapping | null>> {
    return this.sendIPCRequest<{ mappingId: string }, CSVMapping | null>(
      IPCChannel.GET_CSV_MAPPINGS,
      { mappingId }
    );
  }

  async saveCSVMapping(mapping: CSVMapping): Promise<ServiceResponse<CSVMapping>> {
    return this.sendIPCRequest<{ mapping: CSVMapping }, CSVMapping>(
      IPCChannel.SAVE_CSV_MAPPING,
      { mapping }
    );
  }

  async updateCSVMapping(mappingId: string, updates: Partial<CSVMapping>): Promise<ServiceResponse<CSVMapping>> {
    return this.sendIPCRequest<{ mappingId: string; updates: Partial<CSVMapping> }, CSVMapping>(
      IPCChannel.SAVE_CSV_MAPPING,
      { mappingId, updates }
    );
  }

  async deleteCSVMapping(mappingId: string): Promise<ServiceResponse<boolean>> {
    return this.sendIPCRequest<{ mappingId: string }, boolean>(
      IPCChannel.DELETE_CSV_MAPPING,
      { mappingId }
    );
  }

  // === Configuration Operations ===

  async getConfig(): Promise<ServiceResponse<AppConfig>> {
    return this.sendIPCRequest<void, AppConfig>(IPCChannel.GET_CONFIG, undefined);
  }

  async saveConfig(config: AppConfig): Promise<ServiceResponse<AppConfig>> {
    return this.sendIPCRequest<{ config: AppConfig }, AppConfig>(
      IPCChannel.SAVE_CONFIG,
      { config }
    );
  }

  async updateConfig(updates: Partial<AppConfig>): Promise<ServiceResponse<AppConfig>> {
    return this.sendIPCRequest<{ updates: Partial<AppConfig> }, AppConfig>(
      IPCChannel.SAVE_CONFIG,
      { updates }
    );
  }

  async resetConfig(): Promise<ServiceResponse<AppConfig>> {
    return this.sendIPCRequest<void, AppConfig>(IPCChannel.RESET_CONFIG, undefined);
  }

  // === File System Operations ===

  async readFile(path: string): Promise<ServiceResponse<string>> {
    return this.sendIPCRequest<{ path: string }, string>(
      IPCChannel.READ_FILE,
      { path }
    );
  }

  async writeFile(path: string, content: string): Promise<ServiceResponse<boolean>> {
    return this.sendIPCRequest<{ path: string; content: string }, boolean>(
      IPCChannel.WRITE_FILE,
      { path, content }
    );
  }

  async fileExists(path: string): Promise<ServiceResponse<boolean>> {
    return this.sendIPCRequest<{ path: string }, boolean>(
      IPCChannel.EXISTS_FILE,
      { path }
    );
  }

  async deleteFile(path: string): Promise<ServiceResponse<boolean>> {
    return this.sendIPCRequest<{ path: string }, boolean>(
      IPCChannel.DELETE_FILE,
      { path }
    );
  }

  async listDirectory(path: string): Promise<ServiceResponse<string[]>> {
    return this.sendIPCRequest<{ path: string }, string[]>(
      IPCChannel.LIST_DIRECTORY,
      { path }
    );
  }

  async createDirectory(path: string): Promise<ServiceResponse<boolean>> {
    return this.sendIPCRequest<{ path: string }, boolean>(
      IPCChannel.CREATE_DIRECTORY,
      { path }
    );
  }

  // === State Management Operations ===

  async getSelectedTrades(): Promise<ServiceResponse<string[]>> {
    return this.sendIPCRequest<void, string[]>(IPCChannel.GET_CONFIG, undefined)
      .then(response => {
        if (response.success && response.data) {
          const selectedTrades = (response.data as any).selectedTrades || [];
          return ErrorHandler.createSuccessResponse(selectedTrades);
        }
        return response as ServiceResponse<string[]>;
      });
  }

  async saveSelectedTrades(tradeIds: string[]): Promise<ServiceResponse<boolean>> {
    return this.sendIPCRequest<{ updates: { selectedTrades: string[] } }, AppConfig>(
      IPCChannel.SAVE_CONFIG,
      { updates: { selectedTrades: tradeIds } }
    ).then(response => {
      if (response.success) {
        return ErrorHandler.createSuccessResponse(true);
      }
      return {
        success: false,
        error: response.error
      } as ServiceResponse<boolean>;
    });
  }

  async clearSelectedTrades(): Promise<ServiceResponse<boolean>> {
    return this.saveSelectedTrades([]);
  }

  // === Utility Operations ===

  async exportData(format: 'csv' | 'json' | 'xlsx', options?: any): Promise<ServiceResponse<Blob | string>> {
    return this.sendIPCRequest<{ format: string; options?: any }, string>(
      IPCChannel.EXPORT_CSV,
      { format, options }
    );
  }

  async importData(data: string | File, format: 'csv' | 'json', options?: any): Promise<ServiceResponse<Trade[]>> {
    // Handle File object by reading its content first
    let dataContent: string;
    if (data instanceof File) {
      try {
        dataContent = await data.text();
      } catch (error) {
        return ErrorHandler.createErrorResponse(
          new ServiceError(
            ErrorCode.FILE_ACCESS_DENIED,
            'Failed to read file content',
            { error: error instanceof Error ? error.message : String(error) }
          )
        );
      }
    } else {
      dataContent = data;
    }

    return this.sendIPCRequest<{ data: string; format: string; options?: any }, Trade[]>(
      IPCChannel.IMPORT_CSV,
      { data: dataContent, format, options }
    );
  }

  async getHealthStatus(): Promise<ServiceResponse<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    memoryUsage?: number;
    lastError?: string;
  }>> {
    const uptime = Date.now() - this.startTime;
    
    try {
      // Test IPC connection by making a simple request
      const testResponse = await this.sendIPCRequest<void, any>(
        IPCChannel.GET_SYSTEM_INFO,
        undefined,
        { timeout: 5000, retryAttempts: 1 }
      );

      if (testResponse.success) {
        return ErrorHandler.createSuccessResponse({
          status: 'healthy' as const,
          uptime,
          memoryUsage: testResponse.data?.memoryUsage,
        });
      } else {
        return ErrorHandler.createSuccessResponse({
          status: 'degraded' as const,
          uptime,
          lastError: testResponse.error?.message,
        });
      }
    } catch (error) {
      return ErrorHandler.createSuccessResponse({
        status: 'unhealthy' as const,
        uptime,
        lastError: error instanceof Error ? error.message : 'IPC connection failed',
      });
    }
  }

  // === Additional Electron-specific methods ===

  /**
   * Show save dialog
   */
  async showSaveDialog(options?: any): Promise<ServiceResponse<string | null>> {
    return this.sendIPCRequest<{ options?: any }, string | null>(
      IPCChannel.SHOW_SAVE_DIALOG,
      { options }
    );
  }

  /**
   * Show open dialog
   */
  async showOpenDialog(options?: any): Promise<ServiceResponse<string[] | null>> {
    return this.sendIPCRequest<{ options?: any }, string[] | null>(
      IPCChannel.SHOW_OPEN_DIALOG,
      { options }
    );
  }

  /**
   * Show message box
   */
  async showMessageBox(options: any): Promise<ServiceResponse<{ response: number; checkboxChecked?: boolean }>> {
    return this.sendIPCRequest<{ options: any }, { response: number; checkboxChecked?: boolean }>(
      IPCChannel.SHOW_MESSAGE_BOX,
      { options }
    );
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<ServiceResponse<any>> {
    return this.sendIPCRequest<void, any>(IPCChannel.GET_SYSTEM_INFO, undefined);
  }
}