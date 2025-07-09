'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarkdownPreview } from './markdown-preview';
import { TradeMarkdown } from '@/types/trade';
import { generateId } from '@/lib/utils';
import { 
  Save, 
  Eye, 
  Edit, 
  Plus, 
  X, 
  FileText,
  Calendar,
  DollarSign,
  Hash
} from 'lucide-react';

interface MarkdownEditorProps {
  initialContent?: string;
  initialMetadata?: {
    ticker: string;
    action: 'buy' | 'sell';
    date: string;
    quantity?: number;
    price?: number;
    tags?: string[];
  };
  onSave?: (content: string, metadata: any) => void;
  onCancel?: () => void;
}

export function MarkdownEditor({ 
  initialContent = '', 
  initialMetadata,
  onSave,
  onCancel 
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [metadata, setMetadata] = useState({
    ticker: initialMetadata?.ticker || '',
    action: initialMetadata?.action || 'buy' as 'buy' | 'sell',
    date: initialMetadata?.date || new Date().toISOString().split('T')[0],
    quantity: initialMetadata?.quantity || 0,
    price: initialMetadata?.price || 0,
    tags: initialMetadata?.tags || []
  });
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const handleMetadataChange = useCallback((field: string, value: any) => {
    setMetadata(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const addTag = useCallback(() => {
    if (newTag && !metadata.tags.includes(newTag)) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
      setNewTag('');
    }
  }, [newTag, metadata.tags]);

  const removeTag = useCallback((tag: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  }, []);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(content, metadata);
    }
  }, [content, metadata, onSave]);

  const generateFrontmatter = useCallback(() => {
    const frontmatter = [
      '---',
      `date: ${metadata.date}`,
      `ticker: ${metadata.ticker}`,
      `action: ${metadata.action}`,
      metadata.quantity > 0 ? `quantity: ${metadata.quantity}` : '',
      metadata.price > 0 ? `price: ${metadata.price}` : '',
      metadata.tags.length > 0 ? `tags: [${metadata.tags.map(tag => `"${tag}"`).join(', ')}]` : '',
      '---',
      ''
    ].filter(Boolean).join('\n');

    return frontmatter;
  }, [metadata]);

  const insertTemplate = useCallback((type: 'entry' | 'exit' | 'analysis') => {
    const frontmatter = generateFrontmatter();
    let template = '';

    switch (type) {
      case 'entry':
        template = `${frontmatter}
# ${metadata.ticker} ${metadata.action === 'buy' ? '買い' : '売り'}エントリー

## エントリー理由
- 

## テクニカル分析
- 

## ファンダメンタル分析
- 

## リスク管理
- ストップロス: $
- 目標価格: $

## 注意点
- 
`;
        break;
      case 'exit':
        template = `${frontmatter}
# ${metadata.ticker} ${metadata.action === 'buy' ? '買い' : '売り'}決済

## 決済理由
- 

## 結果
- 実現損益: $
- 保有期間: 

## 振り返り
### 良かった点
- 

### 改善点
- 

## 学んだこと
- 
`;
        break;
      case 'analysis':
        template = `${frontmatter}
# ${metadata.ticker} 分析レポート

## 概要
- 

## チャート分析
- 

## 市場環境
- 

## 今後の戦略
- 
`;
        break;
    }

    setContent(template);
  }, [metadata, generateFrontmatter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Trade Note Editor</span>
          </CardTitle>
          <CardDescription>
            Create and edit markdown notes for your trades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Metadata Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="ticker">Ticker</Label>
                <Input
                  id="ticker"
                  value={metadata.ticker}
                  onChange={(e) => handleMetadataChange('ticker', e.target.value)}
                  placeholder="e.g., AAPL"
                />
              </div>
              <div>
                <Label htmlFor="action">Action</Label>
                <select
                  id="action"
                  value={metadata.action}
                  onChange={(e) => handleMetadataChange('action', e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={metadata.date}
                  onChange={(e) => handleMetadataChange('date', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={metadata.quantity}
                  onChange={(e) => handleMetadataChange('quantity', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={metadata.price}
                  onChange={(e) => handleMetadataChange('price', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="flex space-x-2">
                  <Input
                    id="tags"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag"
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button onClick={addTag} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {metadata.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer">
                        {tag}
                        <X 
                          className="w-3 h-3 ml-1" 
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Template Buttons */}
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => insertTemplate('entry')}
              >
                Entry Template
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => insertTemplate('exit')}
              >
                Exit Template
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => insertTemplate('analysis')}
              >
                Analysis Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'edit' | 'preview')}>
            <TabsList>
              <TabsTrigger value="edit">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab}>
            <TabsContent value="edit">
              <div className="space-y-2">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your trade notes in markdown..."
                  className="min-h-[400px] font-mono text-sm"
                />
                <div className="text-xs text-gray-500">
                  Supports markdown syntax. Use ## for headers, - for lists, **bold**, *italic*, etc.
                </div>
              </div>
            </TabsContent>
            <TabsContent value="preview">
              <div className="min-h-[400px] border rounded-md p-4">
                <MarkdownPreview content={content} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Note
        </Button>
      </div>
    </div>
  );
}