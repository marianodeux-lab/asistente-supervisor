const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Read Sheet 'MPCR' from 'Modelos MPCR.xlsx'
const mpcrPath = path.join(__dirname, '../Reportes/Datos/Modelos MPCR.xlsx');
const mpcrWorkbook = XLSX.readFile(mpcrPath);
const mpcrSheet = mpcrWorkbook.Sheets['MPCR'];
const mpcrRows = XLSX.utils.sheet_to_json(mpcrSheet, { header: 1 });

console.log('=== MPCR SHEET HEADER ===');
console.log(mpcrRows[0]);

const mpcrCatalog = [];
const knownModelsLookup = new Map(); // modelUpper -> { fabricante, modeloBase, modelos, mpcr, negocio, rowIdx }

for (let i = 1; i < mpcrRows.length; i++) {
  const row = mpcrRows[i];
  if (!row || row.length === 0) continue;
  const fabricante = (row[0] || '').toString().trim();
  const modeloBase = (row[1] || '').toString().trim();
  const modelos = (row[2] || '').toString().trim();
  const mpcr = (row[13] || '').toString().trim();
  const negocio = (row[14] || '').toString().trim();

  if (modeloBase || modelos || mpcr) {
    const item = {
      rowIdx: i + 1,
      fabricante,
      modeloBase,
      modelos,
      mpcr,
      negocio: negocio || (mpcr.toLowerCase().includes('ct') || fabricante.toLowerCase().includes('snbc') || fabricante.toLowerCase().includes('glory') || fabricante.toLowerCase().includes('cima') ? 'Cash Today' : 'ATM')
    };
    mpcrCatalog.push(item);

    if (modeloBase) {
      knownModelsLookup.set(modeloBase.toUpperCase(), item);
      // Also normalized version without extra spaces or symbols
      knownModelsLookup.set(modeloBase.toUpperCase().replace(/\s+/g, ' '), item);
    }
    if (modelos) {
      knownModelsLookup.set(modelos.toUpperCase(), item);
      knownModelsLookup.set(modelos.toUpperCase().replace(/\s+/g, ' '), item);
    }
  }
}

console.log(`Loaded ${mpcrCatalog.length} catalog items in MPCR sheet.`);
console.log(`Total unique lookup keys: ${knownModelsLookup.size}`);

// 2. Read all Base Instalada files
const baseInstaladaDir = path.join(__dirname, '../Reportes/Base Instalada/2026/2026');
const baseFiles = fs.readdirSync(baseInstaladaDir).filter(f => f.endsWith('.xlsx'));

// We will collect stats for all unique models in Base Instalada
// key: normalized model uppercase -> { originalName, count, clientes: Set, fabricantes: Set, negociosInBase: Set, sources: Set, sampleRow }
const baseModels = new Map();

baseFiles.forEach(file => {
  const filePath = path.join(baseInstaladaDir, file);
  try {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    rows.forEach(r => {
      const rawModel = (r['MODELO'] || r['Modelo'] || r['MODELO_EQUIPO'] || '').toString().trim();
      if (!rawModel) return;
      const key = rawModel.toUpperCase().replace(/\s+/g, ' ');

      if (!baseModels.has(key)) {
        baseModels.set(key, {
          key,
          originalName: rawModel,
          count: 0,
          clientes: new Set(),
          fabricantes: new Set(),
          negociosInBase: new Set(),
          sources: new Set(),
          sampleRow: r
        });
      }

      const m = baseModels.get(key);
      m.count++;
      if (r['CLIENTE'] || r['Cliente']) m.clientes.add((r['CLIENTE'] || r['Cliente']).toString().trim());
      if (r['FABRICANTE'] || r['Fabricante']) m.fabricantes.add((r['FABRICANTE'] || r['Fabricante']).toString().trim());
      if (r['NEGOCIO'] || r['Negocio']) m.negociosInBase.add((r['NEGOCIO'] || r['Negocio']).toString().trim());
      m.sources.add(file);
    });
  } catch (err) {
    console.error(`Error in ${file}:`, err.message);
  }
});

console.log(`\nFound ${baseModels.size} distinct models in Base Instalada across all 2026 months.`);

// 3. Match models and find discrepancies
const matchedModels = [];
const missingModels = [];

baseModels.forEach((info, modelKey) => {
  let match = knownModelsLookup.get(modelKey);
  
  // Try fuzzy or partial matches if direct match failed
  if (!match) {
    // Try matching if any known model is included or starts with
    for (const [k, v] of knownModelsLookup.entries()) {
      if (k === modelKey || k === modelKey.replace(/[^A-Z0-9]/g, '') || modelKey.replace(/[^A-Z0-9]/g, '') === k.replace(/[^A-Z0-9]/g, '')) {
        match = v;
        break;
      }
    }
  }

  if (match) {
    matchedModels.push({
      ...info,
      matchedWith: match
    });
  } else {
    missingModels.push({
      ...info
    });
  }
});

console.log(`\n=== RESULTS ===`);
console.log(`Matched models: ${matchedModels.length}`);
console.log(`MISSING models (in Base Instalada but NOT in Modelos MPCR): ${missingModels.length}`);

console.log('\n--- DETAILED MISSING MODELS ---');
missingModels.sort((a, b) => b.count - a.count).forEach((m, idx) => {
  console.log(`${idx + 1}. Modelo: "${m.originalName}"`);
  console.log(`   Equipos: ${m.count}`);
  console.log(`   Fabricante(s): ${Array.from(m.fabricantes).join(', ') || 'No especificado'}`);
  console.log(`   Negocio en Base: ${Array.from(m.negociosInBase).join(', ') || 'No especificado'}`);
  console.log(`   Clientes: ${Array.from(m.clientes).slice(0, 5).join(', ')}${m.clientes.size > 5 ? ` (+${m.clientes.size - 5} más)` : ''}`);
  console.log(`   Archivos: ${Array.from(m.sources).join(', ')}`);
  console.log('---');
});
