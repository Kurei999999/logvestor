'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TradeMarkdownEditor } from './trade-markdown-editor';
import { Trade } from '@/types/trade';
import { LocalFileSyncService } from '@/lib/services/local-file-sync-service';

interface MarkdownEditorModalProps {
  trade: Trade;
  isOpen: boolean;
  onClose: () => void;
  templateType?: 'entry' | 'exit' | 'analysis' | 'followup' | 'custom';
  onSaved?: () => void;
}

export function MarkdownEditorModal({
  trade,
  isOpen,
  onClose,
  templateType = 'custom',
  onSaved
}: MarkdownEditorModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (content: string, fileName: string) => {
    setIsLoading(true);
    try {
      const syncService = new LocalFileSyncService();
      await syncService.initialize();
      const result = await syncService.createMarkdownMemo(trade, 'memo');
      
      if (result.success) {
        console.log('Markdown file created:', result.filePath);
        onSaved?.();
        onClose();
      } else {
        throw new Error(result.error || 'Failed to save markdown file');
      }
    } catch (error) {
      console.error('Error saving markdown:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Create Markdown Memo for {trade.ticker}
          </DialogTitle>
        </DialogHeader>
        
        <TradeMarkdownEditor
          trade={trade}
          templateType={templateType}
          onSave={handleSave}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}