export interface CSVData {
  headers: string[];
  rows: Record<string, string | number>[];
  rawData: string[][];
}

export interface CSVMapping {
  id: string;
  name: string;
  description?: string;
  columnMapping: {
    date: string;
    ticker: string;
    action: string;
    quantity: string;
    price: string;
    commission?: string;
    pnl?: string;
    [key: string]: string | undefined;
  };
  dateFormat: string;
  actionMapping: {
    buy: string[];
    sell: string[];
  };
  numberFormat?: {
    decimalSeparator?: string;
    thousandsSeparator?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CSVImportConfig {
  file: File;
  mapping: CSVMapping;
  preview: Trade[];
  skipRows?: number;
  encoding?: string;
}

export interface CSVImportResult {
  success: boolean;
  trades: Trade[];
  errors: string[];
  warnings: string[];
  imported: number;
  skipped: number;
}

export interface CSVParseOptions {
  delimiter?: string;
  header?: boolean;
  skipEmptyLines?: boolean;
  encoding?: string;
}

import { Trade } from './trade';