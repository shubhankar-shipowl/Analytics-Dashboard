require('dotenv').config();

console.log('\n=== Credential Verification ===\n');
console.log('Please verify these credentials match your MySQL server:\n');
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`Port: ${process.env.DB_PORT}`);
console.log(`User: ${process.env.DB_USER}`);
console.log(`Database: ${process.env.DB_NAME}`);
console.log(`Password: ${process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : '(empty)'}`);
console.log(`Password Length: ${process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0}\n`);

console.log('To test these credentials manually, run:');
console.log(`mysql -h ${process.env.DB_HOST} -P ${process.env.DB_PORT} -u ${process.env.DB_USER} -p${process.env.DB_NAME}\n`);

console.log('Or use MySQL Workbench/phpMyAdmin with these credentials.\n');

console.log('Common issues:');
console.log('1. Password might have invisible characters (copy-paste issue)');
console.log('2. Password might be case-sensitive');
console.log('3. User might need different privileges');
console.log('4. Database name might be different\n');

console.log('💡 Try this:');
console.log('1. Connect to MySQL server using MySQL client/Workbench');
console.log('2. Verify the exact password works there');
console.log('3. Copy the password exactly (no extra spaces)');
console.log('4. Update .env file with the verified password\n');

