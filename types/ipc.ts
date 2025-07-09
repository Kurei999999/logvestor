// IPC Communication Types for Electron Integration

export interface IPCRequest<T = any> {
  id: string;
  channel: string;
  payload: T;
  timestamp: number;
}

export interface IPCResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: IPCError;
  timestamp: number;
}

export interface IPCError {
  code: string;
  message: string;
  details?: any;
}

// IPC Channel Definitions
export enum IPCChannel {
  // Trade operations
  GET_TRADES = 'trades:get',
  SAVE_TRADE = 'trades:save',
  UPDATE_TRADE = 'trades:update',
  DELETE_TRADE = 'trades:delete',
  BULK_UPDATE_TRADES = 'trades:bulk-update',
  
  // CSV operations
  GET_CSV_MAPPINGS = 'csv:get-mappings',
  SAVE_CSV_MAPPING = 'csv:save-mapping',
  DELETE_CSV_MAPPING = 'csv:delete-mapping',
  IMPORT_CSV = 'csv:import',
  EXPORT_CSV = 'csv:export',
  
  // Configuration
  GET_CONFIG = 'config:get',
  SAVE_CONFIG = 'config:save',
  RESET_CONFIG = 'config:reset',
  
  // File operations
  READ_FILE = 'file:read',
  WRITE_FILE = 'file:write',
  DELETE_FILE = 'file:delete',
  EXISTS_FILE = 'file:exists',
  LIST_DIRECTORY = 'file:list-directory',
  CREATE_DIRECTORY = 'file:create-directory',
  
  // System operations
  GET_SYSTEM_INFO = 'system:info',
  SHOW_MESSAGE_BOX = 'system:message-box',
  SHOW_SAVE_DIALOG = 'system:save-dialog',
  SHOW_OPEN_DIALOG = 'system:open-dialog',
  
  // Application lifecycle
  APP_READY = 'app:ready',
  APP_QUIT = 'app:quit',
  WINDOW_CLOSE = 'window:close',
  WINDOW_MINIMIZE = 'window:minimize',
  WINDOW_MAXIMIZE = 'window:maximize',
}

// Request/Response payload types
export interface TradeRequest {
  trade?: Trade;
  tradeId?: string;
  trades?: Trade[];
}

export interface TradeResponse {
  trades?: Trade[];
  trade?: Trade;
  success?: boolean;
}

export interface CSVRequest {
  mapping?: CSVMapping;
  mappingId?: string;
  filePath?: string;
  data?: any[];
}

export interface CSVResponse {
  mappings?: CSVMapping[];
  mapping?: CSVMapping;
  data?: any[];
  success?: boolean;
}

export interface ConfigRequest {
  config?: AppConfig;
  key?: string;
  value?: any;
}

export interface ConfigResponse {
  config?: AppConfig;
  value?: any;
  success?: boolean;
}

export interface FileRequest {
  path?: string;
  content?: string;
  options?: any;
}

export interface FileResponse {
  content?: string;
  exists?: boolean;
  entries?: string[];
  success?: boolean;
}

// Import types from existing type files
import type { Trade } from './trade';
import type { CSVMapping } from './csv';
import type { AppConfig } from './app';