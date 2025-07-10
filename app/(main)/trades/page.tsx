'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { useTradeData } from '@/lib/hooks/use-trade-data';
import { Plus, Search, Filter, Edit3, FileText, TrendingUp, TrendingDown, Calendar, DollarSign, PenTool, MoreHorizontal, Loader2 } from 'lucide-react';
import { MarkdownSideEditorV2 as MarkdownSideEditor } from '@/components/markdown/markdown-side-editor-v2';
import Link from 'next/link';

export default function TradesPage() {
  // Use the new unified trade data hook
  const {
    trades,
    loading,
    error,
    addTrade,
    updateTrade,
    deleteTrade,
    bulkDeleteTrades,
    refreshTrades,
    exportTrades,
    stats
  } = useTradeData();

  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [filters, setFilters] = useState<ITradeFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'ticker' | 'pnl' | 'quantity' | 'price' | 'commission'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'csv'>('table');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [selectedMemoFile, setSelectedMemoFile] = useState<string | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [showMarkdownEditor, setShowMarkdownEditor] = useState(false);
  const [memoRefreshTrigger, setMemoRefreshTrigger] = useState(0);

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

  const handleDeleteTrade = async (tradeId: string) => {
    const success = await deleteTrade(tradeId, false); // Don't delete folder by default
    if (!success) {
      alert('Failed to delete trade. Please try again.');
    }
  };

  const handleBulkDelete = async (tradeIds: string[]) => {
    const success = await bulkDeleteTrades(tradeIds, false); // Don't delete folders by default
    if (!success) {
      alert('Failed to delete trades. Please try again.');
    }
  };

  const handleExportTrades = async (tradeIds: string[]) => {
    const csv = await exportTrades(tradeIds);
    if (csv) {
      downloadCSV(csv, `trades-export-${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      alert('Failed to export trades. Please try again.');
    }
  };

  const handleUpdateTrade = async (tradeId: string, field: string, value: any) => {
    const updates = { [field]: value };
    const success = await updateTrade(tradeId, updates);
    if (!success) {
      alert('Failed to update trade. Please try again.');
    }
  };

  // CSV Table handlers
  const handleCSVUpdateCell = async (recordId: string, columnName: string, value: any) => {
    const updates = { [columnName]: value };
    await handleUpdateTrade(recordId, columnName, value);
  };

  const handleCSVAddRow = async () => {
    const newTrade = {
      buyDate: new Date().toISOString().split('T')[0],
      ticker: '',
      quantity: 0,
      buyPrice: 0,
      tags: [],
      notesFiles: []
    };

    const result = await addTrade(newTrade);
    if (!result) {
      alert('Failed to add new trade. Please try again.');
    }
  };

  const handleCSVDeleteRow = async (recordId: string) => {
    await handleDeleteTrade(recordId);
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

  // Use stats from the hook, but apply to filtered trades for display
  const totalPnL = filteredTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const totalTrades = filteredTrades.length;
  const winningTrades = filteredTrades.filter(trade => (trade.pnl || 0) > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : '0';

  const handleQuickMemo = (trade: Trade) => {
    setSelectedTrade(trade);
    setSelectedMemoFile(null);
    setSelectedFolderPath(null); // Will trigger auto-creation of new folder
    setShowMarkdownEditor(true);
  };

  const handleOpenMemo = (trade: Trade, memoFile: string, folderPath: string) => {
    setSelectedTrade(trade);
    setSelectedMemoFile(memoFile);
    setSelectedFolderPath(folderPath);
    setShowMarkdownEditor(true);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading trades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <p className="text-red-800 text-sm">
            Error: {error}. Using local data as fallback.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Trade Journal</h1>
            <p className="text-gray-600 text-sm mt-1">
              {totalTrades} trades • {winRate}% win rate • ${totalPnL.toFixed(2)} total P&L
              {error && <span className="ml-2 text-orange-600">(Local data)</span>}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
              <Button
                variant={viewMode === 'csv' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('csv')}
              >
                CSV
              </Button>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Trade
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search trades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-0 bg-gray-50 focus:bg-white"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value: 'date' | 'ticker' | 'pnl' | 'quantity' | 'price' | 'commission') => setSortBy(value)}>
            <SelectTrigger className="w-32 border-0 bg-gray-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="ticker">Ticker</SelectItem>
              <SelectItem value="pnl">P&L</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="border-0 bg-gray-50"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <TradeFilters 
              filters={filters} 
              onFiltersChange={handleFilterChange}
              availableTickers={[...new Set(trades.map(t => t.ticker))]}
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        {viewMode === 'table' ? (
          <div className="bg-white rounded-lg border border-gray-200">
            <TradesList 
              trades={filteredTrades} 
              onDeleteTrade={handleDeleteTrade}
              onBulkDelete={handleBulkDelete}
              onExportTrades={handleExportTrades}
              onUpdateTrade={handleUpdateTrade}
              onQuickMemo={handleQuickMemo}
              onOpenMemo={handleOpenMemo}
              memoRefreshTrigger={memoRefreshTrigger}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200">
            <CSVTable
              document={tradesToCSVDocument(filteredTrades || [])}
              onUpdateCell={handleCSVUpdateCell}
              onAddRow={handleCSVAddRow}
              onDeleteRow={handleCSVDeleteRow}
              onAddColumn={handleCSVAddColumn}
              onDeleteColumn={handleCSVDeleteColumn}
              editable={true}
            />
          </div>
        )}
      </div>

      {/* Markdown Editor Side Panel */}
      {showMarkdownEditor && selectedTrade && (
        <MarkdownSideEditor
          trade={selectedTrade}
          memoFile={selectedMemoFile}
          folderPath={selectedFolderPath}
          onClose={() => {
            setShowMarkdownEditor(false);
            setSelectedTrade(null);
            setSelectedMemoFile(null);
            setSelectedFolderPath(null);
          }}
          onSave={async () => {
            // Refresh trades to update notes files from central CSV
            await refreshTrades();
            
            // Trigger memo dropdown refresh
            setMemoRefreshTrigger(prev => prev + 1);
            
            // Force re-render by resetting selection
            setShowMarkdownEditor(false);
            setSelectedTrade(null);
            setSelectedMemoFile(null);
          }}
        />
      )}
    </div>
  );
}