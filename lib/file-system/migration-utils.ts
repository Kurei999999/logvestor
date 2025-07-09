import { FileSystemAPI } from './filesystem-api';
import { PathManager } from './path-manager';
import { LocalStorage } from './storage';

export interface MigrationProgress {
  step: string;
  current: number;
  total: number;
  completed: boolean;
  error?: string;
}

export interface MigrationResult {
  success: boolean;
  error?: string;
  migratedFiles: string[];
  skippedFiles: string[];
  totalFiles: number;
}

export interface MigrationConfig {
  backupBeforeMigration: boolean;
  overwriteExisting: boolean;
  validateAfterMigration: boolean;
  createDirectoryStructure: boolean;
}

export class MigrationUtils {
  private static readonly DEFAULT_CONFIG: MigrationConfig = {
    backupBeforeMigration: true,
    overwriteExisting: false,
    validateAfterMigration: true,
    createDirectoryStructure: true
  };
  
  constructor(
    private fileSystem: FileSystemAPI,
    private pathManager: PathManager,
    private config: MigrationConfig = MigrationUtils.DEFAULT_CONFIG
  ) {}
  
  async migrateFromLocalStorage(
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedFiles: [],
      skippedFiles: [],
      totalFiles: 0
    };
    
    try {
      this.reportProgress(onProgress, 'Initializing migration', 0, 1);
      
      if (this.config.backupBeforeMigration) {
        await this.createBackup();
      }
      
      if (this.config.createDirectoryStructure) {
        await this.createDirectoryStructure();
      }
      
      const migrationSteps = [
        { name: 'trades', fn: this.migrateTrades.bind(this) },
        { name: 'csvMappings', fn: this.migrateCSVMappings.bind(this) },
        { name: 'appConfig', fn: this.migrateAppConfig.bind(this) },
        { name: 'filterPresets', fn: this.migrateFilterPresets.bind(this) }
      ];
      
      let currentStep = 0;
      const totalSteps = migrationSteps.length;
      
      for (const step of migrationSteps) {
        this.reportProgress(onProgress, `Migrating ${step.name}`, currentStep, totalSteps);
        
        try {
          const stepResult = await step.fn();
          result.migratedFiles.push(...stepResult.migratedFiles);
          result.skippedFiles.push(...stepResult.skippedFiles);
          result.totalFiles += stepResult.totalFiles;
        } catch (error) {
          console.error(`Error migrating ${step.name}:`, error);
          result.skippedFiles.push(step.name);
        }
        
        currentStep++;
      }
      
      if (this.config.validateAfterMigration) {
        this.reportProgress(onProgress, 'Validating migration', totalSteps, totalSteps + 1);
        await this.validateMigration();
      }
      
      this.reportProgress(onProgress, 'Migration completed', totalSteps + 1, totalSteps + 1, true);
      result.success = true;
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      this.reportProgress(onProgress, 'Migration failed', 0, 1, true, result.error);
    }
    
    return result;
  }
  
  private reportProgress(
    onProgress: ((progress: MigrationProgress) => void) | undefined,
    step: string,
    current: number,
    total: number,
    completed: boolean = false,
    error?: string
  ): void {
    if (onProgress) {
      onProgress({
        step,
        current,
        total,
        completed,
        error
      });
    }
  }
  
  private async createBackup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = this.pathManager.getBackupPath(timestamp);
    
    const backupData = {
      timestamp,
      trades: LocalStorage.getTrades(),
      csvMappings: LocalStorage.getCSVMappings(),
      appConfig: LocalStorage.getAppConfig(),
      filterPresets: this.getFilterPresets()
    };
    
    await this.fileSystem.writeFile(backupPath, JSON.stringify(backupData, null, 2));
  }
  
  private async createDirectoryStructure(): Promise<void> {
    const directories = this.pathManager.createDirectoryStructure();
    
    for (const dir of directories) {
      try {
        await this.fileSystem.createDirectory(dir);
      } catch (error) {
        console.warn(`Failed to create directory ${dir}:`, error);
      }
    }
  }
  
  private async migrateTrades(): Promise<{ migratedFiles: string[], skippedFiles: string[], totalFiles: number }> {
    const trades = LocalStorage.getTrades();
    const result = {
      migratedFiles: [] as string[],
      skippedFiles: [] as string[],
      totalFiles: trades.length
    };
    
    for (const trade of trades) {
      try {
        const tradeId = trade.id;
        const tradePath = this.pathManager.getTradePath(tradeId);
        
        await this.fileSystem.createDirectory(tradePath);
        
        const markdownPath = this.pathManager.getTradeMarkdownPath(tradeId);
        const markdownContent = this.generateTradeMarkdown(trade);
        
        if (this.config.overwriteExisting || !await this.fileSystem.exists(markdownPath)) {
          await this.fileSystem.writeFile(markdownPath, markdownContent);
          result.migratedFiles.push(markdownPath);
        } else {
          result.skippedFiles.push(markdownPath);
        }
        
        const metadataPath = PathManager.join(tradePath, 'metadata.json');
        const metadataContent = JSON.stringify(trade, null, 2);
        
        if (this.config.overwriteExisting || !await this.fileSystem.exists(metadataPath)) {
          await this.fileSystem.writeFile(metadataPath, metadataContent);
          result.migratedFiles.push(metadataPath);
        } else {
          result.skippedFiles.push(metadataPath);
        }
        
      } catch (error) {
        console.error(`Error migrating trade ${trade.id}:`, error);
        result.skippedFiles.push(trade.id);
      }
    }
    
    return result;
  }
  
  private async migrateCSVMappings(): Promise<{ migratedFiles: string[], skippedFiles: string[], totalFiles: number }> {
    const csvMappings = LocalStorage.getCSVMappings();
    const result = {
      migratedFiles: [] as string[],
      skippedFiles: [] as string[],
      totalFiles: csvMappings.length
    };
    
    for (const mapping of csvMappings) {
      try {
        const mappingPath = PathManager.join(this.pathManager.getRootPath(), 'csv-mappings', `${mapping.id}.json`);
        const mappingContent = JSON.stringify(mapping, null, 2);
        
        await this.fileSystem.createDirectory(PathManager.dirname(mappingPath));
        
        if (this.config.overwriteExisting || !await this.fileSystem.exists(mappingPath)) {
          await this.fileSystem.writeFile(mappingPath, mappingContent);
          result.migratedFiles.push(mappingPath);
        } else {
          result.skippedFiles.push(mappingPath);
        }
        
      } catch (error) {
        console.error(`Error migrating CSV mapping ${mapping.id}:`, error);
        result.skippedFiles.push(mapping.id);
      }
    }
    
    return result;
  }
  
  private async migrateAppConfig(): Promise<{ migratedFiles: string[], skippedFiles: string[], totalFiles: number }> {
    const appConfig = LocalStorage.getAppConfig();
    const result = {
      migratedFiles: [] as string[],
      skippedFiles: [] as string[],
      totalFiles: 1
    };
    
    try {
      const configPath = PathManager.join(this.pathManager.getRootPath(), 'config.json');
      const configContent = JSON.stringify(appConfig, null, 2);
      
      if (this.config.overwriteExisting || !await this.fileSystem.exists(configPath)) {
        await this.fileSystem.writeFile(configPath, configContent);
        result.migratedFiles.push(configPath);
      } else {
        result.skippedFiles.push(configPath);
      }
      
    } catch (error) {
      console.error('Error migrating app config:', error);
      result.skippedFiles.push('config.json');
    }
    
    return result;
  }
  
  private async migrateFilterPresets(): Promise<{ migratedFiles: string[], skippedFiles: string[], totalFiles: number }> {
    const filterPresets = this.getFilterPresets();
    const result = {
      migratedFiles: [] as string[],
      skippedFiles: [] as string[],
      totalFiles: filterPresets.length
    };
    
    for (const preset of filterPresets) {
      try {
        const presetPath = PathManager.join(this.pathManager.getRootPath(), 'filter-presets', `${preset.id}.json`);
        const presetContent = JSON.stringify(preset, null, 2);
        
        await this.fileSystem.createDirectory(PathManager.dirname(presetPath));
        
        if (this.config.overwriteExisting || !await this.fileSystem.exists(presetPath)) {
          await this.fileSystem.writeFile(presetPath, presetContent);
          result.migratedFiles.push(presetPath);
        } else {
          result.skippedFiles.push(presetPath);
        }
        
      } catch (error) {
        console.error(`Error migrating filter preset ${preset.id}:`, error);
        result.skippedFiles.push(preset.id);
      }
    }
    
    return result;
  }
  
  private generateTradeMarkdown(trade: any): string {
    const frontmatter = {
      id: trade.id,
      ticker: trade.ticker,
      date: trade.date,
      action: trade.action,
      quantity: trade.quantity,
      price: trade.price,
      commission: trade.commission,
      pnl: trade.pnl,
      strategy: trade.strategy,
      tags: trade.tags,
      createdAt: trade.createdAt,
      updatedAt: trade.updatedAt
    };
    
    const frontmatterYaml = Object.entries(frontmatter)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');
    
    return `---\n${frontmatterYaml}\n---\n\n# ${trade.ticker} - ${trade.action}\n\n## Trade Details\n\n- **Date**: ${trade.date}\n- **Action**: ${trade.action}\n- **Quantity**: ${trade.quantity}\n- **Price**: ${trade.price}\n- **Commission**: ${trade.commission || 'N/A'}\n- **P&L**: ${trade.pnl || 'N/A'}\n- **Strategy**: ${trade.strategy || 'N/A'}\n\n## Analysis\n\n${trade.notes || 'No notes available.'}\n\n## Tags\n\n${trade.tags && trade.tags.length > 0 ? trade.tags.map((tag: string) => `- ${tag}`).join('\n') : 'No tags'}\n`;
  }
  
  private getFilterPresets(): any[] {
    try {
      const presets = localStorage.getItem('filterPresets');
      return presets ? JSON.parse(presets) : [];
    } catch (error) {
      console.error('Error loading filter presets:', error);
      return [];
    }
  }
  
  private async validateMigration(): Promise<void> {
    const originalTrades = LocalStorage.getTrades();
    const migratedTrades = await this.loadMigratedTrades();
    
    if (originalTrades.length !== migratedTrades.length) {
      throw new Error(`Trade count mismatch: original ${originalTrades.length}, migrated ${migratedTrades.length}`);
    }
    
    for (const originalTrade of originalTrades) {
      const migratedTrade = migratedTrades.find(t => t.id === originalTrade.id);
      if (!migratedTrade) {
        throw new Error(`Trade ${originalTrade.id} not found in migrated data`);
      }
    }
  }
  
  private async loadMigratedTrades(): Promise<any[]> {
    const tradesPath = this.pathManager.getTradesPath();
    const trades = [];
    
    try {
      const tradeIds = await this.fileSystem.readDirectory(tradesPath);
      
      for (const tradeId of tradeIds) {
        try {
          const metadataPath = PathManager.join(tradesPath, tradeId, 'metadata.json');
          const metadataContent = await this.fileSystem.readFile(metadataPath);
          const trade = JSON.parse(metadataContent);
          trades.push(trade);
        } catch (error) {
          console.warn(`Failed to load trade metadata for ${tradeId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error loading migrated trades:', error);
    }
    
    return trades;
  }
  
  async rollbackMigration(backupTimestamp: string): Promise<void> {
    const backupPath = this.pathManager.getBackupPath(backupTimestamp);
    
    try {
      const backupContent = await this.fileSystem.readFile(backupPath);
      const backupData = JSON.parse(backupContent);
      
      LocalStorage.setTrades(backupData.trades || []);
      LocalStorage.setCSVMappings(backupData.csvMappings || []);
      LocalStorage.setAppConfig(backupData.appConfig || {});
      
      if (backupData.filterPresets) {
        localStorage.setItem('filterPresets', JSON.stringify(backupData.filterPresets));
      }
      
    } catch (error) {
      throw new Error(`Failed to rollback migration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async listBackups(): Promise<string[]> {
    try {
      const backupsPath = this.pathManager.getBackupsPath();
      const files = await this.fileSystem.readDirectory(backupsPath);
      
      return files
        .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
        .map(file => file.replace('backup_', '').replace('.json', ''))
        .sort((a, b) => b.localeCompare(a));
        
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }
}