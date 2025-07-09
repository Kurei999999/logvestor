import { useState, useEffect, useCallback, useRef } from 'react';
import type { CSVMapping } from '@/types/csv';
import type { ServiceResponse } from '@/lib/services/interfaces/data-service';
import { getDataService } from '@/lib/services/service-factory';
// ErrorHandler imported but not used directly in hooks

export interface UseCSVOptions {
  autoLoad?: boolean;
  enableCache?: boolean;
  cacheTimeout?: number;
}

export interface UseCSVReturn {
  // Data
  mappings: CSVMapping[];
  selectedMapping: CSVMapping | null;
  
  // Loading states
  loading: boolean;
  saving: boolean;
  deleting: boolean;
  importing: boolean;
  
  // Error states
  error: string | null;
  lastError: string | null;
  
  // Operations
  loadMappings: () => Promise<void>;
  saveMapping: (mapping: CSVMapping) => Promise<boolean>;
  updateMapping: (mappingId: string, updates: Partial<CSVMapping>) => Promise<boolean>;
  deleteMapping: (mappingId: string) => Promise<boolean>;
  getMapping: (mappingId: string) => Promise<CSVMapping | null>;
  
  // Selection management
  selectMapping: (mappingId: string) => void;
  clearSelection: () => void;
  
  // Import/Export operations
  importCSV: (data: string | File, mappingId?: string) => Promise<any[] | null>;
  exportCSV: (format?: 'csv' | 'xlsx') => Promise<string | null>;
  
  // Utility functions
  refreshMappings: () => Promise<void>;
  clearError: () => void;
  
  // Statistics
  stats: {
    totalMappings: number;
    hasSelected: boolean;
  };
}

const DEFAULT_OPTIONS: UseCSVOptions = {
  autoLoad: true,
  enableCache: true,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
};

export function useCSV(options: UseCSVOptions = {}): UseCSVReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const dataService = getDataService();
  
  // State
  const [mappings, setMappings] = useState<CSVMapping[]>([]);
  const [selectedMapping, setSelectedMapping] = useState<CSVMapping | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Cache management
  const cacheRef = useRef<{
    data: CSVMapping[];
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
      console.error('[useCSV]', response.error);
      return null;
    }
  }, []);
  
  // Load mappings from service
  const loadMappings = useCallback(async () => {
    // Check cache first
    if (opts.enableCache && cacheRef.current) {
      const cacheAge = Date.now() - cacheRef.current.timestamp;
      if (cacheAge < opts.cacheTimeout!) {
        setMappings(cacheRef.current.data);
        return;
      }
    }
    
    setLoading(true);
    try {
      const response = await dataService.getCSVMappings();
      const mappingsData = handleResponse(response);
      
      if (mappingsData) {
        setMappings(mappingsData);
        
        // Update cache
        if (opts.enableCache) {
          cacheRef.current = {
            data: mappingsData,
            timestamp: Date.now(),
          };
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load CSV mappings';
      setError(errorMessage);
      setLastError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [dataService, handleResponse, opts.enableCache, opts.cacheTimeout]);
  
  // Save mapping
  const saveMapping = useCallback(async (mapping: CSVMapping): Promise<boolean> => {
    setSaving(true);
    try {
      const response = await dataService.saveCSVMapping(mapping);
      const savedMapping = handleResponse(response);
      
      if (savedMapping) {
        // Update local state
        setMappings(prev => {
          const existingIndex = prev.findIndex(m => m.id === mapping.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = savedMapping;
            return updated;
          } else {
            return [...prev, savedMapping];
          }
        });
        
        // Invalidate cache
        cacheRef.current = null;
        
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save CSV mapping';
      setError(errorMessage);
      setLastError(errorMessage);
      return false;
    } finally {
      setSaving(false);
    }
  }, [dataService, handleResponse]);
  
  // Update mapping
  const updateMapping = useCallback(async (mappingId: string, updates: Partial<CSVMapping>): Promise<boolean> => {
    setSaving(true);
    try {
      const response = await dataService.updateCSVMapping(mappingId, updates);
      const updatedMapping = handleResponse(response);
      
      if (updatedMapping) {
        setMappings(prev => prev.map(m => m.id === mappingId ? updatedMapping : m));
        
        // Update selected mapping if it's the one being updated
        if (selectedMapping?.id === mappingId) {
          setSelectedMapping(updatedMapping);
        }
        
        // Invalidate cache
        cacheRef.current = null;
        
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update CSV mapping';
      setError(errorMessage);
      setLastError(errorMessage);
      return false;
    } finally {
      setSaving(false);
    }
  }, [dataService, handleResponse, selectedMapping]);
  
  // Delete mapping
  const deleteMapping = useCallback(async (mappingId: string): Promise<boolean> => {
    setDeleting(true);
    try {
      const response = await dataService.deleteCSVMapping(mappingId);
      const success = handleResponse(response);
      
      if (success) {
        setMappings(prev => prev.filter(m => m.id !== mappingId));
        
        // Clear selected mapping if it's the one being deleted
        if (selectedMapping?.id === mappingId) {
          setSelectedMapping(null);
        }
        
        // Invalidate cache
        cacheRef.current = null;
        
        return true;
      }
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete CSV mapping';
      setError(errorMessage);
      setLastError(errorMessage);
      return false;
    } finally {
      setDeleting(false);
    }
  }, [dataService, handleResponse, selectedMapping]);
  
  // Get single mapping
  const getMapping = useCallback(async (mappingId: string): Promise<CSVMapping | null> => {
    try {
      const response = await dataService.getCSVMapping(mappingId);
      return handleResponse(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get CSV mapping';
      setError(errorMessage);
      setLastError(errorMessage);
      return null;
    }
  }, [dataService, handleResponse]);
  
  // Selection management
  const selectMapping = useCallback((mappingId: string) => {
    const mapping = mappings.find(m => m.id === mappingId);
    setSelectedMapping(mapping || null);
  }, [mappings]);
  
  const clearSelection = useCallback(() => {
    setSelectedMapping(null);
  }, []);
  
  // Import CSV data
  const importCSV = useCallback(async (data: string | File, mappingId?: string): Promise<any[] | null> => {
    setImporting(true);
    try {
      const response = await dataService.importData(data, 'csv', { mappingId });
      const importedData = handleResponse(response);
      
      if (importedData) {
        return importedData;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import CSV data';
      setError(errorMessage);
      setLastError(errorMessage);
      return null;
    } finally {
      setImporting(false);
    }
  }, [dataService, handleResponse]);
  
  // Export data as CSV
  const exportCSV = useCallback(async (format: 'csv' | 'xlsx' = 'csv'): Promise<string | null> => {
    try {
      const response = await dataService.exportData(format);
      const exportData = handleResponse(response);
      return typeof exportData === 'string' ? exportData : null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export CSV data';
      setError(errorMessage);
      setLastError(errorMessage);
      return null;
    }
  }, [dataService, handleResponse]);
  
  // Utility functions
  const refreshMappings = useCallback(async () => {
    cacheRef.current = null;
    await loadMappings();
  }, [loadMappings]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Calculate statistics
  const stats = {
    totalMappings: mappings.length,
    hasSelected: selectedMapping !== null,
  };
  
  // Auto-load mappings on mount
  useEffect(() => {
    if (opts.autoLoad) {
      loadMappings();
    }
  }, [opts.autoLoad, loadMappings]);
  
  return {
    // Data
    mappings,
    selectedMapping,
    
    // Loading states
    loading,
    saving,
    deleting,
    importing,
    
    // Error states
    error,
    lastError,
    
    // Operations
    loadMappings,
    saveMapping,
    updateMapping,
    deleteMapping,
    getMapping,
    
    // Selection management
    selectMapping,
    clearSelection,
    
    // Import/Export operations
    importCSV,
    exportCSV,
    
    // Utility functions
    refreshMappings,
    clearError,
    
    // Statistics
    stats,
  };
}

// === Helper hooks for specific CSV operations ===

/**
 * Hook for CSV file validation
 */
export function useCSVValidation() {
  const [validating, setValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);
  
  const validateCSVFile = useCallback(async (file: File): Promise<boolean> => {
    setValidating(true);
    try {
      // Basic validation
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setValidationResults({ valid: false, error: 'File must be a CSV file' });
        return false;
      }
      
      if (file.size === 0) {
        setValidationResults({ valid: false, error: 'File is empty' });
        return false;
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        setValidationResults({ valid: false, error: 'File is too large (max 50MB)' });
        return false;
      }
      
      // Try to read first few lines
      const content = await file.text();
      const lines = content.split('\n').slice(0, 5);
      
      if (lines.length < 2) {
        setValidationResults({ valid: false, error: 'File must have at least a header and one data row' });
        return false;
      }
      
      setValidationResults({ 
        valid: true, 
        preview: lines,
        totalLines: content.split('\n').length - 1 // Exclude empty last line
      });
      return true;
    } catch (error) {
      setValidationResults({ 
        valid: false, 
        error: 'Failed to read file: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
      return false;
    } finally {
      setValidating(false);
    }
  }, []);
  
  return {
    validating,
    validationResults,
    validateCSVFile,
  };
}