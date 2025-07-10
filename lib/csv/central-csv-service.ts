/**
 * Central CSV Service for unified trade data management
 * Manages the single trades.csv file in TradeJournal root
 */

import { Trade } from '@/types/trade';

export interface CentralCSVRecord {
  tradeId: string;
  date: string; // YYYY-MM-DD
  ticker: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  commission: number;
  pnl?: number;
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
        'date',
        'ticker', 
        'action',
        'quantity',
        'price',
        'commission',
        'pnl',
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
      
      const lines = result.data.split('\n').filter(line => line.trim());
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
            date: values[1],
            ticker: values[2],
            action: values[3] as 'buy' | 'sell',
            quantity: parseFloat(values[4]) || 0,
            price: parseFloat(values[5]) || 0,
            commission: parseFloat(values[6]) || 0,
            pnl: values[7] ? parseFloat(values[7]) : undefined,
            folderPath: values[8],
            createdAt: values[9],
            updatedAt: values[10]
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
    return records.filter(r => r.date >= startDate && r.date <= endDate);
  }
  
  /**
   * Convert Trade type to CentralCSVRecord
   */
  static tradeToCSVRecord(trade: Trade, folderPath: string): Omit<CentralCSVRecord, 'createdAt' | 'updatedAt'> {
    return {
      tradeId: trade.id,
      date: trade.buyDate,
      ticker: trade.ticker,
      action: 'buy', // Could be extended to support both buy/sell
      quantity: trade.quantity,
      price: trade.buyPrice,
      commission: trade.commission || 0,
      pnl: trade.pnl,
      folderPath
    };
  }
  
  /**
   * Convert CentralCSVRecord to Trade type
   */
  static csvRecordToTrade(record: CentralCSVRecord): Partial<Trade> {
    return {
      id: record.tradeId,
      ticker: record.ticker,
      buyDate: record.date,
      quantity: record.quantity,
      buyPrice: record.price,
      commission: record.commission,
      pnl: record.pnl,
      notesFiles: [] // Will be populated by scanning folder
    };
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
      record.date,
      record.ticker,
      record.action,
      record.quantity.toString(),
      record.price.toString(),
      record.commission.toString(),
      record.pnl?.toString() || '',
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
        'date', 
        'ticker',
        'action',
        'quantity',
        'price',
        'commission',
        'pnl',
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