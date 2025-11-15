# Analytics Dashboard

An interactive React dashboard for analyzing order data from Excel files. This dashboard provides comprehensive insights into orders, revenue, delivery performance, and fulfillment partner analytics.

## Features

- **Key Performance Indicators (KPIs)**
  - Total Orders
  - Total Revenue
  - Average Order Value
  - Total Cash on Delivery (COD)
  - Total RTO (Return to Origin)
  - Total RTS (Return to Sender)

- **Order Status Analysis**
  - Order Status Distribution (percentage and number)
  - Delivery Ratio Calculation
  - Delivery Ratio by Fulfillment Partner

- **Payment Method Analysis**
  - COD and PPD Distribution (number and percentage)

- **Fulfillment Partner Analysis**
  - Orders and Revenue by Partner

- **Price Range Distribution**
  - Visual breakdown of order value ranges

- **Trend Analysis**
  - Daily Order and Revenue Trends
  - Filter options: Last 7 days, Last 30 days, Yearly, Lifetime, and Custom date range
  - Toggle between Order View and Revenue View

- **Top Performers**
  - Top 10 Products by Orders
  - Top 10 Products by Revenue
  - Top 10 Cities by Orders
  - Top 10 Cities by Revenue

- **Advanced Search & Filtering**
  - Search by Product Name
  - Search by Pincode
  - Top 10 Products in a particular Pincode
  - Combined filter support (Time Period + Product + Pincode)

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (version 14.0.0 or higher)
- **npm** (version 6.0.0 or higher) or **yarn**

To check if you have Node.js and npm installed, run:
```bash
node --version
npm --version
```

If you don't have Node.js installed, download it from [nodejs.org](https://nodejs.org/).

## Installation Steps

### 1. Clone the Repository

```bash
git clone git@github.com:shubhankar-shipowl/Analytics-Dashboard.git
```

Or if you're using HTTPS:
```bash
git clone https://github.com/shubhankar-shipowl/Analytics-Dashboard.git
```

### 2. Navigate to the Project Directory

```bash
cd Analytics-Dashboard
```

### 3. Install Dependencies

Install all required npm packages:

```bash
npm install
```

This will install all the dependencies listed in `package.json`, including:
- React and React DOM
- Recharts (for data visualization)
- XLSX (for Excel file processing)
- Date-fns (for date manipulation)
- And other required packages

### 4. Add Your Excel File (Optional)

If you want to use your own Excel file, place it in the `public/data/` directory. The default file location is:
```
public/data/ForwardOrders-1762582722-21819 (1).xlsx
```

**Note:** Make sure your Excel file has the following columns (column names are case-insensitive and flexible):
- Order Date
- Order Status
- Product Name
- Pincode
- Order Value / Revenue
- Payment Method (COD/PPD)
- Fulfilled By / Fulfillment Partner
- And other relevant order data

## Running the Application

### Running Both Backend and Frontend Together

To start both the backend API and frontend React app simultaneously:

```bash
npm run start:all
```

Or for development mode with auto-reload:

```bash
npm run dev:all
```

### Running Separately

**Backend Only:**
```bash
npm run backend
```

**Frontend Only:**
```bash
npm run frontend
```

**Backend (Development with auto-reload):**
```bash
npm run backend:dev
```

**Frontend (Development):**
```bash
npm run frontend:dev
```

## Production Deployment with PM2

For production environments, we recommend using PM2 (Process Manager 2) for process management, auto-restart, and monitoring.

### Install PM2

```bash
npm install -g pm2
```

### Quick Start with Shell Script (Recommended)

We provide a convenient shell script for managing the application with PM2:

```bash
# Make the script executable (first time only)
chmod +x pm2-manager.sh

# Start the application
./pm2-manager.sh start          # Development mode
./pm2-manager.sh start prod     # Production mode

# Manage the application
./pm2-manager.sh stop           # Stop the application
./pm2-manager.sh restart        # Restart (development)
./pm2-manager.sh restart prod   # Restart (production)
./pm2-manager.sh status         # Show status
./pm2-manager.sh logs           # Show logs (last 50 lines)
./pm2-manager.sh logs 100       # Show last 100 lines
./pm2-manager.sh monitor        # Open PM2 monitor
./pm2-manager.sh delete         # Remove from PM2
./pm2-manager.sh startup        # Setup auto-start on boot
./pm2-manager.sh help           # Show help
```

### Using NPM Scripts

**Start with PM2:**
```bash
npm run pm2:start          # Development mode
npm run pm2:start:prod     # Production mode
```

**PM2 Management Commands:**
```bash
npm run pm2:status         # View status
npm run pm2:logs           # View logs
npm run pm2:monit          # Real-time monitoring
npm run pm2:stop           # Stop application
npm run pm2:restart        # Restart application
npm run pm2:delete         # Delete from PM2
npm run pm2:startup       # Setup auto-start on boot
npm run pm2:save           # Save current processes
```

### Direct PM2 Commands

```bash
pm2 start ecosystem.config.js --only dashboard
pm2 stop dashboard
pm2 restart dashboard
pm2 logs dashboard
pm2 monit
pm2 status
```

## Nginx Reverse Proxy Setup

For production deployments, we recommend using Nginx as a reverse proxy in front of your application. This provides:

- SSL/TLS encryption
- Better performance and caching
- Rate limiting and security
- Single port access (80/443)

### Quick Setup

1. **Install Nginx:**
```bash
sudo apt install nginx -y  # Ubuntu/Debian
sudo yum install nginx -y   # CentOS/RHEL
```

2. **Copy Configuration:**
```bash
sudo cp nginx.conf /etc/nginx/sites-available/analytics-dashboard
sudo ln -s /etc/nginx/sites-available/analytics-dashboard /etc/nginx/sites-enabled/
```

3. **Update Configuration:**
   - Edit `/etc/nginx/sites-available/analytics-dashboard`
   - Replace `your-domain.com` with your actual domain
   - Update SSL certificate paths if needed

4. **Test and Reload:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

5. **Setup SSL (Let's Encrypt):**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

For detailed Nginx setup instructions, see [NGINX_SETUP.md](./NGINX_SETUP.md).

## Port Information

The application displays comprehensive port information when starting. You can also check ports anytime using:

```bash
# Show all port information
./show-ports.sh
```

This script shows:
- PM2 process status
- Nginx status (if installed)
- Backend port (5009) status and URLs
- Frontend port (3006) status and URLs
- Nginx URLs (if configured)
- Quick command reference

### Port Information Display

When you start the application, you'll see:

**With PM2 (`./start.sh` or `npm run pm2:start`):**
- Backend port: 5009
- Frontend port: 3006
- Local and network access URLs
- Nginx access URLs (if configured)

**With npm (`npm run dev`):**
- Same port information displayed in console
- Backend and frontend startup messages show ports

**Backend Server Logs:**
- Shows port, environment, and all access URLs
- Displays both direct access and Nginx URLs

### Build for Production

To create an optimized production build:

```bash
npm run build
```

This builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

### Running Tests

```bash
npm test
```

## Project Structure

```
Analytics-Dashboard/
├── backend/
│   ├── config/          # Database and Swagger configuration
│   ├── database/        # SQL schema files
│   ├── middleware/      # Cache and rate limiting middleware
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   ├── scripts/        # Utility scripts (import, clear data)
│   ├── utils/          # Helper utilities
│   └── server.js       # Main backend server
├── src/
│   ├── components/     # React components (charts, filters, etc.)
│   ├── utils/          # Frontend utilities (API, data processing)
│   ├── app.js          # Main React app
│   └── index.js        # React entry point
├── public/             # Static files
├── ecosystem.config.js # PM2 configuration
├── start-combined.js   # Combined start script for PM2
├── start-frontend.js   # Frontend start wrapper
├── package.json
└── README.md
```

## Technologies Used

- **React** - UI library
- **Recharts** - Charting library for data visualization
- **XLSX** - Excel file parsing
- **Date-fns** - Date manipulation utilities
- **React Scripts** - Build tooling and development server

## Key Features Explained

### Delivery Ratio Calculation
The delivery ratio is calculated as:
```
Delivery Ratio = (Delivered Orders / Total Orders) × 100
```

Where Total Orders includes:
- RTO
- RTS
- Dispatched
- RTO-IT
- RTO-dispatched
- RTO pending
- Lost
- Delivered

### Filtering
- **Time Period Filter**: Filter data by Last 7 days, Last 30 days, Yearly, Lifetime, or Custom date range
- **Product Filter**: Search and filter by specific product names
- **Pincode Filter**: Filter data by specific pincodes
- All filters work together to provide combined insights

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, you'll see a prompt asking if you want to run the app on another port. Type `Y` to proceed.

### Module Not Found Errors
If you encounter module not found errors, try:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Excel File Not Loading
- Ensure the Excel file is in the `public/data/` directory
- Check that the file name matches the expected name in the code
- Verify the Excel file is not corrupted and has the required columns

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please open an issue on the GitHub repository.

---

**Happy Analyzing! 📊**

