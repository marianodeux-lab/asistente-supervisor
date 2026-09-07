const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const file = path.join(__dirname, '../Reportes/Base Instalada/2026/2026/Agosto.xlsx');
const wb = XLSX.readFile(file);
console.log('Agosto.xlsx Sheet Names:', wb.SheetNames);
wb.SheetNames.forEach(sheetName => {
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Sheet "${sheetName}" has ${rows.length} rows.`);
  if (rows.length > 0) {
    console.log('Header row:', JSON.stringify(rows[0]));
    console.log('Row 1:', JSON.stringify(rows[1]));
  }
});
