export interface FileSystemHandle {
  name: string;
  kind: 'file' | 'directory';
}

export interface FileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<FileWritable>;
}

export interface DirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  keys(): AsyncIterable<string>;
  values(): AsyncIterable<FileSystemHandle>;
  entries(): AsyncIterable<[string, FileSystemHandle]>;
}

export interface FileWritable {
  write(data: string | ArrayBuffer | Blob): Promise<void>;
  close(): Promise<void>;
}

export interface FileSystemPermission {
  state: 'granted' | 'denied' | 'prompt';
}

export interface FileSystemWatcher {
  onChange: (changes: FileSystemChange[]) => void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface FileSystemChange {
  type: 'created' | 'modified' | 'deleted';
  path: string;
  timestamp: number;
}

export interface FileSystemStats {
  size: number;
  created: Date;
  modified: Date;
  isDirectory: boolean;
  isFile: boolean;
}

export interface FileSystemError extends Error {
  code: string;
  path?: string;
  cause?: Error;
}

export interface FileSystemAPI {
  readFile(path: string): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
  readBinaryFile(path: string): Promise<ArrayBuffer>;
  writeBinaryFile(path: string, data: ArrayBuffer): Promise<void>;
  
  deleteFile(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<FileSystemStats>;
  
  createDirectory(path: string): Promise<void>;
  deleteDirectory(path: string, recursive?: boolean): Promise<void>;
  readDirectory(path: string): Promise<string[]>;
  
  requestDirectoryAccess(dirName?: string): Promise<DirectoryHandle>;
  
  watchFile(path: string, callback: (change: FileSystemChange) => void): Promise<FileSystemWatcher>;
  watchDirectory(path: string, callback: (changes: FileSystemChange[]) => void): Promise<FileSystemWatcher>;
  
  copyFile(srcPath: string, destPath: string): Promise<void>;
  moveFile(srcPath: string, destPath: string): Promise<void>;
  
  isSupported(): boolean;
  hasPermission(handle: DirectoryHandle): Promise<FileSystemPermission>;
  requestPermission(handle: DirectoryHandle): Promise<FileSystemPermission>;
}

export abstract class BaseFileSystemAPI implements FileSystemAPI {
  protected rootHandle: DirectoryHandle | null = null;
  
  abstract readFile(path: string): Promise<string>;
  abstract writeFile(path: string, data: string): Promise<void>;
  abstract readBinaryFile(path: string): Promise<ArrayBuffer>;
  abstract writeBinaryFile(path: string, data: ArrayBuffer): Promise<void>;
  
  abstract deleteFile(path: string): Promise<void>;
  abstract exists(path: string): Promise<boolean>;
  abstract stat(path: string): Promise<FileSystemStats>;
  
  abstract createDirectory(path: string): Promise<void>;
  abstract deleteDirectory(path: string, recursive?: boolean): Promise<void>;
  abstract readDirectory(path: string): Promise<string[]>;
  
  abstract requestDirectoryAccess(dirName?: string): Promise<DirectoryHandle>;
  
  abstract watchFile(path: string, callback: (change: FileSystemChange) => void): Promise<FileSystemWatcher>;
  abstract watchDirectory(path: string, callback: (changes: FileSystemChange[]) => void): Promise<FileSystemWatcher>;
  
  abstract copyFile(srcPath: string, destPath: string): Promise<void>;
  abstract moveFile(srcPath: string, destPath: string): Promise<void>;
  
  abstract isSupported(): boolean;
  abstract hasPermission(handle: DirectoryHandle): Promise<FileSystemPermission>;
  abstract requestPermission(handle: DirectoryHandle): Promise<FileSystemPermission>;
  
  protected createError(message: string, code: string, path?: string, cause?: Error): FileSystemError {
    const error = new Error(message) as FileSystemError;
    error.code = code;
    error.path = path;
    error.cause = cause;
    return error;
  }
  
  protected normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\//, '');
  }
  
  protected splitPath(path: string): string[] {
    const normalized = this.normalizePath(path);
    return normalized ? normalized.split('/') : [];
  }
  
  protected async resolveHandle(path: string): Promise<FileSystemHandle> {
    if (!this.rootHandle) {
      throw this.createError('No root directory handle available', 'NO_ROOT_HANDLE');
    }
    
    const parts = this.splitPath(path);
    if (parts.length === 0) {
      return this.rootHandle;
    }
    
    let currentHandle: FileSystemHandle = this.rootHandle;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      
      if (currentHandle.kind !== 'directory') {
        throw this.createError(`Path component '${part}' is not a directory`, 'NOT_DIRECTORY', path);
      }
      
      try {
        const dirHandle = currentHandle as DirectoryHandle;
        
        if (isLast) {
          try {
            currentHandle = await dirHandle.getFileHandle(part);
          } catch {
            currentHandle = await dirHandle.getDirectoryHandle(part);
          }
        } else {
          currentHandle = await dirHandle.getDirectoryHandle(part);
        }
      } catch (error) {
        throw this.createError(`Path '${path}' not found`, 'NOT_FOUND', path, error as Error);
      }
    }
    
    return currentHandle;
  }
}