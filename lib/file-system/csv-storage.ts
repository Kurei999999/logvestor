import { CSVDocument, CSVRecord, CSVUploadResult } from '@/types/csv-viewer';
import { generateId } from '@/lib/utils';

export class CSVStorage {
  private static readonly STORAGE_KEY = 'csv-documents';
  private static readonly MAX_STORAGE_SIZE = 10 * 1024 * 1024; // 10MB limit

  static loadDocuments(): CSVDocument[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];
      
      const documents = JSON.parse(data);
      return Array.isArray(documents) ? documents : [];
    } catch (error) {
      console.error('Error loading CSV documents:', error);
      return [];
    }
  }

  static saveDocuments(documents: CSVDocument[]): void {
    try {
      const data = JSON.stringify(documents);
      
      // Check storage size
      if (data.length > this.MAX_STORAGE_SIZE) {
        throw new Error('CSV data exceeds storage limit');
      }
      
      localStorage.setItem(this.STORAGE_KEY, data);
    } catch (error) {
      console.error('Error saving CSV documents:', error);
      throw error;
    }
  }

  static saveDocument(document: CSVDocument): void {
    const documents = this.loadDocuments();
    const existingIndex = documents.findIndex(d => d.id === document.id);
    
    if (existingIndex >= 0) {
      documents[existingIndex] = document;
    } else {
      documents.push(document);
    }
    
    this.saveDocuments(documents);
  }

  static deleteDocument(documentId: string): void {
    const documents = this.loadDocuments();
    const filtered = documents.filter(d => d.id !== documentId);
    this.saveDocuments(filtered);
  }

  static getDocument(documentId: string): CSVDocument | null {
    const documents = this.loadDocuments();
    return documents.find(d => d.id === documentId) || null;
  }

  static createDocumentFromFile(file: File, headers: string[], rows: Record<string, any>[]): CSVUploadResult {
    try {
      const now = new Date().toISOString();
      const documentId = generateId();
      
      const records: CSVRecord[] = rows.map((row, index) => ({
        id: generateId(),
        rowData: row,
        metadata: {
          fileName: file.name,
          importedAt: now,
          rowNumber: index + 1
        }
      }));

      const document: CSVDocument = {
        id: documentId,
        name: file.name.replace('.csv', ''),
        headers,
        records,
        createdAt: now,
        updatedAt: now
      };

      this.saveDocument(document);

      return {
        success: true,
        document
      };
    } catch (error) {
      console.error('Error creating CSV document:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  static updateRecord(documentId: string, recordId: string, updates: Partial<CSVRecord>): void {
    const document = this.getDocument(documentId);
    if (!document) return;

    const recordIndex = document.records.findIndex(r => r.id === recordId);
    if (recordIndex === -1) return;

    document.records[recordIndex] = {
      ...document.records[recordIndex],
      ...updates
    };

    document.updatedAt = new Date().toISOString();
    this.saveDocument(document);
  }

  static addRecord(documentId: string, rowData: Record<string, any>): void {
    const document = this.getDocument(documentId);
    if (!document) return;

    const newRecord: CSVRecord = {
      id: generateId(),
      rowData,
      metadata: {
        fileName: document.name,
        importedAt: new Date().toISOString(),
        rowNumber: document.records.length + 1
      }
    };

    document.records.push(newRecord);
    document.updatedAt = new Date().toISOString();
    this.saveDocument(document);
  }

  static deleteRecord(documentId: string, recordId: string): void {
    const document = this.getDocument(documentId);
    if (!document) return;

    document.records = document.records.filter(r => r.id !== recordId);
    document.updatedAt = new Date().toISOString();
    this.saveDocument(document);
  }

  static addColumn(documentId: string, columnName: string, defaultValue: any = ''): void {
    const document = this.getDocument(documentId);
    if (!document) return;

    if (document.headers.includes(columnName)) {
      throw new Error(`Column '${columnName}' already exists`);
    }

    document.headers.push(columnName);
    document.records.forEach(record => {
      record.rowData[columnName] = defaultValue;
    });

    document.updatedAt = new Date().toISOString();
    this.saveDocument(document);
  }

  static deleteColumn(documentId: string, columnName: string): void {
    const document = this.getDocument(documentId);
    if (!document) return;

    document.headers = document.headers.filter(h => h !== columnName);
    document.records.forEach(record => {
      delete record.rowData[columnName];
    });

    document.updatedAt = new Date().toISOString();
    this.saveDocument(document);
  }

  static exportDocument(documentId: string, format: 'csv' | 'json' = 'csv'): string {
    const document = this.getDocument(documentId);
    if (!document) throw new Error('Document not found');

    if (format === 'json') {
      return JSON.stringify(document, null, 2);
    }

    // CSV format
    const headers = document.headers.map(h => `"${h}"`).join(',');
    const rows = document.records.map(record => 
      document.headers.map(header => {
        const value = record.rowData[header] || '';
        return `"${value}"`;
      }).join(',')
    );

    return [headers, ...rows].join('\n');
  }

  static getStorageInfo(): { used: number; available: number; percentage: number } {
    if (typeof window === 'undefined') {
      return { used: 0, available: this.MAX_STORAGE_SIZE, percentage: 0 };
    }
    
    const data = localStorage.getItem(this.STORAGE_KEY) || '';
    const used = new Blob([data]).size;
    const available = this.MAX_STORAGE_SIZE - used;
    const percentage = (used / this.MAX_STORAGE_SIZE) * 100;

    return { used, available, percentage };
  }
}