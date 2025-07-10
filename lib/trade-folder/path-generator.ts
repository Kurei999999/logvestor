/**
 * Trade folder path generation utilities for date-based structure with sequence numbers
 * Format: trades/{year}/{ticker}_{date}_{sequence}/
 */

interface FileSystemItem {
  name: string;
  type: 'file' | 'directory';
}

interface FileServiceResult {
  success: boolean;
  data?: FileSystemItem[];
  error?: string;
}

export interface TradeFolderConfig {
  ticker: string;
  date: string; // YYYY-MM-DD format
  sequence: number; // 1, 2, 3... (will be padded to 001, 002, 003...)
}

export interface TradeFolderInfo {
  fullPath: string;
  relativePath: string;
  year: string;
  folderName: string;
  ticker: string;
  date: string;
  sequence: number;
}

/**
 * Generate trade folder path with date-based structure and sequence number
 */
export function generateTradeFolderPath(config: TradeFolderConfig): TradeFolderInfo {
  const year = config.date.split('-')[0];
  const monthDay = config.date.substring(5); // Extract MM-DD from YYYY-MM-DD
  const sequence = config.sequence.toString().padStart(3, '0');
  const folderName = `${config.ticker}_${monthDay}_${sequence}`;
  const relativePath = `trades/${year}/${folderName}`;
  
  return {
    fullPath: relativePath, // Will be combined with base path by caller
    relativePath,
    year,
    folderName,
    ticker: config.ticker,
    date: config.date,
    sequence: config.sequence
  };
}

/**
 * Parse folder name to extract trade information
 * Example: "AAPL_01-15_001" -> { ticker: "AAPL", date: "2025-01-15", sequence: 1 }
 * Note: Year must be provided separately from parent folder context
 */
export function parseTradeFolderName(folderName: string, year?: string): TradeFolderConfig | null {
  // New pattern: TICKER_MM-DD_SEQ
  const newPattern = /^([A-Z]+)_(\d{2}-\d{2})_(\d{3})$/;
  const newMatch = folderName.match(newPattern);
  
  if (newMatch && year) {
    return {
      ticker: newMatch[1],
      date: `${year}-${newMatch[2]}`, // Reconstruct full date
      sequence: parseInt(newMatch[3], 10)
    };
  }
  
  // Fallback to old pattern for backward compatibility
  const oldPattern = /^([A-Z]+)_(\d{4}-\d{2}-\d{2})_(\d{3})$/;
  const oldMatch = folderName.match(oldPattern);
  
  if (oldMatch) {
    return {
      ticker: oldMatch[1],
      date: oldMatch[2],
      sequence: parseInt(oldMatch[3], 10)
    };
  }
  
  return null;
}

/**
 * Get the base trade directory path for a given year
 */
export function getYearTradePath(year: string): string {
  return `trades/${year}`;
}

/**
 * Get all years that have trade data
 */
export async function getTradeYears(fileService: any): Promise<string[]> {
  try {
    const result: FileServiceResult = await fileService.readDir('trades');
    if (!result.success || !result.data) {
      return [];
    }
    
    return result.data
      .filter((item: FileSystemItem) => item.type === 'directory' && /^\d{4}$/.test(item.name))
      .map((item: FileSystemItem) => item.name)
      .sort((a: string, b: string) => b.localeCompare(a)); // Latest year first
  } catch (error) {
    console.error('Error getting trade years:', error);
    return [];
  }
}

/**
 * Get all trade folders for a specific year and ticker
 */
export async function getTradeFoldersForTicker(
  fileService: any,
  year: string,
  ticker: string
): Promise<TradeFolderInfo[]> {
  try {
    const yearPath = getYearTradePath(year);
    const result: FileServiceResult = await fileService.readDir(yearPath);
    
    if (!result.success || !result.data) {
      return [];
    }
    
    const allDirectories = result.data.filter((item: FileSystemItem) => item.type === 'directory');
    
    const tickerDirectories = allDirectories
      .map((item: FileSystemItem) => item.name)
      .filter((name: string) => name.startsWith(`${ticker}_`));
    
    const folders = tickerDirectories
      .map((name: string) => {
        const config = parseTradeFolderName(name, year);
        if (!config) return null;
        return generateTradeFolderPath(config);
      })
      .filter(Boolean) as TradeFolderInfo[];
    
    // Sort by date and sequence
    return folders.sort((a: TradeFolderInfo, b: TradeFolderInfo) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.sequence - a.sequence;
    });
  } catch (error) {
    console.error('Error getting trade folders for ticker:', error);
    return [];
  }
}

/**
 * Get the next sequence number for a ticker on a specific date
 */
export async function getNextSequenceNumber(
  fileService: any,
  ticker: string,
  date: string
): Promise<number> {
  try {
    const year = date.split('-')[0];
    const yearPath = getYearTradePath(year);
    const result: FileServiceResult = await fileService.readDir(yearPath);
    
    if (!result.success || !result.data) {
      return 1; // First trade
    }
    
    const monthDay = date.substring(5); // Extract MM-DD from YYYY-MM-DD
    const pattern = `${ticker}_${monthDay}_`;
    const existingFolders = result.data
      .filter((item: FileSystemItem) => item.type === 'directory' && item.name.startsWith(pattern))
      .map((item: FileSystemItem) => item.name);
    
    if (existingFolders.length === 0) {
      return 1; // First trade for this ticker/date
    }
    
    const maxSequence = existingFolders
      .map((name: string) => {
        const config = parseTradeFolderName(name, year);
        return config ? config.sequence : 0;
      })
      .reduce((max: number, current: number) => Math.max(max, current), 0);
    
    return maxSequence + 1;
  } catch (error) {
    console.error('Error getting next sequence number:', error);
    return 1;
  }
}

/**
 * Create a new trade folder with automatic sequence number assignment
 */
export async function createTradeFolderWithSequence(
  fileService: any,
  ticker: string,
  date: string,
  basePath: string = ''
): Promise<TradeFolderInfo | null> {
  try {
    const sequence = await getNextSequenceNumber(fileService, ticker, date);
    const folderInfo = generateTradeFolderPath({ ticker, date, sequence });
    const fullPath = basePath ? `${basePath}/${folderInfo.relativePath}` : folderInfo.relativePath;
    
    // Ensure base trades directory exists
    const tradesPath = basePath ? `${basePath}/trades` : 'trades';
    const tradesResult = await fileService.createDir(tradesPath);
    if (!tradesResult.success) {
      console.error('Failed to create trades directory:', tradesResult.error);
    }
    
    // Ensure year directory exists
    const yearPath = basePath ? `${basePath}/trades/${folderInfo.year}` : `trades/${folderInfo.year}`;
    const yearResult = await fileService.createDir(yearPath);
    if (!yearResult.success) {
      console.error('Failed to create year directory:', yearResult.error);
    }
    
    // Create trade folder
    const createResult = await fileService.createDir(fullPath);
    if (!createResult.success) {
      console.error('Failed to create trade folder:', createResult.error);
      return null;
    }
    
    // Create images subdirectory
    const imagesPath = `${fullPath}/images`;
    const imagesResult = await fileService.createDir(imagesPath);
    if (!imagesResult.success) {
      console.error('Failed to create images directory:', imagesResult.error);
    }
    
    return {
      ...folderInfo,
      fullPath
    };
  } catch (error) {
    console.error('Error creating trade folder with sequence:', error);
    return null;
  }
}