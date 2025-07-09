import { PathManager } from './path-manager';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedExtensions?: string[];
  requireContent?: boolean;
  validatePath?: boolean;
  validateJSON?: boolean;
  validateMarkdown?: boolean;
}

export class FileValidator {
  private static readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  private static readonly ALLOWED_TEXT_EXTENSIONS = ['.md', '.txt', '.json', '.csv'];
  
  static validateFile(file: File, options: FileValidationOptions = {}): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    this.validateFileSize(file, options.maxSize, result);
    this.validateFileExtension(file, options.allowedExtensions, result);
    
    if (options.requireContent) {
      this.validateFileContentSync(file, result);
    }
    
    if (options.validatePath) {
      this.validateFilePath(file.name, result);
    }
    
    result.isValid = result.errors.length === 0;
    return result;
  }
  
  static async validateFileContent(file: File, options: FileValidationOptions = {}): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    try {
      const content = await file.text();
      
      if (options.validateJSON && this.isJSONFile(file)) {
        this.validateJSONContent(content, result);
      }
      
      if (options.validateMarkdown && this.isMarkdownFile(file)) {
        this.validateMarkdownContent(content, result);
      }
      
      this.validateTextContentInternal(content, result);
      
    } catch (error) {
      result.errors.push('Failed to read file content');
    }
    
    result.isValid = result.errors.length === 0;
    return result;
  }
  
  static validateImageFile(file: File): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    if (!file.type.startsWith('image/')) {
      result.errors.push('File is not an image');
      result.isValid = false;
      return result;
    }
    
    const extension = PathManager.extname(file.name).toLowerCase();
    if (!this.ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
      result.errors.push(`Unsupported image format: ${extension}`);
    }
    
    this.validateFileSize(file, 5 * 1024 * 1024, result); // 5MB limit for images
    
    result.isValid = result.errors.length === 0;
    return result;
  }
  
  static validateCSVFile(file: File): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    const extension = PathManager.extname(file.name).toLowerCase();
    if (extension !== '.csv') {
      result.errors.push('File must have .csv extension');
    }
    
    if (!file.type.includes('csv') && !file.type.includes('text/plain')) {
      result.warnings.push('File MIME type does not indicate CSV format');
    }
    
    this.validateFileSize(file, 50 * 1024 * 1024, result); // 50MB limit for CSV
    
    result.isValid = result.errors.length === 0;
    return result;
  }
  
  static validateMarkdownFile(file: File): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    const extension = PathManager.extname(file.name).toLowerCase();
    if (extension !== '.md') {
      result.errors.push('File must have .md extension');
    }
    
    this.validateFileSize(file, 1024 * 1024, result); // 1MB limit for markdown
    
    result.isValid = result.errors.length === 0;
    return result;
  }
  
  static async validateCSVContent(content: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    if (!content.trim()) {
      result.errors.push('CSV file is empty');
      result.isValid = false;
      return result;
    }
    
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      result.errors.push('CSV file must have at least a header row and one data row');
      result.isValid = false;
      return result;
    }
    
    const headerLine = lines[0];
    const headers = this.parseCSVLine(headerLine);
    
    if (headers.length === 0) {
      result.errors.push('CSV file must have column headers');
      result.isValid = false;
      return result;
    }
    
    const duplicateHeaders = this.findDuplicates(headers);
    if (duplicateHeaders.length > 0) {
      result.warnings.push(`Duplicate column headers found: ${duplicateHeaders.join(', ')}`);
    }
    
    let maxColumns = headers.length;
    let minColumns = headers.length;
    
    for (let i = 1; i < lines.length; i++) {
      const columns = this.parseCSVLine(lines[i]);
      maxColumns = Math.max(maxColumns, columns.length);
      minColumns = Math.min(minColumns, columns.length);
    }
    
    if (maxColumns !== minColumns) {
      result.warnings.push(`Inconsistent number of columns: expected ${headers.length}, found ${minColumns}-${maxColumns}`);
    }
    
    result.isValid = result.errors.length === 0;
    return result;
  }
  
  static validateTradeData(data: any): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    const requiredFields = ['id', 'ticker', 'date', 'action', 'quantity', 'price'];
    const optionalFields = ['commission', 'pnl', 'strategy', 'tags', 'notes'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        result.errors.push(`Missing required field: ${field}`);
      }
    }
    
    if (data.date && !this.isValidDate(data.date)) {
      result.errors.push('Invalid date format');
    }
    
    if (data.action && !['buy', 'sell', 'dividend', 'split'].includes(data.action.toLowerCase())) {
      result.warnings.push(`Unusual action type: ${data.action}`);
    }
    
    if (data.quantity && (isNaN(data.quantity) || data.quantity <= 0)) {
      result.errors.push('Quantity must be a positive number');
    }
    
    if (data.price && (isNaN(data.price) || data.price <= 0)) {
      result.errors.push('Price must be a positive number');
    }
    
    if (data.commission && isNaN(data.commission)) {
      result.errors.push('Commission must be a number');
    }
    
    if (data.pnl && isNaN(data.pnl)) {
      result.errors.push('P&L must be a number');
    }
    
    result.isValid = result.errors.length === 0;
    return result;
  }
  
  private static validateFileSize(file: File, maxSize: number = this.DEFAULT_MAX_SIZE, result: ValidationResult): void {
    if (file.size > maxSize) {
      result.errors.push(`File size ${this.formatFileSize(file.size)} exceeds maximum ${this.formatFileSize(maxSize)}`);
    }
  }
  
  private static validateFileExtension(file: File, allowedExtensions: string[] = [], result: ValidationResult): void {
    if (allowedExtensions.length === 0) return;
    
    const extension = PathManager.extname(file.name).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      result.errors.push(`File extension ${extension} not allowed. Allowed: ${allowedExtensions.join(', ')}`);
    }
  }
  
  private static validateFileContentSync(file: File, result: ValidationResult): void {
    if (file.size === 0) {
      result.errors.push('File is empty');
    }
  }
  
  private static validateFilePath(filename: string, result: ValidationResult): void {
    if (!PathManager.prototype.validatePath(filename)) {
      result.errors.push('Invalid file path or filename');
    }
  }
  
  private static validateJSONContent(content: string, result: ValidationResult): void {
    try {
      JSON.parse(content);
    } catch (error) {
      result.errors.push('Invalid JSON format');
    }
  }
  
  private static validateMarkdownContent(content: string, result: ValidationResult): void {
    if (!content.trim()) {
      result.warnings.push('Markdown file is empty');
      return;
    }
    
    const lines = content.split('\n');
    let hasFrontmatter = false;
    
    if (lines[0] === '---') {
      const endIndex = lines.findIndex((line, index) => index > 0 && line === '---');
      if (endIndex > 0) {
        hasFrontmatter = true;
        const frontmatter = lines.slice(1, endIndex).join('\n');
        
        try {
          const yaml = this.parseSimpleYAML(frontmatter);
          if (yaml.id && yaml.ticker) {
            // Valid trade markdown
          } else {
            result.warnings.push('Markdown frontmatter missing trade fields (id, ticker)');
          }
        } catch (error) {
          result.warnings.push('Invalid frontmatter format');
        }
      }
    }
    
    if (!hasFrontmatter) {
      result.warnings.push('Markdown file missing frontmatter');
    }
  }
  
  private static validateTextContentInternal(content: string, result: ValidationResult): void {
    if (content.includes('\0')) {
      result.errors.push('File contains null bytes (binary file?)');
    }
    
    const lines = content.split('\n');
    if (lines.length > 100000) {
      result.warnings.push('File has very many lines, may impact performance');
    }
  }
  
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  private static findDuplicates(arr: string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    
    for (const item of arr) {
      if (seen.has(item)) {
        duplicates.add(item);
      } else {
        seen.add(item);
      }
    }
    
    return Array.from(duplicates);
  }
  
  private static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString.includes('-');
  }
  
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  private static isJSONFile(file: File): boolean {
    return PathManager.extname(file.name).toLowerCase() === '.json';
  }
  
  private static isMarkdownFile(file: File): boolean {
    return PathManager.extname(file.name).toLowerCase() === '.md';
  }
  
  private static parseSimpleYAML(content: string): any {
    const result: any = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.includes(':')) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        result[key.trim()] = value;
      }
    }
    
    return result;
  }
}