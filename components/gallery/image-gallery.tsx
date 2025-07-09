'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TradeImage, Trade } from '@/types/trade';
import { formatDate } from '@/lib/utils';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Calendar,
  Tag,
  TrendingUp,
  TrendingDown,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ImageGalleryProps {
  images: TradeImage[];
  trades: Trade[];
  viewMode: 'grid' | 'timeline';
  onDeleteImage: (imageId: string) => void;
  onUpdateImage: (image: TradeImage) => void;
}

export function ImageGallery({ 
  images, 
  trades, 
  viewMode, 
  onDeleteImage, 
  onUpdateImage 
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<TradeImage | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);

  const getTradeForImage = (image: TradeImage) => {
    return trades.find(trade => trade.id === image.tradeId);
  };

  const handleImageClick = (image: TradeImage) => {
    setSelectedImage(image);
    setShowImageDialog(true);
  };

  const handleDeleteConfirm = (image: TradeImage) => {
    if (confirm('Are you sure you want to delete this image?')) {
      onDeleteImage(image.id);
    }
  };

  const handleDownload = (image: TradeImage) => {
    // In a real app, this would download the actual image file
    const link = document.createElement('a');
    link.href = image.filePath;
    link.download = image.fileName;
    link.click();
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">
          <Eye className="mx-auto h-12 w-12 mb-4" />
          <h3 className="text-lg font-medium">No images found</h3>
          <p className="text-sm">Upload some chart images to get started</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'timeline') {
    return (
      <div className="space-y-4">
        {images.map((image) => {
          const trade = getTradeForImage(image);
          return (
            <Card key={image.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div 
                    className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-lg cursor-pointer overflow-hidden"
                    onClick={() => handleImageClick(image)}
                  >
                    <img 
                      src={image.filePath} 
                      alt={image.fileName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium truncate">{image.fileName}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleImageClick(image)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(image)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteConfirm(image)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(image.createdAt)}</span>
                      </div>
                      
                      {trade && (
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{trade.ticker}</Badge>
                          <Badge 
                            variant={trade.action === 'buy' ? 'default' : 'secondary'}
                            className={trade.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                          >
                            {trade.action === 'buy' ? (
                              <TrendingUp className="w-3 h-3 mr-1" />
                            ) : (
                              <TrendingDown className="w-3 h-3 mr-1" />
                            )}
                            {trade.action.toUpperCase()}
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {image.caption && (
                      <p className="text-sm text-gray-600 mb-2">{image.caption}</p>
                    )}
                    
                    {image.tags && image.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {image.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {images.map((image) => {
          const trade = getTradeForImage(image);
          return (
            <Card key={image.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div 
                  className="aspect-video bg-gray-100 rounded-lg mb-3 cursor-pointer overflow-hidden"
                  onClick={() => handleImageClick(image)}
                >
                  <img 
                    src={image.filePath} 
                    alt={image.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm truncate">{image.fileName}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleImageClick(image)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(image)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteConfirm(image)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(image.createdAt)}</span>
                  </div>
                  
                  {trade && (
                    <div className="flex items-center space-x-1">
                      <Badge variant="outline" className="text-xs">{trade.ticker}</Badge>
                      <Badge 
                        variant={trade.action === 'buy' ? 'default' : 'secondary'}
                        className={`text-xs ${trade.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {trade.action === 'buy' ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {trade.action.toUpperCase()}
                      </Badge>
                    </div>
                  )}
                  
                  {image.caption && (
                    <p className="text-xs text-gray-600 line-clamp-2">{image.caption}</p>
                  )}
                  
                  {image.tags && image.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {image.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {image.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{image.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedImage?.fileName}
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {(() => {
                    const trade = getTradeForImage(selectedImage);
                    return trade ? (
                      <>
                        <Badge variant="outline">{trade.ticker}</Badge>
                        <Badge 
                          variant={trade.action === 'buy' ? 'default' : 'secondary'}
                          className={trade.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        >
                          {trade.action === 'buy' ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {trade.action.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-gray-500">{formatDate(trade.date)}</span>
                      </>
                    ) : null;
                  })()}
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownload(selectedImage)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      handleDeleteConfirm(selectedImage);
                      setShowImageDialog(false);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-center">
                <img 
                  src={selectedImage.filePath} 
                  alt={selectedImage.fileName}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>
              
              {selectedImage.caption && (
                <div>
                  <h4 className="font-medium mb-2">Caption</h4>
                  <p className="text-sm text-gray-600">{selectedImage.caption}</p>
                </div>
              )}
              
              {selectedImage.tags && selectedImage.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedImage.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-sm text-gray-500">
                <p>Uploaded on {formatDate(selectedImage.createdAt)}</p>
                <p>File: {selectedImage.fileName}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}