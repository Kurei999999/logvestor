# Sample Trade Data

This directory contains sample CSV files for testing the Trade Journal application.

## Files

### trades.csv
US stock trades with the following columns:
- `date`: Trade date (YYYY-MM-DD format)
- `ticker`: Stock symbol
- `action`: buy/sell
- `quantity`: Number of shares
- `price`: Price per share
- `total`: Total transaction amount
- `fees`: Transaction fees
- `notes`: Trade notes and reasoning
- `tags`: Comma-separated tags for categorization

### trades-jp.csv
Japanese stock trades with similar structure:
- Japanese stock codes (e.g., 7203 for Toyota)
- Prices in Japanese Yen
- Notes in Japanese

## Usage

1. Import either CSV file through the Import page
2. Map the CSV columns to the trade fields
3. The data will be converted to markdown files for local storage

## Sample Data Overview

The sample data includes:
- **50+ trade records** spanning 6 months
- **Various sectors**: Technology, Finance, Energy, Healthcare, etc.
- **Different trade types**: Swing trades, long-term holds, speculative plays
- **Realistic pricing** and transaction fees
- **Detailed notes** explaining trade reasoning
- **Tags** for categorization and filtering

Perfect for testing:
- CSV import functionality
- Trade filtering and search
- Analytics and reporting
- Gallery views of trade data