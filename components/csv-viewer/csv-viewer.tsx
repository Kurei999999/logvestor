'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, FileText, Calendar, Edit3, Eye } from 'lucide-react';
import { CSVDocument } from '@/types/csv-viewer';
import { CSVStorage } from '@/lib/file-system/csv-storage';
import { CSVTable } from './csv-table';
import { CSVUploader } from './csv-uploader';

interface CSVViewerProps {
  documentId?: string;
  mode?: 'view' | 'edit';
  onUploadComplete?: (document: CSVDocument) => void;
}

export function CSVViewer({ documentId, mode = 'edit', onUploadComplete }: CSVViewerProps) {
  const [document, setDocument] = useState<CSVDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(!documentId);

  useEffect(() => {
    if (documentId) {
      loadDocument(documentId);
    }
  }, [documentId]);

  const loadDocument = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const doc = CSVStorage.getDocument(id);
      if (doc) {
        setDocument(doc);
        setShowUploader(false);
      } else {
        setError('Document not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (newDocument: CSVDocument) => {
    setDocument(newDocument);
    setShowUploader(false);
    setError(null);
    
    if (onUploadComplete) {
      onUploadComplete(newDocument);
    }
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleUpdateCell = (recordId: string, columnName: string, value: any) => {
    if (!document) return;

    try {
      CSVStorage.updateRecord(document.id, recordId, {
        rowData: {
          ...document.records.find(r => r.id === recordId)?.rowData,
          [columnName]: value
        }
      });

      // Reload document to get updated data
      loadDocument(document.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cell');
    }
  };

  const handleAddRow = () => {
    if (!document) return;

    try {
      const newRowData: Record<string, any> = {};
      document.headers.forEach(header => {
        newRowData[header] = '';
      });

      CSVStorage.addRecord(document.id, newRowData);
      loadDocument(document.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add row');
    }
  };

  const handleDeleteRow = (recordId: string) => {
    if (!document) return;

    try {
      CSVStorage.deleteRecord(document.id, recordId);
      loadDocument(document.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete row');
    }
  };

  const handleAddColumn = (columnName: string) => {
    if (!document) return;

    try {
      CSVStorage.addColumn(document.id, columnName);
      loadDocument(document.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add column');
    }
  };

  const handleDeleteColumn = (columnName: string) => {
    if (!document) return;

    try {
      CSVStorage.deleteColumn(document.id, columnName);
      loadDocument(document.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete column');
    }
  };

  const handleExport = (format: 'csv' | 'json' = 'csv') => {
    if (!document) return;

    try {
      const exportData = CSVStorage.exportDocument(document.id, format);
      const blob = new Blob([exportData], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${document.name}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export document');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (showUploader) {
    return (
      <CSVUploader
        onUploadComplete={handleUploadComplete}
        onError={handleUploadError}
      />
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <Button 
            onClick={() => setShowUploader(true)} 
            className="mt-4"
            variant="outline"
          >
            Upload New File
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!document) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            No document selected
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {document.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(document.createdAt).toLocaleDateString()}
                </span>
                <Badge variant="outline">
                  {document.records.length} rows
                </Badge>
                <Badge variant="outline">
                  {document.headers.length} columns
                </Badge>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {mode === 'edit' && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Mode</span>
                </div>
              )}
              {mode === 'view' && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Eye className="w-4 h-4" />
                  <span>View Mode</span>
                </div>
              )}
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
          <CSVTable
            document={document}
            onUpdateCell={handleUpdateCell}
            onAddRow={handleAddRow}
            onDeleteRow={handleDeleteRow}
            onAddColumn={handleAddColumn}
            onDeleteColumn={handleDeleteColumn}
            editable={mode === 'edit'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={() => setShowUploader(true)} variant="outline">
              Upload New File
            </Button>
            <Button 
              onClick={() => CSVStorage.deleteDocument(document.id)} 
              variant="destructive"
            >
              Delete Document
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}