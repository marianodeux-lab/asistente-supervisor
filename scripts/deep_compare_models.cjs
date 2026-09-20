const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// 1. Analyze MPCR sheet from Modelos MPCR.xlsx
const modelosPath = path.resolve('D:/Asistente Supervisor/Reportes/Datos/Modelos MPCR.xlsx');
let mpcrRows = [];
if (fs.existsSync(modelosPath)) {
  const wb = xlsx.readFile(modelosPath);
  const sheet = wb.Sheets['MPCR'];
  mpcrRows = xlsx.utils.sheet_to_json(sheet);
  console.log('=== MODELOS MPCR SHEET "MPCR" (Total rows:', mpcrRows.length, ') ===');
  console.log('Sample row:', mpcrRows[0]);
}

// 2. Analyze Base Instalada 2026/2026 files (sheet 'BASE')
const baseDir = path.resolve('D:/Asistente Supervisor/Reportes/Base Instalada/2026/2026');
const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

const baseCombos = new Map(); // key -> { marca, modelo, count, files: Set }
const allBaseRows = [];

for (const file of files) {
  const filePath = path.join(baseDir, file);
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames.find(s => s.toUpperCase() === 'BASE') || wb.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
  console.log(`\nFile: ${file} | Sheet: "${sheetName}" | Rows: ${rows.length}`);
  if (rows.length > 0 && file === files[0]) {
    console.log('Columns in BASE sheet:', Object.keys(rows[0]));
    console.log('Sample row:', rows[0]);
  }

  rows.forEach(r => {
    const marca = (r['MARCA_DESC'] || r['MARCA'] || '').toString().trim();
    const modelo = (r['MODELO_DESC'] || r['MODELO'] || '').toString().trim();
    const key = `${marca} ||| ${modelo}`;
    if (!baseCombos.has(key)) {
      baseCombos.set(key, { marca, modelo, count: 0, files: new Set() });
    }
    const entry = baseCombos.get(key);
    entry.count++;
    entry.files.add(file);
  });
}

console.log('\n=== ALL UNIQUE (MARCA_DESC, MODELO_DESC) FOUND IN BASE INSTALADA 2026 ===');
const sortedCombos = Array.from(baseCombos.values()).sort((a, b) => 
  a.marca.localeCompare(b.marca) || a.modelo.localeCompare(b.modelo)
);

console.log(`Total unique combinations in Base 2026: ${sortedCombos.length}`);
sortedCombos.forEach((c, idx) => {
  console.log(`${idx + 1}. MARCA: "${c.marca}" | MODELO: "${c.modelo}" | Total Count: ${c.count} | Files: ${Array.from(c.files).join(', ')}`);
});

// Write comprehensive analysis to json
fs.writeFileSync(
  path.resolve('d:/Asistente Supervisor/scripts/modelos_analysis_output.json'),
  JSON.stringify({
    mpcrRows,
    baseCombos: sortedCombos.map(c => ({ ...c, files: Array.from(c.files) }))
  }, null, 2)
);
console.log('\nWrote analysis to scripts/modelos_analysis_output.json');
