'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Edit, 
  Save, 
  X, 
  FileText,
  Download,
  Plus,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Trade } from '@/types/trade';
import { TradeLinker } from '@/lib/trade-linker/trade-linker';

export interface TradeMarkdownEditorProps {
  trade: Trade;
  initialContent?: string;
  fileName?: string;
  templateType?: 'entry' | 'exit' | 'analysis' | 'followup' | 'custom';
  onSave?: (content: string, fileName: string) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export function TradeMarkdownEditor({
  trade,
  initialContent = '',
  fileName = '',
  templateType = 'custom',
  onSave,
  onCancel,
  className
}: TradeMarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [currentFileName, setCurrentFileName] = useState(fileName);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialContent && templateType) {
      const template = TradeLinker.createMarkdownTemplate(trade, templateType);
      setContent(template);
    }
    
    if (!currentFileName && templateType) {
      const generatedFileName = TradeLinker.generateFileName(trade, templateType);
      setCurrentFileName(generatedFileName);
    }
  }, [trade, templateType, initialContent, currentFileName]);

  useEffect(() => {
    // Extract tags from frontmatter
    const frontmatter = TradeLinker.parseFrontmatter(content);
    if (frontmatter.tags && Array.isArray(frontmatter.tags)) {
      setTags(frontmatter.tags);
    }
  }, [content]);

  const handleSave = useCallback(async () => {
    if (!onSave || !currentFileName.trim()) {
      setError('File name is required');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      await onSave(content, currentFileName);
    } catch (err) {
      console.error('Error saving markdown:', err);
      setError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  }, [content, currentFileName, onSave]);

  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      updateFrontmatterTags(updatedTags);
      setNewTag('');
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    updateFrontmatterTags(updatedTags);
  }, [tags]);

  const updateFrontmatterTags = useCallback((newTags: string[]) => {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatterContent = frontmatterMatch[1];
      const updatedFrontmatter = frontmatterContent
        .split('\n')
        .filter(line => !line.trim().startsWith('tags:'))
        .join('\n');
      
      const tagsLine = newTags.length > 0 
        ? `tags: [${newTags.map(tag => `"${tag}"`).join(', ')}]`
        : '';
      
      const newFrontmatterContent = updatedFrontmatter + (tagsLine ? '\n' + tagsLine : '');
      const newContent = content.replace(
        /^---\n([\s\S]*?)\n---/,
        `---\n${newFrontmatterContent}\n---`
      );
      setContent(newContent);
    }
  }, [content]);

  const loadTemplate = useCallback((type: 'entry' | 'exit' | 'analysis' | 'followup' | 'custom') => {
    const template = TradeLinker.createMarkdownTemplate(trade, type);
    setContent(template);
    
    const generatedFileName = TradeLinker.generateFileName(trade, type);
    setCurrentFileName(generatedFileName);
  }, [trade]);

  const exportContent = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName || 'memo.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, currentFileName]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <h3 className="text-lg font-semibold">
            {trade.ticker} Markdown Memo
          </h3>
          <Badge variant="outline">
            {trade.sellDate ? 'CLOSED' : 'OPEN'}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportContent}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          {onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          
          <Button
            onClick={handleSave}
            disabled={isSaving || !currentFileName.trim()}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* File Name */}
      <div className="space-y-2">
        <Label htmlFor="fileName">File Name</Label>
        <Input
          id="fileName"
          value={currentFileName}
          onChange={(e) => setCurrentFileName(e.target.value)}
          placeholder="Enter file name..."
        />
      </div>

      {/* Template Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadTemplate('entry')}
        >
          Entry Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadTemplate('exit')}
        >
          Exit Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadTemplate('analysis')}
        >
          Analysis Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadTemplate('followup')}
        >
          Follow-up Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadTemplate('custom')}
        >
          Custom Template
        </Button>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddTag}
            disabled={!newTag.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'edit' | 'preview')}>
        <TabsList>
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="edit" className="mt-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your markdown content here..."
            className="min-h-[500px] font-mono text-sm"
          />
        </TabsContent>
        
        <TabsContent value="preview" className="mt-4">
          <div className="border rounded-lg p-4 min-h-[500px] bg-white">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <div className="text-sm text-gray-500 space-y-1">
        <div>Trade: {trade.ticker} ({trade.buyDate})</div>
        <div>Status: {trade.sellDate ? 'CLOSED' : 'OPEN'}</div>
        {trade.sellDate && <div>Closed: {trade.sellDate}</div>}
        {trade.pnl !== undefined && <div>P&L: ${trade.pnl.toFixed(2)}</div>}
      </div>
    </div>
  );
}