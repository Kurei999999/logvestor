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
    const { columnMapping, dateFormat, actionMapping, numberFormat } = mapping;

    // Extract required fields
    const dateValue = row[columnMapping.date];
    const tickerValue = row[columnMapping.ticker];
    const actionValue = row[columnMapping.action];
    const quantityValue = row[columnMapping.quantity];
    const priceValue = row[columnMapping.price];

    if (!dateValue || !tickerValue || !actionValue || !quantityValue || !priceValue) {
      return null;
    }

    // Parse date
    let parsedDate: Date;
    try {
      parsedDate = parse(dateValue.toString(), dateFormat, new Date());
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date format: ${dateValue}`);
      }
    } catch (error) {
      throw new Error(`Date parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Map action
    const action = this.mapAction(actionValue.toString(), actionMapping);
    if (!action) {
      throw new Error(`Unknown action: ${actionValue}`);
    }

    // Parse numbers
    const quantity = parseNumber(quantityValue, numberFormat);
    const price = parseNumber(priceValue, numberFormat);

    if (quantity <= 0 || price <= 0) {
      throw new Error(`Invalid quantity or price: ${quantity}, ${price}`);
    }

    // Parse optional fields
    const commission = columnMapping.commission
      ? parseNumber(row[columnMapping.commission] || 0, numberFormat)
      : undefined;

    const pnl = columnMapping.pnl
      ? parseNumber(row[columnMapping.pnl] || 0, numberFormat)
      : undefined;

    const now = new Date().toISOString();

    return {
      id: generateId(),
      date: format(parsedDate, 'yyyy-MM-dd'),
      ticker: tickerValue.toString().toUpperCase(),
      action,
      quantity,
      price,
      commission,
      pnl,
      tags: [],
      notesFiles: [],
      createdAt: now,
      updatedAt: now
    };
  }

  private static mapAction(actionValue: string, actionMapping: CSVMapping['actionMapping']): 'buy' | 'sell' | null {
    const normalizedAction = actionValue.toLowerCase().trim();
    
    if (actionMapping.buy.some(buyAction => buyAction.toLowerCase() === normalizedAction)) {
      return 'buy';
    }
    
    if (actionMapping.sell.some(sellAction => sellAction.toLowerCase() === normalizedAction)) {
      return 'sell';
    }
    
    return null;
  }

  static createDefaultMapping(): CSVMapping {
    const now = new Date().toISOString();
    
    return {
      id: generateId(),
      name: 'Default Mapping',
      description: 'Default CSV mapping configuration',
      columnMapping: {
        date: 'date',
        ticker: 'ticker',
        action: 'action',
        quantity: 'quantity',
        price: 'price',
        commission: 'commission',
        pnl: 'pnl'
      },
      dateFormat: 'yyyy-MM-dd',
      actionMapping: {
        buy: ['buy', 'B', 'Buy', 'BUY', '買い', '現物買', '信用新規買'],
        sell: ['sell', 'S', 'Sell', 'SELL', '売り', '現物売', '信用返済売']
      },
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
    const requiredColumns = ['date', 'ticker', 'action', 'quantity', 'price'];
    
    for (const required of requiredColumns) {
      const mappedColumn = columnMapping[required];
      if (!mappedColumn) {
        errors.push(`Missing mapping for required column: ${required}`);
      } else if (!headers.includes(mappedColumn)) {
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

    // Validate action mapping
    if (!mapping.actionMapping.buy.length) {
      errors.push('No buy actions defined in action mapping');
    }
    
    if (!mapping.actionMapping.sell.length) {
      errors.push('No sell actions defined in action mapping');
    }

    return errors;
  }
}