const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = 'D:\\Asistente Supervisor\\Reportes\\Agenda Diaria';
const files = fs.readdirSync(dir);

console.log('Files found:', files);

files.forEach(file => {
  const filePath = path.join(dir, file);
  try {
    const wb = XLSX.readFile(filePath);
    console.log(`\n================== ${file} ==================`);
    console.log('Sheet names:', wb.SheetNames);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log('Total rows (raw):', rows.length);
    if (rows.length > 0) {
      console.log('Header row:', rows[0]);
    }
    if (rows.length > 1) {
      console.log('Sample row 1:', rows[1]);
    }
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
});
