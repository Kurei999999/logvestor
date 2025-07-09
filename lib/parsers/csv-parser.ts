import Papa from 'papaparse';
import { CSVData, CSVParseOptions } from '@/types/csv';

export class CSVParser {
  static async parseFile(file: File, options?: CSVParseOptions): Promise<CSVData> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: options?.header ?? true,
        delimiter: options?.delimiter ?? '',
        skipEmptyLines: options?.skipEmptyLines ?? true,
        encoding: options?.encoding ?? 'UTF-8',
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
            return;
          }

          const headers = results.meta.fields || [];
          const rows = results.data as Record<string, string | number>[];
          
          resolve({
            headers,
            rows,
            rawData: results.data as string[][]
          });
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  static async parseText(text: string, options?: CSVParseOptions): Promise<CSVData> {
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: options?.header ?? true,
        delimiter: options?.delimiter ?? '',
        skipEmptyLines: options?.skipEmptyLines ?? true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
            return;
          }

          const headers = results.meta.fields || [];
          const rows = results.data as Record<string, string | number>[];
          
          resolve({
            headers,
            rows,
            rawData: results.data as string[][]
          });
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  static detectDelimiter(text: string): string {
    const sample = text.split('\n')[0];
    const delimiters = [',', ';', '\t', '|'];
    
    let maxCount = 0;
    let bestDelimiter = ',';
    
    for (const delimiter of delimiters) {
      const count = sample.split(delimiter).length - 1;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }
    
    return bestDelimiter;
  }

  static validateHeaders(headers: string[], requiredColumns: string[]): string[] {
    const missing = requiredColumns.filter(col => !headers.includes(col));
    return missing;
  }

  static preview(data: CSVData, limit: number = 5): CSVData {
    return {
      headers: data.headers,
      rows: data.rows.slice(0, limit),
      rawData: data.rawData.slice(0, limit)
    };
  }
}