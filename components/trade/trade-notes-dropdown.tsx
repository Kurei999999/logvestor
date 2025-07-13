'use client';

import { useState, useCallback, useEffect } from 'react';
import { Trade } from '@/types/trade';
import { Button } from '@/components/ui/button';
import { getTradeFoldersForTicker } from '@/lib/trade-folder/path-generator';
import { 
  FileText, 
  ChevronDown, 
  PenTool,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TradeNotesDropdownProps {
  trade: Trade;
  onOpenMemo?: (trade: Trade, memoFile: string, folderPath: string) => void;
  onNewMemo?: (trade: Trade) => void;
  refreshTrigger?: number; // External trigger to force refresh
}

interface MemoFileInfo {
  fileName: string;
  folderPath: string;
  fullPath: string;
}

// Global cache for memo files
const memoCache = new Map<string, MemoFileInfo[]>();
let isCacheInitialized = false;

export function TradeNotesDropdown({ trade, onOpenMemo, onNewMemo, refreshTrigger }: TradeNotesDropdownProps) {
  const [memoFiles, setMemoFiles] = useState<MemoFileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize cache on first mount for any trade
  const initializeCache = async () => {
    if (isCacheInitialized) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get config to determine base data directory
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      let config;
      const configResult = await window.electronAPI.config.loadConfig();
      
      if (configResult.success && configResult.data) {
        config = configResult.data;
      } else {
        // If config doesn't exist, get default config
        const defaultConfigResult = await window.electronAPI.config.getDefaultConfig();
        if (!defaultConfigResult.success || !defaultConfigResult.data) {
          throw new Error('Failed to load default config');
        }
        config = defaultConfigResult.data;
      }

      // Create file service wrapper that uses absolute paths
      const fileServiceWrapper = {
        readDir: async (relativePath: string) => {
          const absolutePath = `${config.dataDirectory}/${relativePath}`;
          return await window.electronAPI.fs.readDir(absolutePath);
        }
      };

      // Scan all years in trades directory
      const tradesPath = 'trades';
      const tradesResult = await window.electronAPI.fs.readDir(`${config.dataDirectory}/${tradesPath}`);
      
      if (tradesResult.success && tradesResult.data) {
        const years = tradesResult.data
          .filter(item => item.type === 'directory')
          .map(item => item.name);

        // Load memos for all years
        for (const year of years) {
          const yearResult = await window.electronAPI.fs.readDir(`${config.dataDirectory}/${tradesPath}/${year}`);
          
          if (yearResult.success && yearResult.data) {
            const tradeFolders = yearResult.data
              .filter(item => item.type === 'directory')
              .map(item => item.name);

            // Process each trade folder
            for (const folderName of tradeFolders) {
              const folderPath = `${config.dataDirectory}/${tradesPath}/${year}/${folderName}`;
              
              // Read folder contents
              const folderResult = await window.electronAPI.fs.readDir(folderPath);
              if (!folderResult.success || !folderResult.data) continue;

              // Find markdown files
              const mdFiles = folderResult.data
                .filter(item => item.type === 'file' && item.name.endsWith('.md'))
                .map(item => ({
                  fileName: item.name,
                  folderPath: folderPath,
                  fullPath: `${folderPath}/${item.name}`
                }));

              if (mdFiles.length > 0) {
                // Extract ticker and date from folder name
                const parts = folderName.split('_');
                if (parts.length >= 3) {
                  const ticker = parts[0];
                  const dateStr = parts[1];
                  const tradeKey = `${ticker}_${year}-${dateStr}`;
                  memoCache.set(tradeKey, mdFiles);
                }
              }
            }
          }
        }
      }
      
      isCacheInitialized = true;
    } catch (err) {
      console.error('Failed to initialize memo cache:', err);
      setError('Failed to initialize memos');
    } finally {
      setIsLoading(false);
    }
  };

  // Get memos for specific trade from cache
  const getMemosForTrade = (trade: Trade): MemoFileInfo[] => {
    const year = trade.buyDate.split('-')[0];
    const dateStr = trade.buyDate.split('-').slice(1).join('-');
    const tradeKey = `${trade.ticker}_${year}-${dateStr}`;
    return memoCache.get(tradeKey) || [];
  };

  // Refresh cache for all trades (called when memo button is pressed)
  const refreshCache = async () => {
    isCacheInitialized = false;
    memoCache.clear();
    await initializeCache();
    const updatedMemos = getMemosForTrade(trade);
    setMemoFiles(updatedMemos);
  };

  // Initialize cache on component mount
  useEffect(() => {
    initializeCache().then(() => {
      const memos = getMemosForTrade(trade);
      setMemoFiles(memos);
    });
  }, []);

  // Update memos when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      refreshCache();
    }
  }, [refreshTrigger]);

  // Handle memo button click - refresh cache
  const handleNewMemo = useCallback(async (trade: Trade) => {
    await refreshCache();
    onNewMemo?.(trade);
  }, [onNewMemo]);

  const handleOpenMemo = useCallback(async (trade: Trade, memoFile: string, folderPath: string) => {
    await refreshCache();
    onOpenMemo?.(trade, memoFile, folderPath);
  }, [onOpenMemo]);

  if (error) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-red-500"
        onClick={refreshCache}
      >
        <RefreshCw className="w-4 h-4" />
      </Button>
    );
  }

  // Show simple button if no memos
  if (memoFiles.length === 0) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <PenTool className="w-4 h-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Memos</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isLoading ? (
            <div className="p-2 text-sm text-gray-500">Loading...</div>
          ) : (
            <DropdownMenuItem 
              onClick={() => handleNewMemo(trade)}
              className="text-blue-600"
            >
              <PenTool className="mr-2 h-4 w-4" />
              New Memo
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-2 hover:bg-blue-50"
        >
          <FileText className="w-4 h-4 text-blue-500 mr-1" />
          <span className="text-sm">{memoFiles.length}</span>
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="flex items-center justify-between">
          Memos
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.preventDefault();
              refreshCache();
            }}
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memoFiles.map((file, index) => (
          <DropdownMenuItem 
            key={index}
            onClick={() => handleOpenMemo(trade, file.fileName, file.folderPath)}
            className="cursor-pointer"
          >
            <FileText className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span>{file.fileName}</span>
              {memoFiles.length > 1 && (
                <span className="text-xs text-gray-400">
                  {file.folderPath.split('/').pop()}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleNewMemo(trade)}
          className="text-blue-600"
        >
          <PenTool className="mr-2 h-4 w-4" />
          New Memo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}