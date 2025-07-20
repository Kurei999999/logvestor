'use client';

import React from 'react';
import { useInitialSetup } from '@/lib/hooks/use-initial-setup';
import { InitialSetupDialog } from './initial-setup-dialog';

interface SetupWrapperProps {
  children: React.ReactNode;
}

export function SetupWrapper({ children }: SetupWrapperProps) {
  const { setupState, completeSetup } = useInitialSetup();

  const handleSetupComplete = async (dataDirectory: string) => {
    const success = await completeSetup(dataDirectory);
    if (success) {
      // Force a page reload to initialize with the new configuration
      window.location.reload();
    }
  };

  // Show loading state while checking setup requirements
  if (setupState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Initializing Trade Journal...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (setupState.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Initialization Error</h2>
          <p className="text-gray-600">{setupState.error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show setup dialog if required
  if (setupState.isRequired) {
    return (
      <div className="min-h-screen bg-gray-50">
        <InitialSetupDialog
          isOpen={true}
          onComplete={handleSetupComplete}
          defaultDirectory={setupState.defaultDirectory}
        />
      </div>
    );
  }

  // Setup is complete, show the main application
  return <>{children}</>;
}