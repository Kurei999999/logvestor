'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageGallery } from '@/components/gallery/image-gallery';
import { TagFilter } from '@/components/gallery/tag-filter';
import { PresetManager } from '@/components/gallery/preset-manager';
import { TradeImage, Trade } from '@/types/trade';
import { GalleryView } from '@/types/app';
import { GalleryFilterPreset } from '@/types/gallery';
import { tradeFolderService } from '@/lib/services/trade-folder-service';
import { ElectronFileService } from '@/lib/services/electron/electron-file-service';
import { galleryPresetService } from '@/lib/services/gallery-preset-service';
import { LocalStorage } from '@/lib/file-system/storage';
import { 
  Images, 
  Grid3x3, 
  List, 
  Filter,
  Search,
  RefreshCw,
  X,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { LoadingSpinner } from '@/components/loading/loading-spinner';
import PageErrorBoundary from '@/components/page-error-boundary';

function GalleryContent() {
  const [images, setImages] = useState<TradeImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<TradeImage[]>([]);
  const [filteredImages2, setFilteredImages2] = useState<TradeImage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTerm2, setSearchTerm2] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTags2, setSelectedTags2] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [showTagFilter2, setShowTagFilter2] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'ticker'>('date');
  const [sortBy2, setSortBy2] = useState<'date' | 'ticker'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortOrder2, setSortOrder2] = useState<'asc' | 'desc'>('desc');
  const [selectedTicker, setSelectedTicker] = useState<string>('all');
  const [selectedTicker2, setSelectedTicker2] = useState<string>('all');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [presets, setPresets] = useState<GalleryFilterPreset[]>([]);
  const [showFilters1, setShowFilters1] = useState(false);
  const [showFilters2, setShowFilters2] = useState(false);

  const availableTickers = [...new Set(trades.map(t => t.ticker))];

  const loadGalleryData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Initialize services
      await tradeFolderService.initialize();
      await galleryPresetService.initialize();
      
      // Load trades from central CSV
      const electronService = new ElectronFileService();
      
      // Try direct CSV reading as fallback
      let tradesResult = await electronService.getTrades();
      
      // If getTrades returns empty, try direct CSV reading
      if (tradesResult.success && tradesResult.data && tradesResult.data.length === 0) {
        const configResult = await electronService.getConfig();
        if (configResult.success && configResult.data) {
          const csvPath = `${configResult.data.dataDirectory}/trades.csv`;
          const csvReadResult = await window.electronAPI.csv.readTradesCSV(csvPath);
          
          if (csvReadResult.success && csvReadResult.data) {
            tradesResult = {
              success: true,
              data: csvReadResult.data,
              timestamp: Date.now()
            };
          }
        }
      }
      
      if (tradesResult.success && tradesResult.data && tradesResult.data.length > 0) {
        setTrades(tradesResult.data);
        
        // Load images from all trade folders
        const allImages: TradeImage[] = [];
        
        for (const trade of tradesResult.data) {
          const folderResult = await tradeFolderService.loadTradeFolder(trade);
          if (folderResult.success && folderResult.data) {
            allImages.push(...folderResult.data.images);
          }
        }
        
        setImages(allImages);
      } else {
        setTrades([]);
        setImages([]);
      }

      // Load presets
      await loadPresets();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load gallery data'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPresets = async () => {
    try {
      const result = await galleryPresetService.loadPresets();
      if (result.success && result.data) {
        setPresets(result.data);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  useEffect(() => {
    loadGalleryData();
  }, []);

  const applyFilters = (
    images: TradeImage[],
    searchTerm: string,
    selectedTicker: string,
    selectedTags: string[],
    sortBy: 'date' | 'ticker',
    sortOrder: 'asc' | 'desc'
  ) => {
    let filtered = [...images];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(image => 
        image.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        image.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        image.tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(image => 
        image.tag && selectedTags.includes(image.tag)
      );
    }

    return filtered;
  };

  useEffect(() => {
    const filtered1 = applyFilters(images, searchTerm, selectedTicker, selectedTags, sortBy, sortOrder);
    const filtered2 = applyFilters(images, searchTerm2, selectedTicker2, selectedTags2, sortBy2, sortOrder2);
    
    setFilteredImages(filtered1);
    setFilteredImages2(filtered2);
  }, [images, searchTerm, searchTerm2, selectedTicker, selectedTicker2, selectedTags, selectedTags2, sortBy, sortBy2, sortOrder, sortOrder2, trades]);

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-screen" />;
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


  const handleDeleteImage = async (imageId: string) => {
    const imageToDelete = images.find(img => img.id === imageId);
    if (!imageToDelete) return;

    try {
      // Delete the actual file
      const deleteResult = await window.electronAPI.fs.deleteFile(imageToDelete.filePath);
      if (deleteResult.success) {
        // Remove from state
        const updatedImages = images.filter(img => img.id !== imageId);
        setImages(updatedImages);
      } else {
        console.error('Failed to delete image file:', deleteResult.error);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const handleUpdateImage = (updatedImage: TradeImage) => {
    const updatedImages = images.map(img => 
      img.id === updatedImage.id ? updatedImage : img
    );
    setImages(updatedImages);
  };

  const handleTagSelect = (tag: string) => {
    setSelectedTags(prev => [...prev, tag]);
  };

  const handleTagDeselect = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const handleClearAllTags = () => {
    setSelectedTags([]);
  };

  const handleTagSelect2 = (tag: string) => {
    setSelectedTags2(prev => [...prev, tag]);
  };

  const handleTagDeselect2 = (tag: string) => {
    setSelectedTags2(prev => prev.filter(t => t !== tag));
  };

  const handleClearAllTags2 = () => {
    setSelectedTags2([]);
  };

  const handleLoadPreset1 = (preset: GalleryFilterPreset) => {
    setSearchTerm(preset.searchTerm);
    setSelectedTicker(preset.selectedTicker);
    setSelectedTags(preset.selectedTags);
    setSortBy(preset.sortBy);
    setSortOrder(preset.sortOrder);
  };

  const handleLoadPreset2 = (preset: GalleryFilterPreset) => {
    setSearchTerm2(preset.searchTerm);
    setSelectedTicker2(preset.selectedTicker);
    setSelectedTags2(preset.selectedTags);
    setSortBy2(preset.sortBy);
    setSortOrder2(preset.sortOrder);
  };

  const handleClearFilters1 = () => {
    setSearchTerm('');
    setSelectedTicker('all');
    setSelectedTags([]);
    setSortBy('date');
    setSortOrder('desc');
    setShowTagFilter(false);
  };

  const handleClearFilters2 = () => {
    setSearchTerm2('');
    setSelectedTicker2('all');
    setSelectedTags2([]);
    setSortBy2('date');
    setSortOrder2('desc');
    setShowTagFilter2(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gallery</h1>
          <p className="text-gray-600 mt-2">
            View and manage your trade chart images
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => loadGalleryData(true)} 
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Gallery 1 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Images className="w-5 h-5" />
              <span className="font-semibold">Gallery 1</span>
              <span className="text-sm text-gray-500">({filteredImages.length} images)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters1(!showFilters1)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Filters
                {showFilters1 ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
              </Button>
              <PresetManager
                currentFilter={{
                  searchTerm,
                  selectedTicker,
                  selectedTags,
                  sortBy,
                  sortOrder
                }}
                onLoadPreset={handleLoadPreset1}
                galleryNumber={1}
                presets={presets}
                onPresetsChange={loadPresets}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters1}
                disabled={!searchTerm && selectedTicker === 'all' && selectedTags.length === 0 && sortBy === 'date' && sortOrder === 'desc'}
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar - Always Visible */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search images..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Advanced Filters - Collapsible */}
            {showFilters1 && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Ticker</label>
                    <Select value={selectedTicker} onValueChange={setSelectedTicker}>
                      <SelectTrigger>
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Sort By</label>
                    <Select value={sortBy} onValueChange={(value: 'date' | 'ticker') => setSortBy(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="ticker">Ticker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Order</label>
                    <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Order" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Newest First</SelectItem>
                        <SelectItem value="asc">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button 
                    variant={showTagFilter ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowTagFilter(!showTagFilter)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Tag Filter
                  </Button>
                </div>

                {/* Tag Filter */}
                {showTagFilter && (
                  <div className="mt-4 p-3 border rounded-lg bg-white">
                    <h3 className="font-medium mb-3">Filter by Tags</h3>
                    <TagFilter
                      images={images}
                      selectedTags={selectedTags}
                      onTagSelect={handleTagSelect}
                      onTagDeselect={handleTagDeselect}
                      onClearAll={handleClearAllTags}
                    />
                  </div>
                )}
              </div>
            )}

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

      {/* Gallery 2 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Images className="w-5 h-5" />
              <span className="font-semibold">Gallery 2</span>
              <span className="text-sm text-gray-500">({filteredImages2.length} images)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters2(!showFilters2)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Filters
                {showFilters2 ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
              </Button>
              <PresetManager
                currentFilter={{
                  searchTerm: searchTerm2,
                  selectedTicker: selectedTicker2,
                  selectedTags: selectedTags2,
                  sortBy: sortBy2,
                  sortOrder: sortOrder2
                }}
                onLoadPreset={handleLoadPreset2}
                galleryNumber={2}
                presets={presets}
                onPresetsChange={loadPresets}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters2}
                disabled={!searchTerm2 && selectedTicker2 === 'all' && selectedTags2.length === 0 && sortBy2 === 'date' && sortOrder2 === 'desc'}
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar - Always Visible */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search images..."
                value={searchTerm2}
                onChange={(e) => setSearchTerm2(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Advanced Filters - Collapsible */}
            {showFilters2 && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Ticker</label>
                    <Select value={selectedTicker2} onValueChange={setSelectedTicker2}>
                      <SelectTrigger>
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Sort By</label>
                    <Select value={sortBy2} onValueChange={(value: 'date' | 'ticker') => setSortBy2(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="ticker">Ticker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Order</label>
                    <Select value={sortOrder2} onValueChange={(value: 'asc' | 'desc') => setSortOrder2(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Order" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Newest First</SelectItem>
                        <SelectItem value="asc">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button 
                    variant={showTagFilter2 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowTagFilter2(!showTagFilter2)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Tag Filter
                  </Button>
                </div>

                {/* Tag Filter */}
                {showTagFilter2 && (
                  <div className="mt-4 p-3 border rounded-lg bg-white">
                    <h3 className="font-medium mb-3">Filter by Tags</h3>
                    <TagFilter
                      images={images}
                      selectedTags={selectedTags2}
                      onTagSelect={handleTagSelect2}
                      onTagDeselect={handleTagDeselect2}
                      onClearAll={handleClearAllTags2}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Gallery */}
            <ImageGallery
              images={filteredImages2}
              trades={trades}
              viewMode={viewMode}
              onDeleteImage={handleDeleteImage}
              onUpdateImage={handleUpdateImage}
            />
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

export default function GalleryPage() {
  return <GalleryContent />;
}