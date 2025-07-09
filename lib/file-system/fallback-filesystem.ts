import { 
  BaseFileSystemAPI, 
  DirectoryHandle, 
  FileHandle, 
  FileSystemStats, 
  FileSystemChange, 
  FileSystemWatcher, 
  FileSystemPermission 
} from './filesystem-api';

class FallbackFileSystemWatcher implements FileSystemWatcher {
  constructor(
    private path: string,
    private isDirectory: boolean,
    public onChange: (changes: FileSystemChange[]) => void
  ) {}
  
  async start(): Promise<void> {
    console.warn('File watching not supported in fallback mode');
  }
  
  async stop(): Promise<void> {
    // No-op in fallback mode
  }
}

export class FallbackFileSystemAPI extends BaseFileSystemAPI {
  private virtualFiles: Map<string, string> = new Map();
  private virtualDirs: Set<string> = new Set();
  
  constructor() {
    super();
    this.virtualDirs.add('');
  }
  
  isSupported(): boolean {
    return true;
  }
  
  async requestDirectoryAccess(dirName?: string): Promise<DirectoryHandle> {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    
    return new Promise((resolve, reject) => {
      input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          await this.loadFilesFromInput(files);
          resolve(this.createMockDirectoryHandle(dirName || 'selected-directory'));
        } else {
          reject(this.createError('No directory selected', 'USER_CANCELLED'));
        }
      };
      
      input.oncancel = () => {
        reject(this.createError('User cancelled directory selection', 'USER_CANCELLED'));
      };
      
      input.click();
    });
  }
  
  private async loadFilesFromInput(files: FileList): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = file.webkitRelativePath || file.name;
      
      if (file.type.startsWith('text/') || file.name.endsWith('.json') || file.name.endsWith('.md')) {
        const content = await file.text();
        this.virtualFiles.set(path, content);
      } else {
        const content = await file.arrayBuffer();
        this.virtualFiles.set(path, this.arrayBufferToBase64(content));
      }
      
      const dirPath = path.substring(0, path.lastIndexOf('/'));
      if (dirPath) {
        this.addDirectoryPath(dirPath);
      }
    }
  }
  
  private addDirectoryPath(path: string): void {
    const parts = path.split('/');
    let currentPath = '';
    
    for (const part of parts) {
      if (currentPath) {
        currentPath += '/';
      }
      currentPath += part;
      this.virtualDirs.add(currentPath);
    }
  }
  
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  
  private createMockDirectoryHandle(name: string): DirectoryHandle {
    return {
      name,
      kind: 'directory'
    } as DirectoryHandle;
  }
  
  async hasPermission(handle: DirectoryHandle): Promise<FileSystemPermission> {
    return { state: 'granted' };
  }
  
  async requestPermission(handle: DirectoryHandle): Promise<FileSystemPermission> {
    return { state: 'granted' };
  }
  
  async readFile(path: string): Promise<string> {
    const normalizedPath = this.normalizePath(path);
    
    if (!this.virtualFiles.has(normalizedPath)) {
      throw this.createError(`File not found: ${path}`, 'NOT_FOUND', path);
    }
    
    const content = this.virtualFiles.get(normalizedPath)!;
    
    try {
      atob(content);
      throw this.createError(`Cannot read binary file as text: ${path}`, 'BINARY_FILE', path);
    } catch (e) {
      return content;
    }
  }
  
  async writeFile(path: string, data: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    this.virtualFiles.set(normalizedPath, data);
    
    const dirPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
    if (dirPath) {
      this.addDirectoryPath(dirPath);
    }
    
    this.downloadFile(normalizedPath.split('/').pop()!, data);
  }
  
  async readBinaryFile(path: string): Promise<ArrayBuffer> {
    const normalizedPath = this.normalizePath(path);
    
    if (!this.virtualFiles.has(normalizedPath)) {
      throw this.createError(`File not found: ${path}`, 'NOT_FOUND', path);
    }
    
    const content = this.virtualFiles.get(normalizedPath)!;
    
    try {
      return this.base64ToArrayBuffer(content);
    } catch (e) {
      throw this.createError(`Cannot read text file as binary: ${path}`, 'TEXT_FILE', path);
    }
  }
  
  async writeBinaryFile(path: string, data: ArrayBuffer): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    const base64Content = this.arrayBufferToBase64(data);
    this.virtualFiles.set(normalizedPath, base64Content);
    
    const dirPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
    if (dirPath) {
      this.addDirectoryPath(dirPath);
    }
    
    const blob = new Blob([data]);
    this.downloadBlob(normalizedPath.split('/').pop()!, blob);
  }
  
  private downloadFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    this.downloadBlob(filename, blob);
  }
  
  private downloadBlob(filename: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  async deleteFile(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    
    if (!this.virtualFiles.has(normalizedPath)) {
      throw this.createError(`File not found: ${path}`, 'NOT_FOUND', path);
    }
    
    this.virtualFiles.delete(normalizedPath);
  }
  
  async exists(path: string): Promise<boolean> {
    const normalizedPath = this.normalizePath(path);
    return this.virtualFiles.has(normalizedPath) || this.virtualDirs.has(normalizedPath);
  }
  
  async stat(path: string): Promise<FileSystemStats> {
    const normalizedPath = this.normalizePath(path);
    
    if (this.virtualFiles.has(normalizedPath)) {
      const content = this.virtualFiles.get(normalizedPath)!;
      const size = new TextEncoder().encode(content).length;
      
      return {
        size,
        created: new Date(),
        modified: new Date(),
        isDirectory: false,
        isFile: true
      };
    } else if (this.virtualDirs.has(normalizedPath)) {
      return {
        size: 0,
        created: new Date(),
        modified: new Date(),
        isDirectory: true,
        isFile: false
      };
    } else {
      throw this.createError(`Path not found: ${path}`, 'NOT_FOUND', path);
    }
  }
  
  async createDirectory(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    this.addDirectoryPath(normalizedPath);
  }
  
  async deleteDirectory(path: string, recursive: boolean = false): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    
    if (!this.virtualDirs.has(normalizedPath)) {
      throw this.createError(`Directory not found: ${path}`, 'NOT_FOUND', path);
    }
    
    if (recursive) {
      const toDelete: string[] = [];
      
      for (const filePath of this.virtualFiles.keys()) {
        if (filePath.startsWith(normalizedPath + '/')) {
          toDelete.push(filePath);
        }
      }
      
      for (const filePath of toDelete) {
        this.virtualFiles.delete(filePath);
      }
      
      for (const dirPath of this.virtualDirs) {
        if (dirPath.startsWith(normalizedPath + '/')) {
          this.virtualDirs.delete(dirPath);
        }
      }
    }
    
    this.virtualDirs.delete(normalizedPath);
  }
  
  async readDirectory(path: string): Promise<string[]> {
    const normalizedPath = this.normalizePath(path);
    
    if (!this.virtualDirs.has(normalizedPath)) {
      throw this.createError(`Directory not found: ${path}`, 'NOT_FOUND', path);
    }
    
    const entries = new Set<string>();
    const pathPrefix = normalizedPath ? normalizedPath + '/' : '';
    
    for (const filePath of this.virtualFiles.keys()) {
      if (filePath.startsWith(pathPrefix)) {
        const relativePath = filePath.substring(pathPrefix.length);
        const firstComponent = relativePath.split('/')[0];
        if (firstComponent) {
          entries.add(firstComponent);
        }
      }
    }
    
    for (const dirPath of this.virtualDirs) {
      if (dirPath.startsWith(pathPrefix) && dirPath !== normalizedPath) {
        const relativePath = dirPath.substring(pathPrefix.length);
        const firstComponent = relativePath.split('/')[0];
        if (firstComponent) {
          entries.add(firstComponent);
        }
      }
    }
    
    return Array.from(entries).sort();
  }
  
  async watchFile(path: string, callback: (change: FileSystemChange) => void): Promise<FileSystemWatcher> {
    return new FallbackFileSystemWatcher(path, false, (changes) => {
      if (changes.length > 0) {
        callback(changes[0]);
      }
    });
  }
  
  async watchDirectory(path: string, callback: (changes: FileSystemChange[]) => void): Promise<FileSystemWatcher> {
    return new FallbackFileSystemWatcher(path, true, callback);
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