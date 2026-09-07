const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const mpcrPath = path.join(__dirname, '../Reportes/Datos/Modelos MPCR.xlsx');
const mpcrWorkbook = XLSX.readFile(mpcrPath);

mpcrWorkbook.SheetNames.forEach(sheetName => {
  console.log(`\n=================== SHEET: ${sheetName} ===================`);
  const sheet = mpcrWorkbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Total rows in ${sheetName}: ${rows.length}`);
  console.log('First 10 rows:');
  rows.slice(0, 10).forEach((r, idx) => console.log(`Row ${idx}:`, JSON.stringify(r)));
});
