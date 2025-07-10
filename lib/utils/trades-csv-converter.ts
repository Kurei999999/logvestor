import { Trade } from '@/types/trade';
import { CSVDocument, CSVRecord } from '@/types/csv-viewer';

export function tradesToCSVDocument(trades: Trade[]): CSVDocument {
  const headers = [
    'buyDate',
    'sellDate', 
    'ticker',
    'quantity',
    'buyPrice',
    'sellPrice',
    'pnl',
    'holdingDays',
    'commission',
    'tags'
  ];

  // Handle empty or undefined trades array
  if (!trades || !Array.isArray(trades)) {
    return {
      id: 'trades-document',
      name: 'Trades Data',
      headers,
      records: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const records: CSVRecord[] = trades.map((trade, index) => ({
    id: trade.id,
    rowData: {
      buyDate: trade.buyDate || '',
      sellDate: trade.sellDate || '',
      ticker: trade.ticker || '',
      quantity: trade.quantity?.toString() || '0',
      buyPrice: trade.buyPrice?.toString() || '0',
      sellPrice: trade.sellPrice?.toString() || '',
      pnl: trade.pnl?.toString() || '',
      holdingDays: trade.holdingDays?.toString() || '',
      commission: trade.commission?.toString() || '',
      tags: (trade.tags || []).join(', ')
    },
    metadata: {
      fileName: 'trades.csv',
      importedAt: new Date().toISOString(),
      rowNumber: index + 1
    }
  }));

  return {
    id: 'trades-document',
    name: 'Trades Data',
    headers,
    records,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function csvDocumentToTrades(document: CSVDocument): Trade[] {
  // Handle empty or undefined records
  if (!document?.records || !Array.isArray(document.records)) {
    return [];
  }

  return document.records.map(record => {
    const data = record.rowData;
    
    // Parse numeric values
    const quantity = parseFloat(data.quantity) || 0;
    const buyPrice = parseFloat(data.buyPrice) || 0;
    const sellPrice = data.sellPrice ? parseFloat(data.sellPrice) : undefined;
    const commission = data.commission ? parseFloat(data.commission) : undefined;
    
    // Parse tags
    const tags = data.tags 
      ? data.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
      : [];

    // Auto-calculate P&L and holding days
    let pnl: number | undefined;
    let holdingDays: number | undefined;

    if (sellPrice !== undefined) {
      pnl = (sellPrice - buyPrice) * quantity;
    }

    if (data.sellDate && data.buyDate) {
      const buyDate = new Date(data.buyDate);
      const sellDate = new Date(data.sellDate);
      holdingDays = Math.ceil((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      id: record.id,
      buyDate: data.buyDate,
      sellDate: data.sellDate || undefined,
      ticker: data.ticker,
      quantity,
      buyPrice,
      sellPrice,
      pnl,
      holdingDays,
      commission,
      tags,
      notesFiles: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });
}