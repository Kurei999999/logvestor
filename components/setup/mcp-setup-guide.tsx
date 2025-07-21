/**
 * MCP Setup Guide Component
 * Displays MCP server status and setup instructions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  ExternalLink,
  Terminal,
  Settings,
  Info
} from 'lucide-react';
import { MCPServerService, MCPServerStatus } from '@/lib/services/mcp-server-service';

interface MCPSetupGuideProps {
  dataDirectory: string;
}

export function MCPSetupGuide({ dataDirectory }: MCPSetupGuideProps) {
  const [status, setStatus] = useState<MCPServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const checkMCPStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const mcpStatus = await MCPServerService.checkMCPServerStatus(dataDirectory);
      setStatus(mcpStatus);
    } catch (err) {
      console.error('Error checking MCP server status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check MCP server status');
    } finally {
      setLoading(false);
    }
  }, [dataDirectory]);

  useEffect(() => {
    checkMCPStatus();
  }, [checkMCPStatus]);

  const handleCopyConfig = async () => {
    try {
      const { configText } = MCPServerService.generateClaudeDesktopConfig(dataDirectory);
      await navigator.clipboard.writeText(configText);
      setCopyFeedback('Configuration copied to clipboard!');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      setCopyFeedback('Failed to copy configuration');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const createMCPServer = async () => {
    try {
      setLoading(true);
      setError(null);
      await MCPServerService.createMCPServer(dataDirectory);
      await checkMCPStatus(); // Refresh status
    } catch (err) {
      console.error('Error creating MCP server:', err);
      setError(err instanceof Error ? err.message : 'Failed to create MCP server');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            MCP Server Setup
          </CardTitle>
          <CardDescription>
            Loading MCP server status...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { configText, configPath } = MCPServerService.generateClaudeDesktopConfig(dataDirectory);
  const username = MCPServerService.detectUsername();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          MCP Server Setup
        </CardTitle>
        <CardDescription>
          Configure AI integration with your trade data using Model Context Protocol (MCP)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Server Status</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">MCP Server Folder</span>
              <Badge variant={status?.exists ? "default" : "secondary"}>
                {status?.exists ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                )}
                {status?.exists ? 'Created' : 'Missing'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">Dependencies</span>
              <Badge variant={status?.hasNodeModules ? "default" : "secondary"}>
                {status?.hasNodeModules ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertTriangle className="h-3 w-3 mr-1" />
                )}
                {status?.hasNodeModules ? 'Installed' : 'Not Installed'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Setup Instructions</h3>
          
          {/* Step 1: Create MCP Server */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </span>
              <span className="font-medium">Create MCP Server Files</span>
              {status?.exists && <CheckCircle className="h-4 w-4 text-green-600" />}
            </div>
            
            {!status?.exists ? (
              <div className="ml-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Create the MCP server folder and template files.
                </p>
                <Button 
                  onClick={createMCPServer} 
                  disabled={loading}
                  size="sm"
                >
                  Create MCP Server
                </Button>
              </div>
            ) : (
              <p className="ml-8 text-sm text-green-600">
                ✓ MCP server files created successfully
              </p>
            )}
          </div>

          {/* Step 2: Install Dependencies */}
          {status?.exists && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  2
                </span>
                <span className="font-medium">Install Dependencies</span>
                {status.hasNodeModules && <CheckCircle className="h-4 w-4 text-green-600" />}
              </div>
              
              <div className="ml-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Run the following command in your terminal:
                </p>
                <div className="bg-muted p-3 rounded-lg">
                  <code className="text-sm font-mono">
                    cd {dataDirectory}/logvestor-mcp-server && npm install
                  </code>
                </div>
                {status.needsNpmInstall && (
                  <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertDescription>
                      Dependencies need to be installed. Run the command above in your terminal.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Configure Claude Desktop */}
          {status?.exists && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  3
                </span>
                <span className="font-medium">Configure Claude Desktop</span>
              </div>
              
              <div className="ml-8 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add this configuration to your Claude Desktop config file:
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Config File Location:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyConfig}
                      disabled={!!copyFeedback}
                    >
                      {copyFeedback ? (
                        copyFeedback
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Config
                        </>
                      )}
                    </Button>
                  </div>
                  <code className="text-xs text-muted-foreground block">{configPath}</code>
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <pre className="text-xs overflow-x-auto">
                    <code>{configText}</code>
                  </pre>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    After adding the configuration, restart Claude Desktop to apply the changes.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Step 4: Test Connection */}
          {status?.exists && status.hasNodeModules && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  4
                </span>
                <span className="font-medium">Test the Connection</span>
              </div>
              
              <div className="ml-8 space-y-2">
                <p className="text-sm text-muted-foreground">
                  In Claude Desktop, try asking: &quot;What trades do I have?&quot; or &quot;Calculate my total P&amp;L&quot;
                </p>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your MCP server is ready! You can now analyze your trade data using AI.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}
        </div>

        {/* Refresh Status Button */}
        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={checkMCPStatus}
            disabled={loading}
            size="sm"
          >
            Refresh Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}