import type { IDataService, IServiceFactory, ServiceConfig } from './interfaces/data-service';
import { DEFAULT_SERVICE_CONFIG } from './interfaces/data-service';
import { BrowserDataService } from './browser/browser-data-service';
import { ElectronDataService } from './electron/electron-data-service';

/**
 * Service factory for creating appropriate data service based on environment
 */
export class ServiceFactory implements IServiceFactory {
  private static instance: ServiceFactory;
  private static dataServiceInstance: IDataService | null = null;
  private static config: ServiceConfig = DEFAULT_SERVICE_CONFIG;

  private constructor() {}

  /**
   * Get singleton instance of ServiceFactory
   */
  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /**
   * Create appropriate data service based on environment
   */
  createDataService(): IDataService {
    // Return cached instance if available
    if (ServiceFactory.dataServiceInstance) {
      return ServiceFactory.dataServiceInstance;
    }

    // Determine environment and create appropriate service
    if (this.isElectronEnvironment()) {
      console.log('[ServiceFactory] Creating Electron data service');
      ServiceFactory.dataServiceInstance = new ElectronDataService();
    } else if (this.isBrowserEnvironment()) {
      console.log('[ServiceFactory] Creating Browser data service');
      ServiceFactory.dataServiceInstance = new BrowserDataService();
    } else {
      console.warn('[ServiceFactory] Unknown environment, defaulting to Browser data service');
      ServiceFactory.dataServiceInstance = new BrowserDataService();
    }

    return ServiceFactory.dataServiceInstance;
  }

  /**
   * Check if running in Electron environment
   */
  isElectronEnvironment(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    // Check for Electron API in multiple ways
    const hasElectronAPI = !!(
      (window as any).electron ||
      (window as any).electronAPI ||
      (window as any).require ||
      (process && process.versions && process.versions.electron)
    );

    // Additional check for preload script exposure
    const hasIPC = !!(
      (window as any).electron?.ipcRenderer ||
      (window as any).electronAPI?.ipcRenderer
    );

    return hasElectronAPI || hasIPC;
  }

  /**
   * Check if running in browser environment
   */
  isBrowserEnvironment(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    // Check for browser-specific APIs
    const hasBrowserAPIs = !!(
      window.localStorage &&
      window.sessionStorage &&
      window.location &&
      navigator
    );

    // Make sure it's not Electron masquerading as browser
    return hasBrowserAPIs && !this.isElectronEnvironment();
  }

  /**
   * Get current environment type
   */
  getEnvironmentType(): 'electron' | 'browser' | 'unknown' {
    if (this.isElectronEnvironment()) {
      return 'electron';
    }
    if (this.isBrowserEnvironment()) {
      return 'browser';
    }
    return 'unknown';
  }

  /**
   * Get environment information
   */
  getEnvironmentInfo(): {
    type: 'electron' | 'browser' | 'unknown';
    userAgent?: string;
    platform?: string;
    electronVersion?: string;
    nodeVersion?: string;
    chromeVersion?: string;
    features: {
      localStorage: boolean;
      fileSystemAccess: boolean;
      electronIPC: boolean;
      webWorkers: boolean;
    };
  } {
    const type = this.getEnvironmentType();
    
    const info = {
      type,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      platform: typeof navigator !== 'undefined' ? navigator.platform : undefined,
      electronVersion: typeof process !== 'undefined' ? process.versions?.electron : undefined,
      nodeVersion: typeof process !== 'undefined' ? process.versions?.node : undefined,
      chromeVersion: typeof process !== 'undefined' ? process.versions?.chrome : undefined,
      features: {
        localStorage: this.checkLocalStorageSupport(),
        fileSystemAccess: this.checkFileSystemAccessSupport(),
        electronIPC: this.checkElectronIPCSupport(),
        webWorkers: this.checkWebWorkersSupport(),
      },
    };

    return info;
  }

  /**
   * Set service configuration
   */
  static setConfig(config: Partial<ServiceConfig>): void {
    ServiceFactory.config = { ...DEFAULT_SERVICE_CONFIG, ...config };
    
    // Reset cached instance to apply new config
    ServiceFactory.dataServiceInstance = null;
  }

  /**
   * Get current service configuration
   */
  static getConfig(): ServiceConfig {
    return { ...ServiceFactory.config };
  }

  /**
   * Reset service factory (clear cached instances)
   */
  static reset(): void {
    ServiceFactory.dataServiceInstance = null;
    ServiceFactory.config = DEFAULT_SERVICE_CONFIG;
  }

  /**
   * Get current data service instance (if any)
   */
  static getCurrentDataService(): IDataService | null {
    return ServiceFactory.dataServiceInstance;
  }

  // === Feature Detection Methods ===

  private checkLocalStorageSupport(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      
      // Test if localStorage is actually working
      const testKey = '__localStorage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private checkFileSystemAccessSupport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    return !!(
      (window as any).showDirectoryPicker &&
      (window as any).showOpenFilePicker &&
      (window as any).showSaveFilePicker
    );
  }

  private checkElectronIPCSupport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    return !!(
      (window as any).electron?.ipcRenderer ||
      (window as any).electronAPI?.ipcRenderer
    );
  }

  private checkWebWorkersSupport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    return typeof Worker !== 'undefined';
  }
}

// === Convenience Functions ===

/**
 * Create data service using factory
 */
export function createDataService(): IDataService {
  return ServiceFactory.getInstance().createDataService();
}

/**
 * Get environment type
 */
export function getEnvironmentType(): 'electron' | 'browser' | 'unknown' {
  return ServiceFactory.getInstance().getEnvironmentType();
}

/**
 * Get detailed environment information
 */
export function getEnvironmentInfo() {
  return ServiceFactory.getInstance().getEnvironmentInfo();
}

/**
 * Check if running in Electron
 */
export function isElectron(): boolean {
  return ServiceFactory.getInstance().isElectronEnvironment();
}

/**
 * Check if running in browser
 */
export function isBrowser(): boolean {
  return ServiceFactory.getInstance().isBrowserEnvironment();
}

// === Global Service Instance ===

// Create a global service instance for convenience
let globalDataService: IDataService | null = null;

/**
 * Get global data service instance (lazy initialization)
 */
export function getDataService(): IDataService {
  if (!globalDataService) {
    globalDataService = createDataService();
  }
  return globalDataService;
}

/**
 * Reset global service instance
 */
export function resetGlobalService(): void {
  globalDataService = null;
  ServiceFactory.reset();
}

// === Development Utilities ===

/**
 * Development helper to log environment information
 */
export function logEnvironmentInfo(): void {
  if (process.env.NODE_ENV === 'development') {
    const info = getEnvironmentInfo();
    console.group('[ServiceFactory] Environment Information');
    console.log('Type:', info.type);
    console.log('User Agent:', info.userAgent);
    console.log('Platform:', info.platform);
    if (info.electronVersion) {
      console.log('Electron Version:', info.electronVersion);
    }
    if (info.nodeVersion) {
      console.log('Node Version:', info.nodeVersion);
    }
    if (info.chromeVersion) {
      console.log('Chrome Version:', info.chromeVersion);
    }
    console.log('Features:', info.features);
    console.groupEnd();
  }
}