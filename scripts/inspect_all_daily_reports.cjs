const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const reportFiles = [
  'Reportes/Agenda Diaria/Pendientes Patagonia.xls',
  'Reportes/Agenda Diaria/Pendientes Suroeste.xls',
  'Reportes/Agenda Diaria/Adicionales.xls',
  'Reportes/Agenda Diaria/Asignados.xls',
  'Reportes/Reporte Buzon Movimientos.xlsx',
  'Reportes/Reporte Sla Patagonia.xls',
  'Reportes/Reporte Sla Suroeste.xls',
  'Reportes/Reporte Suspendidos Patagonia.xls',
  'Reportes/Reporte Suspendidos Suroeste.xls',
  'Reportes/MP Pendientes Patagonia.xls',
  'Reportes/MP Pendientes Suroeste.xls',
  'Reportes/MP Pendientes Bariloche.xls',
  'Reportes/MP Cerrados Patagonia.xls',
  'Reportes/MP Cerrados Suroeste.xls'
];

for (const rel of reportFiles) {
  const fullPath = path.resolve(__dirname, '..', rel);
  console.log('====================================================');
  console.log('FILE:', rel);
  console.log('====================================================');
  if (!fs.existsSync(fullPath)) {
    console.log('File does NOT exist:', fullPath);
    continue;
  }

  const wb = XLSX.readFile(fullPath, { sheetRows: 10 });
  for (const sheet of wb.SheetNames) {
    const ws = wb.Sheets[sheet];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log(`Sheet: [${sheet}] (Rows read: ${data.length})`);
    data.slice(0, 5).forEach((r, idx) => {
      let filteredRow = (r || []).slice(0, 15);
      console.log(`  Row ${idx + 1}:`, JSON.stringify(filteredRow));
    });
  }
}
