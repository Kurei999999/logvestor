'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { CSVParser } from '@/lib/parsers/csv-parser';
import { CSVMapper } from '@/lib/csv-mapper/csv-mapper';
import { CSVData, CSVMapping, CSVImportResult } from '@/types/csv';
import { Trade } from '@/types/trade';
import { LocalStorage } from '@/lib/file-system/storage';
import { FileUtils } from '@/lib/file-system/file-utils';

export function CSVImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [mapping, setMapping] = useState<CSVMapping | null>(null);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload');

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const selectedFile = files[0];
    if (!FileUtils.validateCSVFile(selectedFile)) {
      alert('Please select a valid CSV file');
      return;
    }

    setLoading(true);
    setFile(selectedFile);

    try {
      const data = await CSVParser.parseFile(selectedFile);
      setCsvData(data);
      
      // Create default mapping
      const defaultMapping = CSVMapper.createDefaultMapping();
      setMapping(defaultMapping);
      setStep('mapping');
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please check the format.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMappingChange = useCallback((field: string, value: string) => {
    if (!mapping) return;
    
    setMapping({
      ...mapping,
      columnMapping: {
        ...mapping.columnMapping,
        [field]: value
      }
    });
  }, [mapping]);

  const handlePreview = useCallback(() => {
    if (!csvData || !mapping) return;
    
    setLoading(true);
    
    try {
      const result = CSVMapper.mapCSVToTrades(csvData, mapping);
      setImportResult(result);
      setStep('preview');
    } catch (error) {
      console.error('Error mapping CSV:', error);
      alert('Error mapping CSV data. Please check your column mappings.');
    } finally {
      setLoading(false);
    }
  }, [csvData, mapping]);

  const handleImport = useCallback(() => {
    if (!importResult) return;
    
    setLoading(true);
    
    try {
      // Save trades to localStorage
      const existingTrades = LocalStorage.loadTrades();
      const allTrades = [...existingTrades, ...importResult.trades];
      LocalStorage.saveTrades(allTrades);
      
      // Save mapping for future use
      if (mapping) {
        LocalStorage.saveCSVMapping(mapping);
      }
      
      setStep('result');
    } catch (error) {
      console.error('Error importing trades:', error);
      alert('Error importing trades. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [importResult, mapping]);

  const handleReset = useCallback(() => {
    setFile(null);
    setCsvData(null);
    setMapping(null);
    setImportResult(null);
    setStep('upload');
  }, []);

  return (
    <div className="space-y-6">
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Select your trading data CSV file to begin the import process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">CSV files only</p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>
              
              {loading && (
                <div className="text-center">
                  <div className="text-sm text-gray-600">Parsing CSV file...</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'mapping' && csvData && mapping && (
        <Card>
          <CardHeader>
            <CardTitle>Column Mapping</CardTitle>
            <CardDescription>
              Map your CSV columns to the required trade data fields.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date-mapping">Date Column</Label>
                  <Select
                    value={mapping.columnMapping.date}
                    onValueChange={(value) => handleMappingChange('date', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select date column" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvData.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ticker-mapping">Ticker Column</Label>
                  <Select
                    value={mapping.columnMapping.ticker}
                    onValueChange={(value) => handleMappingChange('ticker', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ticker column" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvData.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="action-mapping">Action Column</Label>
                  <Select
                    value={mapping.columnMapping.action}
                    onValueChange={(value) => handleMappingChange('action', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action column" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvData.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity-mapping">Quantity Column</Label>
                  <Select
                    value={mapping.columnMapping.quantity}
                    onValueChange={(value) => handleMappingChange('quantity', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quantity column" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvData.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="price-mapping">Price Column</Label>
                  <Select
                    value={mapping.columnMapping.price}
                    onValueChange={(value) => handleMappingChange('price', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select price column" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvData.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">CSV Preview</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {csvData.headers.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.rows.slice(0, 3).map((row, index) => (
                      <TableRow key={index}>
                        {csvData.headers.map((header) => (
                          <TableCell key={header}>{row[header]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleReset}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handlePreview} disabled={loading}>
                  {loading ? 'Processing...' : 'Preview Import'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Preview</CardTitle>
            <CardDescription>
              Review the parsed data before importing to your trade journal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">
                    {importResult.imported} trades ready to import
                  </span>
                </div>
                {importResult.skipped > 0 && (
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm">
                      {importResult.skipped} rows skipped
                    </span>
                  </div>
                )}
                {importResult.errors.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <X className="w-5 h-5 text-red-500" />
                    <span className="text-sm">
                      {importResult.errors.length} errors found
                    </span>
                  </div>
                )}
              </div>

              {importResult.trades.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Preview of Imported Trades</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Ticker</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.trades.slice(0, 5).map((trade) => (
                        <TableRow key={trade.id}>
                          <TableCell>{trade.date}</TableCell>
                          <TableCell>{trade.ticker}</TableCell>
                          <TableCell className={trade.action === 'buy' ? 'text-green-600' : 'text-red-600'}>
                            {trade.action.toUpperCase()}
                          </TableCell>
                          <TableCell>{trade.quantity}</TableCell>
                          <TableCell>${trade.price.toFixed(2)}</TableCell>
                          <TableCell>
                            {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {importResult.trades.length > 5 && (
                    <p className="text-xs text-gray-500 mt-2">
                      ...and {importResult.trades.length - 5} more trades
                    </p>
                  )}
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-red-600">Errors</h4>
                  <div className="bg-red-50 p-3 rounded-md">
                    {importResult.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm text-red-700">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Back to Mapping
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={loading || importResult.trades.length === 0}
                >
                  {loading ? 'Importing...' : `Import ${importResult.trades.length} Trades`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'result' && importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Complete</CardTitle>
            <CardDescription>
              Your trading data has been successfully imported.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <span className="text-lg font-medium">
                  Successfully imported {importResult.imported} trades
                </span>
              </div>
              
              <div className="flex space-x-4">
                <Button asChild>
                  <a href="/trades">View Trades</a>
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Import More Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}