# Logvestor - Privacy-First Trade Journal & Analytics Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.3.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-33+-9FEAF9)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Logvestor is a powerful, privacy-focused desktop application for managing investment records and analyzing trading performance. Built with the philosophy of complete data ownership and offline-first operation, it provides professional-grade trading analytics without compromising your privacy.

## 🌟 Key Features

### 🔒 **Complete Privacy & Data Ownership**
- **100% Offline**: No cloud services, no data uploads, no external API calls
- **Local-First Architecture**: All data stored in your chosen directory
- **No Account Required**: Start using immediately without sign-ups or logins
- **Your Data, Your Control**: Export, backup, and manage your data freely

### 📊 **Professional Trading Analytics**
- **Interactive Dashboard**: Real-time P&L calculations, win rates, and performance metrics
- **Advanced Charting**: Beautiful visualizations powered by Recharts
- **Portfolio Management**: Track multiple portfolios with custom CSV mapping
- **Performance Analysis**: Detailed statistics, holding period analysis, and trend identification

### 📝 **Flexible Trade Recording**
- **Markdown-Based Notes**: Rich text formatting with live preview
- **Smart Slash Commands**: 16+ productivity shortcuts for faster note-taking
- **Template System**: Customizable templates for different trading strategies
- **Image Management**: Organize and view trade charts with gallery and timeline views

### 🤖 **AI Integration (MCP)**
- **Model Context Protocol**: Analyze trades with Claude Desktop
- **Auto-Setup**: One-click MCP server configuration
- **Privacy-Preserved**: AI analysis without uploading your data
- **Custom Tools**: Query trades, calculate P&L, and get insights via natural language

### 🛠️ **Developer-Friendly**
- **Modern Tech Stack**: Next.js 15, React 19, TypeScript 5
- **Electron Desktop App**: Native file system access with security
- **Extensible Architecture**: Well-structured codebase for customization
- **Hot Reload Development**: Fast iteration with `npm run electron-dev`

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- macOS, Windows, or Linux

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/logvestor.git
cd logvestor

# Install dependencies
npm install

# Start development mode
npm run electron-dev

# Or build for production
npm run electron-build
```

### First-Time Setup
1. Launch the app - you'll see a beautiful setup dialog
2. Choose your data directory (default: `~/TradeJournal`)
3. The app automatically creates the folder structure:
   ```
   ~/TradeJournal/
   ├── trades/          # Trade records and notes
   ├── portfolios/      # Portfolio CSV files
   ├── templates/       # Markdown templates
   └── trades.csv       # Central trade database
   ```

## 📁 Data Organization

### Smart Folder Structure
```
trades/
├── 2024/
│   ├── AAPL_01-15_001/   # First AAPL trade on Jan 15
│   │   ├── analysis.md     # Your trade notes
│   │   └── chart.png       # Trade charts
│   └── AAPL_01-15_002/   # Second AAPL trade same day
└── 2025/
    └── TSLA_03-20_001/
```

### CSV Integration
- **Flexible Mapping**: Import from any broker's CSV format
- **Central Database**: All trades in `trades.csv` for unified analytics
- **Manual Linking**: Connect CSV data with markdown notes
- **Bulk Operations**: Select, delete, and export multiple trades

## 🎯 Unique Advantages

### Why Logvestor?

1. **True Privacy**: Unlike cloud-based solutions, your trading data never leaves your computer
2. **No Vendor Lock-in**: Standard markdown and CSV formats ensure data portability
3. **Offline Analytics**: Professional-grade analysis without internet dependency
4. **Customizable**: Open-source codebase allows full customization
5. **AI-Ready**: Analyze your trades with AI while maintaining complete privacy

### Perfect For:
- 📈 **Active Traders**: Track and analyze multiple trades daily
- 🔐 **Privacy-Conscious Investors**: Keep sensitive financial data secure
- 📊 **Data Analysts**: Export and analyze in your preferred tools
- 🤖 **AI Enthusiasts**: Leverage Claude for trade insights
- 💼 **Professional Traders**: Enterprise-grade features without enterprise costs

## 🛡️ Security & Privacy

- **Context Isolation**: Electron security best practices
- **No Telemetry**: Zero tracking or analytics
- **Local Processing**: All calculations done on your machine
- **Secure IPC**: Protected communication between processes
- **Open Source**: Fully auditable codebase

## 🔧 Advanced Features

### Markdown Editor
- **VSCode-like Experience**: Familiar keyboard shortcuts
- **Real-time Preview**: See formatted output instantly
- **Slash Commands**: `/table`, `/checklist`, `/codeblock`, and more
- **Auto-save**: Never lose your analysis

### Search & Filtering
- **Full-text Search**: Find trades by any content
- **Advanced Filters**: Date ranges, tickers, P&L thresholds
- **Filter Presets**: Save commonly used filter combinations
- **Debounced Performance**: Smooth searching even with thousands of trades

### Data Migration
- **Backup System**: Automated backups with versioning
- **Migration Tools**: Safely update data structures
- **Validation**: Ensure data integrity during migrations
- **LocalStorage Import**: Migrate from web version seamlessly

## 📦 Technology Stack

- **Frontend**: Next.js 15.3.5, React 19, TypeScript 5
- **Styling**: Tailwind CSS 4.x with Typography plugin
- **Desktop**: Electron 33+ with secure IPC
- **Charts**: Recharts for interactive visualizations
- **UI Components**: Shadcn/ui for consistent design
- **State Management**: React hooks with proper memoization
- **File System**: Native Node.js APIs via Electron

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

```bash
# Fork the repo, then:
git checkout -b feature/your-feature
# Make changes
npm run lint
npm test
git commit -m "feat: add amazing feature"
git push origin feature/your-feature
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [Electron](https://www.electronjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- MCP integration for [Claude Desktop](https://claude.ai)

---

<p align="center">
  <strong>Your trades. Your data. Your insights.</strong><br>
  <em>Professional trading analytics without compromising privacy.</em>
</p>