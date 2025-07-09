'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface PageErrorBoundaryProps {
  error: Error;
  retry: () => void;
  title?: string;
}

export function PageErrorBoundary({ error, retry, title = "Page Error" }: PageErrorBoundaryProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            This page encountered an error. Please try refreshing or go back to the previous page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3">
              <div className="text-sm text-red-700 dark:text-red-300">
                <p className="font-medium">Error:</p>
                <p className="mt-1 font-mono text-xs">{error.message}</p>
              </div>
            </div>
          )}
          
          <div className="flex space-x-2">
            <Button 
              onClick={retry}
              className="flex-1"
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button 
              onClick={() => window.history.back()}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PageErrorBoundary;