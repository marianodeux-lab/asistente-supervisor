const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const repDir = path.resolve('D:/Asistente Supervisor/Reportes');
const files = fs.readdirSync(repDir);

console.log('=== FILES IN Reportes/ ===');
files.forEach(f => {
  const stat = fs.statSync(path.join(repDir, f));
  if (stat.isFile()) {
    console.log(`- ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`[DIR] ${f}`);
  }
});

// Let's inspect Pendientes files and Asignados files
const inspectFiles = [
  'Reporte Pendientes Patagonia.xls',
  'Reporte Pendientes Suroeste.xls',
  'Reporte Asignados COT Patagonia.xls',
  'Reporte Asignados COT Suroeste.xls',
  'Reporte Asignados COT.xls',
  'Reporte Agenda COT.xls',
  'Reporte Pendientes.xls'
];

inspectFiles.forEach(fname => {
  const fpath = path.join(repDir, fname);
  if (fs.existsSync(fpath)) {
    console.log(`\n--- INSPECTING ${fname} ---`);
    const wb = xlsx.readFile(fpath);
    console.log('Sheets:', wb.SheetNames);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws);
    console.log(`Rows: ${rows.length}`);
    if (rows.length > 0) {
      console.log('Columns:', Object.keys(rows[0]));
      console.log('Sample row:', rows[0]);
    }
  }
});
