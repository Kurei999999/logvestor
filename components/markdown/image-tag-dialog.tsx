'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tag } from 'lucide-react';

interface ImageTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tag: string) => void;
  originalFileName: string;
}

// Common image tags for trading
const COMMON_TAGS = [
  'buy',
  'sell',
  'entry',
  'exit',
  'breakout',
  'support',
  'resistance',
  'analysis',
  'pattern',
  'setup'
];

export function ImageTagDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  originalFileName 
}: ImageTagDialogProps) {
  const [selectedTag, setSelectedTag] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const handleConfirm = () => {
    const tagToUse = isCustom ? customTag : selectedTag;
    // Convert "none" to empty string for no tag
    const finalTag = tagToUse === 'none' ? '' : tagToUse;
    onConfirm(finalTag);
    // Reset form
    setSelectedTag('');
    setCustomTag('');
    setIsCustom(false);
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setSelectedTag('');
    setCustomTag('');
    setIsCustom(false);
  };

  const generatePreviewFileName = () => {
    const tagToUse = isCustom ? customTag : selectedTag;
    // Show folder structure instead of filename modification
    if (!tagToUse || tagToUse === 'none') {
      return `images/${originalFileName}`;
    }
    
    return `images/${tagToUse}/${originalFileName}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Image Tag</DialogTitle>
          <DialogDescription>
            Add a tag to categorize your image. This will help you organize and filter your images later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Choose a tag</label>
            <Select
              value={isCustom ? 'custom' : selectedTag || 'none'}
              onValueChange={(value) => {
                if (value === 'custom') {
                  setIsCustom(true);
                  setSelectedTag('');
                } else {
                  setIsCustom(false);
                  setSelectedTag(value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a tag or create custom..." />
              </SelectTrigger>
              <SelectContent>
                {COMMON_TAGS.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom tag...</SelectItem>
                <SelectItem value="none">No tag</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCustom && (
            <div>
              <label className="text-sm font-medium mb-2 block">Custom tag</label>
              <Input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Enter custom tag..."
              />
            </div>
          )}

          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground mb-1">File will be saved as:</p>
            <p className="text-sm font-mono">{generatePreviewFileName()}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Add Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}