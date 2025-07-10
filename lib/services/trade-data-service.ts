/**
 * Trade Data Service - Bridge between central CSV and application
 * Manages unified trade data with file system integration
 */

import { Trade } from '@/types/trade';
import { CentralCSVService } from '@/lib/csv/central-csv-service';
import { generateTradeFolderPath, createTradeFolderWithSequence } from '@/lib/trade-folder/path-generator';

export interface TradeDataConfig {
  dataDirectory: string;
  fileService: any;
}

export class TradeDataService {
  private csvService: CentralCSVService;
  private fileService: any;
  private dataDirectory: string;

  constructor(config: TradeDataConfig) {
    this.fileService = config.fileService;
    this.dataDirectory = config.dataDirectory;
    this.csvService = new CentralCSVService(config.fileService, config.dataDirectory);
  }

  /**
   * Initialize the trade data system
   */
  async initialize(): Promise<boolean> {
    try {
      // Ensure data directory exists
      const dirResult = await this.fileService.createDir(this.dataDirectory);
      if (!dirResult.success) {
        console.error('Failed to create data directory:', dirResult.error);
        return false;
      }

      // Initialize central CSV
      const csvResult = await this.csvService.initializeCentralCSV();
      if (!csvResult) {
        console.error('Failed to initialize central CSV');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error initializing trade data service:', error);
      return false;
    }
  }

  /**
   * Load all trades from central CSV
   */
  async loadTrades(): Promise<Trade[]> {
    try {
      return await this.csvService.loadAllTrades(this.fileService, this.dataDirectory);
    } catch (error) {
      console.error('Error loading trades:', error);
      return [];
    }
  }

  /**
   * Add a new trade with automatic folder creation
   */
  async addTrade(trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trade | null> {
    try {
      // Generate unique ID
      const tradeId = CentralCSVService.generateTradeId();
      
      // Create trade folder with sequence numbering
      const folderInfo = await createTradeFolderWithSequence(
        this.fileService,
        trade.ticker,
        trade.buyDate,
        this.dataDirectory
      );

      if (!folderInfo) {
        console.error('Failed to create trade folder');
        return null;
      }

      // Create full trade object
      const now = new Date().toISOString();
      const fullTrade: Trade = {
        ...trade,
        id: tradeId,
        createdAt: now,
        updatedAt: now,
        notesFiles: []
      };

      // Add to central CSV
      const csvRecord = CentralCSVService.tradeToCSVRecord(fullTrade, folderInfo.relativePath);
      const addResult = await this.csvService.addRecord(csvRecord);

      if (!addResult) {
        console.error('Failed to add trade to central CSV');
        return null;
      }

      return fullTrade;
    } catch (error) {
      console.error('Error adding trade:', error);
      return null;
    }
  }

  /**
   * Update an existing trade
   */
  async updateTrade(tradeId: string, updates: Partial<Trade>): Promise<boolean> {
    try {
      // Get current trade
      const currentRecord = await this.csvService.findRecord(tradeId);
      if (!currentRecord) {
        console.error('Trade not found for update:', tradeId);
        return false;
      }

      // Merge updates and calculate derived fields
      const updatedTrade: Trade = {
        ...CentralCSVService.csvRecordToTrade(currentRecord),
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Auto-calculate P&L and holding days
      if (updatedTrade.sellPrice && updatedTrade.buyPrice && updatedTrade.quantity) {
        updatedTrade.pnl = (updatedTrade.sellPrice - updatedTrade.buyPrice) * updatedTrade.quantity - (updatedTrade.commission || 0);
      }

      if (updatedTrade.sellDate && updatedTrade.buyDate) {
        const buyDate = new Date(updatedTrade.buyDate);
        const sellDate = new Date(updatedTrade.sellDate);
        updatedTrade.holdingDays = Math.ceil((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Update central CSV
      const csvUpdates = {
        ticker: updatedTrade.ticker,
        buyDate: updatedTrade.buyDate,
        sellDate: updatedTrade.sellDate,
        quantity: updatedTrade.quantity,
        buyPrice: updatedTrade.buyPrice,
        sellPrice: updatedTrade.sellPrice,
        commission: updatedTrade.commission,
        pnl: updatedTrade.pnl,
        holdingDays: updatedTrade.holdingDays,
        tags: (updatedTrade.tags || []).join(','),
        updatedAt: updatedTrade.updatedAt
      };

      return await this.csvService.updateRecord(tradeId, csvUpdates);
    } catch (error) {
      console.error('Error updating trade:', error);
      return false;
    }
  }

  /**
   * Delete a trade and optionally its folder
   */
  async deleteTrade(tradeId: string, deleteFolder: boolean = false): Promise<boolean> {
    try {
      // Get trade record for folder path
      const record = await this.csvService.findRecord(tradeId);
      
      // Delete from central CSV
      const csvResult = await this.csvService.deleteRecord(tradeId);
      
      // Optionally delete folder
      if (deleteFolder && record) {
        const fullFolderPath = `${this.dataDirectory}/${record.folderPath}`;
        try {
          await this.fileService.deleteDir(fullFolderPath);
        } catch (error) {
          console.warn('Failed to delete trade folder:', error);
        }
      }

      return csvResult;
    } catch (error) {
      console.error('Error deleting trade:', error);
      return false;
    }
  }

  /**
   * Bulk delete trades
   */
  async bulkDeleteTrades(tradeIds: string[], deleteFolders: boolean = false): Promise<boolean> {
    try {
      // Get records for folder paths if needed
      let folderPaths: string[] = [];
      if (deleteFolders) {
        const records = await this.csvService.readAllRecords();
        folderPaths = records
          .filter(r => tradeIds.includes(r.tradeId))
          .map(r => `${this.dataDirectory}/${r.folderPath}`);
      }

      // Delete from central CSV
      const csvResult = await this.csvService.deleteRecords(tradeIds);

      // Optionally delete folders
      if (deleteFolders) {
        for (const folderPath of folderPaths) {
          try {
            await this.fileService.deleteDir(folderPath);
          } catch (error) {
            console.warn('Failed to delete trade folder:', error);
          }
        }
      }

      return csvResult;
    } catch (error) {
      console.error('Error bulk deleting trades:', error);
      return false;
    }
  }

  /**
   * Migrate existing LocalStorage trades to central CSV
   */
  async migrateFromLocalStorage(trades: Trade[]): Promise<boolean> {
    try {
      console.log(`Migrating ${trades.length} trades to central CSV...`);
      
      const result = await this.csvService.syncFromTrades(trades, this.dataDirectory);
      
      if (result) {
        console.log('Successfully migrated trades to central CSV');
      } else {
        console.error('Failed to migrate trades to central CSV');
      }
      
      return result;
    } catch (error) {
      console.error('Error migrating trades:', error);
      return false;
    }
  }

  /**
   * Get trade statistics
   */
  async getTradeStats(): Promise<{
    totalTrades: number;
    totalPnL: number;
    winningTrades: number;
    winRate: number;
  }> {
    try {
      const records = await this.csvService.readAllRecords();
      
      const totalTrades = records.length;
      const totalPnL = records.reduce((sum, record) => sum + (record.pnl || 0), 0);
      const winningTrades = records.filter(record => (record.pnl || 0) > 0).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      return {
        totalTrades,
        totalPnL,
        winningTrades,
        winRate: parseFloat(winRate.toFixed(1))
      };
    } catch (error) {
      console.error('Error getting trade stats:', error);
      return {
        totalTrades: 0,
        totalPnL: 0,
        winningTrades: 0,
        winRate: 0
      };
    }
  }

  /**
   * Export trades to CSV format
   */
  async exportTrades(tradeIds?: string[]): Promise<string | null> {
    try {
      const records = await this.csvService.readAllRecords();
      const filteredRecords = tradeIds 
        ? records.filter(r => tradeIds.includes(r.tradeId))
        : records;

      if (filteredRecords.length === 0) {
        return null;
      }

      // Convert to readable CSV format
      const headers = [
        'Trade ID', 'Ticker', 'Buy Date', 'Sell Date', 'Quantity', 
        'Buy Price', 'Sell Price', 'P&L', 'Holding Days', 'Commission', 'Tags'
      ];

      const rows = filteredRecords.map(record => [
        record.tradeId,
        record.ticker,
        record.buyDate,
        record.sellDate || '',
        record.quantity.toString(),
        record.buyPrice.toString(),
        record.sellPrice?.toString() || '',
        record.pnl?.toString() || '',
        record.holdingDays?.toString() || '',
        record.commission.toString(),
        record.tags || ''
      ]);

      return [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    } catch (error) {
      console.error('Error exporting trades:', error);
      return null;
    }
  }
}