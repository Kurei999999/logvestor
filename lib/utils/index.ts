import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^\w\s.-]/gi, '').replace(/\s+/g, '_');
}

export function parseNumber(value: string | number, options?: {
  decimalSeparator?: string;
  thousandsSeparator?: string;
}): number {
  if (typeof value === 'number') return value;
  
  let cleanValue = value.toString();
  
  if (options?.thousandsSeparator) {
    cleanValue = cleanValue.replace(new RegExp(`\\${options.thousandsSeparator}`, 'g'), '');
  }
  
  if (options?.decimalSeparator && options.decimalSeparator !== '.') {
    cleanValue = cleanValue.replace(options.decimalSeparator, '.');
  }
  
  return parseFloat(cleanValue) || 0;
}