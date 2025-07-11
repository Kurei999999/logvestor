'use client';

import { useEffect, useRef } from 'react';
import { Image, FileText, Hash, Link, List, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  handler: () => void;
}

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  searchTerm: string;
  position: { top: number; left: number };
  selectedIndex: number;
}

export function SlashCommandMenu({
  commands,
  onSelect,
  onClose,
  searchTerm,

  position,
  selectedIndex
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Filter commands based on search term
  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && menuRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (filteredCommands.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-[100] bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-72 max-h-80 overflow-y-auto"
      style={{
        top: position.top,
        left: position.left,
        zIndex: 9999
      }}
    >
      <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
        Commands
      </div>
      {filteredCommands.map((command, index) => (
        <div
          key={command.id}
          ref={index === selectedIndex ? selectedRef : null}
          className={cn(
            "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
            index === selectedIndex ? "bg-gray-100" : "hover:bg-gray-50"
          )}
          onClick={() => onSelect(command)}
        >
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-gray-100">
            {command.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {command.name}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {command.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Default slash commands
export const defaultSlashCommands: Omit<SlashCommand, 'handler'>[] = [
  {
    id: 'image',
    name: 'Image',
    description: 'Insert an image from your computer',
    icon: <Image className="w-4 h-4 text-gray-600" />
  },
  {
    id: 'heading',
    name: 'Heading',
    description: 'Create a heading',
    icon: <Hash className="w-4 h-4 text-gray-600" />
  },
  {
    id: 'link',
    name: 'Link',
    description: 'Insert a link',
    icon: <Link className="w-4 h-4 text-gray-600" />
  },
  {
    id: 'list',
    name: 'Bullet List',
    description: 'Create a bullet list',
    icon: <List className="w-4 h-4 text-gray-600" />
  },
  {
    id: 'code',
    name: 'Code Block',
    description: 'Insert a code block',
    icon: <Code className="w-4 h-4 text-gray-600" />
  },
  {
    id: 'note',
    name: 'Note',
    description: 'Create a note/callout',
    icon: <FileText className="w-4 h-4 text-gray-600" />
  }
];