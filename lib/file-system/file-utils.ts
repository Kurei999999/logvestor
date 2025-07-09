import { FileSystemItem } from '@/types/app';

export class FileUtils {
  static async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = (e) => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(file);
    });
  }

  static async readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = (e) => {
        reject(new Error('Failed to read file as data URL'));
      };
      reader.readAsDataURL(file);
    });
  }

  static validateImageFile(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(file.type);
  }

  static validateCSVFile(file: File): boolean {
    const allowedTypes = ['text/csv', 'application/csv', 'text/plain'];
    const allowedExtensions = ['.csv', '.txt'];
    
    return allowedTypes.includes(file.type) || 
           allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }

  static validateMarkdownFile(file: File): boolean {
    const allowedTypes = ['text/markdown', 'text/plain'];
    const allowedExtensions = ['.md', '.markdown'];
    
    return allowedTypes.includes(file.type) || 
           allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  static generateFileName(baseName: string, extension: string, existingNames: string[]): string {
    let fileName = `${baseName}.${extension}`;
    let counter = 1;
    
    while (existingNames.includes(fileName)) {
      fileName = `${baseName}_${counter}.${extension}`;
      counter++;
    }
    
    return fileName;
  }

  static createFileSystemItem(name: string, path: string, type: 'file' | 'directory', size?: number): FileSystemItem {
    return {
      name,
      path,
      type,
      size,
      lastModified: new Date().toISOString(),
      children: type === 'directory' ? [] : undefined
    };
  }

  static sortFileSystemItems(items: FileSystemItem[], sortBy: 'name' | 'size' | 'lastModified' = 'name'): FileSystemItem[] {
    return [...items].sort((a, b) => {
      // Directories first
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return (a.size || 0) - (b.size || 0);
        case 'lastModified':
          return new Date(a.lastModified || 0).getTime() - new Date(b.lastModified || 0).getTime();
        default:
          return 0;
      }
    });
  }

  static filterFileSystemItems(items: FileSystemItem[], filter: string): FileSystemItem[] {
    if (!filter) return items;
    
    const lowercaseFilter = filter.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(lowercaseFilter) ||
      item.path.toLowerCase().includes(lowercaseFilter)
    );
  }

  static async handleFileUpload(files: FileList | File[], allowedTypes: string[] = []): Promise<File[]> {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    
    for (const file of fileArray) {
      if (allowedTypes.length === 0 || allowedTypes.includes(file.type)) {
        validFiles.push(file);
      }
    }
    
    return validFiles;
  }

  static downloadFile(content: string, fileName: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}