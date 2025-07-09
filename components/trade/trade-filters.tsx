'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { TradeFilters as ITradeFilters } from '@/types/app';
import { FilterPresets } from './filter-presets';

interface TradeFiltersProps {
  filters: ITradeFilters;
  onFiltersChange: (filters: ITradeFilters) => void;
  availableTickers: string[];
}

export function TradeFilters({ filters, onFiltersChange, availableTickers }: TradeFiltersProps) {
  const [newTicker, setNewTicker] = useState('');

  const updateFilters = (updates: Partial<ITradeFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const addTicker = () => {
    if (newTicker && !filters.tickers?.includes(newTicker)) {
      updateFilters({
        tickers: [...(filters.tickers || []), newTicker]
      });
      setNewTicker('');
    }
  };

  const removeTicker = (ticker: string) => {
    updateFilters({
      tickers: filters.tickers?.filter(t => t !== ticker) || []
    });
  };

  const addAction = (action: 'buy' | 'sell') => {
    if (!filters.actions?.includes(action)) {
      updateFilters({
        actions: [...(filters.actions || []), action]
      });
    }
  };

  const removeAction = (action: 'buy' | 'sell') => {
    updateFilters({
      actions: filters.actions?.filter(a => a !== action) || []
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Filters</CardTitle>
        <CardDescription>
          Narrow down your trade results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="flex space-x-2">
              <Input
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => updateFilters({
                  dateRange: {
                    start: e.target.value,
                    end: filters.dateRange?.end || ''
                  }
                })}
                placeholder="Start date"
              />
              <Input
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => updateFilters({
                  dateRange: {
                    start: filters.dateRange?.start || '',
                    end: e.target.value
                  }
                })}
                placeholder="End date"
              />
            </div>
          </div>

          {/* P&L Range */}
          <div className="space-y-2">
            <Label>P&L Range</Label>
            <div className="flex space-x-2">
              <Input
                type="number"
                value={filters.pnlRange?.min || ''}
                onChange={(e) => updateFilters({
                  pnlRange: {
                    min: parseFloat(e.target.value) || 0,
                    max: filters.pnlRange?.max || 0
                  }
                })}
                placeholder="Min P&L"
              />
              <Input
                type="number"
                value={filters.pnlRange?.max || ''}
                onChange={(e) => updateFilters({
                  pnlRange: {
                    min: filters.pnlRange?.min || 0,
                    max: parseFloat(e.target.value) || 0
                  }
                })}
                placeholder="Max P&L"
              />
            </div>
          </div>

          {/* Quantity Range */}
          <div className="space-y-2">
            <Label>Quantity Range</Label>
            <div className="flex space-x-2">
              <Input
                type="number"
                value={filters.quantityRange?.min || ''}
                onChange={(e) => updateFilters({
                  quantityRange: {
                    min: parseFloat(e.target.value) || 0,
                    max: filters.quantityRange?.max || 0
                  }
                })}
                placeholder="Min Quantity"
              />
              <Input
                type="number"
                value={filters.quantityRange?.max || ''}
                onChange={(e) => updateFilters({
                  quantityRange: {
                    min: filters.quantityRange?.min || 0,
                    max: parseFloat(e.target.value) || 0
                  }
                })}
                placeholder="Max Quantity"
              />
            </div>
          </div>

          {/* P&L Category */}
          <div className="space-y-2">
            <Label>P&L Category</Label>
            <Select
              value={filters.pnlCategory || 'all'}
              onValueChange={(value: 'profitable' | 'loss' | 'breakeven' | 'all') => {
                updateFilters({ pnlCategory: value === 'all' ? undefined : value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All trades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All trades</SelectItem>
                <SelectItem value="profitable">Profitable</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
                <SelectItem value="breakeven">Break-even</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tickers */}
        <div className="space-y-2">
          <Label>Tickers</Label>
          <div className="flex space-x-2">
            <Select value={newTicker} onValueChange={setNewTicker}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select ticker" />
              </SelectTrigger>
              <SelectContent>
                {availableTickers.map(ticker => (
                  <SelectItem key={ticker} value={ticker}>
                    {ticker}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addTicker} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {filters.tickers && filters.tickers.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {filters.tickers.map(ticker => (
                <Badge key={ticker} variant="secondary" className="cursor-pointer">
                  {ticker}
                  <X 
                    className="w-3 h-3 ml-1" 
                    onClick={() => removeTicker(ticker)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Label>Actions</Label>
          <div className="flex space-x-2">
            <Button
              variant={filters.actions?.includes('buy') ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (filters.actions?.includes('buy')) {
                  removeAction('buy');
                } else {
                  addAction('buy');
                }
              }}
            >
              Buy
            </Button>
            <Button
              variant={filters.actions?.includes('sell') ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (filters.actions?.includes('sell')) {
                  removeAction('sell');
                } else {
                  addAction('sell');
                }
              }}
            >
              Sell
            </Button>
          </div>
        </div>

        {/* Notes Filter */}
        <div className="space-y-2">
          <Label>Notes</Label>
          <Select
            value={filters.hasNotes?.toString() || 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                updateFilters({ hasNotes: undefined });
              } else {
                updateFilters({ hasNotes: value === 'true' });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All trades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All trades</SelectItem>
              <SelectItem value="true">With notes</SelectItem>
              <SelectItem value="false">Without notes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <FilterPresets 
              currentFilters={filters} 
              onApplyPreset={onFiltersChange}
            />
          </div>
          <div className="text-sm text-gray-600">
            {Object.keys(filters).length} filter(s) applied
          </div>
        </div>
      </CardContent>
    </Card>
  );
}