'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MarkdownEditorModal } from './markdown-editor-modal';
import { MarkdownPreview } from './markdown-preview';
import { Trade } from '@/types/trade';
import { LocalFileSyncService } from '@/lib/services/local-file-sync-service';
import { 
  FileText, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Folder,
  Calendar,
  Clock,
  Download,
  X
} from 'lucide-react';

interface MarkdownMemoManagerProps {
  trade: Trade;
  className?: string;
}

interface MemoFile {
  fileName: string;
  filePath: string;
  content: string;
  createdAt: string;
  lastModified: string;
}

export function MarkdownMemoManager({ trade, className }: MarkdownMemoManagerProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'entry' | 'exit' | 'analysis' | 'followup' | 'custom'>('custom');
  const [memoFiles, setMemoFiles] = useState<MemoFile[]>([]);
  const [selectedMemo, setSelectedMemo] = useState<MemoFile | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing memo files for this trade
  useEffect(() => {
    loadMemoFiles();
  }, [trade.id]);

  const loadMemoFiles = async () => {
    setIsLoading(true);
    try {
      // This would typically fetch from the file system
      // For now, we'll use the notesFiles array from the trade
      const files: MemoFile[] = trade.notesFiles?.map(filePath => ({
        fileName: filePath.split('/').pop() || 'unknown',
        filePath,
        content: '', // Would be loaded when needed
        createdAt: trade.createdAt || new Date().toISOString(),
        lastModified: trade.updatedAt || new Date().toISOString()
      })) || [];
      
      setMemoFiles(files);
    } catch (error) {
      console.error('Error loading memo files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMemo = (templateType: 'entry' | 'exit' | 'analysis' | 'followup' | 'custom') => {
    setSelectedTemplate(templateType);
    setIsEditorOpen(true);
  };

  const handleMemoSaved = () => {
    loadMemoFiles(); // Refresh the list
  };

  const openTradeFolder = async () => {
    try {
      const syncService = new LocalFileSyncService();
      await syncService.initialize();
      // This would open the trade folder in the file explorer
      console.log('Opening trade folder for:', trade.ticker);
    } catch (error) {
      console.error('Error opening trade folder:', error);
    }
  };

  const exportMemo = (memo: MemoFile) => {
    const blob = new Blob([memo.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = memo.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Markdown Memos</span>
              </CardTitle>
              <CardDescription>
                Create and manage markdown notes for {trade.ticker}
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openTradeFolder}
              >
                <Folder className="h-4 w-4 mr-2" />
                Open Folder
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Create New Memo Buttons */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Create New Memo</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateMemo('entry')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Entry Analysis</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateMemo('exit')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Exit Analysis</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateMemo('analysis')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Technical Analysis</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateMemo('followup')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Follow-up</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateMemo('custom')}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Custom Memo</span>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Existing Memos */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Existing Memos</h4>
            
            {isLoading ? (
              <div className="text-sm text-gray-500">Loading memos...</div>
            ) : memoFiles.length === 0 ? (
              <div className="text-sm text-gray-500">
                No memos created yet. Create your first memo using the buttons above.
              </div>
            ) : (
              <div className="space-y-2">
                {memoFiles.map((memo, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium text-sm">{memo.fileName}</div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(memo.createdAt).toLocaleDateString()}</span>
                          <Clock className="h-3 w-3" />
                          <span>{new Date(memo.lastModified).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedMemo(memo)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportMemo(memo)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview Selected Memo */}
          {selectedMemo && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">
                    Preview: {selectedMemo.fileName}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMemo(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="border rounded-lg p-4 bg-white max-h-60 overflow-y-auto">
                  <MarkdownPreview content={selectedMemo.content} />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Markdown Editor Modal */}
      <MarkdownEditorModal
        trade={trade}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        templateType={selectedTemplate}
        onSaved={handleMemoSaved}
      />
    </div>
  );
}