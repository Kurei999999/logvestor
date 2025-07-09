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
```

## Technology Stack

- **Framework**: Next.js 15.3.5 with App Router
- **Language**: TypeScript 5 with strict mode
- **Styling**: Tailwind CSS 4.x
- **Runtime**: React 19
- **Future**: Electron 33+ for desktop packaging

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
└── utils/             # Utilities

electron/              # Electron main process
├── main.ts
├── preload.ts
└── ipc-handlers/
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

## Future Electron Integration

The project is designed to be packaged as an Electron desktop application with:
- IPC communication between renderer and main process
- Native file system access
- Cross-platform compatibility (Windows, macOS, Linux)
- Local-only operation for privacy

## Path Aliases

- `@/*` maps to the project root directory