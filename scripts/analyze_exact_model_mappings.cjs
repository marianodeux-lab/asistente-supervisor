const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// 1. Load Modelos MPCR sheet MPCR
const modelosPath = path.resolve('D:/Asistente Supervisor/Reportes/Datos/Modelos MPCR.xlsx');
const wbMpcr = xlsx.readFile(modelosPath);
const mpcrRows = xlsx.utils.sheet_to_json(wbMpcr.Sheets['MPCR']);
const callRateRows = xlsx.utils.sheet_to_json(wbMpcr.Sheets['Call Rate'] || wbMpcr.Sheets['CallRate'] || {});

console.log('--- MPCR Sheet Rows:', mpcrRows.length);
console.log('--- Call Rate Rows:', callRateRows.length);

// 2. Load all Base Instalada 2026 files
const baseDir = path.resolve('D:/Asistente Supervisor/Reportes/Base Instalada/2026/2026');
const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

const baseMap = new Map(); // key: `${marca}|||${modelo}` -> { count, files: Set }
const allNegociosInBase = new Set();
const allMarcasInBase = new Set();

for (const file of files) {
  const filePath = path.join(baseDir, file);
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames.find(s => s.toUpperCase() === 'BASE') || wb.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);

  rows.forEach(r => {
    const marca = (r['MARCA_DESC'] || r['MARCA'] || '').toString().trim();
    const modelo = (r['MODELO_DESC'] || r['MODELO'] || '').toString().trim();
    const neg = (r['NEG'] || r['NEGOCIO'] || '').toString().trim();
    allNegociosInBase.add(neg);
    allMarcasInBase.add(marca);

    const key = `${marca}|||${modelo}`;
    if (!baseMap.has(key)) {
      baseMap.set(key, { marca, modelo, count: 0, files: new Set() });
    }
    const item = baseMap.get(key);
    item.count++;
    item.files.add(file);
  });
}

console.log('\nAll unique MARCA_DESC in Base 2026:', Array.from(allMarcasInBase));
console.log('All unique NEG in Base 2026 column NEG:', Array.from(allNegociosInBase));

// Let's analyze how Base 2026 (MARCA_DESC, MODELO_DESC) matches with MPCR table
// In MPCR table, columns are:
// 'Fabricante', 'Modelo Base', 'MODELOS', 'MPCR', 'Negocio', 'MARCA_DESC', 'MODELO_DESC'

const matched = [];
const unmatched = [];

baseMap.forEach((val, key) => {
  const { marca, modelo, count, files } = val;

  // Let's determine Negocio per User Rule:
  // MARCA_DESC contains 'Smart Box' -> 'Cash Today'
  // MARCA_DESC contains 'CRP' -> 'CRP'
  // Otherwise -> 'ATM'
  let negocioCalculado = 'ATM';
  const marcaUpper = marca.toUpperCase();
  if (marcaUpper.includes('SMART BOX') || marcaUpper.includes('SMARTBOX')) {
    negocioCalculado = 'Cash Today';
  } else if (marcaUpper.includes('CRP')) {
    negocioCalculado = 'CRP';
  }

  // Find exact or normalized match in MPCR table
  const exactMatch = mpcrRows.find(m => 
    (m['MARCA_DESC'] || '').toString().trim().toUpperCase() === marca.toUpperCase() &&
    (m['MODELO_DESC'] || '').toString().trim().toUpperCase() === modelo.toUpperCase()
  );

  const modeloOnlyMatch = mpcrRows.find(m => 
    (m['MODELO_DESC'] || '').toString().trim().toUpperCase() === modelo.toUpperCase()
  );

  const modeloNameMatch = mpcrRows.find(m =>
    (m['MODELOS'] || '').toString().trim().toUpperCase() === modelo.toUpperCase() ||
    (m['Modelo Base'] || '').toString().trim().toUpperCase() === modelo.toUpperCase()
  );

  const match = exactMatch || modeloOnlyMatch || modeloNameMatch;

  if (match) {
    matched.push({
      marca_base: marca,
      modelo_base: modelo,
      negocio_regla: negocioCalculado,
      negocio_mpcr: match['Negocio'],
      fabricante: match['Fabricante'],
      modelo_base_mpcr: match['Modelo Base'],
      modelos_mpcr: match['MODELOS'],
      mpcr: match['MPCR'],
      count,
      matchType: exactMatch ? 'EXACT' : (modeloOnlyMatch ? 'MODELO_DESC' : 'MODELO_NAME')
    });
  } else {
    unmatched.push({
      marca_base: marca,
      modelo_base: modelo,
      negocio_regla: negocioCalculado,
      count,
      files: Array.from(files)
    });
  }
});

console.log(`\nMatched with MPCR: ${matched.length}`);
console.log(`Unmatched with MPCR: ${unmatched.length}`);

console.log('\n--- UNMATCHED COMBINATIONS ---');
console.log(JSON.stringify(unmatched, null, 2));

console.log('\n--- SAMPLE MATCHED COMBINATIONS (first 10) ---');
console.log(JSON.stringify(matched.slice(0, 10), null, 2));

// Save full comparison
fs.writeFileSync(
  path.resolve('d:/Asistente Supervisor/scripts/exact_model_mappings_result.json'),
  JSON.stringify({
    summary: {
      totalBaseCombos: baseMap.size,
      matchedCount: matched.length,
      unmatchedCount: unmatched.length,
      allMarcasInBase: Array.from(allMarcasInBase),
      allNegociosInBase: Array.from(allNegociosInBase)
    },
    matched,
    unmatched,
    mpcrRows
  }, null, 2)
);
