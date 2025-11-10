# Dashboard Backend API

Node.js and MySQL backend API for the Analytics Dashboard.

## Features

- RESTful API endpoints for orders management
- Analytics endpoints for KPIs and charts
- MySQL database integration
- CORS enabled for frontend communication
- Environment-based configuration

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend directory (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update the `.env` file with your MySQL credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=dashboard_db
```

4. Create the database and tables:
```bash
mysql -u root -p < database/schema.sql
```

Or manually run the SQL file in your MySQL client.

## Running the Server

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will run on `http://localhost:5000` by default.

## API Endpoints

### Health Check
- `GET /api/health` - Server health check

### Orders
- `GET /api/orders` - Get all orders (with filters)
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

**Query Parameters for GET /api/orders:**
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `product` - Filter by product name
- `pincode` - Filter by pincode
- `status` - Filter by order status
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset (default: 0)

### Analytics
- `GET /api/analytics/kpis` - Get KPIs (Total Orders, Revenue, etc.)
- `GET /api/analytics/order-status` - Get order status distribution
- `GET /api/analytics/payment-methods` - Get payment method distribution
- `GET /api/analytics/fulfillment-partners` - Get fulfillment partner analysis
- `GET /api/analytics/top-products` - Get top products (by orders or revenue)
- `GET /api/analytics/top-cities` - Get top cities (by orders or revenue)
- `GET /api/analytics/trends` - Get daily trends (orders or revenue)
- `GET /api/analytics/delivery-ratio` - Get delivery ratio by fulfillment partner

**Query Parameters for Analytics endpoints:**
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `product` - Filter by product name
- `pincode` - Filter by pincode
- `by` - Sort by 'orders' or 'revenue' (for top-products and top-cities)
- `limit` - Number of results (for top-products and top-cities)
- `view` - 'orders' or 'revenue' (for trends)

## Example API Calls

### Get KPIs
```bash
curl http://localhost:5000/api/analytics/kpis
```

### Get Orders with Filters
```bash
curl "http://localhost:5000/api/orders?startDate=2024-01-01&endDate=2024-12-31&limit=50"
```

### Create Order
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "order_date": "2024-01-15",
    "order_status": "delivered",
    "product_name": "Product ABC",
    "pincode": "110001",
    "city": "New Delhi",
    "order_value": 1500.00,
    "payment_method": "COD",
    "fulfillment_partner": "Partner A"
  }'
```

## Database Schema

The main table is `orders` with the following structure:
- `id` - Primary key
- `order_date` - Order date
- `order_status` - Order status (delivered, RTO, RTS, etc.)
- `product_name` - Product name
- `sku` - SKU code
- `pincode` - Delivery pincode
- `city` - City name
- `order_value` - Order value/amount
- `payment_method` - Payment method (COD, PPD)
- `fulfillment_partner` - Fulfillment partner name
- `quantity` - Product quantity
- `created_at` - Record creation timestamp
- `updated_at` - Record update timestamp

## Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `DB_HOST` - MySQL host
- `DB_PORT` - MySQL port
- `DB_USER` - MySQL username
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name
- `CORS_ORIGIN` - Allowed CORS origin

## Error Handling

All endpoints return JSON responses with the following structure:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Development

The backend uses:
- **Express.js** - Web framework
- **MySQL2** - MySQL driver with promise support
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management
- **body-parser** - Request body parsing

## License

ISC

