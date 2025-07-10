'use client';

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { CSVDocument, CSVRecord } from '@/types/csv-viewer';

interface CSVTableProps {
  document: CSVDocument;
  onUpdateCell: (recordId: string, columnName: string, value: any) => void;
  onAddRow: () => void;
  onDeleteRow: (recordId: string) => void;
  onAddColumn: (columnName: string) => void;
  onDeleteColumn: (columnName: string) => void;
  editable?: boolean;
}

export function CSVTable({ 
  document, 
  onUpdateCell, 
  onAddRow, 
  onDeleteRow, 
  onAddColumn, 
  onDeleteColumn,
  editable = true 
}: CSVTableProps) {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingCell, setEditingCell] = useState<{ recordId: string; columnName: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [newColumnName, setNewColumnName] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);

  const sortedRecords = useMemo(() => {
    if (!sortBy) return document.records;

    return [...document.records].sort((a, b) => {
      const aValue = a.rowData[sortBy];
      const bValue = b.rowData[sortBy];

      if (aValue === bValue) return 0;

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    });
  }, [document.records, sortBy, sortOrder]);

  const handleSort = (columnName: string) => {
    if (sortBy === columnName) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnName);
      setSortOrder('asc');
    }
  };

  const handleCellClick = (recordId: string, columnName: string, currentValue: any) => {
    if (!editable) return;
    
    setEditingCell({ recordId, columnName });
    setEditValue(currentValue?.toString() || '');
  };

  const handleCellSave = () => {
    if (!editingCell) return;

    const { recordId, columnName } = editingCell;
    onUpdateCell(recordId, columnName, editValue);
    setEditingCell(null);
    setEditValue('');
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      onAddColumn(newColumnName.trim());
      setNewColumnName('');
      setShowAddColumn(false);
    }
  };

  const renderSortIcon = (columnName: string) => {
    if (sortBy !== columnName) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="w-4 h-4 ml-1" /> : 
      <ChevronDown className="w-4 h-4 ml-1" />;
  };

  return (
    <div className="space-y-4">
      {editable && (
        <div className="flex items-center gap-2">
          <Button onClick={onAddRow} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Row
          </Button>
          
          {showAddColumn ? (
            <div className="flex items-center gap-2">
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Column name"
                className="w-32"
                onKeyPress={(e) => e.key === 'Enter' && handleAddColumn()}
              />
              <Button onClick={handleAddColumn} size="sm">
                Add
              </Button>
              <Button onClick={() => setShowAddColumn(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={() => setShowAddColumn(true)} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Column
            </Button>
          )}
        </div>
      )}

      <div className="rounded-md border overflow-auto max-h-96">
        <Table>
          <TableHeader>
            <TableRow>
              {editable && <TableHead className="w-12"></TableHead>}
              {document.headers.map((header) => (
                <TableHead 
                  key={header} 
                  className="cursor-pointer hover:bg-gray-50 min-w-32"
                  onClick={() => handleSort(header)}
                >
                  <div className="flex items-center justify-between">
                    <span>{header}</span>
                    <div className="flex items-center">
                      {renderSortIcon(header)}
                      {editable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteColumn(header);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRecords.map((record) => (
              <TableRow key={record.id}>
                {editable && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => onDeleteRow(record.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </TableCell>
                )}
                {document.headers.map((header) => (
                  <TableCell 
                    key={header} 
                    className={editable ? "cursor-pointer hover:bg-gray-50" : ""}
                    onClick={() => handleCellClick(record.id, header, record.rowData[header])}
                  >
                    {editingCell?.recordId === record.id && editingCell?.columnName === header ? (
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
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm">
                        {record.rowData[header]?.toString() || ''}
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {document.records.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No data available
        </div>
      )}
    </div>
  );
}