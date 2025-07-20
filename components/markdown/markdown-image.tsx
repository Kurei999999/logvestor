'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MarkdownImageProps {
  src?: string;
  alt?: string;
  title?: string;
  folderPath?: string;
}

export function MarkdownImage({ src, alt, title, folderPath }: MarkdownImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      console.log('MarkdownImage: Loading image', { src, folderPath });
      
      if (!src || !folderPath) {
        console.log('MarkdownImage: Missing src or folderPath', { src, folderPath });
        setError(true);
        setIsLoading(false);
        return;
      }

      try {
        // Handle relative paths - support both tag folder structure and direct images
        let fullPath = src;
        if (src.startsWith('./images/')) {
          // Convert relative path to absolute path
          // Support both: ./images/file.png and ./images/tag/file.png
          fullPath = `${folderPath}/${src.substring(2)}`; // Remove './' prefix
        } else if (src.startsWith('/images/')) {
          // Handle absolute path starting with /images/ (make it relative to folder)
          fullPath = `${folderPath}${src}`;
        } else if (src.startsWith('images/')) {
          fullPath = `${folderPath}/${src}`;
        } else if (src.startsWith('./')) {
          fullPath = `${folderPath}/${src.substring(2)}`;
        } else if (!src.startsWith('/') && !src.startsWith('http')) {
          // Relative path without ./
          fullPath = `${folderPath}/${src}`;
        }

        console.log('MarkdownImage: Resolved full path', { originalSrc: src, fullPath });

        // Use Electron's readImageAsDataUrl API to get base64 data URL
        if (window.electronAPI?.fs?.readImageAsDataUrl) {
          console.log('MarkdownImage: Calling readImageAsDataUrl with', fullPath);
          const result = await window.electronAPI.fs.readImageAsDataUrl(fullPath);
          
          console.log('MarkdownImage: readImageAsDataUrl result', { 
            success: result.success, 
            hasData: !!result.data,
            error: result.error,
            fullPath 
          });
          
          if (result.success && result.data) {
            setImageSrc(result.data);
            setIsLoading(false);
            console.log('MarkdownImage: Successfully loaded image');
          } else {
            console.error('MarkdownImage: Failed to load image', result.error);
            setError(true);
            setIsLoading(false);
          }
        } else {
          console.error('MarkdownImage: Electron API not available');
          setError(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('MarkdownImage: Error loading image:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    loadImage();
  }, [src, folderPath]);

  if (isLoading) {
    return (
      <span className="inline-block w-full text-center py-8 px-4 bg-gray-100 rounded border-2 border-dashed border-gray-300 text-gray-500 text-sm">
        Loading image...
      </span>
    );
  }

  if (error || !imageSrc) {
    return (
      <span className="inline-block w-full text-center py-8 px-4 bg-gray-100 rounded border-2 border-dashed border-gray-300 text-gray-500 text-sm">
        {alt || 'Image not found'} ({src})
      </span>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt || ''}
      title={title}
      className={cn(
        "max-w-full h-auto rounded shadow-sm border",
        "hover:shadow-md transition-shadow duration-200"
      )}
      onError={() => setError(true)}
    />
  );
}