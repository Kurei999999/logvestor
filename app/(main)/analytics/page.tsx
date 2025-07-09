'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trade } from '@/types/trade';
import { LocalStorage } from '@/lib/file-system/storage';
import { TradeAnalytics } from '@/lib/analytics/trade-analytics';
import { BarChart3, TrendingUp, TrendingDown, Target, DollarSign, Activity, Trophy, AlertTriangle } from 'lucide-react';

export default function AnalyticsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [analytics, setAnalytics] = useState<TradeAnalytics.TradeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const loadedTrades = LocalStorage.loadTrades();
      setTrades(loadedTrades);
      
      if (loadedTrades.length > 0) {
        const analyticsData = TradeAnalytics.calculate(loadedTrades);
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Failed to load trades:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">Loading trading data...</p>
        </div>
      </div>
    );
  }

  const hasData = trades.length > 0 && analytics;
  const topPerformers = hasData ? TradeAnalytics.getTopPerformers(trades, 5) : [];
  const worstPerformers = hasData ? TradeAnalytics.getWorstPerformers(trades, 5) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-2">
          Analyze your trading performance and patterns
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              hasData && analytics.totalPnL > 0 ? 'text-green-600' : 
              hasData && analytics.totalPnL < 0 ? 'text-red-600' : 
              'text-gray-900'
            }`}>
              {hasData ? TradeAnalytics.formatCurrency(analytics.totalPnL) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasData ? `${analytics.totalTrades} trades` : 'Import trades to see analytics'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasData ? TradeAnalytics.formatPercent(analytics.winRate) : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasData ? `${analytics.totalWins}W / ${analytics.totalLosses}L` : 'No trades to analyze'}
            </p>
            {hasData && (
              <div className="mt-2">
                <Progress value={analytics.winRate} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Win</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {hasData ? TradeAnalytics.formatCurrency(analytics.avgWin) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasData ? `Best: ${TradeAnalytics.formatCurrency(analytics.largestWin)}` : 'Average winning trade'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Loss</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {hasData ? TradeAnalytics.formatCurrency(analytics.avgLoss) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasData ? `Worst: ${TradeAnalytics.formatCurrency(analytics.largestLoss)}` : 'Average losing trade'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net P&L</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                analytics.netPnL > 0 ? 'text-green-600' : 
                analytics.netPnL < 0 ? 'text-red-600' : 
                'text-gray-900'
              }`}>
                {TradeAnalytics.formatCurrency(analytics.netPnL)}
              </div>
              <p className="text-xs text-muted-foreground">
                Commissions: {TradeAnalytics.formatCurrency(analytics.totalCommissions)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.profitFactor.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.profitFactor > 1 ? 'Profitable' : 'Unprofitable'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.totalTrades}
              </div>
              <p className="text-xs text-muted-foreground">
                {Object.keys(analytics.tickerPnL).length} unique tickers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risk Warning</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.winRate < 50 ? 'High' : 'Medium'}
              </div>
              <p className="text-xs text-muted-foreground">
                Based on win rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analysis */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
          <TabsTrigger value="worst-performers">Worst Performers</TabsTrigger>
          <TabsTrigger value="by-ticker">By Ticker</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>
                Detailed analysis of your trading performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!hasData ? (
                <div className="text-center py-12">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No Data Available</h3>
                  <p className="text-sm text-gray-600">
                    Import your trading data to see detailed analytics and performance metrics
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-4">Monthly Performance</h4>
                      <div className="space-y-2">
                        {Object.entries(analytics.monthlyPnL)
                          .sort(([a], [b]) => b.localeCompare(a))
                          .slice(0, 6)
                          .map(([month, pnl]) => (
                            <div key={month} className="flex items-center justify-between">
                              <span className="text-sm">{month}</span>
                              <span className={`text-sm font-medium ${
                                pnl > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {TradeAnalytics.formatCurrency(pnl)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-4">Key Statistics</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total P&L</span>
                          <span className={`text-sm font-medium ${
                            analytics.totalPnL > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {TradeAnalytics.formatCurrency(analytics.totalPnL)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Win Rate</span>
                          <span className="text-sm font-medium">
                            {TradeAnalytics.formatPercent(analytics.winRate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Profit Factor</span>
                          <span className="text-sm font-medium">
                            {analytics.profitFactor.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total Commissions</span>
                          <span className="text-sm font-medium text-red-600">
                            {TradeAnalytics.formatCurrency(analytics.totalCommissions)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-performers">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Trades</CardTitle>
              <CardDescription>
                Your most profitable trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topPerformers.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600">No profitable trades found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topPerformers.map((trade, index) => (
                    <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-800' :
                          index === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{trade.ticker}</div>
                          <div className="text-sm text-gray-500">
                            {trade.action.toUpperCase()} • {trade.date}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          {TradeAnalytics.formatCurrency(trade.pnl || 0)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {trade.quantity} shares @ ${trade.price}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="worst-performers">
          <Card>
            <CardHeader>
              <CardTitle>Worst Performing Trades</CardTitle>
              <CardDescription>
                Your most losing trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              {worstPerformers.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600">No losing trades found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {worstPerformers.map((trade, index) => (
                    <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-red-100 text-red-800">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{trade.ticker}</div>
                          <div className="text-sm text-gray-500">
                            {trade.action.toUpperCase()} • {trade.date}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          {TradeAnalytics.formatCurrency(trade.pnl || 0)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {trade.quantity} shares @ ${trade.price}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-ticker">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Ticker</CardTitle>
              <CardDescription>
                P&L breakdown by stock ticker
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!hasData || Object.keys(analytics.tickerPnL).length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600">No ticker data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(analytics.tickerPnL)
                    .sort(([, a], [, b]) => b - a)
                    .map(([ticker, pnl]) => {
                      const tickerTrades = trades.filter(t => t.ticker === ticker);
                      const wins = tickerTrades.filter(t => (t.pnl || 0) > 0).length;
                      const losses = tickerTrades.filter(t => (t.pnl || 0) < 0).length;
                      const winRate = tickerTrades.length > 0 ? (wins / tickerTrades.length) * 100 : 0;
                      
                      return (
                        <div key={ticker} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline" className="font-mono">
                              {ticker}
                            </Badge>
                            <div>
                              <div className="text-sm font-medium">
                                {tickerTrades.length} trades
                              </div>
                              <div className="text-xs text-gray-500">
                                {wins}W / {losses}L • {TradeAnalytics.formatPercent(winRate)} win rate
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${
                              pnl > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {TradeAnalytics.formatCurrency(pnl)}
                            </div>
                            <div className="w-24 mt-1">
                              <Progress value={winRate} className="h-2" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}