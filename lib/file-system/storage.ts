import { Trade, TradeMarkdown } from '@/types/trade';
import { CSVMapping } from '@/types/csv';
import { AppConfig } from '@/types/app';

export class LocalStorage {
  private static readonly KEYS = {
    TRADES: 'trades',
    CSV_MAPPINGS: 'csvMappings',
    APP_CONFIG: 'appConfig',
    SELECTED_TRADES: 'selectedTrades'
  };

  static saveTrades(trades: Trade[]): void {
    try {
      localStorage.setItem(this.KEYS.TRADES, JSON.stringify(trades));
    } catch (error) {
      console.error('Failed to save trades to localStorage:', error);
    }
  }

  static loadTrades(): Trade[] {
    try {
      const stored = localStorage.getItem(this.KEYS.TRADES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load trades from localStorage:', error);
      return [];
    }
  }

  static saveTrade(trade: Trade): void {
    const trades = this.loadTrades();
    const index = trades.findIndex(t => t.id === trade.id);
    
    if (index >= 0) {
      trades[index] = trade;
    } else {
      trades.push(trade);
    }
    
    this.saveTrades(trades);
  }

  static deleteTrade(tradeId: string): void {
    const trades = this.loadTrades();
    const filtered = trades.filter(t => t.id !== tradeId);
    this.saveTrades(filtered);
  }

  static saveCSVMappings(mappings: CSVMapping[]): void {
    try {
      localStorage.setItem(this.KEYS.CSV_MAPPINGS, JSON.stringify(mappings));
    } catch (error) {
      console.error('Failed to save CSV mappings to localStorage:', error);
    }
  }

  static loadCSVMappings(): CSVMapping[] {
    try {
      const stored = localStorage.getItem(this.KEYS.CSV_MAPPINGS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load CSV mappings from localStorage:', error);
      return [];
    }
  }

  static saveCSVMapping(mapping: CSVMapping): void {
    const mappings = this.loadCSVMappings();
    const index = mappings.findIndex(m => m.id === mapping.id);
    
    if (index >= 0) {
      mappings[index] = mapping;
    } else {
      mappings.push(mapping);
    }
    
    this.saveCSVMappings(mappings);
  }

  static deleteCSVMapping(mappingId: string): void {
    const mappings = this.loadCSVMappings();
    const filtered = mappings.filter(m => m.id !== mappingId);
    this.saveCSVMappings(filtered);
  }

  static saveAppConfig(config: AppConfig): void {
    try {
      localStorage.setItem(this.KEYS.APP_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save app config to localStorage:', error);
    }
  }

  static loadAppConfig(): AppConfig | null {
    try {
      const stored = localStorage.getItem(this.KEYS.APP_CONFIG);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load app config from localStorage:', error);
      return null;
    }
  }

  static saveSelectedTrades(tradeIds: string[]): void {
    try {
      localStorage.setItem(this.KEYS.SELECTED_TRADES, JSON.stringify(tradeIds));
    } catch (error) {
      console.error('Failed to save selected trades to localStorage:', error);
    }
  }

  static loadSelectedTrades(): string[] {
    try {
      const stored = localStorage.getItem(this.KEYS.SELECTED_TRADES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load selected trades from localStorage:', error);
      return [];
    }
  }

  // Alias methods for consistency with other parts of the codebase
  static getSelectedTrades(): string[] {
    return this.loadSelectedTrades();
  }

  static setSelectedTrades(tradeIds: string[]): void {
    this.saveSelectedTrades(tradeIds);
  }

  // Additional getter/setter methods for migration compatibility
  static getTrades(): Trade[] {
    return this.loadTrades();
  }

  static setTrades(trades: Trade[]): void {
    this.saveTrades(trades);
  }

  static getCSVMappings(): CSVMapping[] {
    return this.loadCSVMappings();
  }

  static setCSVMappings(mappings: CSVMapping[]): void {
    this.saveCSVMappings(mappings);
  }

  static getConfig(): AppConfig | null {
    return this.loadAppConfig();
  }

  static setConfig(config: AppConfig): void {
    this.saveAppConfig(config);
  }

  // Updated config methods to match interface expectations
  static loadConfig(): AppConfig {
    const config = this.loadAppConfig();
    if (config) {
      return config;
    }
    
    // Return default config if none exists
    const defaultConfig: AppConfig = {
      dataDirectory: '~/Documents/TradeJournal',
      tradeDirectory: 'trades',
      portfolioDirectory: 'portfolios',
      templatesDirectory: 'templates',
      defaultCSVMapping: '',
      theme: 'light',
      autoBackup: true,
      backupInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      maxBackups: 10,
    };
    
    this.saveAppConfig(defaultConfig);
    return defaultConfig;
  }

  static saveConfig(config: AppConfig): void {
    this.saveAppConfig(config);
  }

  static clearConfig(): void {
    try {
      localStorage.removeItem(this.KEYS.APP_CONFIG);
    } catch (error) {
      console.error('Failed to clear config from localStorage:', error);
    }
  }

  static clearAll(): void {
    try {
      Object.values(this.KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }

  static getStorageUsage(): { used: number; total: number } {
    try {
      let used = 0;
      Object.values(this.KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          used += new Blob([item]).size;
        }
      });
      
      // Most browsers have a 5MB limit for localStorage
      const total = 5 * 1024 * 1024;
      
      return { used, total };
    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
      return { used: 0, total: 0 };
    }
  }
}