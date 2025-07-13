'use client';

import { useState, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  FileText,
  Images,
  TrendingUp,
  TrendingDown,
  PenTool,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trade } from '@/types/trade';
import { formatDate, formatCurrency } from '@/lib/utils';
import { MarkdownEditorModal } from '@/components/markdown/markdown-editor-modal';
import { TradeNotesDropdown } from './trade-notes-dropdown';
import { TradeEditModal } from './trade-edit-modal';

interface TradesListProps {
  trades: Trade[];
  onDeleteTrade: (tradeId: string) => void;
  onBulkDelete?: (tradeIds: string[]) => void;
  onExportTrades?: (tradeIds: string[]) => void;
  onUpdateTrade?: (tradeId: string, field: string, value: any) => void;
  onQuickMemo?: (trade: Trade) => void;
  onOpenMemo?: (trade: Trade, memoFile: string, folderPath: string) => void;
  memoRefreshTrigger?: number; // External trigger to refresh memo dropdowns
}

export function TradesList({ trades, onDeleteTrade, onBulkDelete, onExportTrades, onUpdateTrade, onQuickMemo, onOpenMemo, memoRefreshTrigger }: TradesListProps) {
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [selectedTradeForEdit, setSelectedTradeForEdit] = useState<Trade | null>(null);
  const [selectedTradeForMemo, setSelectedTradeForMemo] = useState<Trade | null>(null);

  // console.log('TradesList render - selectedTradeForEdit:', selectedTradeForEdit?.ticker || 'null');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTrades(trades.map(t => t.id));
    } else {
      setSelectedTrades([]);
    }
  };

  const handleSelectTrade = (tradeId: string, checked: boolean) => {
    if (checked) {
      setSelectedTrades([...selectedTrades, tradeId]);
    } else {
      setSelectedTrades(selectedTrades.filter(id => id !== tradeId));
    }
  };

  const handleDeleteConfirm = (tradeId: string) => {
    if (confirm('Are you sure you want to delete this trade?')) {
      onDeleteTrade(tradeId);
    }
  };

  const handleEditTrade = useCallback((trade: Trade) => {
    console.log('handleEditTrade called with:', trade.ticker);
    setSelectedTradeForEdit(trade);
  }, []);

  const handleSaveEdit = useCallback((updatedTrade: Trade) => {
    console.log('Modal onSave called with:', updatedTrade);
    console.log('Original trade:', selectedTradeForEdit);
    console.log('onUpdateTrade function exists:', !!onUpdateTrade);
    
    if (onUpdateTrade && selectedTradeForEdit) {
      Object.keys(updatedTrade).forEach(key => {
        const newValue = updatedTrade[key as keyof Trade];
        const oldValue = selectedTradeForEdit[key as keyof Trade];
        
        // Special handling for date fields
        let shouldUpdate = false;
        if (key === 'buyDate' || key === 'sellDate') {
          const newDateStr = newValue ? new Date(newValue as string).toISOString().split('T')[0] : '';
          const oldDateStr = oldValue ? new Date(oldValue as string).toISOString().split('T')[0] : '';
          shouldUpdate = newDateStr !== oldDateStr;
        } else {
          shouldUpdate = key !== 'id' && newValue !== oldValue;
        }
        
        if (shouldUpdate) {
          console.log(`Updating ${key}: ${oldValue} -> ${newValue}`);
          onUpdateTrade(selectedTradeForEdit.id, key, newValue);
        }
      });
    }
    setSelectedTradeForEdit(null);
  }, [onUpdateTrade, selectedTradeForEdit]);

  const handleCloseEdit = useCallback(() => {
    setSelectedTradeForEdit(null);
  }, []);


  if (trades.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">
          <TrendingUp className="mx-auto h-12 w-12 mb-4" />
          <h3 className="text-lg font-medium">No trades found</h3>
          <p className="text-sm">Import your trading data to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedTrades.length === trades.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300"
                />
              </TableHead>
              <TableHead className="min-w-32 whitespace-nowrap">Buy Date</TableHead>
              <TableHead className="min-w-32 whitespace-nowrap">Sell Date</TableHead>
              <TableHead className="min-w-24 whitespace-nowrap">Ticker</TableHead>
              <TableHead className="min-w-24 whitespace-nowrap">Status</TableHead>
              <TableHead className="min-w-24 whitespace-nowrap">Quantity</TableHead>
              <TableHead className="min-w-32 whitespace-nowrap">Buy Price</TableHead>
              <TableHead className="min-w-32 whitespace-nowrap">Sell Price</TableHead>
              <TableHead className="min-w-24 whitespace-nowrap">P&L</TableHead>
              <TableHead className="min-w-32 whitespace-nowrap">Holding Days</TableHead>
              <TableHead className="min-w-24 whitespace-nowrap">Notes</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedTrades.includes(trade.id)}
                    onChange={(e) => handleSelectTrade(trade.id, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </TableCell>
                <TableCell className="min-w-32 whitespace-nowrap">
                  <span className="text-sm">{formatDate(trade.buyDate)}</span>
                </TableCell>
                <TableCell className="min-w-32 whitespace-nowrap">
                  {trade.sellDate ? (
                    <span className="text-sm text-gray-600">{formatDate(trade.sellDate)}</span>
                  ) : (
                    <span className="text-sm text-blue-600">-</span>
                  )}
                </TableCell>
                <TableCell className="min-w-24 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{trade.ticker}</span>
                  </div>
                </TableCell>
                <TableCell className="min-w-24 whitespace-nowrap">
                  <Badge 
                    variant={trade.sellDate ? 'default' : 'secondary'}
                    className={trade.sellDate ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                  >
                    {trade.sellDate ? (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    )}
                    {trade.sellDate ? 'CLOSED' : 'OPEN'}
                  </Badge>
                </TableCell>
                <TableCell className="min-w-24 whitespace-nowrap">
                  {trade.quantity.toLocaleString()}
                </TableCell>
                <TableCell className="min-w-32 whitespace-nowrap">
                  <span className="text-sm">{formatCurrency(trade.buyPrice)}</span>
                </TableCell>
                <TableCell className="min-w-32 whitespace-nowrap">
                  {trade.sellPrice ? (
                    <span className="text-sm">{formatCurrency(trade.sellPrice)}</span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="min-w-24 whitespace-nowrap">
                  {trade.pnl !== undefined ? (
                    <span className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(trade.pnl)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="min-w-32 whitespace-nowrap">
                  {trade.holdingDays !== undefined ? (
                    <span className="text-sm text-gray-700">
                      {trade.holdingDays} days
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="min-w-24 whitespace-nowrap">
                  <TradeNotesDropdown
                    trade={trade}
                    onOpenMemo={onOpenMemo}
                    onNewMemo={onQuickMemo}
                    refreshTrigger={memoRefreshTrigger}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditTrade(trade)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Trade
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedTradeForMemo(trade)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Create Memo
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Images className="mr-2 h-4 w-4" />
                        View Images
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteConfirm(trade.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedTrades.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-md">
          <span className="text-sm text-blue-700">
            {selectedTrades.length} trade(s) selected
          </span>
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                if (onExportTrades) {
                  onExportTrades(selectedTrades);
                }
              }}
            >
              Export
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedTrades.length} trades?`)) {
                  if (onBulkDelete) {
                    onBulkDelete(selectedTrades);
                  } else {
                    selectedTrades.forEach(tradeId => onDeleteTrade(tradeId));
                  }
                  setSelectedTrades([]);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Trade Edit Modal */}
      {selectedTradeForEdit && (
        <TradeEditModal
          trade={selectedTradeForEdit}
          isOpen={!!selectedTradeForEdit}
          onClose={handleCloseEdit}
          onSave={handleSaveEdit}
        />
      )}

      {/* Markdown Editor Modal */}
      {selectedTradeForMemo && (
        <MarkdownEditorModal
          trade={selectedTradeForMemo}
          isOpen={!!selectedTradeForMemo}
          onClose={() => setSelectedTradeForMemo(null)}
          templateType="custom"
          onSaved={() => setSelectedTradeForMemo(null)}
        />
      )}
    </div>
  );
}