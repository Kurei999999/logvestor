'use client';

import { useState, useEffect } from 'react';
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

export function TradeNotesDropdown({ trade, onOpenMemo, onNewMemo, refreshTrigger }: TradeNotesDropdownProps) {
  const [memoFiles, setMemoFiles] = useState<MemoFileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMemoFiles = async () => {
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

      // Extract year from trade date
      const year = trade.buyDate.split('-')[0];
      
      console.log(`[TradeNotesDropdown] Looking for memos for ${trade.ticker} on ${trade.buyDate} in year ${year}`);
      console.log(`[TradeNotesDropdown] Base config directory: ${config.dataDirectory}`);
      
      // Create file service wrapper that uses absolute paths
      const fileServiceWrapper = {
        readDir: async (relativePath: string) => {
          const absolutePath = `${config.dataDirectory}/${relativePath}`;
          console.log(`[TradeNotesDropdown] Reading directory: ${absolutePath}`);
          return await window.electronAPI.fs.readDir(absolutePath);
        }
      };
      
      // Get all trade folders for this ticker in this year
      const tradeFolders = await getTradeFoldersForTicker(
        fileServiceWrapper,
        year,
        trade.ticker
      );

      console.log(`[TradeNotesDropdown] Found ${tradeFolders.length} folders for ${trade.ticker}:`, tradeFolders);

      // Find folders that match this trade's date
      const matchingFolders = tradeFolders.filter(folder => folder.date === trade.buyDate);
      
      console.log(`[TradeNotesDropdown] Matching folders for ${trade.buyDate}:`, matchingFolders);
      
      const allMemoFiles: MemoFileInfo[] = [];

      // Scan each matching folder for markdown files
      for (const folder of matchingFolders) {
        const fullFolderPath = `${config.dataDirectory}/${folder.relativePath}`;
        
        // Check if folder exists
        const existsResult = await window.electronAPI.fs.exists(fullFolderPath);
        if (!existsResult.success || !existsResult.data) {
          continue;
        }

        // Read directory contents
        const readResult = await window.electronAPI.fs.readDir(fullFolderPath);
        if (!readResult.success || !readResult.data) {
          continue;
        }

        // Filter markdown files and add to list
        const mdFiles = readResult.data
          .filter(item => item.type === 'file' && item.name.endsWith('.md'))
          .map(item => ({
            fileName: item.name,
            folderPath: fullFolderPath,
            fullPath: `${fullFolderPath}/${item.name}`
          }));
        
        console.log(`[TradeNotesDropdown] Found ${mdFiles.length} markdown files in ${fullFolderPath}:`, mdFiles);
        allMemoFiles.push(...mdFiles);
      }
      
      console.log(`[TradeNotesDropdown] Final memo files:`, allMemoFiles);
      setMemoFiles(allMemoFiles);
    } catch (err) {
      console.error('Failed to load memo files:', err);
      setError('Failed to load memos');
      setMemoFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount and when trade changes or refreshTrigger changes
  useEffect(() => {
    loadMemoFiles();
  }, [trade.id, refreshTrigger]);

  if (error) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-red-500"
        onClick={loadMemoFiles}
      >
        <RefreshCw className="w-4 h-4" />
      </Button>
    );
  }

  if (isLoading) {
    return (
      <div className="text-sm text-gray-400">Loading...</div>
    );
  }

  if (memoFiles.length === 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
        onClick={() => onNewMemo?.(trade)}
      >
        <PenTool className="w-4 h-4" />
      </Button>
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
              loadMemoFiles();
            }}
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memoFiles.map((file, index) => (
          <DropdownMenuItem 
            key={index}
            onClick={() => onOpenMemo?.(trade, file.fileName, file.folderPath)}
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
          onClick={() => onNewMemo?.(trade)}
          className="text-blue-600"
        >
          <PenTool className="mr-2 h-4 w-4" />
          New Memo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}