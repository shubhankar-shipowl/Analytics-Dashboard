# Backend Architecture

## Database-Only Architecture

**The backend is designed to be database-only. It does NOT read from Excel files for serving data.**

### Data Flow

1. **Data Import (One-Time)**
   - Excel files are uploaded via `/api/import/excel` endpoint
   - Files are processed and imported INTO the database
   - Excel files are temporary and deleted after import
   - All data is stored in MySQL database

2. **Data Serving (All Requests)**
   - All API endpoints query the MySQL database ONLY
   - No Excel file reading for data retrieval
   - All routes use database queries via the `Order` model

### API Endpoints

All endpoints serve data from the database:

- `GET /api/orders` - Queries `orders` table
- `GET /api/orders/:id` - Queries `orders` table
- `GET /api/analytics/*` - All analytics queries the database
- `POST /api/import/excel` - Imports Excel TO database (one-way)

### Excel File Usage

Excel files are ONLY used for:
- **Importing data INTO the database** (via upload endpoint or import script)
- **NOT for reading/serving data**

### Database Schema

All data is stored in the `orders` table with the following structure:
- `id` (Primary Key)
- `order_id`
- `order_date`
- `order_status`
- `product_name`
- `sku`
- `pincode`
- `city`
- `order_value`
- `payment_method`
- `fulfillment_partner`
- `quantity`

### Import Process

1. User uploads Excel file via frontend
2. Backend receives file via multer
3. `excelImporter.js` reads and processes Excel file
4. Data is normalized and inserted into database
5. Excel file is deleted after import
6. All subsequent requests read from database

### Scripts

- `scripts/import-excel.js` - Command-line tool to import Excel files to database
  - This is a utility script, not part of the API
  - Used for initial data loading or bulk imports

### Dependencies

- `xlsx` package is ONLY used for importing Excel files to database
- It is NOT used for reading Excel files to serve data
- All data serving uses `mysql2` package

## Key Principles

1. **Database is the single source of truth**
2. **Excel files are import sources only**
3. **No fallback to Excel files**
4. **All queries go to MySQL database**

