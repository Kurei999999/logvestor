import { FileSystemAPI } from './filesystem-api';
import { PathManager } from './path-manager';

export interface BackupMetadata {
  id: string;
  timestamp: string;
  version: string;
  description?: string;
  fileCount: number;
  totalSize: number;
  checksums: Record<string, string>;
}

export interface BackupProgress {
  step: string;
  current: number;
  total: number;
  currentFile?: string;
  completed: boolean;
  error?: string;
}

export interface RestoreOptions {
  overwriteExisting: boolean;
  validateChecksums: boolean;
  createBackupBeforeRestore: boolean;
}

export class BackupManager {
  private static readonly BACKUP_VERSION = '1.0.0';
  private static readonly METADATA_FILENAME = 'backup-metadata.json';
  
  constructor(
    private fileSystem: FileSystemAPI,
    private pathManager: PathManager
  ) {}
  
  async createBackup(
    description?: string,
    onProgress?: (progress: BackupProgress) => void
  ): Promise<BackupMetadata> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${timestamp}`;
    
    this.reportProgress(onProgress, 'Initializing backup', 0, 1);
    
    try {
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        version: BackupManager.BACKUP_VERSION,
        description,
        fileCount: 0,
        totalSize: 0,
        checksums: {}
      };
      
      const backupPath = PathManager.join(this.pathManager.getBackupsPath(), backupId);
      await this.fileSystem.createDirectory(backupPath);
      
      const filesToBackup = await this.collectFilesToBackup();
      metadata.fileCount = filesToBackup.length;
      
      let currentFile = 0;
      
      for (const filePath of filesToBackup) {
        const fileName = PathManager.basename(filePath);
        this.reportProgress(onProgress, 'Backing up files', currentFile, filesToBackup.length, fileName);
        
        try {
          const content = await this.fileSystem.readFile(filePath);
          const backupFilePath = PathManager.join(backupPath, fileName);
          
          await this.fileSystem.writeFile(backupFilePath, content);
          
          metadata.totalSize += content.length;
          metadata.checksums[fileName] = await this.calculateChecksum(content);
          
        } catch (error) {
          console.warn(`Failed to backup file ${filePath}:`, error);
        }
        
        currentFile++;
      }
      
      const metadataPath = PathManager.join(backupPath, BackupManager.METADATA_FILENAME);
      await this.fileSystem.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
      this.reportProgress(onProgress, 'Backup completed', filesToBackup.length, filesToBackup.length, undefined, true);
      
      return metadata;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.reportProgress(onProgress, 'Backup failed', 0, 1, undefined, true, errorMessage);
      throw error;
    }
  }
  
  async restoreBackup(
    backupId: string,
    options: RestoreOptions = {
      overwriteExisting: false,
      validateChecksums: true,
      createBackupBeforeRestore: true
    },
    onProgress?: (progress: BackupProgress) => void
  ): Promise<void> {
    this.reportProgress(onProgress, 'Initializing restore', 0, 1);
    
    try {
      const backupPath = PathManager.join(this.pathManager.getBackupsPath(), backupId);
      const metadataPath = PathManager.join(backupPath, BackupManager.METADATA_FILENAME);
      
      if (!await this.fileSystem.exists(metadataPath)) {
        throw new Error(`Backup metadata not found: ${backupId}`);
      }
      
      const metadataContent = await this.fileSystem.readFile(metadataPath);
      const metadata: BackupMetadata = JSON.parse(metadataContent);
      
      if (options.createBackupBeforeRestore) {
        this.reportProgress(onProgress, 'Creating backup before restore', 0, 1);
        await this.createBackup(`Pre-restore backup for ${backupId}`);
      }
      
      const filesToRestore = await this.fileSystem.readDirectory(backupPath);
      const dataFiles = filesToRestore.filter(file => file !== BackupManager.METADATA_FILENAME);
      
      let currentFile = 0;
      
      for (const fileName of dataFiles) {
        this.reportProgress(onProgress, 'Restoring files', currentFile, dataFiles.length, fileName);
        
        try {
          const backupFilePath = PathManager.join(backupPath, fileName);
          const content = await this.fileSystem.readFile(backupFilePath);
          
          if (options.validateChecksums && metadata.checksums[fileName]) {
            const checksum = await this.calculateChecksum(content);
            if (checksum !== metadata.checksums[fileName]) {
              throw new Error(`Checksum mismatch for file ${fileName}`);
            }
          }
          
          const restorePath = this.determineRestorePath(fileName);
          
          if (!options.overwriteExisting && await this.fileSystem.exists(restorePath)) {
            console.warn(`Skipping existing file: ${restorePath}`);
            continue;
          }
          
          await this.fileSystem.writeFile(restorePath, content);
          
        } catch (error) {
          console.error(`Failed to restore file ${fileName}:`, error);
          throw error;
        }
        
        currentFile++;
      }
      
      this.reportProgress(onProgress, 'Restore completed', dataFiles.length, dataFiles.length, undefined, true);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.reportProgress(onProgress, 'Restore failed', 0, 1, undefined, true, errorMessage);
      throw error;
    }
  }
  
  async listBackups(): Promise<BackupMetadata[]> {
    const backups: BackupMetadata[] = [];
    
    try {
      const backupsPath = this.pathManager.getBackupsPath();
      const backupDirs = await this.fileSystem.readDirectory(backupsPath);
      
      for (const backupDir of backupDirs) {
        try {
          const metadataPath = PathManager.join(backupsPath, backupDir, BackupManager.METADATA_FILENAME);
          const metadataContent = await this.fileSystem.readFile(metadataPath);
          const metadata: BackupMetadata = JSON.parse(metadataContent);
          backups.push(metadata);
        } catch (error) {
          console.warn(`Failed to read backup metadata for ${backupDir}:`, error);
        }
      }
      
    } catch (error) {
      console.error('Failed to list backups:', error);
    }
    
    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
  
  async deleteBackup(backupId: string): Promise<void> {
    const backupPath = PathManager.join(this.pathManager.getBackupsPath(), backupId);
    
    if (!await this.fileSystem.exists(backupPath)) {
      throw new Error(`Backup not found: ${backupId}`);
    }
    
    await this.fileSystem.deleteDirectory(backupPath, true);
  }
  
  async validateBackup(backupId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };
    
    try {
      const backupPath = PathManager.join(this.pathManager.getBackupsPath(), backupId);
      const metadataPath = PathManager.join(backupPath, BackupManager.METADATA_FILENAME);
      
      if (!await this.fileSystem.exists(metadataPath)) {
        result.errors.push('Backup metadata file not found');
        result.isValid = false;
        return result;
      }
      
      const metadataContent = await this.fileSystem.readFile(metadataPath);
      const metadata: BackupMetadata = JSON.parse(metadataContent);
      
      const files = await this.fileSystem.readDirectory(backupPath);
      const dataFiles = files.filter(file => file !== BackupManager.METADATA_FILENAME);
      
      if (dataFiles.length !== metadata.fileCount) {
        result.errors.push(`File count mismatch: expected ${metadata.fileCount}, found ${dataFiles.length}`);
        result.isValid = false;
      }
      
      let totalSize = 0;
      
      for (const fileName of dataFiles) {
        const filePath = PathManager.join(backupPath, fileName);
        const content = await this.fileSystem.readFile(filePath);
        
        totalSize += content.length;
        
        if (metadata.checksums[fileName]) {
          const checksum = await this.calculateChecksum(content);
          if (checksum !== metadata.checksums[fileName]) {
            result.errors.push(`Checksum mismatch for file ${fileName}`);
            result.isValid = false;
          }
        } else {
          result.warnings.push(`No checksum available for file ${fileName}`);
        }
      }
      
      if (Math.abs(totalSize - metadata.totalSize) > 0) {
        result.warnings.push(`Total size mismatch: expected ${metadata.totalSize}, calculated ${totalSize}`);
      }
      
    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
    }
    
    return result;
  }
  
  async getBackupInfo(backupId: string): Promise<BackupMetadata | null> {
    try {
      const backupPath = PathManager.join(this.pathManager.getBackupsPath(), backupId);
      const metadataPath = PathManager.join(backupPath, BackupManager.METADATA_FILENAME);
      
      if (!await this.fileSystem.exists(metadataPath)) {
        return null;
      }
      
      const metadataContent = await this.fileSystem.readFile(metadataPath);
      return JSON.parse(metadataContent);
      
    } catch (error) {
      console.error(`Failed to get backup info for ${backupId}:`, error);
      return null;
    }
  }
  
  private async collectFilesToBackup(): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const rootPath = this.pathManager.getRootPath();
      await this.collectFilesRecursive(rootPath, files);
    } catch (error) {
      console.error('Failed to collect files to backup:', error);
    }
    
    return files.filter(file => !file.includes('/backups/'));
  }
  
  private async collectFilesRecursive(dirPath: string, files: string[]): Promise<void> {
    try {
      const entries = await this.fileSystem.readDirectory(dirPath);
      
      for (const entry of entries) {
        const fullPath = PathManager.join(dirPath, entry);
        const stats = await this.fileSystem.stat(fullPath);
        
        if (stats.isFile) {
          files.push(fullPath);
        } else if (stats.isDirectory) {
          await this.collectFilesRecursive(fullPath, files);
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${dirPath}:`, error);
    }
  }
  
  private determineRestorePath(fileName: string): string {
    if (fileName === 'config.json') {
      return PathManager.join(this.pathManager.getRootPath(), 'config.json');
    }
    
    if (fileName.startsWith('trade_')) {
      const tradeId = fileName.replace('trade_', '').replace('.json', '');
      return this.pathManager.getTradeMarkdownPath(tradeId, 'metadata.json');
    }
    
    return PathManager.join(this.pathManager.getRootPath(), fileName);
  }
  
  private async calculateChecksum(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  private reportProgress(
    onProgress: ((progress: BackupProgress) => void) | undefined,
    step: string,
    current: number,
    total: number,
    currentFile?: string,
    completed: boolean = false,
    error?: string
  ): void {
    if (onProgress) {
      onProgress({
        step,
        current,
        total,
        currentFile,
        completed,
        error
      });
    }
  }
}