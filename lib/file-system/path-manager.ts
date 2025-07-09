export interface PathConfig {
  rootDir: string;
  tradesDir: string;
  imagesDir: string;
  templatesDir: string;
  backupsDir: string;
  exportsDir: string;
}

export class PathManager {
  private static readonly DEFAULT_CONFIG: PathConfig = {
    rootDir: 'TradeJournal',
    tradesDir: 'trades',
    imagesDir: 'images',
    templatesDir: 'templates',
    backupsDir: 'backups',
    exportsDir: 'exports'
  };
  
  private config: PathConfig;
  
  constructor(config?: Partial<PathConfig>) {
    this.config = { ...PathManager.DEFAULT_CONFIG, ...config };
  }
  
  static normalize(path: string): string {
    return path
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/^\//, '')
      .replace(/\/$/, '');
  }
  
  static join(...parts: string[]): string {
    return PathManager.normalize(parts.filter(Boolean).join('/'));
  }
  
  static dirname(path: string): string {
    const normalized = PathManager.normalize(path);
    const lastSlash = normalized.lastIndexOf('/');
    return lastSlash === -1 ? '' : normalized.substring(0, lastSlash);
  }
  
  static basename(path: string): string {
    const normalized = PathManager.normalize(path);
    const lastSlash = normalized.lastIndexOf('/');
    return lastSlash === -1 ? normalized : normalized.substring(lastSlash + 1);
  }
  
  static extname(path: string): string {
    const basename = PathManager.basename(path);
    const lastDot = basename.lastIndexOf('.');
    return lastDot === -1 ? '' : basename.substring(lastDot);
  }
  
  static withoutExt(path: string): string {
    const ext = PathManager.extname(path);
    return ext ? path.substring(0, path.length - ext.length) : path;
  }
  
  static isAbsolute(path: string): boolean {
    return path.startsWith('/');
  }
  
  static resolve(...paths: string[]): string {
    let resolved = '';
    
    for (const path of paths) {
      if (PathManager.isAbsolute(path)) {
        resolved = path;
      } else {
        resolved = PathManager.join(resolved, path);
      }
    }
    
    return PathManager.normalize(resolved);
  }
  
  static relative(from: string, to: string): string {
    const fromParts = PathManager.normalize(from).split('/');
    const toParts = PathManager.normalize(to).split('/');
    
    let commonLength = 0;
    for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
      if (fromParts[i] === toParts[i]) {
        commonLength++;
      } else {
        break;
      }
    }
    
    const upLevels = fromParts.length - commonLength;
    const remainingPath = toParts.slice(commonLength);
    
    const result = Array(upLevels).fill('..').concat(remainingPath);
    return result.join('/') || '.';
  }
  
  getRootPath(): string {
    return this.config.rootDir;
  }
  
  getTradesPath(): string {
    return PathManager.join(this.config.rootDir, this.config.tradesDir);
  }
  
  getImagesPath(): string {
    return PathManager.join(this.config.rootDir, this.config.imagesDir);
  }
  
  getTemplatesPath(): string {
    return PathManager.join(this.config.rootDir, this.config.templatesDir);
  }
  
  getBackupsPath(): string {
    return PathManager.join(this.config.rootDir, this.config.backupsDir);
  }
  
  getExportsPath(): string {
    return PathManager.join(this.config.rootDir, this.config.exportsDir);
  }
  
  getTradePath(tradeId: string): string {
    return PathManager.join(this.getTradesPath(), tradeId);
  }
  
  getTradeMarkdownPath(tradeId: string, filename?: string): string {
    const tradePath = this.getTradePath(tradeId);
    const markdownFile = filename || `${tradeId}.md`;
    return PathManager.join(tradePath, markdownFile);
  }
  
  getTradeImagePath(tradeId: string, imageName: string): string {
    const tradePath = this.getTradePath(tradeId);
    return PathManager.join(tradePath, imageName);
  }
  
  getBackupPath(timestamp: string): string {
    return PathManager.join(this.getBackupsPath(), `backup_${timestamp}.json`);
  }
  
  getExportPath(filename: string): string {
    return PathManager.join(this.getExportsPath(), filename);
  }
  
  getTemplatePath(templateName: string): string {
    return PathManager.join(this.getTemplatesPath(), `${templateName}.md`);
  }
  
  generateUniqueFilename(baseName: string, extension: string, existingFiles: string[]): string {
    let counter = 1;
    let filename = `${baseName}.${extension}`;
    
    while (existingFiles.includes(filename)) {
      filename = `${baseName}_${counter}.${extension}`;
      counter++;
    }
    
    return filename;
  }
  
  validatePath(path: string): boolean {
    const normalized = PathManager.normalize(path);
    
    const invalidChars = ['<', '>', ':', '"', '|', '?', '*'];
    for (const char of invalidChars) {
      if (normalized.includes(char)) {
        return false;
      }
    }
    
    const parts = normalized.split('/');
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    
    for (const part of parts) {
      if (reservedNames.includes(part.toUpperCase())) {
        return false;
      }
      
      if (part.startsWith('.') || part.endsWith('.')) {
        return false;
      }
      
      if (part.length > 255) {
        return false;
      }
    }
    
    return normalized.length <= 260;
  }
  
  sanitizePath(path: string): string {
    let sanitized = PathManager.normalize(path);
    
    const invalidChars = ['<', '>', ':', '"', '|', '?', '*'];
    for (const char of invalidChars) {
      sanitized = sanitized.replace(new RegExp(`\\${char}`, 'g'), '_');
    }
    
    const parts = sanitized.split('/');
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    
    const sanitizedParts = parts.map(part => {
      if (reservedNames.includes(part.toUpperCase())) {
        return `_${part}`;
      }
      
      part = part.replace(/^\.+/, '').replace(/\.+$/, '');
      
      if (part.length > 255) {
        part = part.substring(0, 255);
      }
      
      return part || '_';
    });
    
    const result = sanitizedParts.join('/');
    return result.length <= 260 ? result : result.substring(0, 260);
  }
  
  updateConfig(newConfig: Partial<PathConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  getConfig(): PathConfig {
    return { ...this.config };
  }
  
  createDirectoryStructure(): string[] {
    return [
      this.getRootPath(),
      this.getTradesPath(),
      this.getImagesPath(),
      this.getTemplatesPath(),
      this.getBackupsPath(),
      this.getExportsPath()
    ];
  }
  
  parseTradeIdFromPath(path: string): string | null {
    const tradesPath = this.getTradesPath();
    const normalized = PathManager.normalize(path);
    
    if (!normalized.startsWith(tradesPath)) {
      return null;
    }
    
    const relativePath = normalized.substring(tradesPath.length + 1);
    const parts = relativePath.split('/');
    
    return parts[0] || null;
  }
  
  isTradeFile(path: string): boolean {
    const tradesPath = this.getTradesPath();
    const normalized = PathManager.normalize(path);
    return normalized.startsWith(tradesPath);
  }
  
  isImageFile(path: string): boolean {
    const extension = PathManager.extname(path).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(extension);
  }
  
  isMarkdownFile(path: string): boolean {
    const extension = PathManager.extname(path).toLowerCase();
    return extension === '.md';
  }
  
  isCSVFile(path: string): boolean {
    const extension = PathManager.extname(path).toLowerCase();
    return extension === '.csv';
  }
}