'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TradesList } from '@/components/trade/trades-list';
import { CSVTable } from '@/components/csv-viewer/csv-table';
import { tradesToCSVDocument, csvDocumentToTrades } from '@/lib/utils/trades-csv-converter';
import { TradeFilters } from '@/components/trade/trade-filters';
import { Trade } from '@/types/trade';
import { TradeFilters as ITradeFilters } from '@/types/app';
import { LocalStorage } from '@/lib/file-system/storage';
import { searchTrades } from '@/lib/utils/search';
import { debounce } from '@/lib/utils/debounce';
import { Plus, Search, Filter, Edit3 } from 'lucide-react';
import Link from 'next/link';

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [filters, setFilters] = useState<ITradeFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'ticker' | 'pnl' | 'quantity' | 'price' | 'commission'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'csv'>('csv');

  useEffect(() => {
    const loadedTrades = LocalStorage.loadTrades();
    setTrades(loadedTrades);
    setFilteredTrades(loadedTrades);
  }, []);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setDebouncedSearchTerm(value);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  useEffect(() => {
    let filtered = [...trades];

    // Apply search filter with full-text search
    if (debouncedSearchTerm) {
      filtered = searchTrades(filtered, debouncedSearchTerm);
    }

    // Apply filters
    if (filters.dateRange) {
      filtered = filtered.filter(trade => {
        const tradeDate = new Date(trade.buyDate);
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
      filtered = filtered.filter(trade => {
        // Map old action filter to new status logic
        // 'buy' filter -> show open trades (no sell date)
        // 'sell' filter -> show closed trades (has sell date)
        const hasOpenFilter = filters.actions!.includes('buy');
        const hasClosedFilter = filters.actions!.includes('sell');
        
        if (hasOpenFilter && hasClosedFilter) {
          return true; // Show all trades
        } else if (hasOpenFilter) {
          return !trade.sellDate; // Show only open trades
        } else if (hasClosedFilter) {
          return !!trade.sellDate; // Show only closed trades
        }
        return false;
      });
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

    if (filters.quantityRange) {
      filtered = filtered.filter(trade => {
        return trade.quantity >= filters.quantityRange!.min && 
               trade.quantity <= filters.quantityRange!.max;
      });
    }

    if (filters.pnlCategory && filters.pnlCategory !== 'all') {
      filtered = filtered.filter(trade => {
        const pnl = trade.pnl || 0;
        switch (filters.pnlCategory) {
          case 'profitable':
            return pnl > 0;
          case 'loss':
            return pnl < 0;
          case 'breakeven':
            return pnl === 0;
          default:
            return true;
        }
      });
    }

    if (filters.hasImages !== undefined) {
      // Placeholder for image filtering - will be implemented when image functionality is added
      // For now, this filter doesn't affect results
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.buyDate);
          bValue = new Date(b.buyDate);
          break;
        case 'ticker':
          aValue = a.ticker;
          bValue = b.ticker;
          break;
        case 'pnl':
          aValue = a.pnl || 0;
          bValue = b.pnl || 0;
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'price':
          aValue = a.buyPrice;
          bValue = b.buyPrice;
          break;
        case 'commission':
          aValue = a.commission || 0;
          bValue = b.commission || 0;
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredTrades(filtered);
  }, [trades, debouncedSearchTerm, filters, sortBy, sortOrder]);

  const handleFilterChange = (newFilters: ITradeFilters) => {
    setFilters(newFilters);
  };

  const handleDeleteTrade = (tradeId: string) => {
    const updatedTrades = trades.filter(trade => trade.id !== tradeId);
    setTrades(updatedTrades);
    LocalStorage.saveTrades(updatedTrades);
  };

  const handleBulkDelete = (tradeIds: string[]) => {
    const updatedTrades = trades.filter(trade => !tradeIds.includes(trade.id));
    setTrades(updatedTrades);
    LocalStorage.saveTrades(updatedTrades);
  };

  const handleExportTrades = (tradeIds: string[]) => {
    const tradesToExport = trades.filter(trade => tradeIds.includes(trade.id));
    const csv = convertTradesToCSV(tradesToExport);
    downloadCSV(csv, `trades-export-${new Date().toISOString().split('T')[0]}.csv`);
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
    LocalStorage.saveTrades(updatedTrades);
  };

  // CSV Table handlers
  const handleCSVUpdateCell = (recordId: string, columnName: string, value: any) => {
    const csvDocument = tradesToCSVDocument(filteredTrades || []);
    const updatedRecords = csvDocument.records.map(record => {
      if (record.id === recordId) {
        return {
          ...record,
          rowData: {
            ...record.rowData,
            [columnName]: value
          }
        };
      }
      return record;
    });

    const updatedDocument = {
      ...csvDocument,
      records: updatedRecords
    };

    const updatedTrades = csvDocumentToTrades(updatedDocument);
    
    // Update the main trades array
    const newTrades = trades.map(trade => {
      const updatedTrade = updatedTrades.find(t => t.id === trade.id);
      return updatedTrade || trade;
    });

    setTrades(newTrades);
    LocalStorage.saveTrades(newTrades);
  };

  const handleCSVAddRow = () => {
    const newTrade: Trade = {
      id: `trade-${Date.now()}`,
      buyDate: new Date().toISOString().split('T')[0],
      ticker: '',
      quantity: 0,
      buyPrice: 0,
      tags: [],
      notesFiles: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newTrades = [...trades, newTrade];
    setTrades(newTrades);
    LocalStorage.saveTrades(newTrades);
  };

  const handleCSVDeleteRow = (recordId: string) => {
    handleDeleteTrade(recordId);
  };

  const handleCSVAddColumn = (columnName: string) => {
    // For now, we'll keep the fixed column structure
    console.log('Add column not yet implemented:', columnName);
  };

  const handleCSVDeleteColumn = (columnName: string) => {
    // For now, we'll keep the fixed column structure
    console.log('Delete column not yet implemented:', columnName);
  };

  // Helper function to convert trades to CSV
  const convertTradesToCSV = (trades: Trade[]): string => {
    const headers = ['Buy Date', 'Sell Date', 'Ticker', 'Status', 'Quantity', 'Buy Price', 'Sell Price', 'P&L', 'Holding Days', 'Commission', 'Tags'];
    const rows = trades.map(trade => [
      trade.buyDate,
      trade.sellDate || '',
      trade.ticker,
      trade.sellDate ? 'CLOSED' : 'OPEN',
      trade.quantity.toString(),
      trade.buyPrice.toString(),
      trade.sellPrice?.toString() || '',
      (trade.pnl || 0).toString(),
      (trade.holdingDays || 0).toString(),
      (trade.commission || 0).toString(),
      (trade.tags || []).join(';')
    ]);
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  // Helper function to download CSV
  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div className="flex gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table View
            </Button>
            <Button
              variant={viewMode === 'csv' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('csv')}
            >
              CSV Editor
            </Button>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Trade
          </Button>
        </div>
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
              
              <Select value={sortBy} onValueChange={(value: 'date' | 'ticker' | 'pnl' | 'quantity' | 'price' | 'commission') => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="ticker">Ticker</SelectItem>
                  <SelectItem value="pnl">P&L</SelectItem>
                  <SelectItem value="quantity">Quantity</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="commission">Commission</SelectItem>
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

            {viewMode === 'table' ? (
              <TradesList 
                trades={filteredTrades} 
                onDeleteTrade={handleDeleteTrade}
                onBulkDelete={handleBulkDelete}
                onExportTrades={handleExportTrades}
                onUpdateTrade={handleUpdateTrade}
              />
            ) : (
              <CSVTable
                document={tradesToCSVDocument(filteredTrades || [])}
                onUpdateCell={handleCSVUpdateCell}
                onAddRow={handleCSVAddRow}
                onDeleteRow={handleCSVDeleteRow}
                onAddColumn={handleCSVAddColumn}
                onDeleteColumn={handleCSVDeleteColumn}
                editable={true}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}