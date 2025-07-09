'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  FileText,
  Images,
  TrendingUp,
  TrendingDown
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

interface TradesListProps {
  trades: Trade[];
  onDeleteTrade: (tradeId: string) => void;
}

export function TradesList({ trades, onDeleteTrade }: TradesListProps) {
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);

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
      <div className="rounded-md border">
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
              <TableHead>Date</TableHead>
              <TableHead>Ticker</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>P&L</TableHead>
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
                <TableCell className="font-medium">
                  {formatDate(trade.date)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{trade.ticker}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={trade.action === 'buy' ? 'default' : 'secondary'}
                    className={trade.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                  >
                    {trade.action === 'buy' ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {trade.action.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{trade.quantity.toLocaleString()}</TableCell>
                <TableCell>{formatCurrency(trade.price)}</TableCell>
                <TableCell>
                  {trade.commission ? formatCurrency(trade.commission) : '-'}
                </TableCell>
                <TableCell>
                  {trade.pnl ? (
                    <span className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(trade.pnl)}
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    {(trade.notesFiles || []).length > 0 && (
                      <div className="flex items-center space-x-1">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-600">
                          {trade.notesFiles!.length}
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(trade.tags || []).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
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
                      <DropdownMenuItem>
                        <FileText className="mr-2 h-4 w-4" />
                        Add Note
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
            <Button size="sm" variant="outline">
              Bulk Edit
            </Button>
            <Button size="sm" variant="outline">
              Export
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedTrades.length} trades?`)) {
                  selectedTrades.forEach(tradeId => onDeleteTrade(tradeId));
                  setSelectedTrades([]);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}