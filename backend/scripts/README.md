# Excel Import Script

This script allows you to import Excel files directly into the database from the command line.

## Usage

### Basic Import (Append to existing data)
```bash
# From project root
npm run import:excel

# Or from backend directory
cd backend
npm run import:excel
```

### Import with Clear (Delete existing data first)
```bash
# From project root
npm run import:excel:clear

# Or from backend directory
cd backend
npm run import:excel:clear
```

### Custom File Path
```bash
# From backend directory
node scripts/import-excel.js --file=path/to/your/file.xlsx

# With clear option
node scripts/import-excel.js --clear --file=path/to/your/file.xlsx
```

## Default File Location

The script will automatically look for the Excel file in these locations (in order):
1. `public/data/ForwardOrders-1762582722-21819 (1).xlsx`
2. `ForwardOrders-1762582722-21819 (1).xlsx` (project root)

## Options

- `--clear` or `-c`: Clear all existing data from the database before importing
- `--file=<path>` or `-f=<path>`: Specify a custom file path

## Example Output

```
🚀 Starting Excel Import Script...

📡 Testing database connection...
✅ Database connected successfully

📂 Excel file: C:\Users\...\public\data\ForwardOrders-1762582722-21819 (1).xlsx
🗑️  Clear existing data: No

📊 IMPORT SUMMARY
============================================================
✅ Total rows processed: 201,610
✅ Successfully inserted: 201,610
❌ Errors: 0
============================================================

🎉 Import completed successfully!
```

