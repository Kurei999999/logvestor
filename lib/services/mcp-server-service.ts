/**
 * MCP Server Service - Manage MCP server creation and configuration
 */

import os from 'os';
import path from 'path';

export interface MCPServerStatus {
  exists: boolean;
  hasPackageJson: boolean;
  hasScript: boolean;
  hasNodeModules: boolean;
  needsNpmInstall: boolean;
}

export interface ClaudeDesktopConfig {
  mcpServers: {
    [key: string]: {
      command: string;
      args: string[];
    };
  };
}

export class MCPServerService {
  private static readonly MCP_FOLDER_NAME = 'logvestor-mcp-server';

  /**
   * Package.json template for MCP server
   */
  private static readonly PACKAGE_JSON_TEMPLATE = `{
  "name": "logvestor-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for fetching and analyzing trades data from CSV",
  "main": "script.js",
  "bin": {
    "logvestor-mcp-server": "./script.js"
  },
  "scripts": {
    "start": "node script.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.16.0",
    "zod": "^3.25.76"
  }
}`;

  /**
   * Script.js template for MCP server
   */
  private static readonly SCRIPT_JS_TEMPLATE = `#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the trades CSV file
const TRADES_CSV_PATH = path.join(__dirname, '..', 'trades.csv');

// CSV parsing function
async function parseCsvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\\n');
    
    if (lines.length === 0) {
      return { headers: [], data: [] };
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
    
    return { headers, data };
  } catch (error) {
    throw new Error(\`Failed to parse CSV: \${error.message}\`);
  }
}

// Create the server instance
const server = new McpServer({
  name: "logvestor-mcp-server",
  version: "1.0.0"
});

// Tool: Get trades with optional filters
server.registerTool("get_trades",
  {
    title: "Get Trades",
    description: "Fetch all trades or filter by criteria",
    inputSchema: {
      ticker: z.string().optional().describe("Filter by ticker symbol"),
      startDate: z.string().optional().describe("Filter trades from this date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Filter trades until this date (YYYY-MM-DD)")
    }
  },
  async ({ ticker, startDate, endDate }) => {
    try {
      const { data } = await parseCsvFile(TRADES_CSV_PATH);
      let filteredTrades = data;
      
      if (ticker) {
        filteredTrades = filteredTrades.filter(trade => 
          trade.ticker === ticker
        );
      }
      
      if (startDate) {
        filteredTrades = filteredTrades.filter(trade => 
          trade.buyDate >= startDate
        );
      }
      
      if (endDate) {
        filteredTrades = filteredTrades.filter(trade => 
          trade.sellDate <= endDate
        );
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            trades: filteredTrades,
            count: filteredTrades.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: \`Error: \${error.message}\` }],
        isError: true
      };
    }
  }
);

// Tool: Calculate P&L
server.registerTool("calculate_pnl",
  {
    title: "Calculate P&L",
    description: "Calculate total P&L for filtered trades",
    inputSchema: {
      ticker: z.string().optional().describe("Filter by ticker symbol"),
      startDate: z.string().optional().describe("Calculate P&L from this date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Calculate P&L until this date (YYYY-MM-DD)")
    }
  },
  async ({ ticker, startDate, endDate }) => {
    try {
      const { data } = await parseCsvFile(TRADES_CSV_PATH);
      let filteredTrades = data;
      
      if (ticker) {
        filteredTrades = filteredTrades.filter(trade => 
          trade.ticker === ticker
        );
      }
      
      if (startDate) {
        filteredTrades = filteredTrades.filter(trade => 
          trade.buyDate >= startDate
        );
      }
      
      if (endDate) {
        filteredTrades = filteredTrades.filter(trade => 
          trade.sellDate <= endDate
        );
      }
      
      const totalPnl = filteredTrades.reduce((sum, trade) => {
        return sum + parseFloat(trade.pnl || 0);
      }, 0);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            totalPnl,
            tradeCount: filteredTrades.length,
            averagePnl: filteredTrades.length > 0 ? totalPnl / filteredTrades.length : 0
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: \`Error: \${error.message}\` }],
        isError: true
      };
    }
  }
);

// Tool: Get trade statistics
server.registerTool("get_trade_statistics",
  {
    title: "Get Trade Statistics",
    description: "Get statistics about trades",
    inputSchema: {
      ticker: z.string().optional().describe("Filter by ticker symbol")
    }
  },
  async ({ ticker }) => {
    try {
      const { data } = await parseCsvFile(TRADES_CSV_PATH);
      let filteredTrades = data;
      
      if (ticker) {
        filteredTrades = filteredTrades.filter(trade => 
          trade.ticker === ticker
        );
      }
      
      const statistics = {
        totalTrades: filteredTrades.length,
        winningTrades: 0,
        losingTrades: 0,
        totalPnl: 0,
        averageHoldingDays: 0,
        tickerDistribution: {}
      };
      
      filteredTrades.forEach(trade => {
        const pnl = parseFloat(trade.pnl || 0);
        statistics.totalPnl += pnl;
        
        if (pnl > 0) {
          statistics.winningTrades++;
        } else if (pnl < 0) {
          statistics.losingTrades++;
        }
        
        statistics.averageHoldingDays += parseInt(trade.holdingDays || 0);
        
        if (!statistics.tickerDistribution[trade.ticker]) {
          statistics.tickerDistribution[trade.ticker] = 0;
        }
        statistics.tickerDistribution[trade.ticker]++;
      });
      
      if (filteredTrades.length > 0) {
        statistics.averageHoldingDays /= filteredTrades.length;
        statistics.winRate = (statistics.winningTrades / filteredTrades.length * 100).toFixed(2) + '%';
      }
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(statistics, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: \`Error: \${error.message}\` }],
        isError: true
      };
    }
  }
);

// Tool: Get all trades data (simple version)
server.registerTool("get_all_trades",
  {
    title: "Get All Trades",
    description: "Get all trades data from CSV file",
    inputSchema: {}
  },
  async () => {
    try {
      const { headers, data } = await parseCsvFile(TRADES_CSV_PATH);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            headers,
            data,
            totalRecords: data.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: \`Error: \${error.message}\` }],
        isError: true
      };
    }
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Logvestor MCP Server running on stdio');

// Cleanup on exit
process.on('SIGINT', () => {
  console.error('Server shutting down...');
  process.exit(0);
});`;

  /**
   * Check if MCP server exists and its status
   */
  static async checkMCPServerStatus(dataDirectory: string): Promise<MCPServerStatus> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const mcpDir = path.join(dataDirectory, this.MCP_FOLDER_NAME);
    const packageJsonPath = path.join(mcpDir, 'package.json');
    const scriptPath = path.join(mcpDir, 'script.js');
    const nodeModulesPath = path.join(mcpDir, 'node_modules');

    const [dirExists, packageJsonExists, scriptExists, nodeModulesExists] = await Promise.all([
      window.electronAPI.fs.exists(mcpDir),
      window.electronAPI.fs.exists(packageJsonPath),
      window.electronAPI.fs.exists(scriptPath),
      window.electronAPI.fs.exists(nodeModulesPath)
    ]);

    return {
      exists: Boolean(dirExists.success && dirExists.data),
      hasPackageJson: Boolean(packageJsonExists.success && packageJsonExists.data),
      hasScript: Boolean(scriptExists.success && scriptExists.data),
      hasNodeModules: Boolean(nodeModulesExists.success && nodeModulesExists.data),
      needsNpmInstall: Boolean((packageJsonExists.success && packageJsonExists.data) && 
                              !(nodeModulesExists.success && nodeModulesExists.data))
    };
  }

  /**
   * Create MCP server folder and files
   */
  static async createMCPServer(dataDirectory: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const mcpDir = path.join(dataDirectory, this.MCP_FOLDER_NAME);

    // Create MCP server directory
    const createDirResult = await window.electronAPI.fs.createDir(mcpDir);
    if (!createDirResult.success) {
      throw new Error(`Failed to create MCP server directory: ${createDirResult.error}`);
    }

    // Create package.json
    const packageJsonPath = path.join(mcpDir, 'package.json');
    const packageJsonResult = await window.electronAPI.fs.writeFile(
      packageJsonPath, 
      this.PACKAGE_JSON_TEMPLATE
    );
    if (!packageJsonResult.success) {
      throw new Error(`Failed to create package.json: ${packageJsonResult.error}`);
    }

    // Create script.js
    const scriptPath = path.join(mcpDir, 'script.js');
    const scriptResult = await window.electronAPI.fs.writeFile(
      scriptPath, 
      this.SCRIPT_JS_TEMPLATE
    );
    if (!scriptResult.success) {
      throw new Error(`Failed to create script.js: ${scriptResult.error}`);
    }
  }

  /**
   * Generate Claude Desktop configuration
   */
  static generateClaudeDesktopConfig(dataDirectory: string): {
    config: ClaudeDesktopConfig;
    configText: string;
    configPath: string;
  } {
    const username = this.detectUsername();
    const mcpServerPath = path.join(dataDirectory, this.MCP_FOLDER_NAME);
    
    const config: ClaudeDesktopConfig = {
      mcpServers: {
        "logvestor-mcp-server": {
          command: "node",
          args: [path.join(mcpServerPath, "script.js")]
        }
      }
    };

    const configText = JSON.stringify(config, null, 2);
    
    // Determine Claude Desktop config path based on platform
    let configPath: string;
    const platform = process.platform;
    
    if (platform === 'darwin') {
      configPath = `/Users/${username}/Library/Application Support/Claude/claude_desktop_config.json`;
    } else if (platform === 'win32') {
      configPath = `C:\\Users\\${username}\\AppData\\Roaming\\Claude\\claude_desktop_config.json`;
    } else {
      configPath = `/home/${username}/.config/Claude/claude_desktop_config.json`;
    }

    return { config, configText, configPath };
  }

  /**
   * Detect current username
   */
  static detectUsername(): string {
    try {
      return os.userInfo().username;
    } catch (error) {
      console.warn('Failed to detect username, using fallback');
      return process.env.USER || process.env.USERNAME || 'user';
    }
  }
}