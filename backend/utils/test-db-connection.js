require('dotenv').config();
const mysql = require('mysql2/promise');
const logger = require('./logger');

async function testConnectionWithOptions() {
  console.log('\n=== Database Connection Diagnostic Tool ===\n');
  
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'dashboard_db';
  
  console.log('Connection Details:');
  console.log(`  Host: ${host}`);
  console.log(`  Port: ${port}`);
  console.log(`  User: ${user}`);
  console.log(`  Database: ${database}`);
  console.log(`  Password: ${password ? '***' + password.slice(-2) : '(empty)'}\n`);
  
  // Test 1: Basic connection without SSL
  console.log('Test 1: Basic connection (no SSL)...');
  try {
    const connection1 = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 10000
    });
    await connection1.query('SELECT 1');
    await connection1.end();
    console.log('✅ Basic connection successful!\n');
    return true;
  } catch (error) {
    console.log(`❌ Basic connection failed: ${error.message}\n`);
  }
  
  // Test 2: Connection with SSL
  console.log('Test 2: Connection with SSL...');
  try {
    const connection2 = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      ssl: {
        rejectUnauthorized: false
      },
      connectTimeout: 10000
    });
    await connection2.query('SELECT 1');
    await connection2.end();
    console.log('✅ SSL connection successful!\n');
    console.log('💡 Solution: Add DB_SSL=true to your .env file\n');
    return true;
  } catch (error) {
    console.log(`❌ SSL connection failed: ${error.message}\n`);
  }
  
  // Test 3: Connection without database (to test if user exists)
  console.log('Test 3: Testing user authentication (without database)...');
  try {
    const connection3 = await mysql.createConnection({
      host,
      port,
      user,
      password,
      connectTimeout: 10000
    });
    await connection3.query('SELECT 1');
    await connection3.end();
    console.log('✅ User authentication successful!\n');
    console.log('💡 Issue: Database might not exist or user lacks permissions\n');
  } catch (error) {
    console.log(`❌ User authentication failed: ${error.message}\n`);
  }
  
  // Test 4: Connection to different database
  console.log('Test 4: Testing connection to "mysql" system database...');
  try {
    const connection4 = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database: 'mysql',
      connectTimeout: 10000
    });
    await connection4.query('SELECT 1');
    await connection4.end();
    console.log('✅ System database connection successful!\n');
    console.log('💡 Issue: Target database might not exist\n');
  } catch (error) {
    console.log(`❌ System database connection failed: ${error.message}\n`);
  }
  
  console.log('\n=== Diagnostic Summary ===');
  console.log('If all tests failed, the issue is likely:');
  console.log('1. IP address not whitelisted in MySQL server');
  console.log('2. Incorrect username or password');
  console.log('3. MySQL server not allowing remote connections');
  console.log('4. Firewall blocking the connection');
  console.log('\nYour IP address: 122.181.101.44');
  console.log('Make sure this IP is whitelisted in your MySQL server.\n');
  
  return false;
}

testConnectionWithOptions().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

