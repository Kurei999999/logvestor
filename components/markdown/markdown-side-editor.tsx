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
import { localFileSyncService } from '@/lib/services/local-file-sync-service';
import { ElectronFileService } from '@/lib/services/electron/electron-file-service';

export interface MarkdownSideEditorProps {
  trade: Trade;
  memoFile?: string | null;
  onClose: () => void;
  onSave?: () => void;
}

export function MarkdownSideEditor({
  trade,
  memoFile,
  onClose,
  onSave
}: MarkdownSideEditorProps) {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState(memoFile || 'memo');
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize service on mount
  useEffect(() => {
    const initService = async () => {
      const result = await localFileSyncService.initialize();
      if (result.success) {
        setIsInitialized(true);
      } else {
        setError(result.error || 'Failed to initialize service');
      }
    };
    initService();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    
    if (memoFile) {
      loadMemoContent();
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
  }, [memoFile, trade, isInitialized]);

  const loadMemoContent = async () => {
    if (!memoFile) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading memo:', memoFile, 'for trade:', trade.id);
      
      const folderResult = await localFileSyncService.getTradeFolder(trade);
      console.log('Folder result:', folderResult);
      
      if (folderResult.success && folderResult.data && folderResult.data.folderPath) {
        const filePath = `${folderResult.data.folderPath}/${memoFile}`;
        console.log('Reading file from:', filePath);
        
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
      } else {
        throw new Error('Failed to get trade folder');
      }
    } catch (err) {
      setError('Failed to load memo content');
      console.error('Load memo error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      const folderService = await import('@/lib/services/trade-folder-service').then(m => m.TradeFolderService);
      const tradeFolderService = new folderService();
      await tradeFolderService.initialize();
      
      // Create trade folder if it doesn't exist
      const folderResult = await tradeFolderService.createTradeFolder(trade);
      if (!folderResult.success || !folderResult.folderPath) {
        throw new Error(folderResult.error || 'Failed to create trade folder');
      }
      
      // Determine file path
      const filePath = memoFile 
        ? `${folderResult.folderPath}/${memoFile}`
        : `${folderResult.folderPath}/${fileName}.md`;
      
      // Write content to file
      if (window.electronAPI?.fs) {
        const writeResult = await window.electronAPI.fs.writeFile(filePath, content);
        if (!writeResult.success) {
          throw new Error(writeResult.error || 'Failed to write file');
        }
      }
      
      // Update trade with new notes files
      const updatedTrade = await tradeFolderService.updateTradeNotesFiles(trade);
      
      // Update LocalStorage
      const { LocalStorage } = await import('@/lib/file-system/storage');
      const trades = LocalStorage.loadTrades();
      const tradeIndex = trades.findIndex(t => t.id === trade.id);
      if (tradeIndex >= 0) {
        trades[tradeIndex] = updatedTrade;
        LocalStorage.saveTrades(trades);
      }
      
      onSave?.();
      onClose();
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
            disabled={isSaving}
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