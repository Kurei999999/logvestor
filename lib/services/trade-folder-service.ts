import { Trade, TradeFolder, TradeMarkdown, TradeImage } from '@/types/trade';
import { AppConfig } from '@/types/app';
import { ElectronFileService } from './electron/electron-file-service';
import path from 'path';

export class TradeFolderService {
  private electronService: ElectronFileService;
  private config: AppConfig | null = null;

  constructor() {
    this.electronService = new ElectronFileService();
  }

  /**
   * Initialize the service with current configuration
   */
  async initialize(): Promise<void> {
    const configResult = await this.electronService.getConfig();
    if (configResult.success) {
      this.config = configResult.data!;
    }
  }

  /**
   * Generate folder name for a trade based on configuration pattern
   */
  generateTradeFolderName(trade: Trade): string {
    const pattern = this.config?.markdownFileNamePattern || '{tradeId}_{ticker}_{date}';
    
    return pattern
      .replace('{tradeId}', trade.id)
      .replace('{ticker}', trade.ticker)
      .replace('{date}', trade.buyDate)
      .replace('{type}', 'folder');
  }

  /**
   * Generate file name for markdown based on configuration pattern
   */
  generateMarkdownFileName(trade: Trade, type: string = 'memo'): string {
    const pattern = this.config?.markdownFileNamePattern || '{tradeId}_{ticker}_{date}_{type}';
    
    return pattern
      .replace('{tradeId}', trade.id)
      .replace('{ticker}', trade.ticker)
      .replace('{date}', trade.buyDate)
      .replace('{type}', type) + '.md';
  }

  /**
   * Get full path for trade folder
   */
  getTradeFolderPath(trade: Trade): string {
    if (!this.config) {
      throw new Error('Service not initialized');
    }

    const folderName = this.generateTradeFolderName(trade);
    return path.join(
      this.config.dataDirectory,
      this.config.markdownDirectory || 'trades',
      folderName
    );
  }

  /**
   * Create trade folder structure
   */
  async createTradeFolder(trade: Trade): Promise<{ success: boolean; folderPath?: string; error?: string }> {
    try {
      const folderPath = this.getTradeFolderPath(trade);
      
      // Check if folder already exists
      const existsResult = await window.electronAPI.fs.exists(folderPath);
      if (!existsResult.success) {
        return { success: false, error: existsResult.error };
      }

      if (!existsResult.data) {
        // Create folder
        const createResult = await window.electronAPI.fs.createDir(folderPath);
        if (!createResult.success) {
          return { success: false, error: createResult.error };
        }

        // Create images subfolder
        const imagesPath = path.join(folderPath, 'images');
        const createImagesResult = await window.electronAPI.fs.createDir(imagesPath);
        if (!createImagesResult.success) {
          return { success: false, error: createImagesResult.error };
        }
      }

      return { success: true, folderPath };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create initial markdown file for a trade
   */
  async createInitialMarkdown(trade: Trade, type: string = 'entry'): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const folderPath = this.getTradeFolderPath(trade);
      const fileName = this.generateMarkdownFileName(trade, type);
      const filePath = path.join(folderPath, fileName);

      // Generate frontmatter
      const frontmatter = {
        tradeId: trade.id,
        ticker: trade.ticker,
        buyDate: trade.buyDate,
        buyPrice: trade.buyPrice,
        quantity: trade.quantity,
        sellDate: trade.sellDate || '',
        sellPrice: trade.sellPrice || '',
        type: type,
        tags: trade.tags || [],
        createdAt: new Date().toISOString()
      };

      // Generate markdown content
      const content = `---
${Object.entries(frontmatter)
  .map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
    }
    return `${key}: ${typeof value === 'string' ? `"${value}"` : value}`;
  })
  .join('\n')}
---

# ${trade.ticker} ${type === 'entry' ? 'Entry' : type === 'exit' ? 'Exit' : 'Analysis'}

## Trade Details
- **Ticker**: ${trade.ticker}
- **Buy Date**: ${trade.buyDate}
- **Buy Price**: $${trade.buyPrice}
- **Quantity**: ${trade.quantity}
${trade.sellDate ? `- **Sell Date**: ${trade.sellDate}` : ''}
${trade.sellPrice ? `- **Sell Price**: $${trade.sellPrice}` : ''}
${trade.pnl ? `- **P&L**: $${trade.pnl}` : ''}

## Analysis

<!-- Add your analysis here -->

## Notes

<!-- Add your notes here -->

## Images

<!-- Link to images in the images/ folder -->
`;

      const writeResult = await window.electronAPI.fs.writeFile(filePath, content);
      if (!writeResult.success) {
        return { success: false, error: writeResult.error };
      }

      return { success: true, filePath };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Load TradeFolder structure for a trade
   */
  async loadTradeFolder(trade: Trade): Promise<{ success: boolean; data?: TradeFolder; error?: string }> {
    try {
      const folderPath = this.getTradeFolderPath(trade);
      
      // Check if folder exists
      const existsResult = await window.electronAPI.fs.exists(folderPath);
      if (!existsResult.success || !existsResult.data) {
        return { success: false, error: 'Trade folder does not exist' };
      }

      // Read folder contents
      const readResult = await window.electronAPI.fs.readDir(folderPath);
      if (!readResult.success) {
        return { success: false, error: readResult.error };
      }

      const items = readResult.data || [];
      const markdownFiles: TradeMarkdown[] = [];
      const images: TradeImage[] = [];

      // Process files
      for (const item of items) {
        if (item.type === 'file' && item.name.endsWith('.md')) {
          // Load markdown file
          const mdResult = await this.loadMarkdownFile(path.join(folderPath, item.name), trade.id);
          if (mdResult.success && mdResult.data) {
            markdownFiles.push(mdResult.data);
          }
        } else if (item.type === 'directory' && item.name === 'images') {
          // Load images from images folder
          const imagesResult = await this.loadTradeImages(path.join(folderPath, 'images'), trade.id);
          if (imagesResult.success && imagesResult.data) {
            images.push(...imagesResult.data);
          }
        }
      }

      const tradeFolder: TradeFolder = {
        id: trade.id,
        name: path.basename(folderPath),
        path: folderPath,
        tradeId: trade.id,
        markdownFiles,
        images,
        createdAt: items.find(item => item.name.endsWith('.md'))?.lastModified || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return { success: true, data: tradeFolder };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Load a markdown file and parse frontmatter
   */
  private async loadMarkdownFile(filePath: string, tradeId: string): Promise<{ success: boolean; data?: TradeMarkdown; error?: string }> {
    try {
      const readResult = await window.electronAPI.fs.readFile(filePath);
      if (!readResult.success) {
        return { success: false, error: readResult.error };
      }

      const content = readResult.data || '';
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      
      let frontmatter: any = {};
      let markdownContent = content;

      if (frontmatterMatch) {
        try {
          // Simple YAML parsing for frontmatter
          const yamlContent = frontmatterMatch[1];
          const lines = yamlContent.split('\n');
          for (const line of lines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const key = line.substring(0, colonIndex).trim();
              const value = line.substring(colonIndex + 1).trim().replace(/^"(.*)"$/, '$1');
              frontmatter[key] = value;
            }
          }
          markdownContent = frontmatterMatch[2];
        } catch (parseError) {
          console.warn('Failed to parse frontmatter:', parseError);
        }
      }

      const tradeMarkdown: TradeMarkdown = {
        id: `${tradeId}_${path.basename(filePath, '.md')}`,
        tradeId,
        fileName: path.basename(filePath),
        filePath,
        content: markdownContent,
        frontmatter: {
          buyDate: frontmatter.buyDate || '',
          ticker: frontmatter.ticker || '',
          quantity: frontmatter.quantity ? parseInt(frontmatter.quantity) : undefined,
          buyPrice: frontmatter.buyPrice ? parseFloat(frontmatter.buyPrice) : undefined,
          sellDate: frontmatter.sellDate || undefined,
          sellPrice: frontmatter.sellPrice ? parseFloat(frontmatter.sellPrice) : undefined,
          tags: frontmatter.tags ? frontmatter.tags.split(',').map((t: string) => t.trim()) : [],
          ...frontmatter
        },
        createdAt: frontmatter.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return { success: true, data: tradeMarkdown };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Load images from trade images folder
   */
  private async loadTradeImages(imagesPath: string, tradeId: string): Promise<{ success: boolean; data?: TradeImage[]; error?: string }> {
    try {
      const existsResult = await window.electronAPI.fs.exists(imagesPath);
      if (!existsResult.success || !existsResult.data) {
        return { success: true, data: [] }; // No images folder is OK
      }

      const readResult = await window.electronAPI.fs.readDir(imagesPath);
      if (!readResult.success) {
        return { success: false, error: readResult.error };
      }

      const items = readResult.data || [];
      const images: TradeImage[] = [];

      for (const item of items) {
        if (item.type === 'file' && this.isImageFile(item.name)) {
          const image: TradeImage = {
            id: `${tradeId}_${item.name}`,
            tradeId,
            fileName: item.name,
            filePath: path.join(imagesPath, item.name),
            relativePath: `images/${item.name}`,
            caption: '',
            tags: [],
            createdAt: item.lastModified || new Date().toISOString()
          };
          images.push(image);
        }
      }

      return { success: true, data: images };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if file is an image
   */
  private isImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const ext = path.extname(fileName).toLowerCase();
    return imageExtensions.includes(ext);
  }

  /**
   * Update Trade with notesFiles paths
   */
  async updateTradeNotesFiles(trade: Trade): Promise<Trade> {
    const folderResult = await this.loadTradeFolder(trade);
    if (folderResult.success && folderResult.data) {
      const notesFiles = folderResult.data.markdownFiles.map(md => md.fileName);
      return {
        ...trade,
        notesFiles,
        updatedAt: new Date().toISOString()
      };
    }
    return trade;
  }
}

// Export singleton instance
export const tradeFolderService = new TradeFolderService();