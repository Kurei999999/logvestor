import { Trade, TradeMarkdown } from '@/types/trade';
import { generateId } from '@/lib/utils';

export class TradeLinker {
  static linkMarkdownToTrade(trade: Trade, markdownContent: string, fileName: string): TradeMarkdown {
    const frontmatter = this.parseFrontmatter(markdownContent);
    const content = this.removeFrontmatter(markdownContent);
    
    const now = new Date().toISOString();
    
    return {
      id: generateId(),
      tradeId: trade.id,
      fileName,
      filePath: this.generateFilePath(trade, fileName),
      content,
      frontmatter: {
        date: frontmatter.date || trade.buyDate,
        ticker: frontmatter.ticker || trade.ticker,
        status: frontmatter.status || (trade.sellDate ? 'CLOSED' : 'OPEN'),
        quantity: frontmatter.quantity || trade.quantity,
        buyPrice: frontmatter.buyPrice || trade.buyPrice,
        sellPrice: frontmatter.sellPrice || trade.sellPrice,
        buyDate: frontmatter.buyDate || trade.buyDate,
        sellDate: frontmatter.sellDate || trade.sellDate,
        tags: frontmatter.tags || trade.tags || [],
        ...frontmatter
      },
      createdAt: now,
      updatedAt: now
    };
  }

  static parseFrontmatter(content: string): Record<string, any> {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return {};

    const frontmatterText = frontmatterMatch[1];
    const frontmatter: Record<string, any> = {};

    frontmatterText.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      if (value.startsWith('[') && value.endsWith(']')) {
        // Parse array
        try {
          frontmatter[key] = JSON.parse(value.replace(/'/g, '"'));
        } catch {
          frontmatter[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''));
        }
      } else if (!isNaN(Number(value))) {
        // Parse number
        frontmatter[key] = Number(value);
      } else {
        // Parse string
        frontmatter[key] = value.replace(/['"]/g, '');
      }
    });

    return frontmatter;
  }

  static removeFrontmatter(content: string): string {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!frontmatterMatch) return content;
    
    return content.substring(frontmatterMatch[0].length);
  }

  static generateFilePath(trade: Trade, fileName: string): string {
    const date = new Date(trade.buyDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const status = trade.sellDate ? 'CLOSED' : 'OPEN';
    const tradeFolder = `T${trade.id}_${trade.ticker}_${status}`;
    
    return `trades/${year}/${month}/${tradeFolder}/${fileName}`;
  }

  static createMarkdownTemplate(trade: Trade, type: 'entry' | 'exit' | 'analysis' | 'followup' | 'custom'): string {
    const frontmatter = this.createFrontmatter(trade);
    
    let template = '';
    
    switch (type) {
      case 'entry':
        template = `${frontmatter}
# ${trade.ticker} ${trade.sellDate ? 'CLOSED' : 'OPEN'}エントリー

## エントリー理由
- 

## テクニカル分析
- 

## ファンダメンタル分析
- 

## リスク管理
- ストップロス: $
- 目標価格: $

## 注意点
- 
`;
        break;
      case 'exit':
        template = `${frontmatter}
# ${trade.ticker} 決済

## 決済理由
- 

## 結果
- 実現損益: $${trade.pnl || 0}
- 保有期間: 

## 振り返り
### 良かった点
- 

### 改善点
- 

## 学んだこと
- 
`;
        break;
      case 'analysis':
        template = `${frontmatter}
# ${trade.ticker} 分析レポート

## 概要
- 銘柄: ${trade.ticker}
- 買い日: ${trade.buyDate}
- 数量: ${trade.quantity}
- 買い価格: $${trade.buyPrice}
- ステータス: ${trade.sellDate ? 'CLOSED' : 'OPEN'}

## チャート分析
- 

## 市場環境
- 

## 今後の戦略
- 
`;
        break;
      case 'followup':
        template = `${frontmatter}
# ${trade.ticker} フォローアップ

## 現在の状況
- 

## 市場の変化
- 

## 戦略の修正
- 

## 次のアクション
- 
`;
        break;
      case 'custom':
        template = `${frontmatter}
# ${trade.ticker} カスタムノート

## メモ
- 

`;
        break;
    }
    
    return template;
  }

  static createFrontmatter(trade: Trade): string {
    const frontmatter = [
      '---',
      `date: ${trade.buyDate}`,
      `ticker: ${trade.ticker}`,
      `status: ${trade.sellDate ? 'CLOSED' : 'OPEN'}`,
      `quantity: ${trade.quantity}`,
      `buyPrice: ${trade.buyPrice}`,
      `sellPrice: ${trade.sellPrice || ''}`,
      trade.tags && trade.tags.length > 0 ? `tags: [${trade.tags.map(tag => `"${tag}"`).join(', ')}]` : '',
      '---',
      ''
    ].filter(Boolean).join('\n');
    
    return frontmatter;
  }

  static updateTradeWithMarkdown(trade: Trade, markdownFiles: TradeMarkdown[]): Trade {
    const notesFiles = markdownFiles.map(md => md.filePath);
    
    // Extract tags from all markdown files
    const allTags = new Set(trade.tags || []);
    markdownFiles.forEach(md => {
      (md.frontmatter.tags || []).forEach(tag => allTags.add(tag));
    });
    
    return {
      ...trade,
      notesFiles,
      tags: Array.from(allTags),
      updatedAt: new Date().toISOString()
    };
  }

  static searchMarkdownContent(markdownFiles: TradeMarkdown[], query: string): TradeMarkdown[] {
    const lowercaseQuery = query.toLowerCase();
    
    return markdownFiles.filter(md => 
      md.content.toLowerCase().includes(lowercaseQuery) ||
      md.fileName.toLowerCase().includes(lowercaseQuery) ||
      (md.frontmatter.tags || []).some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  static generateFileName(trade: Trade, type: 'entry' | 'exit' | 'analysis' | 'followup' | 'custom', customName?: string): string {
    const date = new Date(trade.date);
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    
    switch (type) {
      case 'entry':
        return `entry_analysis_${dateStr}.md`;
      case 'exit':
        return `exit_analysis_${dateStr}.md`;
      case 'analysis':
        return `technical_analysis_${dateStr}.md`;
      case 'followup':
        return `followup_${dateStr}.md`;
      case 'custom':
        return customName ? `${customName.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.md` : `memo_${dateStr}.md`;
      default:
        return `memo_${dateStr}.md`;
    }
  }

  static validateMarkdownStructure(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      errors.push('Missing frontmatter section');
    } else {
      const frontmatter = this.parseFrontmatter(content);
      
      // Check required fields
      if (!frontmatter.date) errors.push('Missing date in frontmatter');
      if (!frontmatter.ticker) errors.push('Missing ticker in frontmatter');
      if (!frontmatter.action) errors.push('Missing action in frontmatter');
    }
    
    // Check for basic structure
    const contentWithoutFrontmatter = this.removeFrontmatter(content);
    if (contentWithoutFrontmatter.trim().length === 0) {
      errors.push('Empty content section');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}