import { Trade } from '@/types/trade';

export interface TradeAnalyticsData {
  totalPnL: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
  netPnL: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  avgHoldingPeriod: number;
  monthlyPnL: Record<string, number>;
  tickerPnL: Record<string, number>;
}

export interface PerformanceMetrics {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  bestDay: number;
  worstDay: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortino: number;
  calmarRatio: number;
}

export class TradeAnalytics {
  static calculate(trades: Trade[]): TradeAnalyticsData {
    if (trades.length === 0) {
      return {
        totalPnL: 0,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        totalTrades: 0,
        netPnL: 0,
        profitFactor: 0,
        largestWin: 0,
        largestLoss: 0,
        avgHoldingPeriod: 0,
        monthlyPnL: {},
        tickerPnL: {}
      };
    }

    const tradesWithPnL = trades.filter(t => t.pnl !== undefined && t.pnl !== null);
    const totalPnL = tradesWithPnL.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const netPnL = totalPnL;

    const wins = tradesWithPnL.filter(t => (t.pnl || 0) > 0);
    const losses = tradesWithPnL.filter(t => (t.pnl || 0) < 0);
    
    const totalWins = wins.length;
    const totalLosses = losses.length;
    const winRate = tradesWithPnL.length > 0 ? (totalWins / tradesWithPnL.length) * 100 : 0;
    
    const totalWinAmount = wins.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const totalLossAmount = Math.abs(losses.reduce((sum, trade) => sum + (trade.pnl || 0), 0));
    
    const avgWin = totalWins > 0 ? totalWinAmount / totalWins : 0;
    const avgLoss = totalLosses > 0 ? totalLossAmount / totalLosses : 0;
    
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;
    
    const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl || 0)) : 0;
    const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl || 0)) : 0;

    // Calculate monthly P&L
    const monthlyPnL: Record<string, number> = {};
    tradesWithPnL.forEach(trade => {
      const month = trade.buyDate.substring(0, 7); // YYYY-MM
      monthlyPnL[month] = (monthlyPnL[month] || 0) + (trade.pnl || 0);
    });

    // Calculate ticker P&L
    const tickerPnL: Record<string, number> = {};
    tradesWithPnL.forEach(trade => {
      tickerPnL[trade.ticker] = (tickerPnL[trade.ticker] || 0) + (trade.pnl || 0);
    });

    // Calculate average holding period from trades with holding days data
    const tradesWithHolding = trades.filter(t => t.holdingDays !== undefined && t.holdingDays !== null);
    const avgHoldingPeriod = tradesWithHolding.length > 0 
      ? tradesWithHolding.reduce((sum, trade) => sum + (trade.holdingDays || 0), 0) / tradesWithHolding.length
      : 0;

    return {
      totalPnL,
      totalWins,
      totalLosses,
      winRate,
      avgWin,
      avgLoss,
      totalTrades: tradesWithPnL.length,
      netPnL,
      profitFactor,
      largestWin,
      largestLoss,
      avgHoldingPeriod,
      monthlyPnL,
      tickerPnL
    };
  }

  static calculatePerformanceMetrics(trades: Trade[]): PerformanceMetrics {
    if (trades.length === 0) {
      return {
        totalValue: 0,
        totalGain: 0,
        totalGainPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        bestDay: 0,
        worstDay: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        sharpeRatio: 0,
        sortino: 0,
        calmarRatio: 0
      };
    }

    const tradesWithPnL = trades.filter(t => t.pnl !== undefined && t.pnl !== null);
    const totalGain = tradesWithPnL.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    
    // Calculate drawdown
    let runningTotal = 0;
    let peak = 0;
    let maxDrawdown = 0;
    
    tradesWithPnL.forEach(trade => {
      runningTotal += trade.pnl || 0;
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

    // Calculate consecutive wins/losses
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    tradesWithPnL.forEach(trade => {
      if ((trade.pnl || 0) > 0) {
        currentWins++;
        currentLosses = 0;
        consecutiveWins = Math.max(consecutiveWins, currentWins);
      } else if ((trade.pnl || 0) < 0) {
        currentLosses++;
        currentWins = 0;
        consecutiveLosses = Math.max(consecutiveLosses, currentLosses);
      }
    });

    // Find best and worst days
    const bestDay = tradesWithPnL.length > 0 ? Math.max(...tradesWithPnL.map(t => t.pnl || 0)) : 0;
    const worstDay = tradesWithPnL.length > 0 ? Math.min(...tradesWithPnL.map(t => t.pnl || 0)) : 0;

    return {
      totalValue: totalGain,
      totalGain,
      totalGainPercent: 0, // Would need initial capital to calculate
      dayChange: 0, // Would need daily data
      dayChangePercent: 0,
      bestDay,
      worstDay,
      consecutiveWins,
      consecutiveLosses,
      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio: 0, // Would need risk-free rate and volatility
      sortino: 0,
      calmarRatio: 0
    };
  }

  static getTopPerformers(trades: Trade[], limit: number = 5): Trade[] {
    return trades
      .filter(t => t.pnl !== undefined && t.pnl !== null)
      .sort((a, b) => (b.pnl || 0) - (a.pnl || 0))
      .slice(0, limit);
  }

  static getWorstPerformers(trades: Trade[], limit: number = 5): Trade[] {
    return trades
      .filter(t => t.pnl !== undefined && t.pnl !== null)
      .sort((a, b) => (a.pnl || 0) - (b.pnl || 0))
      .slice(0, limit);
  }

  static getTradesByTicker(trades: Trade[]): Record<string, Trade[]> {
    const byTicker: Record<string, Trade[]> = {};
    trades.forEach(trade => {
      if (!byTicker[trade.ticker]) {
        byTicker[trade.ticker] = [];
      }
      byTicker[trade.ticker].push(trade);
    });
    return byTicker;
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  static formatPercent(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }
}