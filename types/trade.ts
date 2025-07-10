export interface Trade {
  id: string;
  ticker: string;
  buyDate: string;
  buyPrice: number;
  quantity: number;
  sellDate?: string;
  sellPrice?: number;
  pnl?: number; // Auto-calculated: (sellPrice - buyPrice) * quantity
  holdingDays?: number; // Auto-calculated: days between buyDate and sellDate
  commission?: number;
  tags?: string[];
  notesFiles?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TradeMarkdown {
  id: string;
  tradeId: string;
  fileName: string;
  filePath: string;
  content: string;
  frontmatter: {
    buyDate: string;
    ticker: string;
    quantity?: number;
    buyPrice?: number;
    sellDate?: string;
    sellPrice?: number;
    tags?: string[];
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TradeImage {
  id: string;
  tradeId: string;
  fileName: string;
  filePath: string;
  relativePath: string;
  caption?: string;
  tags?: string[];
  createdAt: string;
}

export interface TradeFolder {
  id: string;
  name: string;
  path: string;
  tradeId: string;
  markdownFiles: TradeMarkdown[];
  images: TradeImage[];
  createdAt: string;
  updatedAt: string;
}