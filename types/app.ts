export interface AppConfig {
  dataDirectory: string;
  tradeDirectory: string;
  portfolioDirectory: string;
  templatesDirectory: string;
  defaultCSVMapping: string;
  theme: 'light' | 'dark' | 'system';
  autoBackup: boolean;
  backupInterval: number;
  maxBackups: number;
  selectedTrades?: string[]; // Optional for backward compatibility
  csvImport?: any; // Optional for CSV import configuration
  ui?: any; // Optional for UI configuration
  export?: any; // Optional for export configuration
  // Markdown memo configuration
  markdownEnabled?: boolean;
  markdownDirectory?: string; // Relative to dataDirectory (default: 'trades')
  autoCreateMarkdownFolders?: boolean;
  markdownFileNamePattern?: string; // Pattern for markdown file naming
  
  // Setup configuration
  setupCompleted?: boolean;
  setupVersion?: string;
}

export interface AppState {
  trades: Trade[];
  csvMappings: CSVMapping[];
  selectedTrades: string[];
  filters: TradeFilters;
  view: 'list' | 'grid' | 'timeline';
  loading: boolean;
  error: string | null;
}

export interface TradeFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  tickers?: string[];
  actions?: ('buy' | 'sell')[];
  tags?: string[];
  hasNotes?: boolean;
  hasImages?: boolean;
  pnlRange?: {
    min: number;
    max: number;
  };
  quantityRange?: {
    min: number;
    max: number;
  };
  pnlCategory?: 'profitable' | 'loss' | 'breakeven' | 'all';
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: TradeFilters;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryView {
  mode: 'grid' | 'timeline' | 'pair';
  sortBy: 'date' | 'ticker' | 'pnl';
  sortOrder: 'asc' | 'desc';
  filters: TradeFilters;
}

export interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: string;
  children?: FileSystemItem[];
}

import { Trade } from './trade';
import { CSVMapping } from './csv';