const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// 1. Inspect Modelos MPCR
const modelosPath = path.resolve('D:/Asistente Supervisor/Reportes/Datos/Modelos MPCR.xlsx');
console.log('--- INSPECTING MODELOS MPCR ---');
if (fs.existsSync(modelosPath)) {
  const wb = xlsx.readFile(modelosPath);
  console.log('Sheets:', wb.SheetNames);
  for (const sheetName of wb.SheetNames) {
    const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
    console.log(`Sheet: "${sheetName}", Rows: ${data.length}`);
    if (data.length > 0) {
      console.log('First 3 rows:', JSON.stringify(data.slice(0, 3), null, 2));
      console.log('All columns:', Object.keys(data[0]));
    }
  }
} else {
  console.log('Modelos MPCR.xlsx not found at', modelosPath);
}

// 2. Inspect Base Instalada 2026/2026
const baseDir = path.resolve('D:/Asistente Supervisor/Reportes/Base Instalada/2026/2026');
console.log('\n--- INSPECTING BASE INSTALADA 2026/2026 ---');
if (fs.existsSync(baseDir)) {
  const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
  console.log('Files in 2026/2026:', files);

  const marcaSet = new Set();
  const modeloSet = new Set();
  const comboSet = new Set();

  for (const file of files) {
    const filePath = path.join(baseDir, file);
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);
    console.log(`File: ${file}, Sheet: ${wb.SheetNames[0]}, Rows: ${rows.length}`);
    if (rows.length > 0) {
      console.log(`Columns in ${file}:`, Object.keys(rows[0]));
    }

    rows.forEach(r => {
      const marca = (r['MARCA_DESC'] || r['MARCA'] || '').toString().trim();
      const modelo = (r['MODELO_DESC'] || r['MODELO'] || '').toString().trim();
      marcaSet.add(marca);
      modeloSet.add(modelo);
      comboSet.add(JSON.stringify({ marca, modelo }));
    });
  }

  console.log('\n--- ALL UNIQUE MARCA_DESC in Base Instalada 2026 ---');
  console.log([...marcaSet].sort());

  console.log('\n--- ALL UNIQUE (MARCA_DESC, MODELO_DESC) in Base Instalada 2026 ---');
  const combos = [...comboSet].map(c => JSON.parse(c)).sort((a, b) => (a.marca + a.modelo).localeCompare(b.marca + b.modelo));
  console.log(JSON.stringify(combos, null, 2));
}
