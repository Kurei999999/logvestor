'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TradeImage } from '@/types/trade';
import { Tag, X } from 'lucide-react';

interface TagFilterProps {
  images: TradeImage[];
  selectedTags: string[];
  onTagSelect: (tag: string) => void;
  onTagDeselect: (tag: string) => void;
  onClearAll: () => void;
}

export function TagFilter({ 
  images, 
  selectedTags, 
  onTagSelect, 
  onTagDeselect, 
  onClearAll 
}: TagFilterProps) {
  // Extract all unique tags from images
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    
    images.forEach(image => {
      if (image.tag) {
        tags.add(image.tag);
      }
      if (image.tags) {
        image.tags.forEach(tag => tags.add(tag));
      }
    });
    
    return Array.from(tags).sort();
  }, [images]);

  // Count images per tag
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    images.forEach(image => {
      if (image.tag) {
        counts[image.tag] = (counts[image.tag] || 0) + 1;
      }
      if (image.tags) {
        image.tags.forEach(tag => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });
    
    return counts;
  }, [images]);

  const handleTagClick = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagDeselect(tag);
    } else {
      onTagSelect(tag);
    }
  };

  if (availableTags.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No tags found in your images</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700">Selected:</span>
          {selectedTags.map(tag => (
            <Badge 
              key={tag} 
              variant="default" 
              className="cursor-pointer hover:bg-red-100 hover:text-red-800"
              onClick={() => onTagDeselect(tag)}
            >
              <Tag className="w-3 h-3 mr-1" />
              {tag}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Available Tags */}
      <div className="space-y-2">
        <span className="text-sm font-medium text-gray-700">Available Tags:</span>
        <div className="flex flex-wrap gap-2">
          {availableTags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            const count = tagCounts[tag] || 0;
            
            return (
              <Badge
                key={tag}
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => handleTagClick(tag)}
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
                <span className="ml-1 text-xs opacity-70">({count})</span>
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="text-xs text-gray-500">
        {availableTags.length} tag{availableTags.length !== 1 ? 's' : ''} available
        {selectedTags.length > 0 && ` • ${selectedTags.length} selected`}
      </div>
    </div>
  );
}