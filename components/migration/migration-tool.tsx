/**
 * Migration Tool Component
 * Provides UI for data migration, validation, and cleanup operations
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Database, 
  FolderOpen, 
  Shield,
  Upload
} from 'lucide-react';
import { DataMigrationService, MigrationResult } from '@/lib/migration/data-migration-service';

interface MigrationToolProps {
  dataDirectory: string;
  fileService: any;
}

export function MigrationTool({ dataDirectory, fileService }: MigrationToolProps) {
  const [loading, setLoading] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState<string>('');

  const migrationService = new DataMigrationService({
    dataDirectory,
    fileService,
    dryRun: false
  });

  const dryRunService = new DataMigrationService({
    dataDirectory,
    fileService,
    dryRun: true
  });

  const handleDryRun = async () => {
    setLoading(true);
    setCurrentOperation('Running migration preview...');
    setProgress(0);

    try {
      const result = await dryRunService.migrateToNewStructure();
      setMigrationResult(result);
      setProgress(100);
    } catch (error) {
      console.error('Dry run failed:', error);
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  const handleMigration = async () => {
    setLoading(true);
    setCurrentOperation('Migrating data structure...');
    setProgress(0);

    try {
      const result = await migrationService.migrateToNewStructure();
      setMigrationResult(result);
      setProgress(100);
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };


  const handleBackup = async () => {
    setLoading(true);
    setCurrentOperation('Creating backup...');
    setProgress(0);

    try {
      const backupPath = await migrationService.createBackup();
      if (backupPath) {
        alert(`Backup created successfully at: ${backupPath}`);
      } else {
        alert('Backup creation failed');
      }
      setProgress(100);
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Backup creation failed');
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Data Migration & Backup</h2>
          <p className="text-gray-600">Migrate to new folder structure and create backups</p>
        </div>
        <Button onClick={handleBackup} variant="outline" disabled={loading}>
          <Shield className="w-4 h-4 mr-2" />
          Create Backup
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{currentOperation}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FolderOpen className="w-5 h-5" />
                <span>Folder Structure Migration</span>
              </CardTitle>
              <CardDescription>
                Migrate from old folder structures to the new date-based hierarchy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Button 
                  onClick={handleDryRun} 
                  variant="outline" 
                  disabled={loading}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Preview Migration
                </Button>
                <Button 
                  onClick={handleMigration} 
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Run Migration
                </Button>
              </div>

              {migrationResult && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    {migrationResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {migrationResult.success ? 'Migration Completed' : 'Migration Failed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">Migrated Folders</div>
                      <div className="text-2xl font-bold text-green-600">
                        {migrationResult.migratedFolders}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">Migrated Trades</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {migrationResult.migratedTrades}
                      </div>
                    </div>
                  </div>

                  {migrationResult.errors.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <div className="font-medium">Errors encountered:</div>
                          {migrationResult.errors.map((error, index) => (
                            <div key={index} className="text-sm">{error}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {migrationResult.warnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <div className="font-medium">Warnings:</div>
                          {migrationResult.warnings.map((warning, index) => (
                            <div key={index} className="text-sm">{warning}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {migrationResult.backupPath && (
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        Backup created at: {migrationResult.backupPath}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  );
}