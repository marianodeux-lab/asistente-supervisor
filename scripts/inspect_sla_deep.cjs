const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function inspectSla(relPath) {
  const full = path.resolve(__dirname, '..', relPath);
  console.log('Inspecting:', relPath);
  if (!fs.existsSync(full)) return;
  const wb = XLSX.readFile(full);
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log(`Sheet: ${name}, Rows: ${data.length}`);
    for (let i = 0; i < Math.min(data.length, 12); i++) {
      if (data[i] && data[i].length > 0) {
        console.log(`  Row ${i + 1}:`, JSON.stringify(data[i].slice(0, 15)));
      }
    }
  }
}

inspectSla('Reportes/Reporte Sla Patagonia.xls');
inspectSla('Reportes/Reporte Sla Suroeste.xls');
