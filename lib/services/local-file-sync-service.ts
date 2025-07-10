import { Trade } from '@/types/trade';
import { AppConfig } from '@/types/app';
import { ElectronFileService } from './electron/electron-file-service';
import { TradeFolderService } from './trade-folder-service';
import path from 'path';

export interface FileWatcherEvent {
  watchId: string;
  filePath: string;
  type: 'file' | 'directory';
}

export class LocalFileSyncService {
  private electronService: ElectronFileService;
  private folderService: TradeFolderService;
  private config: AppConfig | null = null;
  private isWatching = false;
  private watchId = 'trade-folder-watcher';
  
  // Event handlers
  private onTradesChangedHandler: ((trades: Trade[]) => void) | null = null;
  private onMarkdownChangedHandler: ((filePath: string, content: string) => void) | null = null;

  constructor() {
    this.electronService = new ElectronFileService();
    this.folderService = new TradeFolderService();
  }

  /**
   * Initialize the service with configuration
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // Load configuration
      const configResult = await this.electronService.getConfig();
      if (!configResult.success) {
        return { success: false, error: 'Failed to load configuration' };
      }
      
      this.config = configResult.data!;
      
      // Initialize folder service
      await this.folderService.initialize();
      
      // Setup file watchers if markdown is enabled
      if (this.config.markdownEnabled) {
        await this.startWatching();
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Set event handlers for changes
   */
  setEventHandlers(handlers: {
    onTradesChanged?: (trades: Trade[]) => void;
    onMarkdownChanged?: (filePath: string, content: string) => void;
  }) {
    this.onTradesChangedHandler = handlers.onTradesChanged || null;
    this.onMarkdownChangedHandler = handlers.onMarkdownChanged || null;
  }

  /**
   * Start watching the trade directory for changes
   */
  private async startWatching(): Promise<void> {
    if (!this.config || this.isWatching) return;

    const tradesDirectory = path.join(
      this.config.dataDirectory,
      this.config.markdownDirectory || 'trades'
    );

    // Setup file watcher event listeners
    this.setupFileWatcherListeners();

    // Start watching the directory
    const watchResult = await this.electronService.watchDirectory(tradesDirectory, this.watchId);
    if (watchResult.success) {
      this.isWatching = true;
    }
  }

  /**
   * Stop watching the trade directory
   */
  async stopWatching(): Promise<void> {
    if (!this.isWatching) return;

    await this.electronService.unwatchDirectory(this.watchId);
    this.removeFileWatcherListeners();
    this.isWatching = false;
  }

  /**
   * Setup file watcher event listeners
   */
  private setupFileWatcherListeners(): void {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.fileWatcher.onFileChanged(this.handleFileChanged.bind(this));
      window.electronAPI.fileWatcher.onFileAdded(this.handleFileAdded.bind(this));
      window.electronAPI.fileWatcher.onFileRemoved(this.handleFileRemoved.bind(this));
    }
  }

  /**
   * Remove file watcher event listeners
   */
  private removeFileWatcherListeners(): void {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.fileWatcher.removeAllListeners();
    }
  }

  /**
   * Handle file change events
   */
  private async handleFileChanged(event: any, data: FileWatcherEvent): Promise<void> {
    if (data.watchId !== this.watchId) return;

    const fileName = path.basename(data.filePath);
    
    // Handle CSV file changes
    if (fileName === 'trades.csv') {
      await this.syncFromCSV();
    }
    
    // Handle markdown file changes
    else if (fileName.endsWith('.md')) {
      await this.handleMarkdownChange(data.filePath);
    }
  }

  /**
   * Handle file addition events
   */
  private async handleFileAdded(event: any, data: FileWatcherEvent): Promise<void> {
    await this.handleFileChanged(event, data);
  }

  /**
   * Handle file removal events
   */
  private async handleFileRemoved(event: any, data: FileWatcherEvent): Promise<void> {
    const fileName = path.basename(data.filePath);
    
    if (fileName.endsWith('.md')) {
      // Notify about markdown file removal
      if (this.onMarkdownChangedHandler) {
        this.onMarkdownChangedHandler(data.filePath, '');
      }
    }
  }

  /**
   * Handle markdown file changes
   */
  private async handleMarkdownChange(filePath: string): Promise<void> {
    try {
      const readResult = await window.electronAPI.fs.readFile(filePath);
      if (readResult.success && this.onMarkdownChangedHandler) {
        this.onMarkdownChangedHandler(filePath, readResult.data || '');
      }
    } catch (error) {
      console.error('Failed to read markdown file:', error);
    }
  }

  /**
   * Load trades from CSV file
   */
  async loadTradesFromCSV(): Promise<{ success: boolean; data?: Trade[]; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'Service not initialized' };
    }

    const csvPath = path.join(this.config.dataDirectory, 'trades.csv');
    const result = await this.electronService.readTradesCSV(csvPath);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error?.message || 'Failed to read trades CSV' };
    }
  }

  /**
   * Save trades to CSV file
   */
  async saveTradestoCSV(trades: Trade[]): Promise<{ success: boolean; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'Service not initialized' };
    }

    const csvPath = path.join(this.config.dataDirectory, 'trades.csv');
    const result = await this.electronService.writeTradesCSV(trades, csvPath);
    
    return result.success ? { success: true } : { success: false, error: result.error?.message || 'Failed to write trades CSV' };
  }

  /**
   * Sync trades from CSV file and update markdown folders
   */
  async syncFromCSV(): Promise<{ success: boolean; data?: Trade[]; error?: string }> {
    try {
      // Load trades from CSV
      const loadResult = await this.loadTradesFromCSV();
      if (!loadResult.success) {
        return loadResult;
      }

      const trades = loadResult.data || [];
      const updatedTrades: Trade[] = [];

      // Update each trade with markdown folder information
      for (const trade of trades) {
        // Create trade folder if it doesn't exist and auto-creation is enabled
        if (this.config?.autoCreateMarkdownFolders) {
          await this.folderService.createTradeFolder(trade);
        }

        // Update trade with current notesFiles
        const updatedTrade = await this.folderService.updateTradeNotesFiles(trade);
        updatedTrades.push(updatedTrade);
      }

      // Notify handlers
      if (this.onTradesChangedHandler) {
        this.onTradesChangedHandler(updatedTrades);
      }

      return { success: true, data: updatedTrades };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Sync trades to CSV file
   */
  async syncToCSV(trades: Trade[]): Promise<{ success: boolean; error?: string }> {
    try {
      // Update all trades with current markdown folder information
      const updatedTrades: Trade[] = [];
      
      for (const trade of trades) {
        const updatedTrade = await this.folderService.updateTradeNotesFiles(trade);
        updatedTrades.push(updatedTrade);
      }

      // Save to CSV
      return await this.saveTradestoCSV(updatedTrades);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create markdown memo for a trade
   */
  async createMarkdownMemo(trade: Trade, type: string = 'memo'): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Create trade folder if it doesn't exist
      const folderResult = await this.folderService.createTradeFolder(trade);
      if (!folderResult.success) {
        return folderResult;
      }

      // Create markdown file
      const memoResult = await this.folderService.createInitialMarkdown(trade, type);
      if (!memoResult.success) {
        return memoResult;
      }

      // Update trade with new notesFiles
      const updatedTrade = await this.folderService.updateTradeNotesFiles(trade);
      
      // Sync back to CSV
      const csvResult = await this.loadTradesFromCSV();
      if (csvResult.success && csvResult.data) {
        const trades = csvResult.data;
        const tradeIndex = trades.findIndex(t => t.id === trade.id);
        if (tradeIndex >= 0) {
          trades[tradeIndex] = updatedTrade;
          await this.syncToCSV(trades);
        }
      }

      return { success: true, filePath: memoResult.filePath };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get trade folder information
   */
  async getTradeFolder(trade: Trade) {
    return await this.folderService.loadTradeFolder(trade);
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig: AppConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const saveResult = await this.electronService.saveConfig(newConfig);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error?.message || 'Failed to save config' };
      }

      const wasWatching = this.isWatching;
      
      // Stop current watching if active
      if (this.isWatching) {
        await this.stopWatching();
      }

      // Update config
      this.config = newConfig;
      await this.folderService.initialize();

      // Restart watching if it was active and markdown is still enabled
      if (wasWatching && newConfig.markdownEnabled) {
        await this.startWatching();
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.stopWatching();
  }
}

// Export singleton instance
export const localFileSyncService = new LocalFileSyncService();