# Trades Edit Feature

## Overview
A new editable trades interface has been implemented, similar to the CSV viewer functionality. This allows users to edit their imported trades directly in a spreadsheet-like table interface.

## Features

### Direct Cell Editing
- Click on any cell to edit its value
- Automatic type validation (numbers, dates, text)
- Auto-calculation of P&L and holding days when relevant fields are updated
- Tags can be edited as comma-separated values

### Trade Management
- Add new trade rows with the "Add Trade" button
- Delete trades using the trash icon
- Sort by any column by clicking the column header
- Search/filter trades in real-time

### Data Persistence
- Changes are tracked and indicated with "Unsaved Changes" badge
- Save all changes with the "Save Changes" button
- Export data as CSV or JSON

## Navigation

### From Trades List
- Click "Edit All" button on the trades page to access the edit interface

### From CSV Import
- After importing CSV data, click "Edit Trades" to immediately edit imported data

## Usage

1. Navigate to `/trades/edit` or click "Edit All" from the trades page
2. Click any cell to start editing
3. Press Enter to save or Escape to cancel
4. P&L is auto-calculated when both buy and sell prices are present
5. Holding days are auto-calculated when both buy and sell dates are present
6. Click "Save Changes" when finished editing

## Technical Details

- New page: `/app/(main)/trades/edit/page.tsx`
- New component: `/components/trade/trades-table.tsx`
- Uses same LocalStorage persistence as other trade operations
- Maintains data integrity with automatic calculations