/**
 * Migration Tool Component
 * Provides UI for data migration, validation, and cleanup operations
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Database, 
  FolderOpen, 
  Shield, 
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { DataMigrationService, MigrationResult, ValidationResult } from '@/lib/migration/data-migration-service';

interface MigrationToolProps {
  dataDirectory: string;
  fileService: any;
}

export function MigrationTool({ dataDirectory, fileService }: MigrationToolProps) {
  const [loading, setLoading] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
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

  const handleValidation = async () => {
    setLoading(true);
    setCurrentOperation('Validating data integrity...');
    setProgress(0);

    try {
      const result = await migrationService.validateDataIntegrity();
      setValidationResult(result);
      setProgress(100);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  const handleCleanup = async () => {
    setLoading(true);
    setCurrentOperation('Cleaning up and repairing data...');
    setProgress(0);

    try {
      const result = await migrationService.cleanupAndRepair();
      console.log('Cleanup result:', result);
      // Refresh validation after cleanup
      await handleValidation();
      setProgress(100);
    } catch (error) {
      console.error('Cleanup failed:', error);
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
          <h2 className="text-2xl font-bold">Data Migration & Maintenance</h2>
          <p className="text-gray-600">Migrate to new folder structure and maintain data integrity</p>
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

      <Tabs defaultValue="migration" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="migration">Migration</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="migration" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Data Integrity Validation</span>
              </CardTitle>
              <CardDescription>
                Check for data consistency and integrity issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleValidation} disabled={loading}>
                <Database className="w-4 h-4 mr-2" />
                Validate Data
              </Button>

              {validationResult && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    {validationResult.valid ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="font-medium">
                      {validationResult.valid ? 'Data is valid' : 'Issues found'}
                    </span>
                    <Badge variant={validationResult.valid ? 'default' : 'destructive'}>
                      {validationResult.totalTrades} trades
                    </Badge>
                  </div>

                  {!validationResult.valid && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">Missing Folders</div>
                        <div className="text-xl font-bold text-red-600">
                          {validationResult.missingFolders.length}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">Orphaned Folders</div>
                        <div className="text-xl font-bold text-yellow-600">
                          {validationResult.orphanedFolders.length}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">Duplicate IDs</div>
                        <div className="text-xl font-bold text-orange-600">
                          {validationResult.duplicateIds.length}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">Corrupted Records</div>
                        <div className="text-xl font-bold text-red-600">
                          {validationResult.corruptedRecords.length}
                        </div>
                      </div>
                    </div>
                  )}

                  {validationResult.suggestions.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <div className="font-medium">Suggestions:</div>
                          {validationResult.suggestions.map((suggestion, index) => (
                            <div key={index} className="text-sm">{suggestion}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trash2 className="w-5 h-5" />
                <span>Data Maintenance</span>
              </CardTitle>
              <CardDescription>
                Clean up and repair data integrity issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Button 
                  onClick={handleCleanup} 
                  disabled={loading}
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clean & Repair
                </Button>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Warning:</div>
                    <div className="text-sm">
                      This operation will remove duplicate records, create missing folders,
                      and clean up orphaned data. Make sure to create a backup first.
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}