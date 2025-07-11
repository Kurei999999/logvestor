'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { MarkdownImage } from './markdown-image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  X, 
  Eye, 
  Edit, 
  Save,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Image,
  Hash,
  Link,
  List,
  Code
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Trade } from '@/types/trade';
import { AppConfig } from '@/types/app';
import { createTradeFolderWithSequence } from '@/lib/trade-folder/path-generator';
import { SlashCommandMenu, SlashCommand } from './slash-command-menu';
import { useSlashCommands } from '@/lib/hooks/use-slash-commands';

export interface MarkdownSideEditorProps {
  trade: Trade;
  memoFile?: string | null;
  folderPath?: string | null; // Full path to the trade folder
  onClose: () => void;
  onSave?: () => void;
}

export function MarkdownSideEditorV3({
  trade,
  memoFile,
  folderPath,
  onClose,
  onSave
}: MarkdownSideEditorProps) {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState(memoFile || 'memo');
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [actualFolderPath, setActualFolderPath] = useState<string | null>(folderPath || null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Slash commands hook
  const {
    showMenu,
    menuPosition,
    searchTerm,
    selectedIndex,
    checkForSlashCommand,
    handleKeyDown,
    replaceCommand,
    setShowMenu
  } = useSlashCommands({
    textareaRef,
    onInsertText: setContent
  });

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (window.electronAPI?.config) {
        let config;
        const configResult = await window.electronAPI.config.loadConfig();
        
        if (configResult.success && configResult.data) {
          config = configResult.data;
        } else {
          // If config doesn't exist, get default config
          const defaultConfigResult = await window.electronAPI.config.getDefaultConfig();
          if (defaultConfigResult.success && defaultConfigResult.data) {
            config = defaultConfigResult.data;
          }
        }
        
        if (config) {
          setConfig(config);
        }
      }
    };
    loadConfig();
  }, []);

  const getTradeFolderPath = () => {
    // If we have actualFolderPath (created during save), use it
    if (actualFolderPath) {
      return actualFolderPath;
    }
    
    // If folderPath is provided (new structure), use it
    if (folderPath) {
      return folderPath;
    }
    
    // Always use new structure - no fallback to old pattern
    return null; // This will trigger automatic folder creation with sequence
  };

  const loadMemoContent = useCallback(async () => {
    if (!memoFile || !config) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const folderPath = getTradeFolderPath();
      if (!folderPath) throw new Error('Could not determine folder path');
      
      const filePath = `${folderPath}/${memoFile}`;
      console.log('Loading memo from:', filePath);
      
      if (window.electronAPI?.fs) {
        const readResult = await window.electronAPI.fs.readFile(filePath);
        console.log('Read result:', readResult);
        
        if (readResult.success && readResult.data) {
          setContent(readResult.data);
        } else {
          throw new Error(readResult.error || 'Failed to read file');
        }
      } else {
        throw new Error('Electron API not available');
      }
    } catch (err) {
      setError('Failed to load memo content');
      console.error('Load memo error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [memoFile, config]);

  // Load memo content or create template
  useEffect(() => {
    if (!config) return;

    if (memoFile) {
      loadMemoContent();
      
      // Set up file watcher for real-time updates (like VSCode/Obsidian)
      const folderPath = getTradeFolderPath();
      if (folderPath && window.electronAPI?.fileWatcher) {
        const watchId = `memo-${trade.ticker}-${trade.buyDate}`;
        
        // Set up file change listener
        const handleFileChange = (_: any, data: any) => {
          if (data.watchId === watchId && data.filePath.endsWith(memoFile) && isPreview) {
            // File changed, reload content
            loadMemoContent();
          }
        };
        
        // Start watching the folder
        window.electronAPI.fileWatcher.watchDirectory(folderPath, watchId);
        window.electronAPI.fileWatcher.onFileChanged(handleFileChange);
        
        return () => {
          // Cleanup watcher on unmount
          window.electronAPI.fileWatcher.unwatchDirectory(watchId);
          window.electronAPI.fileWatcher.removeAllListeners();
        };
      }
    } else {
      // New memo - create template
      const template = `# ${trade.ticker} - Trade Notes

## Trade Information
- **Buy Date**: ${trade.buyDate}
- **Buy Price**: $${trade.buyPrice}
- **Quantity**: ${trade.quantity}
${trade.sellDate ? `- **Sell Date**: ${trade.sellDate}` : ''}
${trade.sellPrice ? `- **Sell Price**: $${trade.sellPrice}` : ''}
${trade.pnl ? `- **P&L**: $${trade.pnl.toFixed(2)}` : ''}

## Analysis

## Notes

`;
      setContent(template);
    }
  }, [memoFile, trade, config, isPreview, loadMemoContent]);

  const handleSave = async () => {
    if (!config) {
      setError('Configuration not loaded');
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      let actualFolderPath = getTradeFolderPath();
      
      // If no folderPath provided, create new folder with sequence
      if (!folderPath && !actualFolderPath) {
        if (window.electronAPI?.fs) {
          const newFolderInfo = await createTradeFolderWithSequence(
            window.electronAPI.fs,
            trade.ticker,
            trade.buyDate,
            config.dataDirectory
          );
          
          if (!newFolderInfo) {
            throw new Error('Failed to create new trade folder');
          }
          
          actualFolderPath = newFolderInfo.fullPath;
        } else {
          throw new Error('Electron API not available');
        }
      } else if (!actualFolderPath) {
        throw new Error('Could not determine folder path');
      }
      
      // Ensure folder exists
      if (window.electronAPI?.fs) {
        const existsResult = await window.electronAPI.fs.exists(actualFolderPath);
        if (!existsResult.success || !existsResult.data) {
          const createResult = await window.electronAPI.fs.createDir(actualFolderPath);
          if (!createResult.success) {
            throw new Error(createResult.error || 'Failed to create folder');
          }
          
          // Create images subfolder
          const imagesPath = `${actualFolderPath}/images`;
          await window.electronAPI.fs.createDir(imagesPath);
        }
        
        // Determine file path - always use memoFile if it exists, otherwise create new
        const finalFileName = memoFile || `${fileName}.md`;
        const filePath = `${actualFolderPath}/${finalFileName}`;
        
        console.log('Saving to:', filePath);
        console.log('Content length:', content.length);
        
        // Write content to file
        const writeResult = await window.electronAPI.fs.writeFile(filePath, content);
        if (!writeResult.success) {
          throw new Error(writeResult.error || 'Failed to write file');
        }
        
        console.log('Save successful');
        onSave?.();
        onClose();
      } else {
        throw new Error('Electron API not available');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save memo');
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle image command
  const handleImageCommand = useCallback(async () => {
    if (!window.electronAPI?.dialog) {
      setError('File dialog not available');
      return;
    }

    try {
      // Open file picker
      const result = await window.electronAPI.dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.success && result.data && result.data.filePaths.length > 0) {
        const selectedFile = result.data.filePaths[0];
        const fileName = selectedFile.split('/').pop() || 'image';
        
        // Get or create folder path
        let currentFolderPath = getTradeFolderPath();
        
        if (!currentFolderPath && config) {
          if (window.electronAPI?.fs) {
            const newFolderInfo = await createTradeFolderWithSequence(
              window.electronAPI.fs,
              trade.ticker,
              trade.buyDate,
              config.dataDirectory
            );
            
            if (newFolderInfo) {
              currentFolderPath = newFolderInfo.fullPath;
              setActualFolderPath(currentFolderPath); // Remember the created folder path
            }
          }
        }
        
        if (currentFolderPath && window.electronAPI?.fs) {
          // Ensure images folder exists
          const imagesPath = `${currentFolderPath}/images`;
          const imagesFolderExists = await window.electronAPI.fs.exists(imagesPath);
          if (!imagesFolderExists.success || !imagesFolderExists.data) {
            await window.electronAPI.fs.createDir(imagesPath);
          }
          
          // Generate unique filename
          const timestamp = new Date().getTime();
          const uniqueFileName = `${timestamp}_${fileName}`;
          const destPath = `${imagesPath}/${uniqueFileName}`;
          
          // Copy file
          const copyResult = await window.electronAPI.fs.copyFile(selectedFile, destPath);
          if (copyResult.success) {
            // Insert markdown image syntax (use relative path)
            const imageMarkdown = `![${fileName}](./images/${uniqueFileName})`;
            replaceCommand(imageMarkdown);
          } else {
            throw new Error(copyResult.error || 'Failed to copy image');
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to insert image');
      console.error('Image command error:', err);
    }
  }, [config, trade, getTradeFolderPath, replaceCommand]);

  // Define slash commands
  const slashCommands: SlashCommand[] = [
    {
      id: 'image',
      name: 'Image',
      description: 'Insert an image from your computer',
      icon: <Image className="w-4 h-4 text-gray-600" />,
      handler: handleImageCommand
    },
    {
      id: 'heading',
      name: 'Heading',
      description: 'Create a heading',
      icon: <Hash className="w-4 h-4 text-gray-600" />,
      handler: () => replaceCommand('## ')
    },
    {
      id: 'link',
      name: 'Link',
      description: 'Insert a link',
      icon: <Link className="w-4 h-4 text-gray-600" />,
      handler: () => replaceCommand('[link text](https://)')
    },
    {
      id: 'list',
      name: 'Bullet List',
      description: 'Create a bullet list',
      icon: <List className="w-4 h-4 text-gray-600" />,
      handler: () => replaceCommand('- ')
    },
    {
      id: 'code',
      name: 'Code Block',
      description: 'Insert a code block',
      icon: <Code className="w-4 h-4 text-gray-600" />,
      handler: () => replaceCommand('```\n\n```')
    },
    {
      id: 'note',
      name: 'Note',
      description: 'Create a note/callout',
      icon: <FileText className="w-4 h-4 text-gray-600" />,
      handler: () => replaceCommand('> **Note**: ')
    }
  ];

  // Handle command selection
  const handleCommandSelect = (command: SlashCommand) => {
    command.handler();
    setShowMenu(false);
  };

  // Enhanced keyboard handler
  const enhancedHandleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMenu && e.key === 'Enter') {
      e.preventDefault();
      const filteredCommands = slashCommands.filter(cmd =>
        cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cmd.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filteredCommands[selectedIndex]) {
        handleCommandSelect(filteredCommands[selectedIndex]);
      }
    } else {
      handleKeyDown(e);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-1/2 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-gray-500" />
          <div>
            <h2 className="text-lg font-semibold">{trade.ticker} - {memoFile || 'New Memo'}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {trade.buyDate}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ${trade.buyPrice}
              </span>
              {trade.pnl && (
                <span className={cn(
                  "flex items-center gap-1",
                  trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  <TrendingUp className="w-3 h-3" />
                  ${trade.pnl.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
          >
            {isPreview ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !config}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* File name input for new memos */}
      {!memoFile && (
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <Label htmlFor="fileName" className="text-sm whitespace-nowrap">
              File name:
            </Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="memo"
              className="flex-1"
            />
            <span className="text-sm text-gray-500">.md</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-500">{error}</div>
          </div>
        ) : isPreview ? (
          <div className="h-full overflow-y-auto p-6">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  img: ({ src, alt, title }) => (
                    <MarkdownImage
                      src={src as string}
                      alt={alt as string}
                      title={title as string}
                      folderPath={getTradeFolderPath() || undefined}
                    />
                  )
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <>
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                checkForSlashCommand(e);
              }}
              onKeyDown={enhancedHandleKeyDown}
              className="h-full w-full resize-none border-0 p-6 font-mono text-sm focus-visible:ring-0"
              placeholder="Write your markdown here... Type '/' for commands"
            />
            
            {/* Slash Command Menu */}
            {showMenu && (
              <SlashCommandMenu
                commands={slashCommands}
                onSelect={handleCommandSelect}
                onClose={() => setShowMenu(false)}
                searchTerm={searchTerm}
                position={menuPosition}
                selectedIndex={selectedIndex}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}