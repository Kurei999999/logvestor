'use client';

import { useState, useEffect } from 'react';
import { Trade } from '@/types/trade';
import { Button } from '@/components/ui/button';
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
  onOpenMemo?: (trade: Trade, memoFile: string) => void;
  onNewMemo?: (trade: Trade) => void;
}

export function TradeNotesDropdown({ trade, onOpenMemo, onNewMemo }: TradeNotesDropdownProps) {
  const [memoFiles, setMemoFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMemoFiles = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get config to determine folder path
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
      const pattern = config.markdownFileNamePattern || '{tradeId}_{ticker}_{date}';
      const folderName = pattern
        .replace('{tradeId}', trade.id)
        .replace('{ticker}', trade.ticker)
        .replace('{date}', trade.buyDate)
        .replace('{type}', 'folder');
      
      const folderPath = `${config.dataDirectory}/${config.markdownDirectory || 'trades'}/${folderName}`;
      
      // Check if folder exists
      const existsResult = await window.electronAPI.fs.exists(folderPath);
      if (!existsResult.success || !existsResult.data) {
        setMemoFiles([]);
        return;
      }

      // Read directory contents
      const readResult = await window.electronAPI.fs.readDir(folderPath);
      if (!readResult.success || !readResult.data) {
        setMemoFiles([]);
        return;
      }

      // Filter markdown files
      const mdFiles = readResult.data
        .filter(item => item.type === 'file' && item.name.endsWith('.md'))
        .map(item => item.name);
      
      setMemoFiles(mdFiles);
    } catch (err) {
      console.error('Failed to load memo files:', err);
      setError('Failed to load memos');
      setMemoFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount and when trade changes
  useEffect(() => {
    loadMemoFiles();
  }, [trade.id]);

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
            onClick={() => onOpenMemo?.(trade, file)}
            className="cursor-pointer"
          >
            <FileText className="mr-2 h-4 w-4" />
            {file}
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