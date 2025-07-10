# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Trade Journal Local" - a local file-based investment record management system similar to Obsidian. The application is designed to be completely offline, privacy-focused, and will eventually be packaged as an Electron desktop application.

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
- **Local File System**: All data stored in user's local directories (e.g., `~/Documents/TradeJournal/`)
- **Markdown Files**: Trade records stored as markdown files with frontmatter
- **CSV Integration**: Portfolio data managed via CSV files with custom mapping support
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

### Directory Structure (Planned)
```
app/
├── (main)/
│   ├── dashboard/     # Main dashboard
│   ├── trades/        # Trade listing and details
│   ├── gallery/       # Image gallery views
│   ├── analytics/     # Analysis and reporting
│   └── import/        # CSV import functionality
└── api/               # Electron IPC communication

components/
├── ui/                # Shadcn/ui components
├── trade/             # Trade-specific components
├── gallery/           # Gallery components
└── analytics/         # Analytics components

lib/
├── file-system/       # File operations
├── parsers/           # CSV/Excel/MD parsing
├── csv-mapper/        # CSV mapping logic
├── trade-linker/      # CSV-MD linking
├── trade-filters/     # Filter presets management
└── utils/             # Utilities (search, debounce)

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

## Electron Integration (Implemented)

The project has been successfully integrated with Electron and includes:
- **IPC Communication**: Secure communication between renderer and main process using contextBridge
- **Native File System Access**: Full file system operations through Electron APIs
- **Security**: Context isolation enabled with proper preload script
- **Development Mode**: Hot reload support with `npm run electron-dev`
- **Production Build**: Packaging with electron-builder for distribution
- **Cross-platform**: Ready for Windows, macOS, and Linux deployment

## Path Aliases

- `@/*` maps to the project root directory

## Implemented Features

Based on completed GitHub issues:

### Phase 1 Completed:
- **Analytics Dashboard** (#1): Interactive charts, PnL summaries, performance metrics
- **Enhanced Trade Filtering** (#2): Advanced search, filter presets, bulk operations
- **UI/UX Improvements** (#4): Responsive design, loading states, error handling
- **Bug Fix** (#8): Fixed infinite re-render issue on gallery page

### Phase 2 Completed:
- **File System API Abstraction** (#5): Service layer for file operations
- **IPC Communication Layer** (#6): Secure Electron IPC implementation

### Phase 3 Completed:
- **Electron Integration** (#7): Full desktop application functionality

### Currently Open:
- **Export and Backup Functionality** (#3): In progress

## API Services

### ElectronFileService
The main service for file operations when running in Electron:
- `readDirectory()`: List files in a directory
- `readFile()`: Read file contents
- `writeFile()`: Write data to file
- `deleteFile()`: Delete a file
- `exists()`: Check if file/directory exists
- `createDirectory()`: Create new directory
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