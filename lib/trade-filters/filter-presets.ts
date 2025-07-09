import { FilterPreset, TradeFilters } from '@/types/app';
import { LocalStorage } from '@/lib/file-system/storage';

const FILTER_PRESETS_KEY = 'trade-filter-presets';

export class FilterPresetsManager {
  static loadPresets(): FilterPreset[] {
    try {
      const saved = localStorage.getItem(FILTER_PRESETS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading filter presets:', error);
      return [];
    }
  }

  static savePresets(presets: FilterPreset[]): void {
    try {
      localStorage.setItem(FILTER_PRESETS_KEY, JSON.stringify(presets));
    } catch (error) {
      console.error('Error saving filter presets:', error);
    }
  }

  static createPreset(name: string, description: string, filters: TradeFilters): FilterPreset {
    const now = new Date().toISOString();
    return {
      id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      filters,
      createdAt: now,
      updatedAt: now,
    };
  }

  static addPreset(preset: FilterPreset): void {
    const presets = this.loadPresets();
    presets.push(preset);
    this.savePresets(presets);
  }

  static updatePreset(id: string, updates: Partial<FilterPreset>): void {
    const presets = this.loadPresets();
    const index = presets.findIndex(p => p.id === id);
    if (index !== -1) {
      presets[index] = {
        ...presets[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.savePresets(presets);
    }
  }

  static deletePreset(id: string): void {
    const presets = this.loadPresets();
    const filtered = presets.filter(p => p.id !== id);
    this.savePresets(filtered);
  }

  static getPreset(id: string): FilterPreset | undefined {
    const presets = this.loadPresets();
    return presets.find(p => p.id === id);
  }

  // Default presets for common use cases
  static getDefaultPresets(): FilterPreset[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'default-profitable',
        name: 'Profitable Trades',
        description: 'Show only trades with positive P&L',
        filters: {
          pnlCategory: 'profitable',
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'default-losses',
        name: 'Loss Trades',
        description: 'Show only trades with negative P&L',
        filters: {
          pnlCategory: 'loss',
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'default-large-trades',
        name: 'Large Trades',
        description: 'Show trades with quantity > 100',
        filters: {
          quantityRange: {
            min: 100,
            max: Number.MAX_SAFE_INTEGER,
          },
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'default-recent',
        name: 'Recent Trades',
        description: 'Show trades from the last 30 days',
        filters: {
          dateRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0],
          },
        },
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}