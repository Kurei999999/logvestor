/**
 * Data Migration Service for Trade Journal
 * Handles migration from old folder structures to new date-based structure
 * Provides backup, validation, and cleanup tools
 */

import { Trade } from '@/types/trade';
import { CentralCSVService } from '@/lib/csv/central-csv-service';
import { generateTradeFolderPath, createTradeFolderWithSequence, parseTradeFolderName } from '@/lib/trade-folder/path-generator';

export interface MigrationConfig {
  dataDirectory: string;
  fileService: any;
  dryRun?: boolean; // If true, only report what would be migrated without making changes
}

export interface MigrationResult {
  success: boolean;
  migratedFolders: number;
  migratedTrades: number;
  errors: string[];
  warnings: string[];
  skippedFolders: string[];
  backupPath?: string;
}

export interface ValidationResult {
  valid: boolean;
  totalTrades: number;
  missingFolders: string[];
  orphanedFolders: string[];
  duplicateIds: string[];
  corruptedRecords: string[];
  suggestions: string[];
}

export class DataMigrationService {
  private fileService: any;
  private dataDirectory: string;
  private csvService: CentralCSVService;
  private dryRun: boolean;

  constructor(config: MigrationConfig) {
    this.fileService = config.fileService;
    this.dataDirectory = config.dataDirectory;
    this.dryRun = config.dryRun || false;
    this.csvService = new CentralCSVService(config.fileService, config.dataDirectory);
  }

  /**
   * Main migration function - migrates from old folder structure to new
   */
  async migrateToNewStructure(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedFolders: 0,
      migratedTrades: 0,
      errors: [],
      warnings: [],
      skippedFolders: []
    };

    try {
      console.log(`Starting migration (dry run: ${this.dryRun})...`);

      // Create backup first
      if (!this.dryRun) {
        const backupPath = await this.createBackup();
        if (!backupPath) {
          result.errors.push('Failed to create backup - aborting migration');
          return result;
        }
        result.backupPath = backupPath;
      }

      // Scan for old folder structures
      const oldFolders = await this.findOldFolderStructures();
      console.log(`Found ${oldFolders.length} old folders to migrate`);

      // Migrate each folder
      for (const oldFolder of oldFolders) {
        try {
          const migrationResult = await this.migrateSingleFolder(oldFolder);
          if (migrationResult.success) {
            result.migratedFolders++;
            result.migratedTrades += migrationResult.tradesCount || 0;
          } else {
            result.errors.push(`Failed to migrate ${oldFolder.path}: ${migrationResult.error}`);
            result.skippedFolders.push(oldFolder.path);
          }
        } catch (error) {
          result.errors.push(`Error migrating ${oldFolder.path}: ${error}`);
          result.skippedFolders.push(oldFolder.path);
        }
      }

      // Update central CSV if not dry run
      if (!this.dryRun && result.migratedTrades > 0) {
        await this.csvService.initializeCentralCSV();
      }

      result.success = result.errors.length === 0 || result.migratedFolders > 0;
      console.log(`Migration completed: ${result.migratedFolders} folders, ${result.migratedTrades} trades`);

    } catch (error) {
      result.errors.push(`Migration failed: ${error}`);
      console.error('Migration error:', error);
    }

    return result;
  }

  /**
   * Create a backup of current data
   */
  async createBackup(): Promise<string | null> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = `${this.dataDirectory}/backups/backup-${timestamp}`;
      
      // Create backup directory
      const dirResult = await this.fileService.createDir(backupDir);
      if (!dirResult.success) {
        console.error('Failed to create backup directory:', dirResult.error);
        return null;
      }

      // Copy trades directory if it exists
      const tradesPath = `${this.dataDirectory}/trades`;
      const tradesExists = await this.fileService.exists(tradesPath);
      
      if (tradesExists.success && tradesExists.data) {
        await this.copyDirectory(tradesPath, `${backupDir}/trades`);
      }

      // Copy central CSV if it exists
      const csvPath = `${this.dataDirectory}/trades.csv`;
      const csvExists = await this.fileService.exists(csvPath);
      
      if (csvExists.success && csvExists.data) {
        const csvContent = await this.fileService.readFile(csvPath);
        if (csvContent.success) {
          await this.fileService.writeFile(`${backupDir}/trades.csv`, csvContent.data);
        }
      }

      console.log(`Backup created at: ${backupDir}`);
      return backupDir;
    } catch (error) {
      console.error('Backup creation failed:', error);
      return null;
    }
  }

  /**
   * Find old folder structures that need migration
   */
  async findOldFolderStructures(): Promise<{ path: string; type: 'old-stock-structure' | 'loose-files' }[]> {
    const oldFolders: { path: string; type: 'old-stock-structure' | 'loose-files' }[] = [];

    try {
      const tradesPath = `${this.dataDirectory}/trades`;
      const tradesExists = await this.fileService.exists(tradesPath);
      
      if (!tradesExists.success || !tradesExists.data) {
        return oldFolders;
      }

      const tradesResult = await this.fileService.readDir(tradesPath);
      if (!tradesResult.success || !tradesResult.data) {
        return oldFolders;
      }

      for (const item of tradesResult.data) {
        if (item.type === 'directory') {
          // Check if it's a year directory (new structure)
          if (/^\d{4}$/.test(item.name)) {
            continue; // Skip year directories (already new structure)
          }

          // Check if it's an old stock-based structure
          if (item.name === 'stock' || item.name.length <= 5) { // Likely ticker symbol
            oldFolders.push({
              path: `${tradesPath}/${item.name}`,
              type: 'old-stock-structure'
            });
          }
        } else if (item.type === 'file' && item.name.endsWith('.md')) {
          // Loose markdown files in trades root
          oldFolders.push({
            path: `${tradesPath}/${item.name}`,
            type: 'loose-files'
          });
        }
      }
    } catch (error) {
      console.error('Error finding old structures:', error);
    }

    return oldFolders;
  }

  /**
   * Migrate a single old folder to new structure
   */
  async migrateSingleFolder(oldFolder: { path: string; type: string }): Promise<{ success: boolean; error?: string; tradesCount?: number }> {
    try {
      if (oldFolder.type === 'old-stock-structure') {
        return await this.migrateStockStructure(oldFolder.path);
      } else if (oldFolder.type === 'loose-files') {
        return await this.migrateLooseFile(oldFolder.path);
      }

      return { success: false, error: 'Unknown folder type' };
    } catch (error) {
      return { success: false, error: `Migration error: ${error}` };
    }
  }

  /**
   * Migrate old stock-based structure
   */
  async migrateStockStructure(stockPath: string): Promise<{ success: boolean; error?: string; tradesCount?: number }> {
    try {
      const stockResult = await this.fileService.readDir(stockPath);
      if (!stockResult.success || !stockResult.data) {
        return { success: false, error: 'Cannot read stock directory' };
      }

      let tradesCount = 0;

      for (const item of stockResult.data) {
        if (item.type === 'directory') {
          // Process subdirectories (likely memos or individual trades)
          const subResult = await this.migrateTradeFolder(`${stockPath}/${item.name}`, item.name);
          if (subResult.success) {
            tradesCount++;
          }
        } else if (item.type === 'file' && item.name.endsWith('.md')) {
          // Process individual markdown files
          const fileResult = await this.migrateMarkdownFile(`${stockPath}/${item.name}`);
          if (fileResult.success) {
            tradesCount++;
          }
        }
      }

      // Remove old structure if not dry run
      if (!this.dryRun && tradesCount > 0) {
        try {
          await this.fileService.deleteDir(stockPath);
        } catch (error) {
          console.warn(`Could not remove old directory ${stockPath}:`, error);
        }
      }

      return { success: true, tradesCount };
    } catch (error) {
      return { success: false, error: `Stock structure migration failed: ${error}` };
    }
  }

  /**
   * Migrate a trade folder to new structure
   */
  async migrateTradeFolder(folderPath: string, folderName: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to extract trade info from folder name or contents
      const tradeInfo = await this.extractTradeInfoFromFolder(folderPath, folderName);
      if (!tradeInfo) {
        return { success: false, error: 'Could not extract trade information' };
      }

      if (this.dryRun) {
        console.log(`Would migrate folder ${folderPath} to new structure for ${tradeInfo.ticker} on ${tradeInfo.date}`);
        return { success: true };
      }

      // Create new folder structure
      const newFolderInfo = await createTradeFolderWithSequence(
        this.fileService,
        tradeInfo.ticker,
        tradeInfo.date,
        this.dataDirectory
      );

      if (!newFolderInfo) {
        return { success: false, error: 'Failed to create new folder structure' };
      }

      // Copy all files from old to new structure
      await this.copyDirectory(folderPath, `${this.dataDirectory}/${newFolderInfo.relativePath}`);

      return { success: true };
    } catch (error) {
      return { success: false, error: `Folder migration failed: ${error}` };
    }
  }

  /**
   * Migrate a loose file to new structure
   */
  async migrateLooseFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    return await this.migrateMarkdownFile(filePath);
  }

  /**
   * Migrate a loose markdown file
   */
  async migrateMarkdownFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const fileResult = await this.fileService.readFile(filePath);
      if (!fileResult.success) {
        return { success: false, error: 'Cannot read markdown file' };
      }

      const tradeInfo = this.extractTradeInfoFromMarkdown(fileResult.data);
      if (!tradeInfo) {
        return { success: false, error: 'Cannot extract trade info from markdown' };
      }

      if (this.dryRun) {
        console.log(`Would migrate file ${filePath} to new structure for ${tradeInfo.ticker} on ${tradeInfo.date}`);
        return { success: true };
      }

      // Create new folder and move file
      const newFolderInfo = await createTradeFolderWithSequence(
        this.fileService,
        tradeInfo.ticker,
        tradeInfo.date,
        this.dataDirectory
      );

      if (!newFolderInfo) {
        return { success: false, error: 'Failed to create new folder structure' };
      }

      const fileName = filePath.split('/').pop() || 'trade_memo.md';
      const newFilePath = `${this.dataDirectory}/${newFolderInfo.relativePath}/${fileName}`;
      
      await this.fileService.writeFile(newFilePath, fileResult.data);

      return { success: true };
    } catch (error) {
      return { success: false, error: `File migration failed: ${error}` };
    }
  }

  /**
   * Validate data integrity
   */
  async validateDataIntegrity(): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      totalTrades: 0,
      missingFolders: [],
      orphanedFolders: [],
      duplicateIds: [],
      corruptedRecords: [],
      suggestions: []
    };

    try {
      // Read central CSV
      const records = await this.csvService.readAllRecords();
      result.totalTrades = records.length;

      const folderPaths = new Set<string>();
      const tradeIds = new Set<string>();

      // Validate each record
      for (const record of records) {
        // Check for duplicate IDs
        if (tradeIds.has(record.tradeId)) {
          result.duplicateIds.push(record.tradeId);
          result.valid = false;
        }
        tradeIds.add(record.tradeId);

        // Check if folder exists
        const fullFolderPath = `${this.dataDirectory}/${record.folderPath}`;
        const exists = await this.fileService.exists(fullFolderPath);
        
        if (!exists.success || !exists.data) {
          result.missingFolders.push(record.folderPath);
          result.valid = false;
        } else {
          folderPaths.add(record.folderPath);
        }

        // Validate data integrity
        if (!record.ticker || !record.buyDate || !record.quantity || !record.buyPrice) {
          result.corruptedRecords.push(record.tradeId);
          result.valid = false;
        }
      }

      // Check for orphaned folders
      const allFolders = await this.getAllTradeFolders();
      for (const folder of allFolders) {
        if (!folderPaths.has(folder)) {
          result.orphanedFolders.push(folder);
        }
      }

      // Generate suggestions
      if (result.duplicateIds.length > 0) {
        result.suggestions.push(`Remove ${result.duplicateIds.length} duplicate trade IDs`);
      }
      if (result.missingFolders.length > 0) {
        result.suggestions.push(`Create ${result.missingFolders.length} missing folders or remove invalid records`);
      }
      if (result.orphanedFolders.length > 0) {
        result.suggestions.push(`Add ${result.orphanedFolders.length} orphaned folders to central CSV or remove them`);
      }

    } catch (error) {
      result.valid = false;
      result.suggestions.push(`Validation failed: ${error}`);
    }

    return result;
  }

  /**
   * Clean up old data and fix integrity issues
   */
  async cleanupAndRepair(): Promise<{ success: boolean; actions: string[]; errors: string[] }> {
    const result = { success: true, actions: [] as string[], errors: [] as string[] };

    try {
      // First validate
      const validation = await this.validateDataIntegrity();
      
      // Remove duplicates
      if (validation.duplicateIds.length > 0) {
        const records = await this.csvService.readAllRecords();
        const seen = new Set<string>();
        const uniqueRecords = records.filter(record => {
          if (seen.has(record.tradeId)) {
            result.actions.push(`Removed duplicate trade ID: ${record.tradeId}`);
            return false;
          }
          seen.add(record.tradeId);
          return true;
        });
        
        if (!this.dryRun) {
          await this.csvService['writeAllRecords'](uniqueRecords);
        }
      }

      // Create missing folders for valid records
      for (const missingFolder of validation.missingFolders) {
        if (!this.dryRun) {
          const createResult = await this.fileService.createDir(`${this.dataDirectory}/${missingFolder}`);
          if (createResult.success) {
            result.actions.push(`Created missing folder: ${missingFolder}`);
          } else {
            result.errors.push(`Failed to create folder: ${missingFolder}`);
          }
        } else {
          result.actions.push(`Would create missing folder: ${missingFolder}`);
        }
      }

      // Clean up empty directories
      await this.cleanupEmptyDirectories();

      result.success = result.errors.length === 0;
    } catch (error) {
      result.success = false;
      result.errors.push(`Cleanup failed: ${error}`);
    }

    return result;
  }

  // Private helper methods

  private async extractTradeInfoFromFolder(folderPath: string, folderName: string): Promise<{ ticker: string; date: string } | null> {
    try {
      // Try to parse from existing new format
      const parsed = parseTradeFolderName(folderName);
      if (parsed) {
        return { ticker: parsed.ticker, date: parsed.date };
      }

      // Try to extract from markdown files in folder
      const folderResult = await this.fileService.readDir(folderPath);
      if (folderResult.success && folderResult.data) {
        for (const item of folderResult.data) {
          if (item.type === 'file' && item.name.endsWith('.md')) {
            const fileResult = await this.fileService.readFile(`${folderPath}/${item.name}`);
            if (fileResult.success) {
              const tradeInfo = this.extractTradeInfoFromMarkdown(fileResult.data);
              if (tradeInfo) {
                return tradeInfo;
              }
            }
          }
        }
      }

      // Fallback: use folder name as ticker and current date
      return {
        ticker: folderName.toUpperCase(),
        date: new Date().toISOString().split('T')[0]
      };
    } catch (error) {
      console.error('Error extracting trade info:', error);
      return null;
    }
  }

  private extractTradeInfoFromMarkdown(content: string): { ticker: string; date: string } | null {
    try {
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) {
        return null;
      }

      const frontmatter = frontmatterMatch[1];
      const lines = frontmatter.split('\n');
      
      let ticker = '';
      let date = '';

      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          
          if (key.trim() === 'ticker') {
            ticker = value;
          } else if (key.trim() === 'date' || key.trim() === 'buyDate') {
            date = value;
          }
        }
      }

      if (ticker && date) {
        return { ticker, date };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async copyDirectory(sourcePath: string, destPath: string): Promise<void> {
    try {
      // Create destination directory
      await this.fileService.createDir(destPath);

      // Read source directory
      const sourceResult = await this.fileService.readDir(sourcePath);
      if (!sourceResult.success || !sourceResult.data) {
        return;
      }

      // Copy each item
      for (const item of sourceResult.data) {
        const sourceItemPath = `${sourcePath}/${item.name}`;
        const destItemPath = `${destPath}/${item.name}`;

        if (item.type === 'file') {
          const fileResult = await this.fileService.readFile(sourceItemPath);
          if (fileResult.success) {
            await this.fileService.writeFile(destItemPath, fileResult.data);
          }
        } else if (item.type === 'directory') {
          await this.copyDirectory(sourceItemPath, destItemPath);
        }
      }
    } catch (error) {
      console.error('Error copying directory:', error);
    }
  }

  private async getAllTradeFolders(): Promise<string[]> {
    const folders: string[] = [];
    
    try {
      const tradesPath = `${this.dataDirectory}/trades`;
      const tradesResult = await this.fileService.readDir(tradesPath);
      
      if (tradesResult.success && tradesResult.data) {
        for (const yearItem of tradesResult.data) {
          if (yearItem.type === 'directory' && /^\d{4}$/.test(yearItem.name)) {
            const yearPath = `${tradesPath}/${yearItem.name}`;
            const yearResult = await this.fileService.readDir(yearPath);
            
            if (yearResult.success && yearResult.data) {
              for (const tradeItem of yearResult.data) {
                if (tradeItem.type === 'directory') {
                  folders.push(`trades/${yearItem.name}/${tradeItem.name}`);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting trade folders:', error);
    }

    return folders;
  }

  private async cleanupEmptyDirectories(): Promise<void> {
    try {
      const tradesPath = `${this.dataDirectory}/trades`;
      const tradesResult = await this.fileService.readDir(tradesPath);
      
      if (tradesResult.success && tradesResult.data) {
        for (const item of tradesResult.data) {
          if (item.type === 'directory') {
            const itemPath = `${tradesPath}/${item.name}`;
            const itemResult = await this.fileService.readDir(itemPath);
            
            if (itemResult.success && itemResult.data && itemResult.data.length === 0) {
              if (!this.dryRun) {
                await this.fileService.deleteDir(itemPath);
              }
              console.log(`Removed empty directory: ${itemPath}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up empty directories:', error);
    }
  }
}