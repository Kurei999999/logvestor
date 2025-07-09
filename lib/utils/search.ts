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
    
    // Search in tags
    if (trade.tags?.some(tag => tag.toLowerCase().includes(normalizedSearch))) {
      return true;
    }
    
    // Search in action
    if (trade.action.toLowerCase().includes(normalizedSearch)) {
      return true;
    }
    
    // Search in numeric fields (convert to string for comparison)
    const numericFields = [
      trade.quantity.toString(),
      trade.price.toString(),
      trade.commission?.toString() || '',
      trade.pnl?.toString() || '',
    ];
    
    if (numericFields.some(field => field.includes(normalizedSearch))) {
      return true;
    }
    
    // Search in date (various formats)
    const dateStr = new Date(trade.date).toLocaleDateString();
    const isoDateStr = trade.date;
    if (dateStr.toLowerCase().includes(normalizedSearch) || 
        isoDateStr.includes(normalizedSearch)) {
      return true;
    }
    
    // Search in calculated fields
    const totalValue = (trade.quantity * trade.price).toString();
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