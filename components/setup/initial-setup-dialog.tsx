'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderOpen, HardDrive, AlertTriangle, CheckCircle } from 'lucide-react';

interface InitialSetupDialogProps {
  isOpen: boolean;
  onComplete: (dataDirectory: string) => void;
  onCancel?: () => void;
  defaultDirectory: string;
}

export function InitialSetupDialog({
  isOpen,
  onComplete,
  onCancel,
  defaultDirectory
}: InitialSetupDialogProps) {
  const [customDirectory, setCustomDirectory] = useState(defaultDirectory);
  const [useCustomPath, setUseCustomPath] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectCustomDirectory = async () => {
    if (window.electronAPI?.dialog) {
      try {
        const result = await window.electronAPI.dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select Parent Directory (TradeJournal folder will be created inside)',
          defaultPath: customDirectory
        });

        if (result.success && result.data && !result.data.canceled && result.data.filePaths.length > 0) {
          const selectedPath = result.data.filePaths[0];
          // Append TradeJournal to the selected directory
          const tradeJournalPath = `${selectedPath}/TradeJournal`;
          setCustomDirectory(tradeJournalPath);
        }
      } catch (error) {
        console.error('Error selecting directory:', error);
      }
    }
  };

  const handleProceed = async () => {
    setIsCreating(true);
    
    try {
      const targetDirectory = useCustomPath ? customDirectory : defaultDirectory;
      console.log('Setup: Target directory selected:', targetDirectory);
      
      // Check if directory exists
      if (window.electronAPI?.fs) {
        const exists = await window.electronAPI.fs.exists(targetDirectory);
        console.log('Setup: Directory exists check:', exists);
        
        if (!exists.success || !exists.data) {
          // Create the directory
          console.log('Setup: Creating target directory...');
          const createResult = await window.electronAPI.fs.createDir(targetDirectory);
          if (!createResult.success) {
            throw new Error(createResult.error || 'Failed to create directory');
          }
          console.log('Setup: Target directory created successfully');
        } else {
          console.log('Setup: Target directory already exists');
        }
      }
      
      console.log('Setup: Calling onComplete with directory:', targetDirectory);
      onComplete(targetDirectory);
    } catch (error) {
      console.error('Error creating directory:', error);
      // You might want to show an error message here
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-[90vw] md:w-[80vw]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HardDrive className="h-6 w-6 text-blue-600" />
            Trade Journal - Initial Setup
          </DialogTitle>
          <DialogDescription className="text-base">
            Welcome to Trade Journal! We need to set up a data directory to store your trading records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 px-1">
          {/* Default Directory Option */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="default-path"
                name="directory-option"
                checked={!useCustomPath}
                onChange={() => setUseCustomPath(false)}
                className="h-4 w-4 text-blue-600"
              />
              <Label htmlFor="default-path" className="text-base font-medium">
                Use recommended location (Recommended)
              </Label>
            </div>
            
            <Alert className="ml-6 border-blue-200 bg-blue-50">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <div className="space-y-2">
                  <p><strong>Location:</strong></p>
                  <p><code className="bg-gray-100 px-2 py-1 rounded text-xs break-all block">{defaultDirectory}</code></p>
                  <p>This location is easily accessible and follows system conventions for user data.</p>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          {/* Custom Directory Option */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="custom-path"
                name="directory-option"
                checked={useCustomPath}
                onChange={() => setUseCustomPath(true)}
                className="h-4 w-4 text-blue-600"
              />
              <Label htmlFor="custom-path" className="text-base font-medium">
                Choose custom location
              </Label>
            </div>
            
            {useCustomPath && (
              <div className="ml-6 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={customDirectory}
                    onChange={(e) => setCustomDirectory(e.target.value)}
                    placeholder="Enter custom directory path"
                    className="flex-1 min-w-0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSelectCustomDirectory}
                    className="whitespace-nowrap w-full sm:w-auto"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Select Parent Folder
                  </Button>
                </div>
                
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-sm">
                    <div className="space-y-2">
                      <p><strong>TradeJournal folder will be created at:</strong></p>
                      <p><code className="bg-gray-100 px-2 py-1 rounded text-xs break-all block">{customDirectory}</code></p>
                      <p>Click "Select Parent Folder" to choose where the TradeJournal folder should be created.</p>
                    </div>
                  </AlertDescription>
                </Alert>
                
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm">
                    Make sure you have write permissions to this location and that it's easily accessible.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          {/* Information about what will be created */}
          <Alert className="border-gray-200 bg-gray-50">
            <AlertDescription className="text-sm">
              <div className="space-y-3">
                <p><strong>What will be created:</strong></p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-2">
                  <div className="flex items-center gap-2">
                    <code className="bg-white px-2 py-1 rounded text-xs">trades/</code>
                    <span className="text-xs text-gray-600">Trading records by year</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-white px-2 py-1 rounded text-xs">trades.csv</code>
                    <span className="text-xs text-gray-600">Central database</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-white px-2 py-1 rounded text-xs">config.json</code>
                    <span className="text-xs text-gray-600">App settings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-white px-2 py-1 rounded text-xs">mappings.json</code>
                    <span className="text-xs text-gray-600">CSV import configs</span>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isCreating} className="w-full sm:w-auto">
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleProceed} 
            disabled={isCreating || (useCustomPath && !customDirectory.trim())}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            {isCreating ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Setting up...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Directory & Continue
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}