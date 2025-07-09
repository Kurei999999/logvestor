'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TradesList } from '@/components/trade/trades-list';
import { TradeFilters } from '@/components/trade/trade-filters';
import { Trade } from '@/types/trade';
import { TradeFilters as ITradeFilters } from '@/types/app';
import { LocalStorage } from '@/lib/file-system/storage';
import { Plus, Search, Filter } from 'lucide-react';

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [filters, setFilters] = useState<ITradeFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'ticker' | 'pnl'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadedTrades = LocalStorage.loadTrades();
    setTrades(loadedTrades);
    setFilteredTrades(loadedTrades);
  }, []);

  useEffect(() => {
    let filtered = [...trades];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(trade => 
        trade.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trade.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply filters
    if (filters.dateRange) {
      filtered = filtered.filter(trade => {
        const tradeDate = new Date(trade.date);
        const startDate = new Date(filters.dateRange!.start);
        const endDate = new Date(filters.dateRange!.end);
        return tradeDate >= startDate && tradeDate <= endDate;
      });
    }

    if (filters.tickers && filters.tickers.length > 0) {
      filtered = filtered.filter(trade => 
        filters.tickers!.includes(trade.ticker)
      );
    }

    if (filters.actions && filters.actions.length > 0) {
      filtered = filtered.filter(trade => 
        filters.actions!.includes(trade.action)
      );
    }

    if (filters.hasNotes !== undefined) {
      filtered = filtered.filter(trade => 
        filters.hasNotes ? (trade.notesFiles || []).length > 0 : (trade.notesFiles || []).length === 0
      );
    }

    if (filters.pnlRange) {
      filtered = filtered.filter(trade => {
        const pnl = trade.pnl || 0;
        return pnl >= filters.pnlRange!.min && pnl <= filters.pnlRange!.max;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'ticker':
          aValue = a.ticker;
          bValue = b.ticker;
          break;
        case 'pnl':
          aValue = a.pnl || 0;
          bValue = b.pnl || 0;
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredTrades(filtered);
  }, [trades, searchTerm, filters, sortBy, sortOrder]);

  const handleFilterChange = (newFilters: ITradeFilters) => {
    setFilters(newFilters);
  };

  const handleDeleteTrade = (tradeId: string) => {
    const updatedTrades = trades.filter(trade => trade.id !== tradeId);
    setTrades(updatedTrades);
    LocalStorage.saveTrades(updatedTrades);
  };

  const totalPnL = filteredTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const totalTrades = filteredTrades.length;
  const winningTrades = filteredTrades.filter(trade => (trade.pnl || 0) > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trades</h1>
          <p className="text-gray-600 mt-2">
            Manage and analyze your trading records
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Trade
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrades}</div>
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Winning Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{winningTrades}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trade Records</CardTitle>
          <CardDescription>
            View and manage your trading history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search trades by ticker or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={sortBy} onValueChange={(value: 'date' | 'ticker' | 'pnl') => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="ticker">Ticker</SelectItem>
                  <SelectItem value="pnl">P&L</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>

            {showFilters && (
              <TradeFilters 
                filters={filters} 
                onFiltersChange={handleFilterChange}
                availableTickers={[...new Set(trades.map(t => t.ticker))]}
              />
            )}

            <TradesList 
              trades={filteredTrades} 
              onDeleteTrade={handleDeleteTrade}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}