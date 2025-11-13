const XLSX = require('xlsx');
const path = require('path');

const excelFile = path.join(__dirname, '../../ForwardOrders-1762582722-21819 (1).xlsx');

console.log('Analyzing Excel file:', excelFile);

try {
  const workbook = XLSX.readFile(excelFile, { sheetStubs: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Get first row as headers
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const headers = data[0];
  
  console.log('\n=== Excel File Columns ===');
  console.log(`Total columns: ${headers.length}\n`);
  
  headers.forEach((header, index) => {
    console.log(`${(index + 1).toString().padStart(2, ' ')}. ${header}`);
  });
  
  // Get a sample row to see data types
  if (data.length > 1) {
    const sampleRow = data[1];
    console.log('\n=== Sample Data (Row 2) ===');
    headers.forEach((header, index) => {
      const value = sampleRow[index];
      const type = typeof value;
      console.log(`${header}: ${value} (${type})`);
    });
  }
  
} catch (error) {
  console.error('Error analyzing Excel file:', error.message);
  process.exit(1);
}

