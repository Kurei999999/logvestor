const { ipcMain, dialog, shell, app } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const { existsSync, statSync } = require('fs');

// Initialize IPC handlers
function initializeIPC(mainWindow) {
  // File System Operations
  ipcMain.handle('fs:read-file', async (event, filePath) => {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:write-file', async (event, filePath, data) => {
    try {
      await fs.writeFile(filePath, data, 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:read-dir', async (event, dirPath) => {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      const items = files.map(file => ({
        name: file.name,
        path: path.join(dirPath, file.name),
        type: file.isDirectory() ? 'directory' : 'file',
        size: file.isFile() ? statSync(path.join(dirPath, file.name)).size : undefined,
        lastModified: statSync(path.join(dirPath, file.name)).mtime.toISOString()
      }));
      return { success: true, data: items };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:create-dir', async (event, dirPath) => {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:delete-file', async (event, filePath) => {
    try {
      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:delete-dir', async (event, dirPath) => {
    try {
      await fs.rmdir(dirPath, { recursive: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:exists', async (event, filePath) => {
    try {
      return { success: true, data: existsSync(filePath) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:stat', async (event, filePath) => {
    try {
      const stats = await fs.stat(filePath);
      return {
        success: true,
        data: {
          size: stats.size,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          mtime: stats.mtime.toISOString(),
          ctime: stats.ctime.toISOString()
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:copy-file', async (event, src, dest) => {
    try {
      await fs.copyFile(src, dest);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:move-file', async (event, src, dest) => {
    try {
      await fs.rename(src, dest);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Dialog Operations
  ipcMain.handle('dialog:show-open-dialog', async (event, options) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('dialog:show-save-dialog', async (event, options) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('dialog:show-message-box', async (event, options) => {
    try {
      const result = await dialog.showMessageBox(mainWindow, options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('dialog:show-error-box', async (event, title, content) => {
    try {
      dialog.showErrorBox(title, content);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // App Operations
  ipcMain.handle('app:get-version', async () => {
    try {
      return { success: true, data: app.getVersion() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('app:get-path', async (event, name) => {
    try {
      return { success: true, data: app.getPath(name) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('app:show-item-in-folder', async (event, fullPath) => {
    try {
      shell.showItemInFolder(fullPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('app:open-external', async (event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('app:quit', async () => {
    try {
      app.quit();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Window Operations
  ipcMain.handle('window:minimize', async () => {
    try {
      mainWindow.minimize();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('window:maximize', async () => {
    try {
      mainWindow.maximize();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('window:unmaximize', async () => {
    try {
      mainWindow.unmaximize();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('window:close', async () => {
    try {
      mainWindow.close();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('window:is-maximized', async () => {
    try {
      return { success: true, data: mainWindow.isMaximized() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('window:set-title', async (event, title) => {
    try {
      mainWindow.setTitle(title);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Trade Data Operations
  ipcMain.handle('trades:load-trades', async (event, directory) => {
    try {
      const tradesPath = path.join(directory, 'trades');
      if (!existsSync(tradesPath)) {
        return { success: true, data: [] };
      }

      const files = await fs.readdir(tradesPath);
      const trades = [];

      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(tradesPath, file);
          const content = await fs.readFile(filePath, 'utf8');
          
          // Parse frontmatter and content
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
          if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            const markdown = frontmatterMatch[2];
            
            // Simple YAML parsing for frontmatter
            const trade = { id: path.basename(file, '.md'), markdown, filePath };
            const lines = frontmatter.split('\n');
            
            for (const line of lines) {
              const [key, ...valueParts] = line.split(':');
              if (key && valueParts.length > 0) {
                const value = valueParts.join(':').trim();
                trade[key.trim()] = value;
              }
            }
            
            trades.push(trade);
          }
        }
      }

      return { success: true, data: trades };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('trades:save-trade', async (event, trade, directory) => {
    try {
      const tradesPath = path.join(directory, 'trades');
      await fs.mkdir(tradesPath, { recursive: true });
      
      const filePath = path.join(tradesPath, `${trade.id}.md`);
      
      // Create frontmatter
      const frontmatter = [
        '---',
        `id: ${trade.id}`,
        `date: ${trade.date}`,
        `ticker: ${trade.ticker}`,
        `action: ${trade.action}`,
        `quantity: ${trade.quantity}`,
        `price: ${trade.price}`,
        `total: ${trade.total}`,
        `tags: ${trade.tags || ''}`,
        `created: ${trade.created}`,
        `updated: ${new Date().toISOString()}`,
        '---',
        '',
        trade.markdown || ''
      ].join('\n');
      
      await fs.writeFile(filePath, frontmatter, 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('trades:delete-trade', async (event, tradeId, directory) => {
    try {
      const filePath = path.join(directory, 'trades', `${tradeId}.md`);
      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('trades:load-markdown', async (event, filePath) => {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return { success: true, data: content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('trades:save-markdown', async (event, filePath, content) => {
    try {
      await fs.writeFile(filePath, content, 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Configuration
  ipcMain.handle('config:load-config', async () => {
    try {
      const configPath = path.join(app.getPath('userData'), 'config.json');
      if (existsSync(configPath)) {
        const content = await fs.readFile(configPath, 'utf8');
        return { success: true, data: JSON.parse(content) };
      }
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('config:save-config', async (event, config) => {
    try {
      const configPath = path.join(app.getPath('userData'), 'config.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('config:get-default-config', async () => {
    try {
      const documentsPath = app.getPath('documents');
      const defaultConfig = {
        dataDirectory: path.join(documentsPath, 'TradeJournal'),
        tradeDirectory: 'trades',
        portfolioDirectory: 'portfolios',
        templatesDirectory: 'templates',
        defaultCSVMapping: '',
        theme: 'light',
        autoBackup: true,
        backupInterval: 24 * 60 * 60 * 1000,
        maxBackups: 10
      };
      return { success: true, data: defaultConfig };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // CSV Operations (placeholder - would need CSV parsing library)
  ipcMain.handle('csv:parse-csv', async (event, filePath) => {
    try {
      // This would use a CSV parsing library like csv-parser
      // For now, returning placeholder
      return { success: true, data: [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('csv:export-csv', async (event, data, filePath) => {
    try {
      // This would convert data to CSV format
      // For now, returning placeholder
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('csv:load-mappings', async (event, directory) => {
    try {
      const mappingsPath = path.join(directory, 'mappings.json');
      if (existsSync(mappingsPath)) {
        const content = await fs.readFile(mappingsPath, 'utf8');
        return { success: true, data: JSON.parse(content) };
      }
      return { success: true, data: [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('csv:save-mapping', async (event, mapping, directory) => {
    try {
      const mappingsPath = path.join(directory, 'mappings.json');
      let mappings = [];
      
      if (existsSync(mappingsPath)) {
        const content = await fs.readFile(mappingsPath, 'utf8');
        mappings = JSON.parse(content);
      }
      
      const index = mappings.findIndex(m => m.id === mapping.id);
      if (index >= 0) {
        mappings[index] = mapping;
      } else {
        mappings.push(mapping);
      }
      
      await fs.writeFile(mappingsPath, JSON.stringify(mappings, null, 2), 'utf8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { initializeIPC };