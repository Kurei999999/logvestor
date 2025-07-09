'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CSVImporter } from '@/components/csv-importer';
import { Upload, FileText, Settings } from 'lucide-react';

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<'csv' | 'mapping'>('csv');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import Data</h1>
        <p className="text-gray-600 mt-2">
          Import your trading data from CSV files and manage column mappings.
        </p>
      </div>

      <div className="flex space-x-4 border-b">
        <button
          onClick={() => setActiveTab('csv')}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'csv'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Upload className="inline-block w-4 h-4 mr-2" />
          CSV Import
        </button>
        <button
          onClick={() => setActiveTab('mapping')}
          className={`pb-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'mapping'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="inline-block w-4 h-4 mr-2" />
          Column Mapping
        </button>
      </div>

      {activeTab === 'csv' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CSV File Import</CardTitle>
              <CardDescription>
                Upload your trading data CSV file. The system will automatically detect columns and apply appropriate mappings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CSVImporter />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supported Formats</CardTitle>
              <CardDescription>
                Your CSV file should contain the following columns (names can be mapped):
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Required Columns:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Date (trade date)</li>
                    <li>• Ticker (stock symbol)</li>
                    <li>• Action (buy/sell)</li>
                    <li>• Quantity (number of shares)</li>
                    <li>• Price (per share)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Optional Columns:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Commission (trading fees)</li>
                    <li>• P&L (profit/loss)</li>
                    <li>• Notes (additional information)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle>Column Mapping Configuration</CardTitle>
            <CardDescription>
              Configure how your CSV columns map to trade data fields. This is useful if your CSV uses different column names.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              Column mapping configuration will be available after uploading a CSV file.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}