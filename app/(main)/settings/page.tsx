/**
 * Settings Page - Data Management and Migration Tools
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MigrationTool } from '@/components/migration/migration-tool';
import { MCPSetupGuide } from '@/components/setup/mcp-setup-guide';
import { 
  Settings, 
  Database, 
  FolderOpen, 
  Info,
  CheckCircle,
  AlertTriangle 
} from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileService, setFileService] = useState<any>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      if (typeof window === 'undefined' || !window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Get config
      const configResult = await window.electronAPI.config.loadConfig();
      let currentConfig = configResult.data;
      
      if (!currentConfig) {
        const defaultConfigResult = await window.electronAPI.config.getDefaultConfig();
        currentConfig = defaultConfigResult.data;
      }

      if (!currentConfig) {
        throw new Error('Failed to load configuration');
      }

      setConfig(currentConfig);

      // Create file service wrapper
      const service = {
        readDir: (path: string) => window.electronAPI.fs.readDir(path),
        readFile: (path: string) => window.electronAPI.fs.readFile(path),
        writeFile: (path: string, content: string) => window.electronAPI.fs.writeFile(path, content),
        createDir: (path: string) => window.electronAPI.fs.createDir(path),
        deleteDir: (path: string) => window.electronAPI.fs.deleteDir(path),
        exists: (path: string) => window.electronAPI.fs.exists(path)
      };

      setFileService(service);

    } catch (err) {
      console.error('Error loading config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      if (!config || !window.electronAPI) {
        return;
      }

      const result = await window.electronAPI.config.saveConfig(config);
      if (result.success) {
        alert('Configuration saved successfully');
      } else {
        alert('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Settings className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>Settings Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage application settings and configuration
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FolderOpen className="w-5 h-5" />
                  <span>Data Directory Settings</span>
                </CardTitle>
                <CardDescription>
                  Configure where your trade data is stored
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dataDirectory">Data Directory</Label>
                  <Input
                    id="dataDirectory"
                    value={config?.dataDirectory || ''}
                    onChange={(e) => handleConfigChange('dataDirectory', e.target.value)}
                    placeholder="~/TradeJournal"
                  />
                  <p className="text-sm text-gray-600">
                    Default location: {config?.dataDirectory || '~/TradeJournal'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="markdownEnabled">Markdown Features</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="markdownEnabled"
                      checked={config?.markdownEnabled || false}
                      onChange={(e) => handleConfigChange('markdownEnabled', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Enable markdown memo features</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoBackup">Auto Backup</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoBackup"
                      checked={config?.autoBackup || false}
                      onChange={(e) => handleConfigChange('autoBackup', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Automatically backup data</span>
                  </div>
                </div>

                <Button onClick={saveConfig}>
                  Save Configuration
                </Button>
              </CardContent>
            </Card>

            {config && (
              <MCPSetupGuide dataDirectory={config.dataDirectory} />
            )}

            {fileService && config && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="w-5 h-5" />
                    <span>Backup & Migration</span>
                  </CardTitle>
                  <CardDescription>
                    Data backup, migration, and validation tools
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MigrationTool 
                    dataDirectory={config.dataDirectory}
                    fileService={fileService}
                  />
                </CardContent>
              </Card>
            )}
      </div>
    </div>
  );
}