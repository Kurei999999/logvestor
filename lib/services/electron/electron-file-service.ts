import { IDataService, ServiceResponse } from '../interfaces/data-service';
import { Trade } from '@/types/trade';
import { CSVMapping } from '@/types/csv';
import { AppConfig } from '@/types/app';
import { FileSystemItem } from '@/types/app';

declare global {
  interface Window {
    electronAPI: {
      fs: {
        readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
        writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
        readDir: (dirPath: string) => Promise<{ success: boolean; data?: FileSystemItem[]; error?: string }>;
        createDir: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
        deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
        deleteDir: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
        exists: (path: string) => Promise<{ success: boolean; data?: boolean; error?: string }>;
        stat: (path: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        copyFile: (src: string, dest: string) => Promise<{ success: boolean; error?: string }>;
        moveFile: (src: string, dest: string) => Promise<{ success: boolean; error?: string }>;
      };
      trades: {
        loadTrades: (directory: string) => Promise<{ success: boolean; data?: Trade[]; error?: string }>;
        saveTrade: (trade: Trade, directory: string) => Promise<{ success: boolean; error?: string }>;
        deleteTrade: (tradeId: string, directory: string) => Promise<{ success: boolean; error?: string }>;
        loadTradeMarkdown: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
        saveTradeMarkdown: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
      };
      csv: {
        parseCSV: (filePath: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        exportCSV: (data: any[], filePath: string) => Promise<{ success: boolean; error?: string }>;
        loadCSVMappings: (directory: string) => Promise<{ success: boolean; data?: CSVMapping[]; error?: string }>;
        saveCSVMapping: (mapping: CSVMapping, directory: string) => Promise<{ success: boolean; error?: string }>;
        readTradesCSV: (filePath: string) => Promise<{ success: boolean; data?: Trade[]; error?: string }>;
        writeTradesCSV: (trades: Trade[], filePath: string) => Promise<{ success: boolean; error?: string }>;
      };
      config: {
        loadConfig: () => Promise<{ success: boolean; data?: AppConfig; error?: string }>;
        saveConfig: (config: AppConfig) => Promise<{ success: boolean; error?: string }>;
        getDefaultConfig: () => Promise<{ success: boolean; data?: AppConfig; error?: string }>;
      };
      dialog: {
        showOpenDialog: (options: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        showSaveDialog: (options: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        showMessageBox: (options: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        showErrorBox: (title: string, content: string) => Promise<{ success: boolean; error?: string }>;
      };
      fileWatcher: {
        watchDirectory: (directoryPath: string, watchId: string) => Promise<{ success: boolean; error?: string }>;
        unwatchDirectory: (watchId: string) => Promise<{ success: boolean; error?: string }>;
        onFileAdded: (callback: (event: any, data: any) => void) => void;
        onFileChanged: (callback: (event: any, data: any) => void) => void;
        onFileRemoved: (callback: (event: any, data: any) => void) => void;
        onError: (callback: (event: any, data: any) => void) => void;
        removeAllListeners: () => void;
      };
      app: {
        getVersion: () => Promise<{ success: boolean; data?: string; error?: string }>;
        getPath: (name: string) => Promise<{ success: boolean; data?: string; error?: string }>;
        showItemInFolder: (path: string) => Promise<{ success: boolean; error?: string }>;
        openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
        quit: () => Promise<{ success: boolean; error?: string }>;
      };
    };
  }
}

export class ElectronFileService {
  private dataDirectory: string;

  constructor(dataDirectory?: string) {
    this.dataDirectory = dataDirectory || '';
  }

  async setDataDirectory(directory: string): Promise<ServiceResponse<void>> {
    this.dataDirectory = directory;
    return { success: true, data: undefined, timestamp: Date.now() };
  }

  async getTrades(): Promise<ServiceResponse<Trade[]>> {
    try {
      if (!this.dataDirectory) {
        const configResult = await window.electronAPI.config.loadConfig();
        if (configResult.success && configResult.data) {
          this.dataDirectory = configResult.data.dataDirectory;
        } else {
          const defaultConfigResult = await window.electronAPI.config.getDefaultConfig();
          if (defaultConfigResult.success && defaultConfigResult.data) {
            this.dataDirectory = defaultConfigResult.data.dataDirectory;
          }
        }
      }

      const result = await window.electronAPI.trades.loadTrades(this.dataDirectory);
      if (result.success) {
        return { success: true, data: result.data || [], timestamp: Date.now() };
      } else {
        return { success: false, error: { code: 'LOAD_FAILED', message: result.error || 'Failed to load trades' }, timestamp: Date.now() };
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async saveTrade(trade: Trade): Promise<ServiceResponse<Trade>> {
    try {
      const result = await window.electronAPI.trades.saveTrade(trade, this.dataDirectory);
      if (result.success) {
        return { success: true, data: trade, timestamp: Date.now() };
      } else {
        return { success: false, error: { code: 'SAVE_FAILED', message: result.error || 'Failed to save trade' }, timestamp: Date.now() };
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async deleteTrade(tradeId: string): Promise<ServiceResponse<boolean>> {
    try {
      const result = await window.electronAPI.trades.deleteTrade(tradeId, this.dataDirectory);
      if (result.success) {
        return { success: true, data: true, timestamp: Date.now() };
      } else {
        return { success: false, error: { code: 'DELETE_FAILED', message: result.error || 'Failed to delete trade' }, timestamp: Date.now() };
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async getCSVMappings(): Promise<ServiceResponse<CSVMapping[]>> {
    try {
      const result = await window.electronAPI.csv.loadCSVMappings(this.dataDirectory);
      if (result.success) {
        return { success: true, data: result.data || [], timestamp: Date.now() };
      } else {
        return { success: false, error: { code: 'LOAD_FAILED', message: result.error || 'Failed to load CSV mappings' }, timestamp: Date.now() };
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async saveCSVMapping(mapping: CSVMapping): Promise<ServiceResponse<CSVMapping>> {
    try {
      const result = await window.electronAPI.csv.saveCSVMapping(mapping, this.dataDirectory);
      if (result.success) {
        return { success: true, data: mapping, timestamp: Date.now() };
      } else {
        return { success: false, error: { code: 'SAVE_FAILED', message: result.error || 'Failed to save CSV mapping' }, timestamp: Date.now() };
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async deleteCSVMapping(mappingId: string): Promise<ServiceResponse<boolean>> {
    try {
      // This would need to be implemented in the IPC handler
      return { success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented yet' }, timestamp: Date.now() };
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async getConfig(): Promise<ServiceResponse<AppConfig>> {
    try {
      const result = await window.electronAPI.config.loadConfig();
      if (result.success && result.data) {
        return { success: true, data: result.data, timestamp: Date.now() };
      } else {
        const defaultResult = await window.electronAPI.config.getDefaultConfig();
        if (defaultResult.success && defaultResult.data) {
          return { success: true, data: defaultResult.data, timestamp: Date.now() };
        } else {
          return { success: false, error: { code: 'LOAD_FAILED', message: 'Failed to load configuration' }, timestamp: Date.now() };
        }
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async saveConfig(config: AppConfig): Promise<ServiceResponse<AppConfig>> {
    try {
      const result = await window.electronAPI.config.saveConfig(config);
      if (result.success) {
        this.dataDirectory = config.dataDirectory;
        return { success: true, data: config, timestamp: Date.now() };
      } else {
        return { success: false, error: { code: 'SAVE_FAILED', message: result.error || 'Failed to save configuration' }, timestamp: Date.now() };
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async exportData(format: 'csv' | 'json', filePath: string): Promise<ServiceResponse<void>> {
    try {
      const tradesResult = await this.getTrades();
      if (!tradesResult.success) {
        return { success: false, error: { code: 'LOAD_FAILED', message: 'Failed to load trades for export' }, timestamp: Date.now() };
      }

      if (format === 'csv') {
        const result = await window.electronAPI.csv.exportCSV(tradesResult.data || [], filePath);
        if (result.success) {
          return { success: true, data: undefined, timestamp: Date.now() };
        } else {
          return { success: false, error: { code: 'EXPORT_FAILED', message: result.error || 'Failed to export CSV' }, timestamp: Date.now() };
        }
      } else {
        const result = await window.electronAPI.fs.writeFile(filePath, JSON.stringify(tradesResult.data, null, 2));
        if (result.success) {
          return { success: true, data: undefined, timestamp: Date.now() };
        } else {
          return { success: false, error: { code: 'EXPORT_FAILED', message: result.error || 'Failed to export JSON' }, timestamp: Date.now() };
        }
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async importData(filePath: string): Promise<ServiceResponse<Trade[]>> {
    try {
      if (filePath.endsWith('.csv')) {
        const result = await window.electronAPI.csv.parseCSV(filePath);
        if (result.success) {
          // This would need proper CSV to Trade conversion
          return { success: true, data: result.data || [], timestamp: Date.now() };
        } else {
          return { success: false, error: { code: 'PARSE_FAILED', message: result.error || 'Failed to parse CSV' }, timestamp: Date.now() };
        }
      } else {
        const result = await window.electronAPI.fs.readFile(filePath);
        if (result.success && result.data) {
          const trades = JSON.parse(result.data);
          return { success: true, data: trades, timestamp: Date.now() };
        } else {
          return { success: false, error: { code: 'READ_FAILED', message: result.error || 'Failed to read file' }, timestamp: Date.now() };
        }
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async selectDataDirectory(): Promise<ServiceResponse<string>> {
    try {
      const result = await window.electronAPI.dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Data Directory'
      });
      
      if (result.success && result.data && !result.data.canceled) {
        const directory = result.data.filePaths[0];
        this.dataDirectory = directory;
        return { success: true, data: directory, timestamp: Date.now() };
      } else {
        return { success: false, error: { code: 'CANCELLED', message: 'Directory selection cancelled' }, timestamp: Date.now() };
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async showItemInFolder(filePath: string): Promise<ServiceResponse<void>> {
    try {
      const result = await window.electronAPI.app.showItemInFolder(filePath);
      if (result.success) {
        return { success: true, data: undefined, timestamp: Date.now() };
      } else {
        return { success: false, error: { code: 'SHOW_FAILED', message: result.error || 'Failed to show item in folder' }, timestamp: Date.now() };
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async openExternal(url: string): Promise<ServiceResponse<void>> {
    try {
      const result = await window.electronAPI.app.openExternal(url);
      if (result.success) {
        return { success: true, data: undefined, timestamp: Date.now() };
      } else {
        return { success: false, error: { code: 'OPEN_FAILED', message: result.error || 'Failed to open external URL' }, timestamp: Date.now() };
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async watchDirectory(directoryPath: string, watchId: string): Promise<ServiceResponse<void>> {
    try {
      const result = await window.electronAPI.fileWatcher.watchDirectory(directoryPath, watchId);
      if (result.success) {
        return { success: true, data: undefined, timestamp: Date.now() };
      } else {
        return { success: false, error: { code: 'WATCH_FAILED', message: result.error || 'Failed to watch directory' }, timestamp: Date.now() };
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async unwatchDirectory(watchId: string): Promise<ServiceResponse<void>> {
    try {
      const result = await window.electronAPI.fileWatcher.unwatchDirectory(watchId);
      if (result.success) {
        return { success: true, data: undefined, timestamp: Date.now() };
      } else {
        return { success: false, error: { code: 'UNWATCH_FAILED', message: result.error || 'Failed to unwatch directory' }, timestamp: Date.now() };
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async readTradesCSV(filePath: string): Promise<ServiceResponse<Trade[]>> {
    try {
      const result = await window.electronAPI.csv.readTradesCSV(filePath);
      if (result.success) {
        return { success: true, data: result.data || [], timestamp: Date.now() };
      } else {
        return { success: false, error: { code: 'READ_FAILED', message: result.error || 'Failed to read trades CSV' }, timestamp: Date.now() };
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }

  async writeTradesCSV(trades: Trade[], filePath: string): Promise<ServiceResponse<void>> {
    try {
      const result = await window.electronAPI.csv.writeTradesCSV(trades, filePath);
      if (result.success) {
        return { success: true, data: undefined, timestamp: Date.now() };
      } else {
        return { success: false, error: { code: 'WRITE_FAILED', message: result.error || 'Failed to write trades CSV' }, timestamp: Date.now() };
      }
    } catch (error) {
      return { success: false, error: { code: 'UNKNOWN_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }, timestamp: Date.now() };
    }
  }
}