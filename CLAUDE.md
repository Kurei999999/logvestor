# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Trade Journal Local" - a local file-based investment record management system similar to Obsidian. The application is designed to be completely offline, privacy-focused, and packaged as an Electron desktop application.

## Development Commands

```bash
# Start development server with turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run Electron in development mode
npm run electron-dev

# Build Electron app for distribution
npm run electron-build
```

## Technology Stack

- **Framework**: Next.js 15.3.5 with App Router
- **Language**: TypeScript 5 with strict mode
- **Styling**: Tailwind CSS 4.x
- **Runtime**: React 19
- **Desktop Framework**: Electron 33+ (implemented)

## Architecture Overview

The application follows a local-first architecture with these key concepts:

### Data Management
- **Local File System**: All data stored in user's local directories (default: `~/TradeJournal/`)
- **Date-based Folder Structure**: `trades/{year}/{ticker}_{MM-DD}_{sequence}/` with automatic sequence numbering
- **Markdown Files**: Trade records stored as markdown files with frontmatter
- **CSV Integration**: Portfolio data managed via CSV files with custom mapping support
- **Central CSV Management**: Single `trades.csv` file for unified analytics data
- **Image Storage**: Chart images stored alongside markdown files in organized folders

### Core Features
1. **Trade Records**: Markdown-based recording with template support
2. **CSV-Markdown Linking**: Manual linking between CSV trade data and markdown analysis files
3. **Image Gallery**: Grid and timeline views of trade charts
4. **Portfolio Management**: CSV/Excel file integration with custom field mapping
5. **Analytics**: Performance analysis and visualization
6. **Advanced Search & Filtering**: Full-text search, debounced performance, multiple filter criteria
7. **Filter Presets**: Save and manage commonly used filter combinations
8. **Bulk Operations**: Bulk select, delete, and export trades
9. **CSV Viewer/Editor**: Flexible CSV data management without mapping requirements

### Directory Structure
```
app/
├── (main)/
│   ├── dashboard/     # Main dashboard
│   ├── trades/        # Trade listing and details
│   ├── gallery/       # Image gallery views
│   ├── analytics/     # Analysis and reporting
│   ├── csv-viewer/    # CSV viewer/editor
│   ├── import/        # CSV import functionality
│   └── settings/      # Settings and migration tools
└── api/               # Electron IPC communication

components/
├── ui/                # Shadcn/ui components
├── trade/             # Trade-specific components
├── gallery/           # Gallery components
├── analytics/         # Analytics components
├── csv-viewer/        # CSV viewer components
├── markdown/          # Markdown editor components
├── migration/         # Migration tools components
└── loading/           # Loading skeleton components

lib/
├── file-system/       # File operations
├── trade-folder/      # Trade folder management
├── csv/               # CSV management
├── services/          # Application services
├── hooks/             # React hooks
├── migration/         # Data migration tools
├── parsers/           # CSV/Excel/MD parsing
├── csv-mapper/        # CSV mapping logic
├── trade-linker/      # CSV-MD linking
├── trade-filters/     # Filter presets management
└── utils/             # Utilities (search, debounce)

types/
├── trade.ts           # Trade-related types
├── csv.ts             # CSV types
└── csv-viewer.ts      # CSV viewer types

electron/              # Electron main process
├── main.js            # Main process entry point
├── preload.js         # Preload script with contextBridge
└── ipc-handlers.js    # IPC event handlers
```

## Key Design Principles

1. **Privacy First**: No external API calls, completely offline operation
2. **User Control**: Users control their data location and file organization
3. **Flexibility**: Support for custom CSV formats via mapping
4. **Manual Linking**: User-controlled linking between CSV data and markdown files
5. **Template System**: Customizable markdown templates for different trade types

## Data Format Standards

### Markdown Files
- Use frontmatter for structured data (date, ticker, action, etc.)
- Support for multiple files per trade
- Image references relative to markdown file location

### CSV Integration
- Support for custom column mapping
- Flexible date format handling
- Action mapping for different buy/sell terminology

## Electron Integration

The project has been successfully integrated with Electron and includes:
- **IPC Communication**: Secure communication between renderer and main process using contextBridge
- **Native File System Access**: Full file system operations through Electron APIs
- **Security**: Context isolation enabled with proper preload script
- **Development Mode**: Hot reload support with `npm run electron-dev`
- **Production Build**: Packaging with electron-builder for distribution
- **Cross-platform**: Ready for Windows, macOS, and Linux deployment

## Path Aliases

- `@/*` maps to the project root directory

## Implementation Status

### Completed Features (by Phase):

**Phase 1-3: Core Infrastructure ✅**
- Analytics Dashboard (#1): Interactive charts, PnL summaries, performance metrics
- Enhanced Trade Filtering (#2): Advanced search, filter presets, bulk operations
- UI/UX Improvements (#4): Responsive design, loading states, error handling
- File System API Abstraction (#5): Service layer for file operations
- IPC Communication Layer (#6): Secure Electron IPC implementation
- Electron Integration (#7): Full desktop application functionality
- Bug Fix (#8): Fixed infinite re-render issue on gallery page

**Phase 4: CSV Management ✅**
- CSV Viewer/Editor (#15): Flexible CSV data management without mapping requirements
- Enhanced Trade Import (#16): Format compliance with custom column integration
- Markdown Memo Integration (#19): Local file-based trade notes system with VSCode-like editing

**Phase 5: Data Structure Restructuring ✅**
- Trade Data Structure Restructuring (#21): Complete date-based folder hierarchy with central CSV management

**Phase 6: Markdown Editor Enhancement ✅**
- Slash Commands for Markdown Editor (#24): Advanced content insertion system with keyboard navigation

**Phase 7: UI/UX Enhancement ✅**
- Loading States Implementation: Added skeleton loading components across all pages
- Error Handling Implementation: Added page-level error boundaries with retry functionality
- Code Cleanup: Removed obsolete components and unused files

### Currently In Progress:
- Export and Backup Functionality (#3): In progress

## API Services

### ElectronFileService
Main service for file operations when running in Electron:
- `readDir()`: List files in a directory
- `readFile()`: Read file contents
- `writeFile()`: Write data to file
- `deleteFile()`: Delete a file
- `exists()`: Check if file/directory exists
- `createDir()`: Create new directory
- `selectFile()`: Open file dialog
- `selectDirectory()`: Open directory dialog

### IPC Channels
Available IPC channels for Electron communication:
- `file:read-directory`
- `file:read-file`
- `file:write-file`
- `file:delete-file`
- `file:exists`
- `file:create-directory`
- `dialog:select-file`
- `dialog:select-directory`

## Key Implemented Systems

### CSV Management System
- **CSV Viewer/Editor**: Flexible CSV data management without complex mapping requirements
- **Enhanced Trade Import**: Integration of CSV Viewer flexibility with Trade analytics capabilities
- **Central CSV Service**: Unified `trades.csv` file management system

### Markdown Integration
- **TradeNotesDropdown**: Real-time file listing from trade folders
- **MarkdownSideEditor**: Right-side panel with edit/preview modes
- **VSCode-like Auto-reload**: External file changes reflected automatically
- **File System Direct Access**: No LocalStorage dependency for memo data
- **Slash Commands System**: Advanced content insertion with keyboard navigation
  - `components/markdown/slash-command-menu.tsx`: Command menu with filtering
  - `lib/hooks/use-slash-commands.ts`: Centralized command logic
  - Support for headers, lists, formatting, tables, images, and more

### Trade Data Structure (Issue #21 - ✅ COMPLETE)
- **Date-based Folder Hierarchy**: `trades/{year}/{ticker}_{MM-DD}_{sequence}/`
- **Directory Location**: Changed from `~/Documents/TradeJournal` to `~/TradeJournal`
- **Sequence Number System**: Automatic assignment for multiple trades (001, 002, 003)
- **Path Generator Library**: New utilities for folder creation and management
- **Central CSV Management**: Single source of truth for all trade data
- **Automatic Migration**: LocalStorage to central CSV migration system
- **Migration Tools**: Complete data migration, validation, and cleanup utilities
- **Settings Page**: User-friendly interface for data management
- **Component Updates**: TradeNotesDropdown and MarkdownSideEditor adapted for new structure

**Key Features:**
- Year-based folder organization with clean naming
- Dynamic path resolution using config.dataDirectory
- Auto-creation of folder structure with sequence assignment
- Backward compatibility with existing folder patterns
- TypeScript type safety with proper interface definitions
- Real-time folder scanning and memo file detection
- Error handling with LocalStorage fallback
- Automatic sync and data validation
- Backup system with automatic backup creation before migrations

### Loading States & Error Handling (Phase 7 - ✅ COMPLETE)
- **Loading Components**: Comprehensive skeleton loading system
  - `components/loading/dashboard-skeleton.tsx`: Dashboard-specific loading states
  - `components/loading/gallery-skeleton.tsx`: Image gallery loading animation
  - `components/loading/trades-skeleton.tsx`: Trade list loading states
- **Error Boundaries**: Page-level error handling with recovery
  - `components/page-error-boundary.tsx`: Unified error boundary component
  - Retry functionality for failed operations
  - User-friendly error messages with context
- **Implementation Coverage**:
  - Dashboard: Real data loading with statistics calculation
  - Analytics: Enhanced error handling with proper type conversion
  - Gallery: Async data loading with error recovery
  - All pages: Consistent loading and error handling patterns
- **Code Quality**: Removed obsolete components (unused hooks, old markdown editors)