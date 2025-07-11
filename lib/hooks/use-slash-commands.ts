import { useState, useCallback, useRef, useEffect } from 'react';
import { SlashCommand } from '@/components/markdown/slash-command-menu';

interface UseSlashCommandsProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInsertText: (text: string) => void;
}

export function useSlashCommands({ textareaRef, onInsertText }: UseSlashCommandsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commandStartIndex, setCommandStartIndex] = useState(-1);

  // Get cursor coordinates in the textarea
  const getCursorCoordinates = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return { top: 0, left: 0 };

    // Get the textarea position relative to its scrollable container
    const textareaRect = textarea.getBoundingClientRect();
    
    // Simple position calculation - place menu below current line
    // For now, we'll use a fixed position relative to textarea
    return {
      top: 100, // Fixed position from top of textarea container
      left: 20  // Fixed position from left
    };
  }, [textareaRef]);

  // Check if we should show the slash command menu
  const checkForSlashCommand = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = event.target;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    
    // Find the last slash that could be a command
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    
    if (lastSlashIndex !== -1) {
      const textAfterSlash = textBeforeCursor.substring(lastSlashIndex + 1);
      const textBeforeSlash = lastSlashIndex > 0 ? textBeforeCursor[lastSlashIndex - 1] : '';
      
      // Check if slash is at the beginning of a line or after a space
      const isValidSlashPosition = lastSlashIndex === 0 || textBeforeSlash === ' ' || textBeforeSlash === '\n';
      
      // Check if we're still in a command (no spaces after slash)
      const isStillInCommand = !textAfterSlash.includes(' ') && !textAfterSlash.includes('\n');
      
      if (isValidSlashPosition && isStillInCommand) {
        setShowMenu(true);
        setSearchTerm(textAfterSlash);
        setCommandStartIndex(lastSlashIndex);
        setMenuPosition(getCursorCoordinates());
        setSelectedIndex(0);
      } else {
        setShowMenu(false);
      }
    } else {
      setShowMenu(false);
    }
  }, [getCursorCoordinates]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMenu) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => prev + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => Math.max(0, prev - 1));
        break;
      case 'Enter':
        event.preventDefault();
        // Will be handled by the component using this hook
        break;
      case 'Escape':
        event.preventDefault();
        setShowMenu(false);
        break;
    }
  }, [showMenu]);

  // Replace the slash command with the result
  const replaceCommand = useCallback((replacement: string) => {
    const textarea = textareaRef.current;
    if (!textarea || commandStartIndex === -1) return;

    const before = textarea.value.substring(0, commandStartIndex);
    const after = textarea.value.substring(textarea.selectionStart);
    
    const newText = before + replacement + after;
    onInsertText(newText);
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = commandStartIndex + replacement.length;
        textarea.selectionStart = newCursorPos;
        textarea.selectionEnd = newCursorPos;
        textarea.focus();
      }
    }, 0);
    
    setShowMenu(false);
    setSearchTerm('');
    setCommandStartIndex(-1);
  }, [textareaRef, commandStartIndex, onInsertText]);

  return {
    showMenu,
    menuPosition,
    searchTerm,
    selectedIndex,
    checkForSlashCommand,
    handleKeyDown,
    replaceCommand,
    setShowMenu
  };
}