export interface ElectronAPI {
  fs: {
    readDir: (path: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
    readFile: (path: string) => Promise<{ success: boolean; data?: string; error?: string }>;
    writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
    createDir: (path: string) => Promise<{ success: boolean; error?: string }>;
    deleteDir: (path: string) => Promise<{ success: boolean; error?: string }>;
    exists: (path: string) => Promise<{ success: boolean; data?: boolean; error?: string }>;
  };
  config: {
    loadConfig: () => Promise<{ success: boolean; data?: any; error?: string }>;
    getDefaultConfig: () => Promise<{ success: boolean; data?: any; error?: string }>;
    saveConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}