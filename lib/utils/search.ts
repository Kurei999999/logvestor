import { Trade } from '@/types/trade';

export function searchTrades(trades: Trade[], searchTerm: string): Trade[] {
  if (!searchTerm.trim()) {
    return trades;
  }

  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  return trades.filter(trade => {
    // Search in ticker
    if (trade.ticker.toLowerCase().includes(normalizedSearch)) {
      return true;
    }
    
    // Search in numeric fields (convert to string for comparison)
    const numericFields = [
      trade.quantity?.toString() || '',
      trade.buyPrice?.toString() || '',
      trade.sellPrice?.toString() || '',
      trade.pnl?.toString() || '',
    ];
    
    if (numericFields.some(field => field.includes(normalizedSearch))) {
      return true;
    }
    
    // Search in dates (various formats)
    const buyDateStr = trade.buyDate ? new Date(trade.buyDate).toLocaleDateString() : '';
    const sellDateStr = trade.sellDate ? new Date(trade.sellDate).toLocaleDateString() : '';
    if (buyDateStr.toLowerCase().includes(normalizedSearch) || 
        sellDateStr.toLowerCase().includes(normalizedSearch) ||
        trade.buyDate?.includes(normalizedSearch) ||
        trade.sellDate?.includes(normalizedSearch)) {
      return true;
    }
    
    // Search in calculated fields
    const totalValue = trade.quantity && trade.buyPrice ? (trade.quantity * trade.buyPrice).toString() : '';
    if (totalValue.includes(normalizedSearch)) {
      return true;
    }
    
    return false;
  });
}

export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) {
    return text;
  }
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}