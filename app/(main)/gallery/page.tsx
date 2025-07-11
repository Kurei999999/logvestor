'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageGallery } from '@/components/gallery/image-gallery';
import { ImageUploader } from '@/components/gallery/image-uploader';
import { TradeImage, Trade } from '@/types/trade';
import { GalleryView } from '@/types/app';
import { LocalStorage } from '@/lib/file-system/storage';
import { 
  Images, 
  Upload, 
  Grid3x3, 
  List, 
  Filter,
  Search
} from 'lucide-react';
import { GallerySkeleton } from '@/components/loading/gallery-skeleton';
import PageErrorBoundary from '@/components/page-error-boundary';

function GalleryContent() {
  const [images, setImages] = useState<TradeImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<TradeImage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'ticker'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTicker, setSelectedTicker] = useState<string>('all');
  const [showUploader, setShowUploader] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const availableTickers = [...new Set(trades.map(t => t.ticker))];

  useEffect(() => {
    const loadGalleryData = async () => {
      try {
        setLoading(true);
        
        // Load images from localStorage (in a real app, this would scan the file system)
        const savedImages = localStorage.getItem('tradeImages');
        if (savedImages) {
          setImages(JSON.parse(savedImages));
        }
        
        // Load trades
        const loadedTrades = LocalStorage.loadTrades();
        setTrades(loadedTrades);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load gallery data'));
      } finally {
        setLoading(false);
      }
    };

    loadGalleryData();
  }, []);

  useEffect(() => {
    let filtered = [...images];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(image => 
        image.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        image.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (image.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply ticker filter
    if (selectedTicker !== 'all') {
      const trade = trades.find(t => t.ticker === selectedTicker);
      if (trade) {
        filtered = filtered.filter(image => image.tradeId === trade.id);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'ticker':
          const aTradeId = a.tradeId;
          const bTradeId = b.tradeId;
          const aTrade = trades.find(t => t.id === aTradeId);
          const bTrade = trades.find(t => t.id === bTradeId);
          aValue = aTrade?.ticker || '';
          bValue = bTrade?.ticker || '';
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredImages(filtered);
  }, [images, searchTerm, selectedTicker, sortBy, sortOrder, trades]);

  if (loading) {
    return <GallerySkeleton />;
  }

  if (error) {
    return (
      <PageErrorBoundary 
        error={error} 
        retry={() => window.location.reload()}
        title="Gallery Error"
      />
    );
  }

  const handleImageUpload = (newImages: TradeImage[]) => {
    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);
    localStorage.setItem('tradeImages', JSON.stringify(updatedImages));
    setShowUploader(false);
  };

  const handleDeleteImage = (imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    setImages(updatedImages);
    localStorage.setItem('tradeImages', JSON.stringify(updatedImages));
  };

  const handleUpdateImage = (updatedImage: TradeImage) => {
    const updatedImages = images.map(img => 
      img.id === updatedImage.id ? updatedImage : img
    );
    setImages(updatedImages);
    localStorage.setItem('tradeImages', JSON.stringify(updatedImages));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gallery</h1>
          <p className="text-gray-600 mt-2">
            View and manage your trade chart images
          </p>
        </div>
        <Button onClick={() => setShowUploader(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Images
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{images.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtered Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredImages.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tickers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableTickers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {images.filter(img => {
                const uploadDate = new Date(img.createdAt);
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return uploadDate > yesterday;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Images className="w-5 h-5" />
            <span>Image Gallery</span>
          </CardTitle>
          <CardDescription>
            Browse and manage your trading chart images
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search images..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedTicker} onValueChange={setSelectedTicker}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Tickers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tickers</SelectItem>
                  {availableTickers.map(ticker => (
                    <SelectItem key={ticker} value={ticker}>
                      {ticker}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: 'date' | 'ticker') => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="ticker">Ticker</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex space-x-2">
                <Button 
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === 'timeline' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('timeline')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Gallery */}
            <ImageGallery
              images={filteredImages}
              trades={trades}
              viewMode={viewMode}
              onDeleteImage={handleDeleteImage}
              onUpdateImage={handleUpdateImage}
            />
          </div>
        </CardContent>
      </Card>

      {/* Image Uploader */}
      {showUploader && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Images</CardTitle>
            <CardDescription>
              Upload chart images and associate them with trades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader
              trades={trades}
              onUpload={handleImageUpload}
              onCancel={() => setShowUploader(false)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function GalleryPage() {
  return <GalleryContent />;
}