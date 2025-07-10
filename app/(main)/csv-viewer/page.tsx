'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, Trash2, Eye, Edit3, Plus, Search } from 'lucide-react';
import { CSVDocument } from '@/types/csv-viewer';
import { CSVStorage } from '@/lib/file-system/csv-storage';
import { CSVViewer } from '@/components/csv-viewer/csv-viewer';
import Link from 'next/link';

export default function CSVViewerPage() {
  const [documents, setDocuments] = useState<CSVDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<CSVDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = () => {
    const docs = CSVStorage.loadDocuments();
    setDocuments(docs);
  };

  const handleDeleteDocument = (documentId: string) => {
    CSVStorage.deleteDocument(documentId);
    loadDocuments();
    
    if (selectedDocument?.id === documentId) {
      setSelectedDocument(null);
    }
  };

  const handleDocumentSelect = (document: CSVDocument) => {
    setSelectedDocument(document);
    setShowUploader(false);
  };

  const handleUploadComplete = (document: CSVDocument) => {
    loadDocuments();
    setSelectedDocument(document);
    setShowUploader(false);
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.headers.some(header => header.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const storageInfo = CSVStorage.getStorageInfo();

  if (selectedDocument) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CSV Viewer</h1>
            <p className="text-gray-600 mt-2">
              View and edit CSV data without complex mapping
            </p>
          </div>
          <Button onClick={() => setSelectedDocument(null)} variant="outline">
            Back to Documents
          </Button>
        </div>

        <CSVViewer documentId={selectedDocument.id} mode="edit" />
      </div>
    );
  }

  if (showUploader) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Upload CSV File</h1>
            <p className="text-gray-600 mt-2">
              Upload a new CSV file to view and edit
            </p>
          </div>
          <Button onClick={() => setShowUploader(false)} variant="outline">
            Back to Documents
          </Button>
        </div>

        <CSVViewer onUploadComplete={handleUploadComplete} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CSV Viewer</h1>
          <p className="text-gray-600 mt-2">
            View and edit CSV data without complex mapping
          </p>
        </div>
        <Button onClick={() => setShowUploader(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Upload CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.reduce((sum, doc) => sum + doc.records.length, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(storageInfo.used / 1024 / 1024).toFixed(1)} MB
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {storageInfo.percentage.toFixed(1)}% of limit
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Space</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(storageInfo.available / 1024 / 1024).toFixed(1)} MB
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV Documents</CardTitle>
          <CardDescription>
            Manage your uploaded CSV files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {documents.length === 0 ? 'No CSV documents uploaded yet' : 'No documents match your search'}
                </p>
                <Button onClick={() => setShowUploader(true)} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Your First CSV
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredDocuments.map((document) => (
                  <Card key={document.id} className="cursor-pointer hover:bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-8 h-8 text-blue-500" />
                          <div>
                            <h3 className="font-medium text-lg">{document.name}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
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
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => handleDocumentSelect(document)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteDocument(document.id)}
                            variant="outline"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}