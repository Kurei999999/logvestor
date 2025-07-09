import { useState, useEffect, useCallback, useRef } from 'react';
import type { Trade } from '@/types/trade';
import type { ServiceResponse } from '@/lib/services/interfaces/data-service';
import { getDataService } from '@/lib/services/service-factory';
// ErrorHandler imported but not used directly in hooks

export interface UseTradesOptions {
  autoLoad?: boolean;
  enableCache?: boolean;
  cacheTimeout?: number;
}

export interface UseTradesReturn {
  // Data
  trades: Trade[];
  selectedTrade: Trade | null;
  selectedTrades: string[];
  
  // Loading states
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  
  // Error states
  error: string | null;
  lastError: string | null;
  
  // Operations
  loadTrades: () => Promise<void>;
  saveTrade: (trade: Trade) => Promise<boolean>;
  updateTrade: (tradeId: string, updates: Partial<Trade>) => Promise<boolean>;
  deleteTrade: (tradeId: string) => Promise<boolean>;
  bulkDeleteTrades: (tradeIds: string[]) => Promise<boolean>;
  getTrade: (tradeId: string) => Promise<Trade | null>;
  
  // Selection management
  selectTrade: (tradeId: string) => void;
  toggleTradeSelection: (tradeId: string) => void;
  selectAllTrades: () => void;
  clearSelection: () => void;
  isTradeSelected: (tradeId: string) => boolean;
  
  // Utility functions
  refreshTrades: () => Promise<void>;
  clearError: () => void;
  exportTrades: (format: 'csv' | 'json') => Promise<string | null>;
  
  // Statistics
  stats: {
    total: number;
    selected: number;
    totalValue: number;
    totalPnL: number;
  };
}

const DEFAULT_OPTIONS: UseTradesOptions = {
  autoLoad: true,
  enableCache: true,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
};

export function useTrades(options: UseTradesOptions = {}): UseTradesReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const dataService = getDataService();
  
  // State
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Cache management
  const cacheRef = useRef<{
    data: Trade[];
    timestamp: number;
  } | null>(null);
  
  // Handle service response
  const handleResponse = useCallback(<T>(response: ServiceResponse<T>): T | null => {
    if (response.success) {
      setError(null);
      return response.data!;
    } else {
      const errorMessage = response.error?.message || 'Unknown error occurred';
      setError(errorMessage);
      setLastError(errorMessage);
      console.error('[useTrades]', response.error);
      return null;
    }
  }, []);
  
  // Load trades from service
  const loadTrades = useCallback(async () => {
    // Check cache first
    if (opts.enableCache && cacheRef.current) {
      const cacheAge = Date.now() - cacheRef.current.timestamp;
      if (cacheAge < opts.cacheTimeout!) {
        setTrades(cacheRef.current.data);
        return;
      }
    }
    
    setLoading(true);
    try {
      const response = await dataService.getTrades();
      const tradesData = handleResponse(response);
      
      if (tradesData) {
        setTrades(tradesData);
        
        // Update cache
        if (opts.enableCache) {
          cacheRef.current = {
            data: tradesData,
            timestamp: Date.now(),
          };
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load trades';
      setError(errorMessage);
      setLastError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [dataService, handleResponse, opts.enableCache, opts.cacheTimeout]);
  
  // Save trade
  const saveTrade = useCallback(async (trade: Trade): Promise<boolean> => {
    setSaving(true);
    try {
      const response = await dataService.saveTrade(trade);
      const savedTrade = handleResponse(response);
      
      if (savedTrade) {
        // Update local state
        setTrades(prev => {
          const existingIndex = prev.findIndex(t => t.id === trade.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = savedTrade;
            return updated;
          } else {
            return [...prev, savedTrade];
          }
        });
        
        // Invalidate cache
        cacheRef.current = null;
        
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save trade';
      setError(errorMessage);
      setLastError(errorMessage);
      return false;
    } finally {
      setSaving(false);
    }
  }, [dataService, handleResponse]);
  
  // Update trade
  const updateTrade = useCallback(async (tradeId: string, updates: Partial<Trade>): Promise<boolean> => {
    setSaving(true);
    try {
      const response = await dataService.updateTrade(tradeId, updates);
      const updatedTrade = handleResponse(response);
      
      if (updatedTrade) {
        setTrades(prev => prev.map(t => t.id === tradeId ? updatedTrade : t));
        
        // Update selected trade if it's the one being updated
        if (selectedTrade?.id === tradeId) {
          setSelectedTrade(updatedTrade);
        }
        
        // Invalidate cache
        cacheRef.current = null;
        
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update trade';
      setError(errorMessage);
      setLastError(errorMessage);
      return false;
    } finally {
      setSaving(false);
    }
  }, [dataService, handleResponse, selectedTrade]);
  
  // Delete trade
  const deleteTrade = useCallback(async (tradeId: string): Promise<boolean> => {
    setDeleting(true);
    try {
      const response = await dataService.deleteTrade(tradeId);
      const success = handleResponse(response);
      
      if (success) {
        setTrades(prev => prev.filter(t => t.id !== tradeId));
        setSelectedTrades(prev => prev.filter(id => id !== tradeId));
        
        // Clear selected trade if it's the one being deleted
        if (selectedTrade?.id === tradeId) {
          setSelectedTrade(null);
        }
        
        // Invalidate cache
        cacheRef.current = null;
        
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete trade';
      setError(errorMessage);
      setLastError(errorMessage);
      return false;
    } finally {
      setDeleting(false);
    }
  }, [dataService, handleResponse, selectedTrade]);
  
  // Bulk delete trades
  const bulkDeleteTrades = useCallback(async (tradeIds: string[]): Promise<boolean> => {
    setDeleting(true);
    try {
      const response = await dataService.bulkDeleteTrades(tradeIds);
      const success = handleResponse(response);
      
      if (success) {
        setTrades(prev => prev.filter(t => !tradeIds.includes(t.id)));
        setSelectedTrades(prev => prev.filter(id => !tradeIds.includes(id)));
        
        // Clear selected trade if it's being deleted
        if (selectedTrade && tradeIds.includes(selectedTrade.id)) {
          setSelectedTrade(null);
        }
        
        // Invalidate cache
        cacheRef.current = null;
        
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete trades';
      setError(errorMessage);
      setLastError(errorMessage);
      return false;
    } finally {
      setDeleting(false);
    }
  }, [dataService, handleResponse, selectedTrade]);
  
  // Get single trade
  const getTrade = useCallback(async (tradeId: string): Promise<Trade | null> => {
    try {
      const response = await dataService.getTrade(tradeId);
      return handleResponse(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get trade';
      setError(errorMessage);
      setLastError(errorMessage);
      return null;
    }
  }, [dataService, handleResponse]);
  
  // Selection management
  const selectTrade = useCallback((tradeId: string) => {
    const trade = trades.find(t => t.id === tradeId);
    setSelectedTrade(trade || null);
  }, [trades]);
  
  const toggleTradeSelection = useCallback((tradeId: string) => {
    setSelectedTrades(prev => {
      const isSelected = prev.includes(tradeId);
      if (isSelected) {
        return prev.filter(id => id !== tradeId);
      } else {
        return [...prev, tradeId];
      }
    });
  }, []);
  
  const selectAllTrades = useCallback(() => {
    setSelectedTrades(trades.map(t => t.id));
  }, [trades]);
  
  const clearSelection = useCallback(() => {
    setSelectedTrades([]);
  }, []);
  
  const isTradeSelected = useCallback((tradeId: string): boolean => {
    return selectedTrades.includes(tradeId);
  }, [selectedTrades]);
  
  // Utility functions
  const refreshTrades = useCallback(async () => {
    cacheRef.current = null;
    await loadTrades();
  }, [loadTrades]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const exportTrades = useCallback(async (format: 'csv' | 'json'): Promise<string | null> => {
    try {
      const response = await dataService.exportData(format);
      const exportData = handleResponse(response);
      return typeof exportData === 'string' ? exportData : null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export trades';
      setError(errorMessage);
      setLastError(errorMessage);
      return null;
    }
  }, [dataService, handleResponse]);
  
  // Calculate statistics
  const stats = {
    total: trades.length,
    selected: selectedTrades.length,
    totalValue: trades.reduce((sum, trade) => sum + (trade.quantity * trade.price), 0),
    totalPnL: trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0),
  };
  
  // Load selected trades from service on mount
  useEffect(() => {
    const loadSelectedTrades = async () => {
      try {
        const response = await dataService.getSelectedTrades();
        const selectedIds = handleResponse(response);
        if (selectedIds) {
          setSelectedTrades(selectedIds);
        }
      } catch (err) {
        console.warn('[useTrades] Failed to load selected trades:', err);
      }
    };
    
    loadSelectedTrades();
  }, [dataService, handleResponse]);
  
  // Save selected trades to service when selection changes
  useEffect(() => {
    const saveSelectedTrades = async () => {
      try {
        await dataService.saveSelectedTrades(selectedTrades);
      } catch (err) {
        console.warn('[useTrades] Failed to save selected trades:', err);
      }
    };
    
    saveSelectedTrades();
  }, [selectedTrades, dataService]);
  
  // Auto-load trades on mount
  useEffect(() => {
    if (opts.autoLoad) {
      loadTrades();
    }
  }, [opts.autoLoad, loadTrades]);
  
  return {
    // Data
    trades,
    selectedTrade,
    selectedTrades,
    
    // Loading states
    loading,
    saving,
    deleting,
    
    // Error states
    error,
    lastError,
    
    // Operations
    loadTrades,
    saveTrade,
    updateTrade,
    deleteTrade,
    bulkDeleteTrades,
    getTrade,
    
    // Selection management
    selectTrade,
    toggleTradeSelection,
    selectAllTrades,
    clearSelection,
    isTradeSelected,
    
    // Utility functions
    refreshTrades,
    clearError,
    exportTrades,
    
    // Statistics
    stats,
  };
}