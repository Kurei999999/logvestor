'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MarkdownEditor } from '@/components/markdown/markdown-editor';
import { MarkdownPreview } from '@/components/markdown/markdown-preview';
import { Trade, TradeMarkdown } from '@/types/trade';
import { TradeLinker } from '@/lib/trade-linker/trade-linker';
import { LocalStorage } from '@/lib/file-system/storage';
import { 
  Plus, 
  FileText, 
  Eye, 
  Edit, 
  Trash2, 
  Download,
  Calendar,
  Tag,
  Clock
} from 'lucide-react';

interface TradeNotesManagerProps {
  trade: Trade;
  onTradeUpdate: (updatedTrade: Trade) => void;
}

export function TradeNotesManager({ trade, onTradeUpdate }: TradeNotesManagerProps) {
  const [markdownFiles, setMarkdownFiles] = useState<TradeMarkdown[]>([]);
  const [selectedFile, setSelectedFile] = useState<TradeMarkdown | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newNoteType, setNewNoteType] = useState<'entry' | 'exit' | 'analysis' | 'followup' | 'custom'>('entry');
  const [customNoteName, setCustomNoteName] = useState('');

  const handleCreateNote = useCallback(() => {
    const fileName = TradeLinker.generateFileName(trade, newNoteType, customNoteName);
    const template = TradeLinker.createMarkdownTemplate(trade, newNoteType);
    
    const newMarkdown = TradeLinker.linkMarkdownToTrade(trade, template, fileName);
    
    setSelectedFile(newMarkdown);
    setIsCreating(true);
    setIsEditing(true);
  }, [trade, newNoteType, customNoteName]);

  const handleSaveNote = useCallback((content: string, metadata: any) => {
    if (!selectedFile) return;
    
    const updatedMarkdown: TradeMarkdown = {
      ...selectedFile,
      content,
      frontmatter: {
        ...selectedFile.frontmatter,
        ...metadata
      },
      updatedAt: new Date().toISOString()
    };
    
    // Update markdown files
    let updatedFiles;
    if (isCreating) {
      updatedFiles = [...markdownFiles, updatedMarkdown];
    } else {
      updatedFiles = markdownFiles.map(file => 
        file.id === selectedFile.id ? updatedMarkdown : file
      );
    }
    
    setMarkdownFiles(updatedFiles);
    
    // Update trade with new notes
    const updatedTrade = TradeLinker.updateTradeWithMarkdown(trade, updatedFiles);
    onTradeUpdate(updatedTrade);
    
    // Save to localStorage (in a real app, this would be saved to file system)
    LocalStorage.saveTrade(updatedTrade);
    
    setIsCreating(false);
    setIsEditing(false);
    setSelectedFile(null);
  }, [selectedFile, markdownFiles, trade, onTradeUpdate, isCreating]);

  const handleEditNote = useCallback((file: TradeMarkdown) => {
    setSelectedFile(file);
    setIsEditing(true);
  }, []);

  const handleDeleteNote = useCallback((file: TradeMarkdown) => {
    if (confirm('Are you sure you want to delete this note?')) {
      const updatedFiles = markdownFiles.filter(f => f.id !== file.id);
      setMarkdownFiles(updatedFiles);
      
      const updatedTrade = TradeLinker.updateTradeWithMarkdown(trade, updatedFiles);
      onTradeUpdate(updatedTrade);
      LocalStorage.saveTrade(updatedTrade);
    }
  }, [markdownFiles, trade, onTradeUpdate]);

  const handleViewNote = useCallback((file: TradeMarkdown) => {
    setSelectedFile(file);
    setIsEditing(false);
  }, []);

  const handleExportNote = useCallback((file: TradeMarkdown) => {
    const fullContent = `---\n${Object.entries(file.frontmatter)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? JSON.stringify(value) : value}`)
      .join('\n')}\n---\n\n${file.content}`;
    
    const blob = new Blob([fullContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setIsCreating(false);
    setIsEditing(false);
    setCustomNoteName('');
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Trade Notes</span>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Note</DialogTitle>
                  <DialogDescription>
                    Choose the type of note you want to create for this trade.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="note-type">Note Type</Label>
                    <Select 
                      value={newNoteType} 
                      onValueChange={(value: 'entry' | 'exit' | 'analysis' | 'followup' | 'custom') => setNewNoteType(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select note type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry Analysis</SelectItem>
                        <SelectItem value="exit">Exit Analysis</SelectItem>
                        <SelectItem value="analysis">Technical Analysis</SelectItem>
                        <SelectItem value="followup">Follow-up</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {newNoteType === 'custom' && (
                    <div>
                      <Label htmlFor="custom-name">Note Name</Label>
                      <Input
                        id="custom-name"
                        value={customNoteName}
                        onChange={(e) => setCustomNoteName(e.target.value)}
                        placeholder="Enter custom note name"
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateNote}>
                      Create Note
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Manage markdown notes for {trade.ticker} trade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {markdownFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No notes yet</h3>
              <p className="text-sm text-gray-600">Create your first note to start documenting this trade</p>
            </div>
          ) : (
            <div className="space-y-4">
              {markdownFiles.map((file) => (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div>
                          <h4 className="font-medium">{file.fileName}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{file.frontmatter.date}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{new Date(file.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {file.frontmatter.tags && file.frontmatter.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {file.frontmatter.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {file.frontmatter.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{file.frontmatter.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewNote(file)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditNote(file)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportNote(file)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(file)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note Editor/Viewer */}
      {selectedFile && (
        <Dialog open={true} onOpenChange={handleCancel}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Edit Note' : 'View Note'}: {selectedFile.fileName}
              </DialogTitle>
            </DialogHeader>
            {isEditing ? (
              <MarkdownEditor
                initialContent={selectedFile.content}
                initialMetadata={selectedFile.frontmatter}
                onSave={handleSaveNote}
                onCancel={handleCancel}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{selectedFile.frontmatter.ticker}</Badge>
                    <Badge variant={selectedFile.frontmatter.action === 'buy' ? 'default' : 'secondary'}>
                      {selectedFile.frontmatter.action}
                    </Badge>
                    <span className="text-sm text-gray-500">{selectedFile.frontmatter.date}</span>
                  </div>
                  <Button onClick={() => setIsEditing(true)} size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
                <div className="border rounded-md p-4 max-h-96 overflow-y-auto">
                  <MarkdownPreview content={selectedFile.content} />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}