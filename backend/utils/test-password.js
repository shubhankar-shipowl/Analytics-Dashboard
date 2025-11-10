require('dotenv').config();
const mysql = require('mysql2/promise');

async function testPasswordVariations() {
  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  
  console.log('\n=== Testing Password Variations ===\n');
  console.log(`Host: ${host}`);
  console.log(`User: ${user}`);
  console.log(`Database: ${database}`);
  console.log(`Password length: ${password ? password.length : 0}`);
  console.log(`Password (first 2, last 2): ${password ? password.substring(0, 2) + '***' + password.slice(-2) : 'empty'}\n`);
  
  // Test 1: Original password as-is
  console.log('Test 1: Original password (as stored in .env)...');
  try {
    const conn1 = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 10000
    });
    await conn1.query('SELECT 1');
    await conn1.end();
    console.log('✅ SUCCESS with original password!\n');
    return true;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}\n`);
  }
  
  // Test 2: Password with trim
  console.log('Test 2: Password with trim...');
  try {
    const conn2 = await mysql.createConnection({
      host,
      port,
      user,
      password: password ? password.trim() : '',
      database,
      connectTimeout: 10000
    });
    await conn2.query('SELECT 1');
    await conn2.end();
    console.log('✅ SUCCESS with trimmed password!\n');
    return true;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}\n`);
  }
  
  // Test 3: Check for special characters
  if (password) {
    console.log('Password analysis:');
    console.log(`  Contains quotes: ${password.includes('"') || password.includes("'")}`);
    console.log(`  Contains backslash: ${password.includes('\\')}`);
    console.log(`  Contains newline: ${password.includes('\n') || password.includes('\r')}`);
    console.log(`  Contains spaces: ${password.includes(' ')}`);
    console.log(`  Has leading/trailing spaces: ${password !== password.trim()}\n`);
  }
  
  // Test 4: Try URL decoding if password looks encoded
  if (password && password.includes('%')) {
    console.log('Test 4: URL decoded password...');
    try {
      const decoded = decodeURIComponent(password);
      const conn4 = await mysql.createConnection({
        host,
        port,
        user,
        password: decoded,
        database,
        connectTimeout: 10000
      });
      await conn4.query('SELECT 1');
      await conn4.end();
      console.log('✅ SUCCESS with URL decoded password!\n');
      return true;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}\n`);
    }
  }
  
  // Test 5: Try with escaped quotes
  if (password && (password.includes('"') || password.includes("'"))) {
    console.log('Test 5: Password with escaped quotes...');
    try {
      const escaped = password.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
      const conn5 = await mysql.createConnection({
        host,
        port,
        user,
        password: escaped,
        database,
        connectTimeout: 10000
      });
      await conn5.query('SELECT 1');
      await conn5.end();
      console.log('✅ SUCCESS with escaped password!\n');
      return true;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}\n`);
    }
  }
  
  console.log('\n💡 Recommendations:');
  console.log('1. Verify the password in .env matches exactly (no extra spaces, newlines)');
  console.log('2. If password has special characters, try wrapping in quotes in .env:');
  console.log('   DB_PASSWORD="your_password_here"');
  console.log('3. Check if password needs to be URL-encoded');
  console.log('4. Verify the password works when connecting via MySQL client\n');
  
  return false;
}

testPasswordVariations().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

