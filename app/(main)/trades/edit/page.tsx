'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download, Save, Search, FileText } from 'lucide-react';
import { Trade } from '@/types/trade';
import { LocalStorage } from '@/lib/file-system/storage';
import { TradesTable } from '@/components/trade/trades-table';
import Link from 'next/link';
import { generateId } from '@/lib/utils';

export default function TradesEditPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadTrades();
  }, []);

  useEffect(() => {
    // Filter trades based on search term
    if (searchTerm) {
      const filtered = trades.filter(trade => 
        trade.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        trade.buyDate.includes(searchTerm) ||
        trade.sellDate?.includes(searchTerm)
      );
      setFilteredTrades(filtered);
    } else {
      setFilteredTrades(trades);
    }
  }, [trades, searchTerm]);

  const loadTrades = () => {
    const loadedTrades = LocalStorage.loadTrades();
    setTrades(loadedTrades);
    setFilteredTrades(loadedTrades);
  };

  const handleUpdateTrade = (tradeId: string, field: string, value: any) => {
    const updatedTrades = trades.map(trade => {
      if (trade.id === tradeId) {
        const updatedTrade = { ...trade, [field]: value, updatedAt: new Date().toISOString() };
        
        // Auto-calculate P&L and holding days
        if (field === 'sellPrice' || field === 'buyPrice' || field === 'quantity') {
          if (updatedTrade.sellPrice && updatedTrade.buyPrice && updatedTrade.quantity) {
            updatedTrade.pnl = (updatedTrade.sellPrice - updatedTrade.buyPrice) * updatedTrade.quantity;
          }
        }
        
        if (field === 'sellDate' || field === 'buyDate') {
          if (updatedTrade.sellDate && updatedTrade.buyDate) {
            const buyDate = new Date(updatedTrade.buyDate);
            const sellDate = new Date(updatedTrade.sellDate);
            updatedTrade.holdingDays = Math.ceil((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
          }
        }
        
        return updatedTrade;
      }
      return trade;
    });
    
    setTrades(updatedTrades);
    setHasUnsavedChanges(true);
  };

  const handleAddRow = () => {
    const newTrade: Trade = {
      id: generateId(),
      ticker: '',
      buyDate: new Date().toISOString().split('T')[0],
      buyPrice: 0,
      quantity: 0,
      tags: [],
      notesFiles: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setTrades([...trades, newTrade]);
    setHasUnsavedChanges(true);
  };

  const handleDeleteRow = (tradeId: string) => {
    setTrades(trades.filter(trade => trade.id !== tradeId));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    LocalStorage.saveTrades(trades);
    setHasUnsavedChanges(false);
  };

  const handleExport = (format: 'csv' | 'json' = 'csv') => {
    if (format === 'csv') {
      const headers = ['ticker', 'buyDate', 'quantity', 'buyPrice', 'sellDate', 'sellPrice', 'pnl', 'holdingDays', 'commission', 'tags'];
      const csvContent = [
        headers.join(','),
        ...trades.map(trade => [
          trade.ticker,
          trade.buyDate,
          trade.quantity,
          trade.buyPrice,
          trade.sellDate || '',
          trade.sellPrice || '',
          trade.pnl || '',
          trade.holdingDays || '',
          trade.commission || '',
          (trade.tags || []).join(';')
        ].map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trades-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonContent = JSON.stringify(trades, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trades-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const totalPnL = filteredTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const openTrades = filteredTrades.filter(trade => !trade.sellDate).length;
  const closedTrades = filteredTrades.filter(trade => trade.sellDate).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/trades">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Trades
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Trades</h1>
            <p className="text-gray-600 mt-2">
              Edit your trades directly in the table
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="destructive">Unsaved Changes</Badge>
          )}
          <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTrades.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{openTrades}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Closed Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{closedTrades}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${totalPnL.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Trade Records
              </CardTitle>
              <CardDescription>
                Click any cell to edit. Changes are auto-saved when you click Save Changes.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => handleExport('json')} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search trades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <TradesTable
              trades={filteredTrades}
              onUpdateTrade={handleUpdateTrade}
              onAddRow={handleAddRow}
              onDeleteRow={handleDeleteRow}
              editable={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}