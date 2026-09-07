const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const files = [
  'd:\\Asistente Supervisor\\Reportes\\Datos\\Modelos MPCR.xlsx',
  'd:\\Asistente Supervisor\\Reportes\\Datos\\StockFijo.xls',
  'd:\\Asistente Supervisor\\Reportes\\Datos\\Zonas Técnicos.xlsx'
];

for (const file of files) {
  console.log('====================================================');
  console.log('FILE:', file);
  console.log('====================================================');
  if (!fs.existsSync(file)) {
    console.log('File does not exist');
    continue;
  }
  
  const wb = XLSX.readFile(file);
  console.log('Sheets:', wb.SheetNames);
  
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log(`\n--- Sheet [${sheetName}] (Rows: ${data.length}) ---`);
    data.slice(0, 8).forEach((r, idx) => {
      console.log(`Row ${idx + 1}:`, JSON.stringify(r));
    });
  }
}
