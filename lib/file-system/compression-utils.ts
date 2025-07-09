import { FileSystemAPI } from './filesystem-api';
import { PathManager } from './path-manager';

export interface CompressionOptions {
  level: number;
  includeImages: boolean;
  includeBackups: boolean;
  excludePatterns: string[];
}

export interface CompressionResult {
  success: boolean;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  filesIncluded: number;
  error?: string;
}

export class CompressionUtils {
  private static readonly DEFAULT_OPTIONS: CompressionOptions = {
    level: 6,
    includeImages: true,
    includeBackups: false,
    excludePatterns: ['*.tmp', '*.log', '.DS_Store']
  };
  
  constructor(
    private fileSystem: FileSystemAPI,
    private pathManager: PathManager
  ) {}
  
  async compressDirectory(
    sourcePath: string,
    outputPath: string,
    options: Partial<CompressionOptions> = {}
  ): Promise<CompressionResult> {
    const opts = { ...CompressionUtils.DEFAULT_OPTIONS, ...options };
    
    const result: CompressionResult = {
      success: false,
      originalSize: 0,
      compressedSize: 0,
      compressionRatio: 0,
      filesIncluded: 0
    };
    
    try {
      const files = await this.collectFilesForCompression(sourcePath, opts);
      result.filesIncluded = files.length;
      
      const zip = await this.createZipFile(files, opts);
      result.originalSize = files.reduce((sum, file) => sum + file.size, 0);
      
      const compressedData = await zip.generateAsync({ type: 'uint8array' });
      result.compressedSize = compressedData.length;
      result.compressionRatio = result.originalSize > 0 ? result.compressedSize / result.originalSize : 0;
      
      await this.fileSystem.writeBinaryFile(outputPath, compressedData.buffer);
      
      result.success = true;
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown compression error';
    }
    
    return result;
  }
  
  async decompressFile(
    compressedPath: string,
    outputPath: string,
    overwriteExisting: boolean = false
  ): Promise<{ success: boolean; filesExtracted: number; error?: string }> {
    const result = {
      success: false,
      filesExtracted: 0,
      error: undefined as string | undefined
    };
    
    try {
      const compressedData = await this.fileSystem.readBinaryFile(compressedPath);
      const zip = await this.loadZipFile(compressedData);
      
      const fileNames = Object.keys(zip.files);
      
      for (const fileName of fileNames) {
        const zipEntry = zip.files[fileName];
        
        if (zipEntry.dir) {
          await this.fileSystem.createDirectory(PathManager.join(outputPath, fileName));
        } else {
          const filePath = PathManager.join(outputPath, fileName);
          
          if (!overwriteExisting && await this.fileSystem.exists(filePath)) {
            console.warn(`Skipping existing file: ${filePath}`);
            continue;
          }
          
          const content = await zipEntry.async('string');
          await this.fileSystem.writeFile(filePath, content);
          result.filesExtracted++;
        }
      }
      
      result.success = true;
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown decompression error';
    }
    
    return result;
  }
  
  async createExportArchive(
    exportName: string,
    options: Partial<CompressionOptions> = {}
  ): Promise<CompressionResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `${exportName}_${timestamp}.zip`;
    const outputPath = this.pathManager.getExportPath(archiveName);
    
    return this.compressDirectory(
      this.pathManager.getRootPath(),
      outputPath,
      options
    );
  }
  
  async importFromArchive(
    archivePath: string,
    overwriteExisting: boolean = false
  ): Promise<{ success: boolean; filesExtracted: number; error?: string }> {
    return this.decompressFile(
      archivePath,
      this.pathManager.getRootPath(),
      overwriteExisting
    );
  }
  
  private async collectFilesForCompression(
    sourcePath: string,
    options: CompressionOptions
  ): Promise<Array<{ path: string; relativePath: string; size: number; content: string }>> {
    const files: Array<{ path: string; relativePath: string; size: number; content: string }> = [];
    
    await this.collectFilesRecursive(sourcePath, sourcePath, files, options);
    
    return files;
  }
  
  private async collectFilesRecursive(
    currentPath: string,
    basePath: string,
    files: Array<{ path: string; relativePath: string; size: number; content: string }>,
    options: CompressionOptions
  ): Promise<void> {
    try {
      const entries = await this.fileSystem.readDirectory(currentPath);
      
      for (const entry of entries) {
        const fullPath = PathManager.join(currentPath, entry);
        const relativePath = PathManager.relative(basePath, fullPath);
        
        if (this.shouldExcludeFile(relativePath, options)) {
          continue;
        }
        
        const stats = await this.fileSystem.stat(fullPath);
        
        if (stats.isFile) {
          try {
            const content = await this.fileSystem.readFile(fullPath);
            files.push({
              path: fullPath,
              relativePath,
              size: stats.size,
              content
            });
          } catch (error) {
            console.warn(`Failed to read file ${fullPath}:`, error);
          }
        } else if (stats.isDirectory) {
          await this.collectFilesRecursive(fullPath, basePath, files, options);
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${currentPath}:`, error);
    }
  }
  
  private shouldExcludeFile(relativePath: string, options: CompressionOptions): boolean {
    if (!options.includeBackups && relativePath.startsWith('backups/')) {
      return true;
    }
    
    if (!options.includeImages && this.pathManager.isImageFile(relativePath)) {
      return true;
    }
    
    for (const pattern of options.excludePatterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        return true;
      }
    }
    
    return false;
  }
  
  private matchesPattern(path: string, pattern: string): boolean {
    const regex = new RegExp(
      pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
    );
    
    return regex.test(path);
  }
  
  private async createZipFile(
    files: Array<{ path: string; relativePath: string; size: number; content: string }>,
    options: CompressionOptions
  ): Promise<any> {
    const JSZip = await this.loadJSZip();
    const zip = new JSZip();
    
    for (const file of files) {
      zip.file(file.relativePath, file.content);
    }
    
    return zip;
  }
  
  private async loadZipFile(data: ArrayBuffer): Promise<any> {
    const JSZip = await this.loadJSZip();
    return JSZip.loadAsync(data);
  }
  
  private async loadJSZip(): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).JSZip) {
      return (window as any).JSZip;
    }
    
    throw new Error('JSZip library not available. File compression features require jszip package to be installed and loaded.');
  }
}