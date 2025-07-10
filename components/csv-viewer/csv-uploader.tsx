'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { CSVParser } from '@/lib/parsers/csv-parser';
import { CSVStorage } from '@/lib/file-system/csv-storage';
import { CSVDocument } from '@/types/csv-viewer';
import { FileUtils } from '@/lib/file-system/file-utils';

interface CSVUploaderProps {
  onUploadComplete: (document: CSVDocument) => void;
  onError: (error: string) => void;
}

export function CSVUploader({ onUploadComplete, onError }: CSVUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!FileUtils.validateCSVFile(file)) {
      onError('Please select a valid CSV file');
      return;
    }

    setUploading(true);

    try {
      const csvData = await CSVParser.parseFile(file);
      const result = CSVStorage.createDocumentFromFile(file, csvData.headers, csvData.rows);

      if (result.success && result.document) {
        onUploadComplete(result.document);
      } else {
        onError(result.errors?.[0] || 'Failed to upload CSV file');
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      onError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete, onError]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    handleFileUpload(files[0]);
  }, [handleFileUpload]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;

    handleFileUpload(files[0]);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload CSV File</CardTitle>
        <CardDescription>
          Select a CSV file to view and edit in the table viewer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`
            flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer
            ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}
            ${uploading ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-100'}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <label htmlFor="csv-file-upload" className="flex flex-col items-center justify-center pt-5 pb-6 w-full h-full">
            <div className="flex flex-col items-center justify-center">
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-sm text-gray-600">Uploading and processing...</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">CSV files only</p>
                </>
              )}
            </div>
            <input
              id="csv-file-upload"
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <FileText className="w-4 h-4 mr-2" />
            <span>Supports CSV files with any column structure</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
            <span>No column mapping required</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
            <span>Files are stored locally in your browser</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}