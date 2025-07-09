'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Trade, TradeImage } from '@/types/trade';
import { FileUtils } from '@/lib/file-system/file-utils';
import { generateId } from '@/lib/utils';
import { 
  Upload, 
  X, 
  Plus, 
  FileImage,
  AlertCircle
} from 'lucide-react';

interface ImageUploaderProps {
  trades: Trade[];
  onUpload: (images: TradeImage[]) => void;
  onCancel: () => void;
}

export function ImageUploader({ trades, onUpload, onCancel }: ImageUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedTrade, setSelectedTrade] = useState<string>('');
  const [commonCaption, setCommonCaption] = useState('');
  const [commonTags, setCommonTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    const newErrors: string[] = [];

    for (const file of Array.from(files)) {
      if (FileUtils.validateImageFile(file)) {
        validFiles.push(file);
      } else {
        newErrors.push(`${file.name} is not a valid image file`);
      }
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setErrors(newErrors);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddTag = useCallback(() => {
    if (newTag && !commonTags.includes(newTag)) {
      setCommonTags(prev => [...prev, newTag]);
      setNewTag('');
    }
  }, [newTag, commonTags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setCommonTags(prev => prev.filter(t => t !== tag));
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) {
      setErrors(['Please select at least one image']);
      return;
    }

    if (!selectedTrade) {
      setErrors(['Please select a trade']);
      return;
    }

    setUploading(true);
    setErrors([]);

    try {
      const uploadedImages: TradeImage[] = [];
      
      for (const file of selectedFiles) {
        try {
          const dataUrl = await FileUtils.readFileAsDataURL(file);
          const now = new Date().toISOString();
          
          const tradeImage: TradeImage = {
            id: generateId(),
            tradeId: selectedTrade,
            fileName: file.name,
            filePath: dataUrl, // In a real app, this would be a proper file path
            relativePath: `images/${file.name}`,
            caption: commonCaption || undefined,
            tags: commonTags.length > 0 ? [...commonTags] : undefined,
            createdAt: now
          };
          
          uploadedImages.push(tradeImage);
        } catch (error) {
          setErrors(prev => [...prev, `Failed to upload ${file.name}`]);
        }
      }

      if (uploadedImages.length > 0) {
        onUpload(uploadedImages);
      }
    } catch (error) {
      setErrors(['Failed to upload images']);
    } finally {
      setUploading(false);
    }
  }, [selectedFiles, selectedTrade, commonCaption, commonTags, onUpload]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    
    const validFiles: File[] = [];
    const newErrors: string[] = [];

    for (const file of Array.from(files)) {
      if (FileUtils.validateImageFile(file)) {
        validFiles.push(file);
      } else {
        newErrors.push(`${file.name} is not a valid image file`);
      }
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setErrors(newErrors);
  }, []);

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <Upload className="h-12 w-12 text-gray-400" />
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">Upload Images</p>
            <p className="text-sm text-gray-600">
              Drag and drop images here, or click to select files
            </p>
          </div>
          <div>
            <label htmlFor="file-input" className="cursor-pointer">
              <Button type="button" variant="outline">
                <FileImage className="w-4 h-4 mr-2" />
                Select Images
              </Button>
            </label>
            <input
              id="file-input"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          <p className="text-xs text-gray-500">
            Supported formats: PNG, JPG, JPEG, GIF, WebP
          </p>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Selected Images ({selectedFiles.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedFiles.map((file, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileImage className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {FileUtils.formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upload Configuration */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="trade-select">Associate with Trade</Label>
          <Select value={selectedTrade} onValueChange={setSelectedTrade}>
            <SelectTrigger>
              <SelectValue placeholder="Select a trade" />
            </SelectTrigger>
            <SelectContent>
              {trades.map(trade => (
                <SelectItem key={trade.id} value={trade.id}>
                  {trade.ticker} - {trade.action.toUpperCase()} - {trade.date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="caption">Caption (optional)</Label>
          <Textarea
            id="caption"
            value={commonCaption}
            onChange={(e) => setCommonCaption(e.target.value)}
            placeholder="Add a caption for all images..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="tags">Tags (optional)</Label>
          <div className="flex space-x-2">
            <Input
              id="tags"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag"
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <Button onClick={handleAddTag} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {commonTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {commonTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer">
                  {tag}
                  <X 
                    className="w-3 h-3 ml-1" 
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <h4 className="text-sm font-medium text-red-800">Upload Errors</h4>
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleUpload} 
          disabled={uploading || selectedFiles.length === 0}
        >
          {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Image(s)`}
        </Button>
      </div>
    </div>
  );
}