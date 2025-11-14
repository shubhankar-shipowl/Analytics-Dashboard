const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dashboard API',
      version: '1.0.0',
      description: 'API documentation for Analytics Dashboard - Order Management and Analytics System',
      contact: {
        name: 'API Support',
        email: 'support@dashboard.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:5009/api',
        description: 'Development server'
      },
      {
        url: 'https://api.dashboard.com/api',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Auto-increment ID'
            },
            order_id: {
              type: 'string',
              description: 'Order ID from source system'
            },
            order_date: {
              type: 'string',
              format: 'date',
              description: 'Order date (YYYY-MM-DD)'
            },
            order_status: {
              type: 'string',
              description: 'Order status (e.g., delivered, RTS, RTO, NDR, etc.)'
            },
            product_name: {
              type: 'string',
              description: 'Product name'
            },
            sku: {
              type: 'string',
              description: 'Stock Keeping Unit'
            },
            pincode: {
              type: 'string',
              description: 'Delivery pincode'
            },
            city: {
              type: 'string',
              description: 'Delivery city'
            },
            order_value: {
              type: 'number',
              format: 'float',
              description: 'Order value/amount'
            },
            payment_method: {
              type: 'string',
              description: 'Payment method (COD, PPD, etc.)'
            },
            fulfillment_partner: {
              type: 'string',
              description: 'Fulfillment partner name'
            },
            quantity: {
              type: 'integer',
              description: 'Product quantity',
              default: 1
            }
          }
        },
        KPIs: {
          type: 'object',
          properties: {
            totalOrders: {
              type: 'integer',
              description: 'Total orders (excluding cancelled)'
            },
            totalRevenue: {
              type: 'number',
              description: 'Total revenue from valid orders'
            },
            averageOrderValue: {
              type: 'number',
              description: 'Average order value'
            },
            topPincode: {
              type: 'string',
              description: 'Top pincode by delivered orders'
            },
            topPincodeRatio: {
              type: 'number',
              description: 'Delivery ratio for top pincode'
            },
            topPincodeDeliveredCount: {
              type: 'integer',
              description: 'Number of delivered orders in top pincode'
            },
            totalRTO: {
              type: 'integer',
              description: 'Total RTO (Return to Origin) orders'
            },
            totalRTS: {
              type: 'integer',
              description: 'Total RTS (Ready to Ship) orders'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            }
          }
        }
      },
      parameters: {
        startDate: {
          name: 'startDate',
          in: 'query',
          description: 'Start date for filtering (YYYY-MM-DD)',
          required: false,
          schema: {
            type: 'string',
            format: 'date'
          },
          example: '2024-01-01'
        },
        endDate: {
          name: 'endDate',
          in: 'query',
          description: 'End date for filtering (YYYY-MM-DD)',
          required: false,
          schema: {
            type: 'string',
            format: 'date'
          },
          example: '2024-12-31'
        },
        product: {
          name: 'product',
          in: 'query',
          description: 'Filter by product name (partial match)',
          required: false,
          schema: {
            type: 'string'
          }
        },
        pincode: {
          name: 'pincode',
          in: 'query',
          description: 'Filter by pincode',
          required: false,
          schema: {
            type: 'string'
          }
        },
        limit: {
          name: 'limit',
          in: 'query',
          description: 'Number of records to return',
          required: false,
          schema: {
            type: 'integer',
            default: 100
          }
        },
        offset: {
          name: 'offset',
          in: 'query',
          description: 'Number of records to skip',
          required: false,
          schema: {
            type: 'integer',
            default: 0
          }
        }
      }
    },
    tags: [
      {
        name: 'Orders',
        description: 'Order management endpoints'
      },
      {
        name: 'Analytics',
        description: 'Analytics and KPI endpoints'
      },
      {
        name: 'Import',
        description: 'Data import endpoints'
      },
      {
        name: 'Health',
        description: 'Health check endpoints'
      }
    ]
  },
  apis: [
    './routes/*.js',
    './server.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

