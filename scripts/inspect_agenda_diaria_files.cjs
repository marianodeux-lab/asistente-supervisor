const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const agendaDir = path.resolve('D:/Asistente Supervisor/Reportes/Agenda Diaria');
const files = fs.readdirSync(agendaDir);

console.log('=== INSPECTING AGENDA DIARIA FILES ===');
for (const file of files) {
  const filePath = path.join(agendaDir, file);
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);
  console.log(`\nFile: "${file}", Sheet: "${wb.SheetNames[0]}", Rows: ${rows.length}`);
  if (rows.length > 0) {
    console.log('Columns:', Object.keys(rows[0]));
    console.log('Sample Row 1:', rows[0]);
    console.log('Sample Row 2:', rows[1] || {});
  }
}
