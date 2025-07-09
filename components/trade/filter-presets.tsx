'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FilterPreset, TradeFilters } from '@/types/app';
import { FilterPresetsManager } from '@/lib/trade-filters/filter-presets';
import { Save, Bookmark, ChevronDown, Trash2, Edit } from 'lucide-react';

interface FilterPresetsProps {
  currentFilters: TradeFilters;
  onApplyPreset: (filters: TradeFilters) => void;
}

export function FilterPresets({ currentFilters, onApplyPreset }: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = () => {
    const loaded = FilterPresetsManager.loadPresets();
    if (loaded.length === 0) {
      // Initialize with default presets on first load
      const defaults = FilterPresetsManager.getDefaultPresets();
      defaults.forEach(preset => FilterPresetsManager.addPreset(preset));
      setPresets(defaults);
    } else {
      setPresets(loaded);
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;

    const preset = FilterPresetsManager.createPreset(
      presetName,
      presetDescription,
      currentFilters
    );

    FilterPresetsManager.addPreset(preset);
    loadPresets();
    setShowSaveDialog(false);
    setPresetName('');
    setPresetDescription('');
  };

  const handleDeletePreset = (id: string) => {
    if (id.startsWith('default-')) {
      alert('Cannot delete default presets');
      return;
    }

    if (confirm('Are you sure you want to delete this preset?')) {
      FilterPresetsManager.deletePreset(id);
      loadPresets();
    }
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    onApplyPreset(preset.filters);
  };

  const hasActiveFilters = Object.keys(currentFilters).length > 0;

  return (
    <div className="flex items-center space-x-2">
      {/* Presets Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Bookmark className="w-4 h-4 mr-2" />
            Presets
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          {presets.length === 0 ? (
            <DropdownMenuItem disabled>No presets saved</DropdownMenuItem>
          ) : (
            presets.map((preset) => (
              <DropdownMenuItem 
                key={preset.id} 
                className="flex items-center justify-between"
              >
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => handleApplyPreset(preset)}
                >
                  <div className="font-medium">{preset.name}</div>
                  {preset.description && (
                    <div className="text-xs text-gray-500">{preset.description}</div>
                  )}
                </div>
                {!preset.id.startsWith('default-') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePreset(preset.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </DropdownMenuItem>
            ))
          )}
          {presets.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={() => setShowSaveDialog(true)}>
            <Save className="w-4 h-4 mr-2" />
            Save current filters
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save Preset Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
            <DialogDescription>
              Save the current filter configuration as a preset for quick access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., High Volume Trades"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preset-description">Description (optional)</Label>
              <Input
                id="preset-description"
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                placeholder="e.g., Shows trades with volume > 1000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePreset} 
              disabled={!presetName.trim() || !hasActiveFilters}
            >
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}