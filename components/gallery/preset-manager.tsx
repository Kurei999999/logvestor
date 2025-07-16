'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { GalleryFilterPreset } from '@/types/gallery';
import { galleryPresetService } from '@/lib/services/gallery-preset-service';
import { 
  Save, 
  FolderOpen, 
  Trash2, 
  Plus, 
  BookmarkPlus,
  X
} from 'lucide-react';

interface PresetManagerProps {
  currentFilter: {
    searchTerm: string;
    selectedTicker: string;
    selectedTags: string[];
    sortBy: 'date' | 'ticker';
    sortOrder: 'asc' | 'desc';
  };
  onLoadPreset: (preset: GalleryFilterPreset) => void;
  galleryNumber: number; // 1 or 2
  presets: GalleryFilterPreset[];
  onPresetsChange: () => void;
}

export function PresetManager({ 
  currentFilter, 
  onLoadPreset, 
  galleryNumber,
  presets,
  onPresetsChange
}: PresetManagerProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleSavePreset = async () => {
    if (!presetName.trim()) return;

    const newPreset: GalleryFilterPreset = {
      id: `preset_${Date.now()}`,
      name: presetName.trim(),
      searchTerm: currentFilter.searchTerm,
      selectedTicker: currentFilter.selectedTicker,
      selectedTags: currentFilter.selectedTags,
      sortBy: currentFilter.sortBy,
      sortOrder: currentFilter.sortOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const result = await galleryPresetService.savePreset(newPreset);
      if (result.success) {
        onPresetsChange();
        setPresetName('');
        setShowSaveDialog(false);
      }
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    try {
      const result = await galleryPresetService.deletePreset(presetId);
      if (result.success) {
        onPresetsChange();
      }
    } catch (error) {
      console.error('Failed to delete preset:', error);
    }
  };

  const handleLoadPreset = (preset: GalleryFilterPreset) => {
    onLoadPreset(preset);
    setShowLoadDialog(false);
  };

  const hasActiveFilter = 
    currentFilter.searchTerm || 
    currentFilter.selectedTicker !== 'all' || 
    currentFilter.selectedTags.length > 0 ||
    currentFilter.sortBy !== 'date' ||
    currentFilter.sortOrder !== 'desc';

  return (
    <div className="flex space-x-2">
      {/* Save Preset */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            disabled={!hasActiveFilter}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Enter preset name..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Current Filter Settings:</Label>
              <div className="text-sm text-gray-600 space-y-1">
                {currentFilter.searchTerm && (
                  <div>• Search: "{currentFilter.searchTerm}"</div>
                )}
                {currentFilter.selectedTicker !== 'all' && (
                  <div>• Ticker: {currentFilter.selectedTicker}</div>
                )}
                {currentFilter.selectedTags.length > 0 && (
                  <div>• Tags: {currentFilter.selectedTags.join(', ')}</div>
                )}
                <div>• Sort: {currentFilter.sortBy} ({currentFilter.sortOrder})</div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
              >
                Save Preset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Preset */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            disabled={presets.length === 0}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Load
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Load Filter Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {presets.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No presets saved yet
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {presets.map((preset) => (
                  <div 
                    key={preset.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{preset.name}</h3>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          {preset.searchTerm && (
                            <div>Search: "{preset.searchTerm}"</div>
                          )}
                          {preset.selectedTicker !== 'all' && (
                            <div>Ticker: {preset.selectedTicker}</div>
                          )}
                          {preset.selectedTags.length > 0 && (
                            <div className="flex items-center gap-1">
                              Tags: 
                              {preset.selectedTags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div>Sort: {preset.sortBy} ({preset.sortOrder})</div>
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          Created: {new Date(preset.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadPreset(preset)}
                        >
                          Load
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePreset(preset.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}