'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  X, 
  Eye, 
  Edit, 
  Save,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Trade } from '@/types/trade';
import { AppConfig } from '@/types/app';
import { createTradeFolderWithSequence } from '@/lib/trade-folder/path-generator';

export interface MarkdownSideEditorProps {
  trade: Trade;
  memoFile?: string | null;
  folderPath?: string | null; // Full path to the trade folder
  onClose: () => void;
  onSave?: () => void;
}

export function MarkdownSideEditorV2({
  trade,
  memoFile,
  folderPath,
  onClose,
  onSave
}: MarkdownSideEditorProps) {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState(memoFile || 'memo');
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (window.electronAPI?.config) {
        let config;
        const configResult = await window.electronAPI.config.loadConfig();
        
        if (configResult.success && configResult.data) {
          config = configResult.data;
        } else {
          // If config doesn't exist, get default config
          const defaultConfigResult = await window.electronAPI.config.getDefaultConfig();
          if (defaultConfigResult.success && defaultConfigResult.data) {
            config = defaultConfigResult.data;
          }
        }
        
        if (config) {
          setConfig(config);
        }
      }
    };
    loadConfig();
  }, []);

  // Load memo content or create template
  useEffect(() => {
    if (!config) return;

    if (memoFile) {
      loadMemoContent();
      
      // Set up interval to reload content every 2 seconds (like VSCode)
      const interval = setInterval(() => {
        if (!isPreview) return; // Only reload when in preview mode
        loadMemoContent();
      }, 2000);
      
      return () => clearInterval(interval);
    } else {
      // New memo - create template
      const template = `# ${trade.ticker} - Trade Notes

## Trade Information
- **Buy Date**: ${trade.buyDate}
- **Buy Price**: $${trade.buyPrice}
- **Quantity**: ${trade.quantity}
${trade.sellDate ? `- **Sell Date**: ${trade.sellDate}` : ''}
${trade.sellPrice ? `- **Sell Price**: $${trade.sellPrice}` : ''}
${trade.pnl ? `- **P&L**: $${trade.pnl.toFixed(2)}` : ''}

## Analysis

## Notes

`;
      setContent(template);
    }
  }, [memoFile, trade, config, isPreview]);

  const getTradeFolderPath = () => {
    // If folderPath is provided (new structure), use it
    if (folderPath) {
      return folderPath;
    }
    
    // Always use new structure - no fallback to old pattern
    return null; // This will trigger automatic folder creation with sequence
  };

  const loadMemoContent = async () => {
    if (!memoFile || !config) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const folderPath = getTradeFolderPath();
      if (!folderPath) throw new Error('Could not determine folder path');
      
      const filePath = `${folderPath}/${memoFile}`;
      console.log('Loading memo from:', filePath);
      
      if (window.electronAPI?.fs) {
        const readResult = await window.electronAPI.fs.readFile(filePath);
        console.log('Read result:', readResult);
        
        if (readResult.success && readResult.data) {
          setContent(readResult.data);
        } else {
          throw new Error(readResult.error || 'Failed to read file');
        }
      } else {
        throw new Error('Electron API not available');
      }
    } catch (err) {
      setError('Failed to load memo content');
      console.error('Load memo error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) {
      setError('Configuration not loaded');
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      let actualFolderPath = getTradeFolderPath();
      
      // If no folderPath provided, create new folder with sequence
      if (!folderPath && !actualFolderPath) {
        if (window.electronAPI?.fs) {
          const newFolderInfo = await createTradeFolderWithSequence(
            window.electronAPI.fs,
            trade.ticker,
            trade.buyDate,
            config.dataDirectory
          );
          
          if (!newFolderInfo) {
            throw new Error('Failed to create new trade folder');
          }
          
          actualFolderPath = newFolderInfo.fullPath;
        } else {
          throw new Error('Electron API not available');
        }
      } else if (!actualFolderPath) {
        throw new Error('Could not determine folder path');
      }
      
      // Ensure folder exists
      if (window.electronAPI?.fs) {
        const existsResult = await window.electronAPI.fs.exists(actualFolderPath);
        if (!existsResult.success || !existsResult.data) {
          const createResult = await window.electronAPI.fs.createDir(actualFolderPath);
          if (!createResult.success) {
            throw new Error(createResult.error || 'Failed to create folder');
          }
          
          // Create images subfolder
          const imagesPath = `${actualFolderPath}/images`;
          await window.electronAPI.fs.createDir(imagesPath);
        }
        
        // Determine file path - always use memoFile if it exists, otherwise create new
        const finalFileName = memoFile || `${fileName}.md`;
        const filePath = `${actualFolderPath}/${finalFileName}`;
        
        console.log('Saving to:', filePath);
        console.log('Content length:', content.length);
        
        // Write content to file
        const writeResult = await window.electronAPI.fs.writeFile(filePath, content);
        if (!writeResult.success) {
          throw new Error(writeResult.error || 'Failed to write file');
        }
        
        console.log('Save successful');
        onSave?.();
        onClose();
      } else {
        throw new Error('Electron API not available');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save memo');
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-1/2 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-gray-500" />
          <div>
            <h2 className="text-lg font-semibold">{trade.ticker} - {memoFile || 'New Memo'}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {trade.buyDate}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ${trade.buyPrice}
              </span>
              {trade.pnl && (
                <span className={cn(
                  "flex items-center gap-1",
                  trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  <TrendingUp className="w-3 h-3" />
                  ${trade.pnl.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
          >
            {isPreview ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !config}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* File name input for new memos */}
      {!memoFile && (
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <Label htmlFor="fileName" className="text-sm whitespace-nowrap">
              File name:
            </Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="memo"
              className="flex-1"
            />
            <span className="text-sm text-gray-500">.md</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-500">{error}</div>
          </div>
        ) : isPreview ? (
          <div className="h-full overflow-y-auto p-6">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-full w-full resize-none border-0 p-6 font-mono text-sm focus-visible:ring-0"
            placeholder="Write your markdown here..."
          />
        )}
      </div>
    </div>
  );
}