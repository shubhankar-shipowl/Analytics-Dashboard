const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');

console.log('\n=== .env Password Fixer ===\n');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  process.exit(1);
}

// Read current .env
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

// Find password line
let passwordLineIndex = -1;
let passwordValue = '';

for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('DB_PASSWORD=')) {
    passwordLineIndex = i;
    const match = lines[i].match(/DB_PASSWORD=(.+)/);
    if (match) {
      passwordValue = match[1].trim();
      // Remove quotes if present
      if ((passwordValue.startsWith('"') && passwordValue.endsWith('"')) ||
          (passwordValue.startsWith("'") && passwordValue.endsWith("'"))) {
        passwordValue = passwordValue.slice(1, -1);
      }
    }
    break;
  }
}

if (passwordLineIndex === -1) {
  console.log('❌ DB_PASSWORD not found in .env');
  process.exit(1);
}

console.log(`Current password (first 3, last 3): ${passwordValue.substring(0, 3)}***${passwordValue.slice(-3)}`);
console.log(`Password length: ${passwordValue.length}`);
console.log(`Has special chars: ${/[^a-zA-Z0-9]/.test(passwordValue)}\n`);

// Create backup
const backupPath = envPath + '.backup';
fs.writeFileSync(backupPath, envContent);
console.log(`✅ Backup created: ${backupPath}\n`);

// Update with quoted password
const quotedPassword = `DB_PASSWORD="${passwordValue}"`;
lines[passwordLineIndex] = quotedPassword;

const newContent = lines.join('\n');
fs.writeFileSync(envPath, newContent);

console.log('✅ Updated .env with quoted password');
console.log('   Format: DB_PASSWORD="your_password"\n');
console.log('Now test the connection with: node test-connection.js\n');

