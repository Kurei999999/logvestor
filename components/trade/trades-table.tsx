'use client';

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Trade } from '@/types/trade';

interface TradesTableProps {
  trades: Trade[];
  onUpdateTrade: (tradeId: string, field: string, value: any) => void;
  onAddRow: () => void;
  onDeleteRow: (tradeId: string) => void;
  editable?: boolean;
}

export function TradesTable({ 
  trades, 
  onUpdateTrade, 
  onAddRow, 
  onDeleteRow,
  editable = true 
}: TradesTableProps) {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingCell, setEditingCell] = useState<{ tradeId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const columns = [
    { key: 'ticker', label: 'Ticker', type: 'text' },
    { key: 'buyDate', label: 'Buy Date', type: 'date' },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'buyPrice', label: 'Buy Price', type: 'number' },
    { key: 'sellDate', label: 'Sell Date', type: 'date' },
    { key: 'sellPrice', label: 'Sell Price', type: 'number' },
    { key: 'pnl', label: 'P&L', type: 'number', readonly: true },
    { key: 'holdingDays', label: 'Holding Days', type: 'number', readonly: true },
    { key: 'commission', label: 'Commission', type: 'number' },
    { key: 'tags', label: 'Tags', type: 'tags' }
  ];

  const sortedTrades = useMemo(() => {
    if (!sortBy) return trades;

    return [...trades].sort((a, b) => {
      const aValue = a[sortBy as keyof Trade];
      const bValue = b[sortBy as keyof Trade];

      if (aValue === bValue) return 0;

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    });
  }, [trades, sortBy, sortOrder]);

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
  };

  const handleCellClick = (tradeId: string, field: string, currentValue: any, readonly?: boolean) => {
    if (!editable || readonly) return;
    
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
    if (!editingCell) return;

    const { tradeId, field } = editingCell;
    const column = columns.find(col => col.key === field);
    
    let processedValue: any = editValue;

    // Process value based on type
    if (column?.type === 'number') {
      processedValue = editValue ? parseFloat(editValue) : undefined;
    } else if (column?.type === 'tags') {
      processedValue = editValue
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    } else if (column?.type === 'date') {
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

  const renderSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="w-4 h-4 ml-1" /> : 
      <ChevronDown className="w-4 h-4 ml-1" />;
  };

  const formatCellValue = (trade: Trade, column: any) => {
    const value = trade[column.key as keyof Trade];
    
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    switch (column.key) {
      case 'buyPrice':
      case 'sellPrice':
        return `$${(value as number).toFixed(2)}`;
      case 'pnl':
        const pnl = value as number;
        return (
          <span className={pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
            ${pnl.toFixed(2)}
          </span>
        );
      case 'commission':
        return `$${(value as number).toFixed(2)}`;
      case 'tags':
        return (
          <div className="flex flex-wrap gap-1">
            {(value as string[]).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        );
      default:
        return value.toString();
    }
  };

  return (
    <div className="space-y-4">
      {editable && (
        <div className="flex items-center gap-2">
          <Button onClick={onAddRow} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Trade
          </Button>
        </div>
      )}

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {editable && <TableHead className="w-12"></TableHead>}
              <TableHead className="w-20">Status</TableHead>
              {columns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className="cursor-pointer hover:bg-gray-50 min-w-32"
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center">
                    <span>{column.label}</span>
                    {renderSortIcon(column.key)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTrades.map((trade) => (
              <TableRow key={trade.id}>
                {editable && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => onDeleteRow(trade.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant={trade.sellDate ? 'default' : 'secondary'}>
                    {trade.sellDate ? 'CLOSED' : 'OPEN'}
                  </Badge>
                </TableCell>
                {columns.map((column) => (
                  <TableCell 
                    key={column.key} 
                    className={editable && !column.readonly ? "cursor-pointer hover:bg-gray-50" : ""}
                    onClick={() => handleCellClick(trade.id, column.key, trade[column.key as keyof Trade], column.readonly)}
                  >
                    {editingCell?.tradeId === trade.id && editingCell?.field === column.key ? (
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
                        type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
                        autoFocus
                      />
                    ) : (
                      <div className="text-sm">
                        {formatCellValue(trade, column)}
                      </div>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {trades.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No trades available. Click &quot;Add Trade&quot; to create your first trade.
        </div>
      )}
    </div>
  );
}