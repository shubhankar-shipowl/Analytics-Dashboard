const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Path to the Excel file
const filePath = path.join(__dirname, '..', '..', 'ForwardOrders-1762582722-21819 (1).xlsx');

if (!fs.existsSync(filePath)) {
  console.error('❌ File not found at:', filePath);
  process.exit(1);
}

console.log('📊 Analyzing Excel File Structure...\n');
console.log('File:', filePath);
console.log('File Size:', (fs.statSync(filePath).size / 1024 / 1024).toFixed(2), 'MB\n');

try {
  // Read Excel file
  const workbook = XLSX.readFile(filePath, { 
    cellDates: true,
    cellNF: false,
    cellText: false
  });

  console.log('📋 Sheets found:', workbook.SheetNames.length);
  workbook.SheetNames.forEach((name, idx) => {
    console.log(`  ${idx + 1}. ${name}`);
  });

  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  console.log(`\n📄 Processing sheet: "${sheetName}"\n`);
  
  const worksheet = workbook.Sheets[sheetName];
  
  // Get range
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  console.log(`📏 Sheet Range: ${worksheet['!ref']}`);
  console.log(`   Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}\n`);

  // Convert to JSON with headers
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    defval: '',
    raw: false,
    header: 1  // Get as array first to see headers
  });

  console.log(`📊 Total Rows: ${jsonData.length}\n`);

  // Get headers (first row)
  if (jsonData.length > 0) {
    const headers = jsonData[0];
    console.log('📑 Column Headers:');
    headers.forEach((header, idx) => {
      console.log(`  ${idx + 1}. "${header}"`);
    });
    console.log(`\n   Total Columns: ${headers.length}\n`);

    // Show sample data (first 3 rows after header)
    console.log('📝 Sample Data (First 3 rows):');
    for (let i = 1; i <= Math.min(3, jsonData.length - 1); i++) {
      console.log(`\n   Row ${i + 1}:`);
      headers.forEach((header, idx) => {
        const value = jsonData[i][idx];
        const displayValue = value !== undefined && value !== null && value !== '' 
          ? String(value).substring(0, 50) 
          : '(empty)';
        console.log(`     ${header}: ${displayValue}`);
      });
    }

    // Now convert to JSON with proper headers
    const jsonDataWithHeaders = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '',
      raw: false
    });

    console.log('\n\n🔍 Column Analysis:');
    console.log('='.repeat(60));
    
    headers.forEach((header, idx) => {
      const columnData = jsonDataWithHeaders
        .map(row => row[header])
        .filter(val => val !== undefined && val !== null && val !== '');
      
      const sampleValues = columnData.slice(0, 5);
      const dataTypes = new Set(columnData.slice(0, 100).map(v => typeof v));
      
      console.log(`\n${idx + 1}. "${header}"`);
      console.log(`   - Non-empty values: ${columnData.length}/${jsonDataWithHeaders.length}`);
      console.log(`   - Data types: ${Array.from(dataTypes).join(', ')}`);
      console.log(`   - Sample values: ${sampleValues.slice(0, 3).map(v => `"${String(v).substring(0, 30)}"`).join(', ')}`);
    });

    console.log('\n\n✅ Analysis Complete!');
  } else {
    console.log('⚠️ No data found in sheet');
  }

} catch (error) {
  console.error('❌ Error analyzing file:', error.message);
  console.error(error.stack);
  process.exit(1);
}

