const { contextBridge, ipcRenderer } = require('electron');

// Define the API that will be exposed to the renderer process
const electronAPI = {
  // File System Operations
  fs: {
    readFile: (filePath) => ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('fs:write-file', filePath, data),
    readDir: (dirPath) => ipcRenderer.invoke('fs:read-dir', dirPath),
    createDir: (dirPath) => ipcRenderer.invoke('fs:create-dir', dirPath),
    deleteFile: (filePath) => ipcRenderer.invoke('fs:delete-file', filePath),
    deleteDir: (dirPath) => ipcRenderer.invoke('fs:delete-dir', dirPath),
    exists: (path) => ipcRenderer.invoke('fs:exists', path),
    stat: (path) => ipcRenderer.invoke('fs:stat', path),
    copyFile: (src, dest) => ipcRenderer.invoke('fs:copy-file', src, dest),
    moveFile: (src, dest) => ipcRenderer.invoke('fs:move-file', src, dest)
  },

  // File Watcher Operations
  fileWatcher: {
    watchDirectory: (directoryPath, watchId) => ipcRenderer.invoke('fs:watch-directory', directoryPath, watchId),
    unwatchDirectory: (watchId) => ipcRenderer.invoke('fs:unwatch-directory', watchId),
    // Event listeners for file changes
    onFileAdded: (callback) => ipcRenderer.on('file-watcher:file-added', callback),
    onFileChanged: (callback) => ipcRenderer.on('file-watcher:file-changed', callback),
    onFileRemoved: (callback) => ipcRenderer.on('file-watcher:file-removed', callback),
    onError: (callback) => ipcRenderer.on('file-watcher:error', callback),
    // Remove listeners
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('file-watcher:file-added');
      ipcRenderer.removeAllListeners('file-watcher:file-changed');
      ipcRenderer.removeAllListeners('file-watcher:file-removed');
      ipcRenderer.removeAllListeners('file-watcher:error');
    }
  },

  // Dialog Operations
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:show-open-dialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:show-save-dialog', options),
    showMessageBox: (options) => ipcRenderer.invoke('dialog:show-message-box', options),
    showErrorBox: (title, content) => ipcRenderer.invoke('dialog:show-error-box', title, content)
  },

  // App Operations
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getPath: (name) => ipcRenderer.invoke('app:get-path', name),
    showItemInFolder: (path) => ipcRenderer.invoke('app:show-item-in-folder', path),
    openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
    quit: () => ipcRenderer.invoke('app:quit')
  },

  // Window Operations
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    unmaximize: () => ipcRenderer.invoke('window:unmaximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    setTitle: (title) => ipcRenderer.invoke('window:set-title', title)
  },

  // Trade Data Operations
  trades: {
    loadTrades: (directory) => ipcRenderer.invoke('trades:load-trades', directory),
    saveTrade: (trade, directory) => ipcRenderer.invoke('trades:save-trade', trade, directory),
    deleteTrade: (tradeId, directory) => ipcRenderer.invoke('trades:delete-trade', tradeId, directory),
    loadTradeMarkdown: (filePath) => ipcRenderer.invoke('trades:load-markdown', filePath),
    saveTradeMarkdown: (filePath, content) => ipcRenderer.invoke('trades:save-markdown', filePath, content)
  },

  // CSV Operations
  csv: {
    parseCSV: (filePath) => ipcRenderer.invoke('csv:parse-csv', filePath),
    exportCSV: (data, filePath) => ipcRenderer.invoke('csv:export-csv', data, filePath),
    loadCSVMappings: (directory) => ipcRenderer.invoke('csv:load-mappings', directory),
    saveCSVMapping: (mapping, directory) => ipcRenderer.invoke('csv:save-mapping', mapping, directory),
    readTradesCSV: (filePath) => ipcRenderer.invoke('csv:read-trades-csv', filePath),
    writeTradesCSV: (trades, filePath) => ipcRenderer.invoke('csv:write-trades-csv', trades, filePath)
  },

  // Configuration
  config: {
    loadConfig: () => ipcRenderer.invoke('config:load-config'),
    saveConfig: (config) => ipcRenderer.invoke('config:save-config', config),
    getDefaultConfig: () => ipcRenderer.invoke('config:get-default-config')
  },

  // Menu Events (from main process)
  menu: {
    onNewTrade: (callback) => ipcRenderer.on('menu-new-trade', callback),
    onOpenDirectory: (callback) => ipcRenderer.on('menu-open-directory', callback),
    onImportCSV: (callback) => ipcRenderer.on('menu-import-csv', callback),
    onExportData: (callback) => ipcRenderer.on('menu-export-data', callback),
    onNavigate: (callback) => ipcRenderer.on('menu-navigate', callback),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
  },

  // Environment Detection
  platform: process.platform,
  isElectron: true,
  isDev: process.env.NODE_ENV === 'development'
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Also expose a simple way to check if we're in Electron
contextBridge.exposeInMainWorld('isElectron', true);