'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Upload, FileText, Images } from 'lucide-react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/loading/loading-spinner';
import PageErrorBoundary from '@/components/page-error-boundary';
import { useTradeData } from '@/lib/hooks/use-trade-data';

interface DashboardStats {
  totalTrades: number;
  totalPnL: number;
  totalNotes: number;
  totalImages: number;
}

function DashboardContent() {
  const { trades, loading: tradesLoading, error: tradesError } = useTradeData();
  const [stats, setStats] = useState<DashboardStats>({
    totalTrades: 0,
    totalPnL: 0,
    totalNotes: 0,
    totalImages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Calculate stats from trades data
        if (trades && trades.length > 0) {
          const totalPnL = trades.reduce((sum, trade) => {
            const pnl = trade.sellPrice && trade.buyPrice 
              ? (trade.sellPrice - trade.buyPrice) * trade.quantity
              : 0;
            return sum + pnl;
          }, 0);

          setStats({
            totalTrades: trades.length,
            totalPnL,
            totalNotes: 0, // TODO: Implement notes counting
            totalImages: 0 // TODO: Implement images counting
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load dashboard data'));
      } finally {
        setLoading(false);
      }
    };

    if (!tradesLoading) {
      loadDashboardData();
    }
  }, [trades, tradesLoading]);

  if (loading || tradesLoading) {
    return <LoadingSpinner size="lg" className="min-h-screen" />;
  }

  if (error || tradesError) {
    return (
      <PageErrorBoundary 
        error={error || new Error(tradesError!)} 
        retry={() => window.location.reload()}
        title="Dashboard Error"
      />
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome to your trade journal. Get started by importing your trading data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrades}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTrades === 0 ? 'No trades imported yet' : 'Total trades recorded'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats.totalPnL.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTrades === 0 ? 'Import trades to see P&L' : 'Total profit/loss'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNotes}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalNotes === 0 ? 'No notes created yet' : 'Trade notes available'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Images</CardTitle>
            <Images className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalImages}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalImages === 0 ? 'No images uploaded yet' : 'Chart images stored'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started with your trade journal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/import">
              <Button className="w-full justify-start" variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import CSV Data
              </Button>
            </Link>
            <Link href="/trades">
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Trades
              </Button>
            </Link>
            <Link href="/gallery">
              <Button className="w-full justify-start" variant="outline">
                <Images className="mr-2 h-4 w-4" />
                View Gallery
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest trading activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              No recent activity. Import your trading data to get started.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}