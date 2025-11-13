-- Create database
CREATE DATABASE IF NOT EXISTS dashboard_db;
USE dashboard_db;

-- Create orders table with all fields from Excel file (34 columns)
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_account VARCHAR(255) NULL,
  order_id VARCHAR(100) NULL,
  channel_order_number VARCHAR(100) NULL,
  channel_order_date DATETIME NULL,
  waybill_number VARCHAR(100) NULL,
  pre_generated_waybill VARCHAR(100) NULL,
  order_date DATE NOT NULL,
  ref_invoice_number VARCHAR(100) NULL,
  payment_method VARCHAR(50) NULL,
  express VARCHAR(50) NULL,
  pickup_warehouse VARCHAR(255) NULL,
  consignee_name VARCHAR(255) NULL,
  consignee_contact VARCHAR(20) NULL,
  alternate_number VARCHAR(20) NULL,
  address TEXT NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  pincode VARCHAR(20) NULL,
  product_name VARCHAR(500) NULL,
  quantity INT DEFAULT 1,
  product_value DECIMAL(12, 2) NULL,
  sku VARCHAR(100) NULL,
  order_value DECIMAL(12, 2) NULL,
  extra_charges DECIMAL(12, 2) NULL,
  total_amount DECIMAL(12, 2) NULL,
  cod_amount DECIMAL(12, 2) NULL,
  dimensions VARCHAR(100) NULL,
  weight DECIMAL(10, 2) NULL,
  fulfillment_partner VARCHAR(100) NULL,
  order_status VARCHAR(100) NULL,
  added_on DATETIME NULL,
  delivered_date DATETIME NULL,
  rts_date DATETIME NULL,
  client_order_id VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_order_id (order_id),
  INDEX idx_order_date (order_date),
  INDEX idx_order_status (order_status),
  INDEX idx_product_name (product_name),
  INDEX idx_sku (sku),
  INDEX idx_pincode (pincode),
  INDEX idx_city (city),
  INDEX idx_state (state),
  INDEX idx_payment_method (payment_method),
  INDEX idx_fulfillment_partner (fulfillment_partner),
  INDEX idx_order_value (order_value),
  INDEX idx_channel_order_number (channel_order_number),
  INDEX idx_waybill_number (waybill_number),
  INDEX idx_client_order_id (client_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create composite indexes for better query performance
CREATE INDEX idx_order_date_status ON orders(order_date, order_status);
CREATE INDEX idx_product_pincode ON orders(product_name, pincode);
CREATE INDEX idx_date_payment ON orders(order_date, payment_method);
CREATE INDEX idx_status_partner ON orders(order_status, fulfillment_partner);

-- Create logs table for application logging
CREATE TABLE IF NOT EXISTS api_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  method VARCHAR(10) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  status_code INT,
  response_time INT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_body TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_endpoint (endpoint),
  INDEX idx_status_code (status_code),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create import_logs table for tracking Excel imports
CREATE TABLE IF NOT EXISTS import_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  total_rows INT,
  inserted_rows INT,
  error_rows INT,
  status ENUM('success', 'failed', 'partial') DEFAULT 'success',
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

