'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trade } from '@/types/trade';

interface TradeEditModalProps {
  trade: Trade;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTrade: Trade) => void;
}

export function TradeEditModal({ trade, isOpen, onClose, onSave }: TradeEditModalProps) {
  // console.log('TradeEditModal rendered:', { isOpen, trade: trade?.ticker });
  
  const [formData, setFormData] = useState<Trade>(() => ({
    ...trade,
    // Ensure dates are in YYYY-MM-DD format for input[type="date"]
    buyDate: trade.buyDate ? new Date(trade.buyDate).toISOString().split('T')[0] : '',
    sellDate: trade.sellDate ? new Date(trade.sellDate).toISOString().split('T')[0] : '',
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('TradeEditModal handleSubmit - formData:', formData);
    onSave(formData);
  };

  const handleChange = (field: keyof Trade, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Trade - {trade.ticker}</DialogTitle>
          <DialogDescription>
            Update the trade details below and click Save Changes to apply your modifications.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ticker">Ticker</Label>
              <Input
                id="ticker"
                value={formData.ticker}
                onChange={(e) => handleChange('ticker', e.target.value)}
                placeholder="AAPL"
                required
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
                min="0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buyDate">Buy Date</Label>
              <Input
                id="buyDate"
                type="date"
                value={formData.buyDate}
                onChange={(e) => handleChange('buyDate', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="buyPrice">Buy Price</Label>
              <Input
                id="buyPrice"
                type="number"
                step="0.01"
                value={formData.buyPrice}
                onChange={(e) => handleChange('buyPrice', parseFloat(e.target.value) || 0)}
                min="0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sellDate">Sell Date (Optional)</Label>
              <Input
                id="sellDate"
                type="date"
                value={formData.sellDate || ''}
                onChange={(e) => handleChange('sellDate', e.target.value || undefined)}
              />
            </div>
            <div>
              <Label htmlFor="sellPrice">Sell Price (Optional)</Label>
              <Input
                id="sellPrice"
                type="number"
                step="0.01"
                value={formData.sellPrice || ''}
                onChange={(e) => handleChange('sellPrice', parseFloat(e.target.value) || undefined)}
                min="0"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="commission">Commission (Optional)</Label>
            <Input
              id="commission"
              type="number"
              step="0.01"
              value={formData.commission || ''}
              onChange={(e) => handleChange('commission', parseFloat(e.target.value) || undefined)}
              min="0"
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}