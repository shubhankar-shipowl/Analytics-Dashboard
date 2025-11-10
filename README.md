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

### Development Mode

Start the development server:

```bash
npm start
```

The application will automatically open in your browser at [http://localhost:3000](http://localhost:3000).

The page will reload automatically when you make changes to the code. You will see any lint errors in the console.

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
Dashboard/
├── public/
│   ├── data/
│   │   └── ForwardOrders-1762582722-21819 (1).xlsx
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Chart.css
│   │   ├── Filters.css
│   │   ├── Filters.js
│   │   ├── FulfillmentPartnerChart.js
│   │   ├── KPICard.css
│   │   ├── KPICard.js
│   │   ├── KPISection.css
│   │   ├── KPISection.js
│   │   ├── OrderStatusChart.js
│   │   ├── PaymentMethodChart.js
│   │   ├── PriceRangeChart.js
│   │   ├── TopCitiesChart.js
│   │   ├── TopProductsChart.js
│   │   └── TrendChart.js
│   ├── utils/
│   │   └── dataProcessor.js
│   ├── app.css
│   ├── app.js
│   └── index.js
├── .gitignore
├── package.json
├── package-lock.json
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

