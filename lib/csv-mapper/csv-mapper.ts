import { CSVData, CSVMapping, CSVImportResult } from '@/types/csv';
import { Trade } from '@/types/trade';
import { generateId, parseNumber } from '@/lib/utils';
import { parse, format } from 'date-fns';

export class CSVMapper {
  static mapCSVToTrades(
    csvData: CSVData,
    mapping: CSVMapping,
    skipRows: number = 0
  ): CSVImportResult {
    const result: CSVImportResult = {
      success: true,
      trades: [],
      errors: [],
      warnings: [],
      imported: 0,
      skipped: 0
    };

    const rows = csvData.rows.slice(skipRows);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + skipRows + 1;

      try {
        const trade = this.mapRowToTrade(row, mapping);
        if (trade) {
          result.trades.push(trade);
          result.imported++;
        } else {
          result.skipped++;
        }
      } catch (error) {
        result.errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.skipped++;
      }
    }

    if (result.errors.length > 0) {
      result.success = false;
    }

    return result;
  }

  private static mapRowToTrade(row: Record<string, string | number>, mapping: CSVMapping): Trade | null {
    const { columnMapping, dateFormat, numberFormat } = mapping;

    // Extract required fields
    const buyDateValue = row[columnMapping.buyDate];
    const tickerValue = row[columnMapping.ticker];
    const buyPriceValue = row[columnMapping.buyPrice];
    const quantityValue = row[columnMapping.quantity];

    if (!buyDateValue || !tickerValue || !buyPriceValue || !quantityValue) {
      return null;
    }

    // Parse buy date
    let parsedBuyDate: Date;
    try {
      parsedBuyDate = parse(buyDateValue.toString(), dateFormat, new Date());
      if (isNaN(parsedBuyDate.getTime())) {
        throw new Error(`Invalid buy date format: ${buyDateValue}`);
      }
    } catch (error) {
      throw new Error(`Buy date parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Parse required numbers
    const quantity = parseNumber(quantityValue, numberFormat);
    const buyPrice = parseNumber(buyPriceValue, numberFormat);

    if (quantity <= 0 || buyPrice <= 0) {
      throw new Error(`Invalid quantity or buy price: ${quantity}, ${buyPrice}`);
    }

    // Parse optional sell fields
    let sellDate: string | undefined;
    let sellPrice: number | undefined;
    
    if (columnMapping.sellDate && row[columnMapping.sellDate]) {
      try {
        const parsedSellDate = parse(row[columnMapping.sellDate].toString(), dateFormat, new Date());
        if (!isNaN(parsedSellDate.getTime())) {
          sellDate = format(parsedSellDate, 'yyyy-MM-dd');
        }
      } catch (error) {
        // If sell date parsing fails, just leave it undefined
      }
    }

    if (columnMapping.sellPrice && row[columnMapping.sellPrice]) {
      try {
        const parsedSellPrice = parseNumber(row[columnMapping.sellPrice], numberFormat);
        if (parsedSellPrice > 0) {
          sellPrice = parsedSellPrice;
        }
      } catch (error) {
        // If sell price parsing fails, just leave it undefined
      }
    }

    // Auto-calculate P&L if both sell price and buy price are available
    let pnl: number | undefined;
    if (sellPrice !== undefined) {
      pnl = (sellPrice - buyPrice) * quantity;
    }

    // Auto-calculate holding days if both dates are available
    let holdingDays: number | undefined;
    if (sellDate) {
      const buyDateObj = parsedBuyDate;
      const sellDateObj = parse(sellDate, 'yyyy-MM-dd', new Date());
      holdingDays = Math.ceil((sellDateObj.getTime() - buyDateObj.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Parse optional commission
    const commission = columnMapping.commission
      ? parseNumber(row[columnMapping.commission] || 0, numberFormat)
      : undefined;

    const now = new Date().toISOString();

    return {
      id: generateId(),
      ticker: tickerValue.toString().toUpperCase(),
      buyDate: format(parsedBuyDate, 'yyyy-MM-dd'),
      buyPrice,
      quantity,
      sellDate,
      sellPrice,
      pnl,
      holdingDays,
      commission,
      tags: [],
      notesFiles: [],
      createdAt: now,
      updatedAt: now
    };
  }


  static createDefaultMapping(): CSVMapping {
    const now = new Date().toISOString();
    
    return {
      id: generateId(),
      name: 'Default Mapping',
      description: 'Default CSV mapping for complete trade records',
      columnMapping: {
        buyDate: 'buyDate',
        ticker: 'ticker',
        buyPrice: 'buyPrice',
        quantity: 'quantity',
        sellDate: 'sellDate',
        sellPrice: 'sellPrice',
        commission: 'commission'
      },
      dateFormat: 'yyyy-MM-dd',
      numberFormat: {
        decimalSeparator: '.',
        thousandsSeparator: ','
      },
      createdAt: now,
      updatedAt: now
    };
  }

  static validateMapping(mapping: CSVMapping, headers: string[]): string[] {
    const errors: string[] = [];
    const { columnMapping } = mapping;

    // Check required columns
    const requiredColumns = ['buyDate', 'ticker', 'buyPrice', 'quantity'];
    
    for (const required of requiredColumns) {
      const mappedColumn = columnMapping[required];
      if (!mappedColumn) {
        errors.push(`Missing mapping for required column: ${required}`);
      } else if (!headers.includes(mappedColumn)) {
        errors.push(`Mapped column '${mappedColumn}' not found in CSV headers`);
      }
    }

    // Check optional columns if they are mapped
    const optionalColumns = ['sellDate', 'sellPrice', 'commission'];
    for (const optional of optionalColumns) {
      const mappedColumn = columnMapping[optional];
      if (mappedColumn && !headers.includes(mappedColumn)) {
        errors.push(`Mapped column '${mappedColumn}' not found in CSV headers`);
      }
    }

    // Validate date format
    try {
      const testDate = '2024-01-01';
      parse(testDate, mapping.dateFormat, new Date());
    } catch (error) {
      errors.push(`Invalid date format: ${mapping.dateFormat}`);
    }

    return errors;
  }
}