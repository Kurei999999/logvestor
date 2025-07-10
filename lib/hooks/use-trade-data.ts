/**
 * React hook for unified trade data management
 * Integrates central CSV with Electron file system
 */

import { useState, useEffect, useCallback } from 'react';
import { Trade } from '@/types/trade';
import { TradeDataService } from '@/lib/services/trade-data-service';
import { LocalStorage } from '@/lib/file-system/storage';

export interface UseTradeDataReturn {
  trades: Trade[];
  loading: boolean;
  error: string | null;
  
  // CRUD operations
  addTrade: (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Trade | null>;
  updateTrade: (tradeId: string, updates: Partial<Trade>) => Promise<boolean>;
  deleteTrade: (tradeId: string, deleteFolder?: boolean) => Promise<boolean>;
  bulkDeleteTrades: (tradeIds: string[], deleteFolders?: boolean) => Promise<boolean>;
  
  // Data operations
  refreshTrades: () => Promise<void>;
  exportTrades: (tradeIds?: string[]) => Promise<string | null>;
  
  // Statistics
  stats: {
    totalTrades: number;
    totalPnL: number;
    winningTrades: number;
    winRate: number;
  };
}

let tradeDataService: TradeDataService | null = null;

export function useTradeData(): UseTradeDataReturn {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalTrades: 0,
    totalPnL: 0,
    winningTrades: 0,
    winRate: 0
  });

  // Initialize service
  const initializeService = useCallback(async () => {
    if (tradeDataService) return tradeDataService;

    try {
      // Check if we're in Electron environment
      if (typeof window === 'undefined' || !window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Get config from Electron
      const configResult = await window.electronAPI.config.loadConfig();
      let config = configResult.data;
      
      if (!config) {
        const defaultConfigResult = await window.electronAPI.config.getDefaultConfig();
        config = defaultConfigResult.data;
      }

      if (!config) {
        throw new Error('Failed to load configuration');
      }

      // Create file service wrapper
      const fileService = {
        readDir: (path: string) => window.electronAPI.fs.readDir(path),
        readFile: (path: string) => window.electronAPI.fs.readFile(path),
        writeFile: (path: string, content: string) => window.electronAPI.fs.writeFile(path, content),
        createDir: (path: string) => window.electronAPI.fs.createDir(path),
        deleteDir: (path: string) => window.electronAPI.fs.deleteDir(path),
        exists: (path: string) => window.electronAPI.fs.exists(path)
      };

      tradeDataService = new TradeDataService({
        dataDirectory: config.dataDirectory,
        fileService
      });

      // Initialize the service
      const initResult = await tradeDataService.initialize();
      if (!initResult) {
        throw new Error('Failed to initialize trade data service');
      }

      return tradeDataService;
    } catch (err) {
      console.error('Error initializing trade data service:', err);
      throw err;
    }
  }, []);

  // Load trades
  const loadTrades = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const service = await initializeService();
      
      // Check if we need to migrate from LocalStorage
      const localStorageTrades = LocalStorage.loadTrades();
      if (localStorageTrades.length > 0) {
        console.log('Found LocalStorage trades, migrating to central CSV...');
        const migrationResult = await service.migrateFromLocalStorage(localStorageTrades);
        
        if (migrationResult) {
          // Clear LocalStorage after successful migration
          LocalStorage.saveTrades([]);
          console.log('Migration completed successfully');
        }
      }

      // Load trades from central CSV
      const loadedTrades = await service.loadTrades();
      setTrades(loadedTrades);

      // Update stats
      const tradeStats = await service.getTradeStats();
      setStats(tradeStats);

    } catch (err) {
      console.error('Error loading trades:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trades');
      
      // Fallback to LocalStorage
      try {
        const fallbackTrades = LocalStorage.loadTrades();
        setTrades(fallbackTrades);
        
        // Calculate fallback stats
        const totalTrades = fallbackTrades.length;
        const totalPnL = fallbackTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
        const winningTrades = fallbackTrades.filter(trade => (trade.pnl || 0) > 0).length;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        
        setStats({
          totalTrades,
          totalPnL,
          winningTrades,
          winRate: parseFloat(winRate.toFixed(1))
        });
      } catch (fallbackErr) {
        console.error('Fallback loading failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  }, [initializeService]);

  // Refresh trades
  const refreshTrades = useCallback(async () => {
    await loadTrades();
  }, [loadTrades]);

  // Add trade
  const addTrade = useCallback(async (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trade | null> => {
    try {
      const service = await initializeService();
      const newTrade = await service.addTrade(trade);
      
      if (newTrade) {
        await refreshTrades();
      }
      
      return newTrade;
    } catch (err) {
      console.error('Error adding trade:', err);
      setError(err instanceof Error ? err.message : 'Failed to add trade');
      return null;
    }
  }, [initializeService, refreshTrades]);

  // Update trade
  const updateTrade = useCallback(async (tradeId: string, updates: Partial<Trade>): Promise<boolean> => {
    try {
      const service = await initializeService();
      const result = await service.updateTrade(tradeId, updates);
      
      if (result) {
        await refreshTrades();
      }
      
      return result;
    } catch (err) {
      console.error('Error updating trade:', err);
      setError(err instanceof Error ? err.message : 'Failed to update trade');
      return false;
    }
  }, [initializeService, refreshTrades]);

  // Delete trade
  const deleteTrade = useCallback(async (tradeId: string, deleteFolder = false): Promise<boolean> => {
    try {
      const service = await initializeService();
      const result = await service.deleteTrade(tradeId, deleteFolder);
      
      if (result) {
        await refreshTrades();
      }
      
      return result;
    } catch (err) {
      console.error('Error deleting trade:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete trade');
      return false;
    }
  }, [initializeService, refreshTrades]);

  // Bulk delete trades
  const bulkDeleteTrades = useCallback(async (tradeIds: string[], deleteFolders = false): Promise<boolean> => {
    try {
      const service = await initializeService();
      const result = await service.bulkDeleteTrades(tradeIds, deleteFolders);
      
      if (result) {
        await refreshTrades();
      }
      
      return result;
    } catch (err) {
      console.error('Error bulk deleting trades:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete trades');
      return false;
    }
  }, [initializeService, refreshTrades]);

  // Export trades
  const exportTrades = useCallback(async (tradeIds?: string[]): Promise<string | null> => {
    try {
      const service = await initializeService();
      return await service.exportTrades(tradeIds);
    } catch (err) {
      console.error('Error exporting trades:', err);
      setError(err instanceof Error ? err.message : 'Failed to export trades');
      return null;
    }
  }, [initializeService]);

  // Load trades on mount
  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  return {
    trades,
    loading,
    error,
    addTrade,
    updateTrade,
    deleteTrade,
    bulkDeleteTrades,
    refreshTrades,
    exportTrades,
    stats
  };
}