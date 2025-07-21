/**
 * Hook for managing initial application setup
 * Handles first-time directory creation and configuration
 */

import { useState, useEffect, useCallback } from 'react';
import { AppConfig } from '@/types/app';
import { MCPServerService } from '@/lib/services/mcp-server-service';

export interface SetupState {
  isRequired: boolean;
  isLoading: boolean;
  error: string | null;
  defaultDirectory: string;
}

export interface UseInitialSetupReturn {
  setupState: SetupState;
  completeSetup: (dataDirectory: string) => Promise<boolean>;
  skipSetup: () => void;
}

export function useInitialSetup(): UseInitialSetupReturn {
  const [setupState, setSetupState] = useState<SetupState>({
    isRequired: false,
    isLoading: true,
    error: null,
    defaultDirectory: ''
  });

  // Check if initial setup is required
  const checkSetupRequired = useCallback(async () => {
    try {
      setSetupState(prev => ({ ...prev, isLoading: true, error: null }));

      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Get default config to determine default directory
      const defaultConfigResult = await window.electronAPI.config.getDefaultConfig();
      if (!defaultConfigResult.success || !defaultConfigResult.data) {
        throw new Error('Failed to get default configuration');
      }

      const defaultDirectory = defaultConfigResult.data.dataDirectory;

      // Check if config already exists (app has been set up before)
      const configResult = await window.electronAPI.config.loadConfig();
      
      if (configResult.success && configResult.data) {
        // Config exists - check if data directory exists
        const dataDir = configResult.data.dataDirectory;
        const dirExists = await window.electronAPI.fs.exists(dataDir);
        
        if (dirExists.success && dirExists.data) {
          // Everything exists, no setup required
          setSetupState({
            isRequired: false,
            isLoading: false,
            error: null,
            defaultDirectory
          });
          return;
        }
      }

      // Setup is required
      setSetupState({
        isRequired: true,
        isLoading: false,
        error: null,
        defaultDirectory
      });

    } catch (error) {
      console.error('Error checking setup requirements:', error);
      setSetupState({
        isRequired: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check setup requirements',
        defaultDirectory: ''
      });
    }
  }, []);

  // Complete the initial setup
  const completeSetup = useCallback(async (dataDirectory: string): Promise<boolean> => {
    try {
      setSetupState(prev => ({ ...prev, isLoading: true, error: null }));

      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Ensure the main data directory exists
      console.log('Creating main data directory:', dataDirectory);
      const dirExists = await window.electronAPI.fs.exists(dataDirectory);
      if (!dirExists.success || !dirExists.data) {
        const createResult = await window.electronAPI.fs.createDir(dataDirectory);
        if (!createResult.success) {
          throw new Error(createResult.error || 'Failed to create directory');
        }
        console.log('Main data directory created successfully');
      } else {
        console.log('Main data directory already exists');
      }

      // Create the configuration
      const config: AppConfig = {
        dataDirectory,
        tradeDirectory: 'trades',
        portfolioDirectory: 'portfolios',
        templatesDirectory: 'templates',
        defaultCSVMapping: '',
        theme: 'light',
        autoBackup: true,
        backupInterval: 24 * 60 * 60 * 1000,
        maxBackups: 10,
        markdownEnabled: true,
        markdownDirectory: 'trades',
        autoCreateMarkdownFolders: true,
        markdownFileNamePattern: '{tradeId}_{ticker}_{date}',
        // Mark as setup completed
        setupCompleted: true,
        setupVersion: '1.0.0'
      };

      // Save the configuration
      const saveResult = await window.electronAPI.config.saveConfig(config);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save configuration');
      }

      // Create initial directory structure within the TradeJournal folder
      console.log('Creating subdirectories...');
      
      const tradesDir = `${dataDirectory}/trades`;
      console.log('Creating trades directory:', tradesDir);
      const tradesResult = await window.electronAPI.fs.createDir(tradesDir);
      if (!tradesResult.success) {
        console.error('Failed to create trades directory:', tradesResult.error);
        throw new Error(`Failed to create trades directory: ${tradesResult.error}`);
      }
      console.log('Trades directory created successfully');

      const portfoliosDir = `${dataDirectory}/portfolios`;
      console.log('Creating portfolios directory:', portfoliosDir);
      const portfoliosResult = await window.electronAPI.fs.createDir(portfoliosDir);
      if (!portfoliosResult.success) {
        console.error('Failed to create portfolios directory:', portfoliosResult.error);
        throw new Error(`Failed to create portfolios directory: ${portfoliosResult.error}`);
      }
      console.log('Portfolios directory created successfully');

      const templatesDir = `${dataDirectory}/templates`;
      console.log('Creating templates directory:', templatesDir);
      const templatesResult = await window.electronAPI.fs.createDir(templatesDir);
      if (!templatesResult.success) {
        console.error('Failed to create templates directory:', templatesResult.error);
        throw new Error(`Failed to create templates directory: ${templatesResult.error}`);
      }
      console.log('Templates directory created successfully');

      // Initialize central CSV
      const csvPath = `${dataDirectory}/trades.csv`;
      console.log('Creating central CSV file:', csvPath);
      const csvExists = await window.electronAPI.fs.exists(csvPath);
      if (!csvExists.success || !csvExists.data) {
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
        
        const csvResult = await window.electronAPI.fs.writeFile(csvPath, headers);
        if (!csvResult.success) {
          throw new Error(`Failed to create trades.csv: ${csvResult.error}`);
        }
        console.log('Central CSV file created successfully');
      } else {
        console.log('Central CSV file already exists');
      }

      // Create MCP server folder and files
      console.log('Creating MCP server...');
      try {
        await MCPServerService.createMCPServer(dataDirectory);
        console.log('MCP server created successfully');
      } catch (error) {
        console.warn('Failed to create MCP server:', error);
        // Don't fail setup if MCP server creation fails
      }

      setSetupState({
        isRequired: false,
        isLoading: false,
        error: null,
        defaultDirectory: dataDirectory
      });

      return true;
    } catch (error) {
      console.error('Error completing setup:', error);
      setSetupState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to complete setup'
      }));
      return false;
    }
  }, []);

  // Skip setup (for development or edge cases)
  const skipSetup = useCallback(() => {
    setSetupState(prev => ({
      ...prev,
      isRequired: false
    }));
  }, []);

  // Check setup requirements on mount
  useEffect(() => {
    checkSetupRequired();
  }, [checkSetupRequired]);

  return {
    setupState,
    completeSetup,
    skipSetup
  };
}