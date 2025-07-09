import { FileSystemAPI } from './filesystem-api';
import { BrowserFileSystemAPI } from './browser-filesystem';
import { FallbackFileSystemAPI } from './fallback-filesystem';

export class FileSystemFactory {
  private static instance: FileSystemAPI | null = null;
  
  static createFileSystem(): FileSystemAPI {
    if (this.instance) {
      return this.instance;
    }
    
    if (this.isFileSystemAccessSupported()) {
      this.instance = new BrowserFileSystemAPI();
    } else {
      this.instance = new FallbackFileSystemAPI();
    }
    
    return this.instance;
  }
  
  static getFileSystem(): FileSystemAPI | null {
    return this.instance;
  }
  
  static resetFileSystem(): void {
    this.instance = null;
  }
  
  private static isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }
  
  static getSupportedFeatures(): {
    fileSystemAccess: boolean;
    fileWatching: boolean;
    directoryPicker: boolean;
  } {
    return {
      fileSystemAccess: this.isFileSystemAccessSupported(),
      fileWatching: this.isFileSystemAccessSupported(),
      directoryPicker: this.isFileSystemAccessSupported()
    };
  }
}