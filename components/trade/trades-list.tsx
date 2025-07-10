'use client';

import { useState } from 'react';
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
  const [editingCell, setEditingCell] = useState<{ tradeId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [selectedTradeForMemo, setSelectedTradeForMemo] = useState<Trade | null>(null);

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

  const handleCellDoubleClick = (tradeId: string, field: string, currentValue: any) => {
    if (!onUpdateTrade) return;
    
    setEditingCell({ tradeId, field });
    
    // Format value for editing
    if (field === 'tags') {
      setEditValue((currentValue as string[] || []).join(', '));
    } else if (currentValue !== null && currentValue !== undefined) {
      setEditValue(currentValue.toString());
    } else {
      setEditValue('');
    }
  };

  const handleCellSave = () => {
    if (!editingCell || !onUpdateTrade) return;

    const { tradeId, field } = editingCell;
    let processedValue: any = editValue;

    // Process value based on field type
    if (field === 'quantity' || field === 'buyPrice' || field === 'sellPrice' || field === 'commission') {
      processedValue = editValue ? parseFloat(editValue) : undefined;
    } else if (field === 'tags') {
      processedValue = editValue
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    } else if (field === 'buyDate' || field === 'sellDate') {
      processedValue = editValue || undefined;
    }

    onUpdateTrade(tradeId, field, processedValue);
    setEditingCell(null);
    setEditValue('');
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const renderEditableCell = (trade: Trade, field: string, currentValue: any, displayValue: React.ReactNode) => {
    const isEditing = editingCell?.tradeId === trade.id && editingCell?.field === field;
    
    if (isEditing) {
      return (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCellSave}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleCellSave();
            } else if (e.key === 'Escape') {
              handleCellCancel();
            }
          }}
          className="h-8 text-sm"
          type={
            field === 'quantity' || field === 'buyPrice' || field === 'sellPrice' || field === 'commission' 
              ? 'number' 
              : field === 'buyDate' || field === 'sellDate' 
                ? 'date' 
                : 'text'
          }
          autoFocus
        />
      );
    }
    
    return (
      <div 
        className={onUpdateTrade ? "cursor-pointer hover:bg-gray-50 p-1 rounded" : ""}
        onDoubleClick={() => handleCellDoubleClick(trade.id, field, currentValue)}
      >
        {displayValue}
      </div>
    );
  };

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
      {onUpdateTrade && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center space-x-2">
            <Edit className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">
              Inline editing enabled - Double-click any cell to edit
            </span>
          </div>
        </div>
      )}
      <div className="rounded-md border overflow-x-auto">
        <Table>
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
              <TableHead>Buy Date</TableHead>
              <TableHead>Sell Date</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Buy Price</TableHead>
              <TableHead>Sell Price</TableHead>
              <TableHead>P&L</TableHead>
              <TableHead>Holding Days</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Tags</TableHead>
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
                <TableCell>
                  {renderEditableCell(
                    trade,
                    'buyDate',
                    trade.buyDate,
                    <span className="text-sm">{formatDate(trade.buyDate)}</span>
                  )}
                </TableCell>
                <TableCell>
                  {renderEditableCell(
                    trade,
                    'sellDate',
                    trade.sellDate,
                    trade.sellDate ? (
                      <span className="text-sm text-gray-600">{formatDate(trade.sellDate)}</span>
                    ) : (
                      <span className="text-sm text-blue-600">-</span>
                    )
                  )}
                </TableCell>
                <TableCell>
                  {renderEditableCell(
                    trade,
                    'ticker',
                    trade.ticker,
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{trade.ticker}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
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
                <TableCell>
                  {renderEditableCell(
                    trade,
                    'quantity',
                    trade.quantity,
                    trade.quantity.toLocaleString()
                  )}
                </TableCell>
                <TableCell>
                  {renderEditableCell(
                    trade,
                    'buyPrice',
                    trade.buyPrice,
                    <span className="text-sm">{formatCurrency(trade.buyPrice)}</span>
                  )}
                </TableCell>
                <TableCell>
                  {renderEditableCell(
                    trade,
                    'sellPrice',
                    trade.sellPrice,
                    trade.sellPrice ? (
                      <span className="text-sm">{formatCurrency(trade.sellPrice)}</span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )
                  )}
                </TableCell>
                <TableCell>
                  {trade.pnl !== undefined ? (
                    <span className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(trade.pnl)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {trade.holdingDays !== undefined ? (
                    <span className="text-sm text-gray-700">
                      {trade.holdingDays} days
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {renderEditableCell(
                    trade,
                    'commission',
                    trade.commission,
                    trade.commission ? formatCurrency(trade.commission) : '-'
                  )}
                </TableCell>
                <TableCell>
                  <TradeNotesDropdown
                    trade={trade}
                    onOpenMemo={onOpenMemo}
                    onNewMemo={onQuickMemo}
                    refreshTrigger={memoRefreshTrigger}
                  />
                </TableCell>
                <TableCell>
                  {renderEditableCell(
                    trade,
                    'tags',
                    trade.tags,
                    <div className="flex flex-wrap gap-1">
                      {(trade.tags || []).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
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
                      <DropdownMenuItem>
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