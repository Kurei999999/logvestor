export interface Trade {
  id: string;
  date: string;
  ticker: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  commission?: number;
  pnl?: number;
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
    date: string;
    ticker: string;
    action: 'buy' | 'sell';
    quantity?: number;
    price?: number;
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