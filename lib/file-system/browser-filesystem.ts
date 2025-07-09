import { 
  BaseFileSystemAPI, 
  DirectoryHandle, 
  FileHandle, 
  FileSystemStats, 
  FileSystemChange, 
  FileSystemWatcher, 
  FileSystemPermission 
} from './filesystem-api';

class BrowserFileSystemWatcher implements FileSystemWatcher {
  private isActive = false;
  private intervalId: number | null = null;
  private lastModified: Map<string, number> = new Map();
  
  constructor(
    private path: string,
    private isDirectory: boolean,
    private api: BrowserFileSystemAPI,
    public onChange: (changes: FileSystemChange[]) => void
  ) {}
  
  async start(): Promise<void> {
    if (this.isActive) return;
    
    this.isActive = true;
    this.intervalId = window.setInterval(async () => {
      await this.checkForChanges();
    }, 1000);
    
    await this.checkForChanges();
  }
  
  async stop(): Promise<void> {
    this.isActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  private async checkForChanges(): Promise<void> {
    try {
      const changes: FileSystemChange[] = [];
      
      if (this.isDirectory) {
        const files = await this.api.readDirectory(this.path);
        
        for (const file of files) {
          const filePath = `${this.path}/${file}`;
          try {
            const stats = await this.api.stat(filePath);
            const lastMod = this.lastModified.get(filePath);
            
            if (lastMod === undefined) {
              changes.push({
                type: 'created',
                path: filePath,
                timestamp: stats.modified.getTime()
              });
            } else if (stats.modified.getTime() !== lastMod) {
              changes.push({
                type: 'modified',
                path: filePath,
                timestamp: stats.modified.getTime()
              });
            }
            
            this.lastModified.set(filePath, stats.modified.getTime());
          } catch (error) {
            if (this.lastModified.has(filePath)) {
              changes.push({
                type: 'deleted',
                path: filePath,
                timestamp: Date.now()
              });
              this.lastModified.delete(filePath);
            }
          }
        }
      } else {
        try {
          const stats = await this.api.stat(this.path);
          const lastMod = this.lastModified.get(this.path);
          
          if (lastMod === undefined) {
            changes.push({
              type: 'created',
              path: this.path,
              timestamp: stats.modified.getTime()
            });
          } else if (stats.modified.getTime() !== lastMod) {
            changes.push({
              type: 'modified',
              path: this.path,
              timestamp: stats.modified.getTime()
            });
          }
          
          this.lastModified.set(this.path, stats.modified.getTime());
        } catch (error) {
          if (this.lastModified.has(this.path)) {
            changes.push({
              type: 'deleted',
              path: this.path,
              timestamp: Date.now()
            });
            this.lastModified.delete(this.path);
          }
        }
      }
      
      if (changes.length > 0) {
        this.onChange(changes);
      }
    } catch (error) {
      console.error('Error checking for file changes:', error);
    }
  }
}

export class BrowserFileSystemAPI extends BaseFileSystemAPI {
  private supportsFileSystemAccess: boolean;
  
  constructor() {
    super();
    this.supportsFileSystemAccess = 'showDirectoryPicker' in window;
  }
  
  isSupported(): boolean {
    return this.supportsFileSystemAccess || true;
  }
  
  async requestDirectoryAccess(dirName?: string): Promise<DirectoryHandle> {
    if (this.supportsFileSystemAccess) {
      try {
        const handle = await (window as any).showDirectoryPicker({
          id: dirName || 'trade-journal',
          startIn: 'documents'
        });
        this.rootHandle = handle;
        return handle;
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          throw this.createError('User cancelled directory selection', 'USER_CANCELLED');
        }
        throw this.createError('Failed to request directory access', 'ACCESS_DENIED', undefined, error as Error);
      }
    } else {
      throw this.createError('File System Access API not supported', 'NOT_SUPPORTED');
    }
  }
  
  async hasPermission(handle: DirectoryHandle): Promise<FileSystemPermission> {
    if (this.supportsFileSystemAccess) {
      const permission = await (handle as any).queryPermission({ mode: 'readwrite' });
      return { state: permission };
    }
    return { state: 'granted' };
  }
  
  async requestPermission(handle: DirectoryHandle): Promise<FileSystemPermission> {
    if (this.supportsFileSystemAccess) {
      const permission = await (handle as any).requestPermission({ mode: 'readwrite' });
      return { state: permission };
    }
    return { state: 'granted' };
  }
  
  async readFile(path: string): Promise<string> {
    if (this.supportsFileSystemAccess) {
      try {
        const handle = await this.resolveHandle(path);
        if (handle.kind !== 'file') {
          throw this.createError('Path is not a file', 'NOT_FILE', path);
        }
        
        const fileHandle = handle as FileHandle;
        const file = await fileHandle.getFile();
        return await file.text();
      } catch (error) {
        throw this.createError(`Failed to read file: ${path}`, 'READ_ERROR', path, error as Error);
      }
    } else {
      throw this.createError('File System Access API not supported', 'NOT_SUPPORTED');
    }
  }
  
  async writeFile(path: string, data: string): Promise<void> {
    if (this.supportsFileSystemAccess) {
      try {
        const parts = this.splitPath(path);
        const fileName = parts.pop()!;
        const dirPath = parts.join('/');
        
        let dirHandle: DirectoryHandle;
        if (dirPath) {
          await this.createDirectory(dirPath);
          dirHandle = await this.resolveHandle(dirPath) as DirectoryHandle;
        } else {
          dirHandle = this.rootHandle!;
        }
        
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
      } catch (error) {
        throw this.createError(`Failed to write file: ${path}`, 'WRITE_ERROR', path, error as Error);
      }
    } else {
      throw this.createError('File System Access API not supported', 'NOT_SUPPORTED');
    }
  }
  
  async readBinaryFile(path: string): Promise<ArrayBuffer> {
    if (this.supportsFileSystemAccess) {
      try {
        const handle = await this.resolveHandle(path);
        if (handle.kind !== 'file') {
          throw this.createError('Path is not a file', 'NOT_FILE', path);
        }
        
        const fileHandle = handle as FileHandle;
        const file = await fileHandle.getFile();
        return await file.arrayBuffer();
      } catch (error) {
        throw this.createError(`Failed to read binary file: ${path}`, 'READ_ERROR', path, error as Error);
      }
    } else {
      throw this.createError('File System Access API not supported', 'NOT_SUPPORTED');
    }
  }
  
  async writeBinaryFile(path: string, data: ArrayBuffer): Promise<void> {
    if (this.supportsFileSystemAccess) {
      try {
        const parts = this.splitPath(path);
        const fileName = parts.pop()!;
        const dirPath = parts.join('/');
        
        let dirHandle: DirectoryHandle;
        if (dirPath) {
          await this.createDirectory(dirPath);
          dirHandle = await this.resolveHandle(dirPath) as DirectoryHandle;
        } else {
          dirHandle = this.rootHandle!;
        }
        
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
      } catch (error) {
        throw this.createError(`Failed to write binary file: ${path}`, 'WRITE_ERROR', path, error as Error);
      }
    } else {
      throw this.createError('File System Access API not supported', 'NOT_SUPPORTED');
    }
  }
  
  async deleteFile(path: string): Promise<void> {
    if (this.supportsFileSystemAccess) {
      try {
        const parts = this.splitPath(path);
        const fileName = parts.pop()!;
        const dirPath = parts.join('/');
        
        let dirHandle: DirectoryHandle;
        if (dirPath) {
          dirHandle = await this.resolveHandle(dirPath) as DirectoryHandle;
        } else {
          dirHandle = this.rootHandle!;
        }
        
        await dirHandle.removeEntry(fileName);
      } catch (error) {
        throw this.createError(`Failed to delete file: ${path}`, 'DELETE_ERROR', path, error as Error);
      }
    } else {
      throw this.createError('File System Access API not supported', 'NOT_SUPPORTED');
    }
  }
  
  async exists(path: string): Promise<boolean> {
    if (this.supportsFileSystemAccess) {
      try {
        await this.resolveHandle(path);
        return true;
      } catch (error) {
        return false;
      }
    } else {
      return false;
    }
  }
  
  async stat(path: string): Promise<FileSystemStats> {
    if (this.supportsFileSystemAccess) {
      try {
        const handle = await this.resolveHandle(path);
        
        if (handle.kind === 'file') {
          const fileHandle = handle as FileHandle;
          const file = await fileHandle.getFile();
          return {
            size: file.size,
            created: new Date(file.lastModified),
            modified: new Date(file.lastModified),
            isDirectory: false,
            isFile: true
          };
        } else {
          return {
            size: 0,
            created: new Date(),
            modified: new Date(),
            isDirectory: true,
            isFile: false
          };
        }
      } catch (error) {
        throw this.createError(`Failed to stat: ${path}`, 'STAT_ERROR', path, error as Error);
      }
    } else {
      throw this.createError('File System Access API not supported', 'NOT_SUPPORTED');
    }
  }
  
  async createDirectory(path: string): Promise<void> {
    if (this.supportsFileSystemAccess) {
      try {
        const parts = this.splitPath(path);
        let currentHandle = this.rootHandle!;
        
        for (const part of parts) {
          try {
            currentHandle = await currentHandle.getDirectoryHandle(part);
          } catch (error) {
            currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
          }
        }
      } catch (error) {
        throw this.createError(`Failed to create directory: ${path}`, 'CREATE_DIR_ERROR', path, error as Error);
      }
    } else {
      throw this.createError('File System Access API not supported', 'NOT_SUPPORTED');
    }
  }
  
  async deleteDirectory(path: string, recursive: boolean = false): Promise<void> {
    if (this.supportsFileSystemAccess) {
      try {
        const parts = this.splitPath(path);
        const dirName = parts.pop()!;
        const parentPath = parts.join('/');
        
        let parentHandle: DirectoryHandle;
        if (parentPath) {
          parentHandle = await this.resolveHandle(parentPath) as DirectoryHandle;
        } else {
          parentHandle = this.rootHandle!;
        }
        
        await parentHandle.removeEntry(dirName, { recursive });
      } catch (error) {
        throw this.createError(`Failed to delete directory: ${path}`, 'DELETE_DIR_ERROR', path, error as Error);
      }
    } else {
      throw this.createError('File System Access API not supported', 'NOT_SUPPORTED');
    }
  }
  
  async readDirectory(path: string): Promise<string[]> {
    if (this.supportsFileSystemAccess) {
      try {
        const handle = await this.resolveHandle(path);
        if (handle.kind !== 'directory') {
          throw this.createError('Path is not a directory', 'NOT_DIRECTORY', path);
        }
        
        const dirHandle = handle as DirectoryHandle;
        const entries: string[] = [];
        
        for await (const [name] of dirHandle.entries()) {
          entries.push(name);
        }
        
        return entries.sort();
      } catch (error) {
        throw this.createError(`Failed to read directory: ${path}`, 'READ_DIR_ERROR', path, error as Error);
      }
    } else {
      throw this.createError('File System Access API not supported', 'NOT_SUPPORTED');
    }
  }
  
  async watchFile(path: string, callback: (change: FileSystemChange) => void): Promise<FileSystemWatcher> {
    const watcher = new BrowserFileSystemWatcher(path, false, this, (changes) => {
      if (changes.length > 0) {
        callback(changes[0]);
      }
    });
    
    await watcher.start();
    return watcher;
  }
  
  async watchDirectory(path: string, callback: (changes: FileSystemChange[]) => void): Promise<FileSystemWatcher> {
    const watcher = new BrowserFileSystemWatcher(path, true, this, callback);
    await watcher.start();
    return watcher;
  }
  
  async copyFile(srcPath: string, destPath: string): Promise<void> {
    const data = await this.readFile(srcPath);
    await this.writeFile(destPath, data);
  }
  
  async moveFile(srcPath: string, destPath: string): Promise<void> {
    await this.copyFile(srcPath, destPath);
    await this.deleteFile(srcPath);
  }
}