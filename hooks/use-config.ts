import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppConfig } from '@/types/app';
import type { ServiceResponse } from '@/lib/services/interfaces/data-service';
import { getDataService } from '@/lib/services/service-factory';
// ErrorHandler imported but not used directly in hooks

export interface UseConfigOptions {
  autoLoad?: boolean;
  enableCache?: boolean;
  cacheTimeout?: number;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export interface UseConfigReturn {
  // Data
  config: AppConfig | null;
  
  // Loading states
  loading: boolean;
  saving: boolean;
  
  // Error states
  error: string | null;
  lastError: string | null;
  
  // Operations
  loadConfig: () => Promise<void>;
  saveConfig: (config: AppConfig) => Promise<boolean>;
  updateConfig: (updates: Partial<AppConfig>) => Promise<boolean>;
  resetConfig: () => Promise<boolean>;
  
  // Specific config operations
  updatePreference: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => Promise<boolean>;
  getPreference: <K extends keyof AppConfig>(key: K) => AppConfig[K] | undefined;
  
  // Utility functions
  refreshConfig: () => Promise<void>;
  clearError: () => void;
  isLoaded: boolean;
  isDirty: boolean;
}

const DEFAULT_OPTIONS: UseConfigOptions = {
  autoLoad: true,
  enableCache: true,
  cacheTimeout: 10 * 60 * 1000, // 10 minutes
  autoSave: false,
  autoSaveDelay: 2000, // 2 seconds
};

export function useConfig(options: UseConfigOptions = {}): UseConfigReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const dataService = getDataService();
  
  // State
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  
  // Cache management
  const cacheRef = useRef<{
    data: AppConfig;
    timestamp: number;
  } | null>(null);
  
  // Auto-save management
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const originalConfigRef = useRef<AppConfig | null>(null);
  
  // Handle service response
  const handleResponse = useCallback(<T>(response: ServiceResponse<T>): T | null => {
    if (response.success) {
      setError(null);
      return response.data!;
    } else {
      const errorMessage = response.error?.message || 'Unknown error occurred';
      setError(errorMessage);
      setLastError(errorMessage);
      console.error('[useConfig]', response.error);
      return null;
    }
  }, []);
  
  // Load config from service
  const loadConfig = useCallback(async () => {
    // Check cache first
    if (opts.enableCache && cacheRef.current) {
      const cacheAge = Date.now() - cacheRef.current.timestamp;
      if (cacheAge < opts.cacheTimeout!) {
        setConfig(cacheRef.current.data);
        originalConfigRef.current = cacheRef.current.data;
        setIsDirty(false);
        return;
      }
    }
    
    setLoading(true);
    try {
      const response = await dataService.getConfig();
      const configData = handleResponse(response);
      
      if (configData) {
        setConfig(configData);
        originalConfigRef.current = configData;
        setIsDirty(false);
        
        // Update cache
        if (opts.enableCache) {
          cacheRef.current = {
            data: configData,
            timestamp: Date.now(),
          };
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load config';
      setError(errorMessage);
      setLastError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [dataService, handleResponse, opts.enableCache, opts.cacheTimeout]);
  
  // Save config
  const saveConfig = useCallback(async (configToSave: AppConfig): Promise<boolean> => {
    setSaving(true);
    try {
      const response = await dataService.saveConfig(configToSave);
      const savedConfig = handleResponse(response);
      
      if (savedConfig) {
        setConfig(savedConfig);
        originalConfigRef.current = savedConfig;
        setIsDirty(false);
        
        // Update cache
        if (opts.enableCache) {
          cacheRef.current = {
            data: savedConfig,
            timestamp: Date.now(),
          };
        }
        
        // Clear auto-save timeout
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
        }
        
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save config';
      setError(errorMessage);
      setLastError(errorMessage);
      return false;
    } finally {
      setSaving(false);
    }
  }, [dataService, handleResponse, opts.enableCache]);
  
  // Update config
  const updateConfig = useCallback(async (updates: Partial<AppConfig>): Promise<boolean> => {
    if (!config) {
      setError('No config loaded');
      return false;
    }
    
    const updatedConfig = { ...config, ...updates };
    setConfig(updatedConfig);
    setIsDirty(true);
    
    // Handle auto-save
    if (opts.autoSave) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveConfig(updatedConfig);
      }, opts.autoSaveDelay);
      
      return true;
    } else {
      // Manual save
      return saveConfig(updatedConfig);
    }
  }, [config, opts.autoSave, opts.autoSaveDelay, saveConfig]);
  
  // Reset config
  const resetConfig = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    try {
      const response = await dataService.resetConfig();
      const resetConfigData = handleResponse(response);
      
      if (resetConfigData) {
        setConfig(resetConfigData);
        originalConfigRef.current = resetConfigData;
        setIsDirty(false);
        
        // Update cache
        if (opts.enableCache) {
          cacheRef.current = {
            data: resetConfigData,
            timestamp: Date.now(),
          };
        }
        
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset config';
      setError(errorMessage);
      setLastError(errorMessage);
      return false;
    } finally {
      setSaving(false);
    }
  }, [dataService, handleResponse, opts.enableCache]);
  
  // Update specific preference
  const updatePreference = useCallback(async <K extends keyof AppConfig>(
    key: K,
    value: AppConfig[K]
  ): Promise<boolean> => {
    return updateConfig({ [key]: value } as Partial<AppConfig>);
  }, [updateConfig]);
  
  // Get specific preference
  const getPreference = useCallback(<K extends keyof AppConfig>(
    key: K
  ): AppConfig[K] | undefined => {
    return config?.[key];
  }, [config]);
  
  // Utility functions
  const refreshConfig = useCallback(async () => {
    cacheRef.current = null;
    await loadConfig();
  }, [loadConfig]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Auto-load config on mount
  useEffect(() => {
    if (opts.autoLoad) {
      loadConfig();
    }
  }, [opts.autoLoad, loadConfig]);
  
  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);
  
  // Check if config is dirty (compare with original)
  useEffect(() => {
    if (!config || !originalConfigRef.current) {
      setIsDirty(false);
      return;
    }
    
    const configStr = JSON.stringify(config);
    const originalStr = JSON.stringify(originalConfigRef.current);
    setIsDirty(configStr !== originalStr);
  }, [config]);
  
  return {
    // Data
    config,
    
    // Loading states
    loading,
    saving,
    
    // Error states
    error,
    lastError,
    
    // Operations
    loadConfig,
    saveConfig,
    updateConfig,
    resetConfig,
    
    // Specific config operations
    updatePreference,
    getPreference,
    
    // Utility functions
    refreshConfig,
    clearError,
    isLoaded: config !== null,
    isDirty,
  };
}

// === Additional hooks for specific config sections ===

/**
 * Hook for managing CSV import preferences
 */
export function useCSVConfig() {
  const { config, updatePreference, getPreference, ...rest } = useConfig();
  
  const csvConfig = config?.csvImport || {};
  
  const updateCSVPreference = useCallback(async (updates: Partial<typeof csvConfig>) => {
    const currentCsvConfig = config?.csvImport || {};
    return updatePreference('csvImport', { ...currentCsvConfig, ...updates });
  }, [config?.csvImport, updatePreference]);
  
  return {
    csvConfig,
    updateCSVPreference,
    ...rest,
  };
}

/**
 * Hook for managing UI preferences
 */
export function useUIConfig() {
  const { config, updatePreference, getPreference, ...rest } = useConfig();
  
  const uiConfig = config?.ui || {};
  
  const updateUIPreference = useCallback(async (updates: Partial<typeof uiConfig>) => {
    const currentUIConfig = config?.ui || {};
    return updatePreference('ui', { ...currentUIConfig, ...updates });
  }, [config?.ui, updatePreference]);
  
  return {
    uiConfig,
    updateUIPreference,
    theme: uiConfig.theme || 'light',
    language: uiConfig.language || 'en',
    ...rest,
  };
}

/**
 * Hook for managing export preferences
 */
export function useExportConfig() {
  const { config, updatePreference, getPreference, ...rest } = useConfig();
  
  const exportConfig = config?.export || {};
  
  const updateExportPreference = useCallback(async (updates: Partial<typeof exportConfig>) => {
    const currentExportConfig = config?.export || {};
    return updatePreference('export', { ...currentExportConfig, ...updates });
  }, [config?.export, updatePreference]);
  
  return {
    exportConfig,
    updateExportPreference,
    ...rest,
  };
}