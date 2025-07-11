/**
 * Central CSV Service for unified trade data management
 * Manages the single trades.csv file in TradeJournal root
 */

import { Trade } from '@/types/trade';

export interface CentralCSVRecord {
  tradeId: string;
  ticker: string;
  buyDate: string; // YYYY-MM-DD
  sellDate?: string; // YYYY-MM-DD
  quantity: number;
  buyPrice: number;
  sellPrice?: number;
  pnl?: number;
  holdingDays?: number;
  folderPath: string; // Relative path to trade folder
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface CSVImportResult {
  success: boolean;
  recordsAdded: number;
  recordsSkipped: number;
  errors: string[];
}

export class CentralCSVService {
  private fileService: any;
  private csvFilePath: string;
  
  constructor(fileService: any, basePath: string = '') {
    this.fileService = fileService;
    this.csvFilePath = basePath ? `${basePath}/trades.csv` : 'trades.csv';
  }
  
  /**
   * Initialize central CSV file if it doesn't exist
   */
  async initializeCentralCSV(): Promise<boolean> {
    try {
      const exists = await this.fileService.exists(this.csvFilePath);
      if (exists.success && exists.data) {
        return true; // Already exists
      }
      
      // Create CSV with headers
      const headers = [
        'tradeId',
        'ticker',
        'buyDate',
        'sellDate',
        'quantity',
        'buyPrice',
        'sellPrice',
        'pnl',
        'holdingDays',
        'folderPath',
        'createdAt',
        'updatedAt'
      ].join(',');
      
      const result = await this.fileService.writeFile(this.csvFilePath, headers);
      return result.success;
    } catch (error) {
      console.error('Error initializing central CSV:', error);
      return false;
    }
  }
  
  /**
   * Read all records from central CSV
   */
  async readAllRecords(): Promise<CentralCSVRecord[]> {
    try {
      const result = await this.fileService.readFile(this.csvFilePath);
      if (!result.success) {
        console.error('Failed to read central CSV:', result.error);
        return [];
      }
      
      const lines = result.data.split('\n').filter((line: string) => line.trim());
      if (lines.length <= 1) {
        return []; // Only headers or empty
      }
      
      const headers = lines[0].split(',');
      const records: CentralCSVRecord[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length >= headers.length) {
          const record: CentralCSVRecord = {
            tradeId: values[0],
            ticker: values[1],
            buyDate: values[2],
            sellDate: values[3] || undefined,
            quantity: parseFloat(values[4]) || 0,
            buyPrice: parseFloat(values[5]) || 0,
            sellPrice: values[6] ? parseFloat(values[6]) : undefined,
            pnl: values[7] ? parseFloat(values[7]) : undefined,
            holdingDays: values[8] ? parseInt(values[8]) : undefined,
            folderPath: values[9],
            createdAt: values[10],
            updatedAt: values[11]
          };
          records.push(record);
        }
      }
      
      return records;
    } catch (error) {
      console.error('Error reading central CSV records:', error);
      return [];
    }
  }
  
  /**
   * Add a new record to central CSV
   */
  async addRecord(record: Omit<CentralCSVRecord, 'createdAt' | 'updatedAt'>): Promise<boolean> {
    try {
      // Ensure CSV exists
      await this.initializeCentralCSV();
      
      // Check for duplicates
      const existing = await this.findRecord(record.tradeId);
      if (existing) {
        console.warn('Trade ID already exists:', record.tradeId);
        return false;
      }
      
      const now = new Date().toISOString();
      const fullRecord: CentralCSVRecord = {
        ...record,
        createdAt: now,
        updatedAt: now
      };
      
      // Read current content
      const result = await this.fileService.readFile(this.csvFilePath);
      if (!result.success) {
        return false;
      }
      
      // Append new record
      const csvLine = this.recordToCSVLine(fullRecord);
      const newContent = result.data + '\n' + csvLine;
      
      const writeResult = await this.fileService.writeFile(this.csvFilePath, newContent);
      return writeResult.success;
    } catch (error) {
      console.error('Error adding record to central CSV:', error);
      return false;
    }
  }
  
  /**
   * Update an existing record
   */
  async updateRecord(tradeId: string, updates: Partial<CentralCSVRecord>): Promise<boolean> {
    try {
      const records = await this.readAllRecords();
      const index = records.findIndex(r => r.tradeId === tradeId);
      
      if (index === -1) {
        console.warn('Trade ID not found for update:', tradeId);
        return false;
      }
      
      // Update record
      records[index] = {
        ...records[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Write back to file
      return await this.writeAllRecords(records);
    } catch (error) {
      console.error('Error updating record:', error);
      return false;
    }
  }
  
  /**
   * Find a specific record by trade ID
   */
  async findRecord(tradeId: string): Promise<CentralCSVRecord | null> {
    const records = await this.readAllRecords();
    return records.find(r => r.tradeId === tradeId) || null;
  }
  
  /**
   * Get records for a specific ticker
   */
  async getRecordsForTicker(ticker: string): Promise<CentralCSVRecord[]> {
    const records = await this.readAllRecords();
    return records.filter(r => r.ticker === ticker);
  }
  
  /**
   * Get records for a date range
   */
  async getRecordsForDateRange(startDate: string, endDate: string): Promise<CentralCSVRecord[]> {
    const records = await this.readAllRecords();
    return records.filter(r => r.buyDate >= startDate && r.buyDate <= endDate);
  }
  
  /**
   * Convert Trade type to CentralCSVRecord
   */
  static tradeToCSVRecord(trade: Trade, folderPath: string): Omit<CentralCSVRecord, 'createdAt' | 'updatedAt'> {
    return {
      tradeId: trade.id,
      ticker: trade.ticker,
      buyDate: trade.buyDate,
      sellDate: trade.sellDate,
      quantity: trade.quantity,
      buyPrice: trade.buyPrice,
      sellPrice: trade.sellPrice,
      pnl: trade.pnl,
      holdingDays: trade.holdingDays,
      folderPath
    };
  }
  
  /**
   * Convert CentralCSVRecord to Trade type
   */
  static csvRecordToTrade(record: CentralCSVRecord): Trade {
    return {
      id: record.tradeId,
      ticker: record.ticker,
      buyDate: record.buyDate,
      sellDate: record.sellDate,
      quantity: record.quantity,
      buyPrice: record.buyPrice,
      sellPrice: record.sellPrice,
      commission: 0, // Default value since removed from CSV
      pnl: record.pnl,
      holdingDays: record.holdingDays,
      tags: [], // Default empty array since removed from CSV
      notesFiles: [], // Will be populated by scanning folder
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }
  
  /**
   * Delete a record from central CSV
   */
  async deleteRecord(tradeId: string): Promise<boolean> {
    try {
      const records = await this.readAllRecords();
      const filteredRecords = records.filter(r => r.tradeId !== tradeId);
      
      if (filteredRecords.length === records.length) {
        console.warn('Trade ID not found for deletion:', tradeId);
        return false;
      }
      
      return await this.writeAllRecords(filteredRecords);
    } catch (error) {
      console.error('Error deleting record:', error);
      return false;
    }
  }

  /**
   * Bulk delete records
   */
  async deleteRecords(tradeIds: string[]): Promise<boolean> {
    try {
      const records = await this.readAllRecords();
      const filteredRecords = records.filter(r => !tradeIds.includes(r.tradeId));
      
      return await this.writeAllRecords(filteredRecords);
    } catch (error) {
      console.error('Error bulk deleting records:', error);
      return false;
    }
  }

  /**
   * Convert all trades from LocalStorage and sync to central CSV
   */
  async syncFromTrades(trades: Trade[], basePath: string = ''): Promise<boolean> {
    try {
      // Clear existing records
      await this.initializeCentralCSV();
      
      const records: CentralCSVRecord[] = [];
      
      for (const trade of trades) {
        // Generate folder path using trade folder structure
        const year = trade.buyDate.split('-')[0];
        const monthDay = trade.buyDate.substring(5);
        const folderPath = `trades/${year}/${trade.ticker}_${monthDay}_001`; // Default sequence
        
        const record: CentralCSVRecord = {
          ...CentralCSVService.tradeToCSVRecord(trade, folderPath),
          createdAt: trade.createdAt || new Date().toISOString(),
          updatedAt: trade.updatedAt || new Date().toISOString()
        };
        
        records.push(record);
      }
      
      return await this.writeAllRecords(records);
    } catch (error) {
      console.error('Error syncing trades to central CSV:', error);
      return false;
    }
  }

  /**
   * Load all trades from central CSV and populate notes files by scanning folders
   */
  async loadAllTrades(fileService: any, basePath: string = ''): Promise<Trade[]> {
    try {
      const records = await this.readAllRecords();
      const trades: Trade[] = [];
      
      for (const record of records) {
        const trade = CentralCSVService.csvRecordToTrade(record);
        
        // Scan folder for memo files
        const fullFolderPath = basePath ? `${basePath}/${record.folderPath}` : record.folderPath;
        try {
          const folderResult = await fileService.readDir(fullFolderPath);
          if (folderResult.success && folderResult.data) {
            const memoFiles = folderResult.data
              .filter((item: any) => item.type === 'file' && item.name.endsWith('.md'))
              .map((item: any) => `${record.folderPath}/${item.name}`);
            trade.notesFiles = memoFiles;
          }
        } catch (error) {
          console.log(`Folder not found for trade ${trade.id}:`, fullFolderPath);
          trade.notesFiles = [];
        }
        
        trades.push(trade);
      }
      
      return trades;
    } catch (error) {
      console.error('Error loading trades from central CSV:', error);
      return [];
    }
  }

  /**
   * Generate unique trade ID
   */
  static generateTradeId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `T${timestamp}${random}`.toUpperCase();
  }
  
  // Private helper methods
  
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result.map(s => s.trim());
  }
  
  private recordToCSVLine(record: CentralCSVRecord): string {
    const values = [
      record.tradeId,
      record.ticker,
      record.buyDate,
      record.sellDate || '',
      record.quantity.toString(),
      record.buyPrice.toString(),
      record.sellPrice?.toString() || '',
      record.pnl?.toString() || '',
      record.holdingDays?.toString() || '',
      record.folderPath,
      record.createdAt,
      record.updatedAt
    ];
    
    // Escape values that contain commas or quotes
    return values.map(value => {
      if (value.includes(',') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  }
  
  private async writeAllRecords(records: CentralCSVRecord[]): Promise<boolean> {
    try {
      const headers = [
        'tradeId',
        'ticker',
        'buyDate',
        'sellDate',
        'quantity',
        'buyPrice',
        'sellPrice',
        'pnl',
        'holdingDays',
        'folderPath',
        'createdAt',
        'updatedAt'
      ].join(',');
      
      const lines = [headers];
      records.forEach(record => {
        lines.push(this.recordToCSVLine(record));
      });
      
      const content = lines.join('\n');
      const result = await this.fileService.writeFile(this.csvFilePath, content);
      return result.success;
    } catch (error) {
      console.error('Error writing all records:', error);
      return false;
    }
  }
}