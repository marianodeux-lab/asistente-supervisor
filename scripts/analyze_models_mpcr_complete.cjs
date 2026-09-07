const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Read Sheet 'MPCR' from 'Modelos MPCR.xlsx'
const mpcrPath = path.join(__dirname, '../Reportes/Datos/Modelos MPCR.xlsx');
const mpcrWorkbook = XLSX.readFile(mpcrPath);
const mpcrSheet = mpcrWorkbook.Sheets['MPCR'];
const mpcrRows = XLSX.utils.sheet_to_json(mpcrSheet, { header: 1 });

console.log('=== MPCR SHEET ROWS COUNT:', mpcrRows.length);

const mpcrCatalog = [];
const knownModelsLookup = new Map(); // normalized model uppercase -> { fabricante, modeloBase, modelos, mpcr, negocio, rowIdx }

for (let i = 1; i < mpcrRows.length; i++) {
  const row = mpcrRows[i];
  if (!row || row.length === 0) continue;
  const fabricante = (row[0] || '').toString().trim();
  const modeloBase = (row[1] || '').toString().trim();
  const modelos = (row[2] || '').toString().trim();
  const mpcr = (row[13] || '').toString().trim();
  const negocio = (row[14] || '').toString().trim();

  // Also check column T (index 19: MODELO_DESC) and column S (index 18: MARCA_DESC)
  const marcaDescCol = (row[18] || '').toString().trim();
  const modeloDescCol = (row[19] || '').toString().trim();

  if (modeloBase || modelos || mpcr || modeloDescCol) {
    const item = {
      rowIdx: i + 1,
      fabricante: fabricante || marcaDescCol,
      modeloBase,
      modelos,
      mpcr,
      negocio: negocio || (mpcr.toLowerCase().includes('ct') || fabricante.toLowerCase().includes('snbc') || fabricante.toLowerCase().includes('glory') || fabricante.toLowerCase().includes('cima') ? 'Cash Today' : 'ATM'),
      modeloDescCol
    };
    mpcrCatalog.push(item);

    const addKey = (k) => {
      if (!k) return;
      const clean = k.toString().trim().toUpperCase().replace(/\s+/g, ' ');
      knownModelsLookup.set(clean, item);
      // Also without special chars
      const noSpecial = clean.replace(/[^A-Z0-9]/g, '');
      if (noSpecial) knownModelsLookup.set(noSpecial, item);
    };

    addKey(modeloBase);
    addKey(modelos);
    addKey(mpcr);
    addKey(modeloDescCol);
  }
}

console.log(`Loaded ${mpcrCatalog.length} catalog items from MPCR sheet.`);
console.log(`Total lookup keys in MPCR: ${knownModelsLookup.size}`);

// 2. Read all Base Instalada files
const baseInstaladaDir = path.join(__dirname, '../Reportes/Base Instalada/2026/2026');
const baseFiles = fs.readdirSync(baseInstaladaDir).filter(f => f.endsWith('.xlsx'));

const baseModels = new Map(); // normalized model uppercase -> { originalName, count, clientes: Set, marcas: Set, negociosInBase: Set, sources: Set, sampleRow }

baseFiles.forEach(file => {
  const filePath = path.join(baseInstaladaDir, file);
  try {
    const wb = XLSX.readFile(filePath);
    const sheetName = wb.SheetNames.includes('BASE') ? 'BASE' : wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    
    rows.forEach(r => {
      const rawModel = (r['MODELO_DESC'] || r['MODELO'] || r['Modelo'] || '').toString().trim();
      if (!rawModel) return;
      const key = rawModel.toUpperCase().replace(/\s+/g, ' ');

      if (!baseModels.has(key)) {
        baseModels.set(key, {
          key,
          originalName: rawModel,
          count: 0,
          clientes: new Set(),
          marcas: new Set(),
          negociosInBase: new Set(),
          sources: new Set(),
          sampleRow: r
        });
      }

      const m = baseModels.get(key);
      m.count++;
      if (r['CLIENTE_DESC'] || r['CLIENTE'] || r['Cliente']) m.clientes.add((r['CLIENTE_DESC'] || r['CLIENTE'] || r['Cliente']).toString().trim());
      if (r['MARCA_DESC'] || r['FABRICANTE'] || r['Fabricante']) m.marcas.add((r['MARCA_DESC'] || r['FABRICANTE'] || r['Fabricante']).toString().trim());
      if (r['NEGOCIO'] || r['Negocio']) m.negociosInBase.add((r['NEGOCIO'] || r['Negocio']).toString().trim());
      m.sources.add(file.replace('.xlsx', ''));
    });
  } catch (err) {
    console.error(`Error in ${file}:`, err.message);
  }
});

console.log(`\nFound ${baseModels.size} distinct models across Base Instalada.`);

// 3. Match models and detect discrepancies
const matchedModels = [];
const missingModels = [];

baseModels.forEach((info, modelKey) => {
  let match = knownModelsLookup.get(modelKey);
  if (!match) {
    const noSpecial = modelKey.replace(/[^A-Z0-9]/g, '');
    match = knownModelsLookup.get(noSpecial);
  }

  // Also check partial word matches
  if (!match) {
    for (const [k, v] of knownModelsLookup.entries()) {
      if (k.length >= 4 && (modelKey === k || modelKey.startsWith(k) || k.startsWith(modelKey))) {
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

console.log(`\n=================== COMPARISON SUMMARY ===================`);
console.log(`Total distinct models in Base Instalada: ${baseModels.size}`);
console.log(`Models matched in Modelos MPCR: ${matchedModels.length}`);
console.log(`Models MISSING in Modelos MPCR: ${missingModels.length}`);

console.log('\n=================== DETAILED MISSING MODELS ===================');
missingModels.sort((a, b) => b.count - a.count).forEach((m, idx) => {
  console.log(`${idx + 1}. Modelo: "${m.originalName}"`);
  console.log(`   Total registros/equipos en 2026: ${m.count}`);
  console.log(`   Marca / Fabricante en Base: ${Array.from(m.marcas).join(', ') || 'No especificado'}`);
  console.log(`   Negocio indicado en Base: ${Array.from(m.negociosInBase).join(', ') || 'No especificado'}`);
  console.log(`   Clientes principales: ${Array.from(m.clientes).slice(0, 5).join(', ')}${m.clientes.size > 5 ? ` (+${m.clientes.size - 5} más)` : ''}`);
  console.log(`   Meses donde aparece: ${Array.from(m.sources).join(', ')}`);
  console.log('------------------------------------------------------------');
});

// Also save results to a JSON file for the frontend
const exportData = {
  totalBaseModels: baseModels.size,
  matchedCount: matchedModels.length,
  missingCount: missingModels.length,
  missingModels: missingModels.map(m => ({
    modelo: m.originalName,
    count: m.count,
    marcas: Array.from(m.marcas),
    negociosInBase: Array.from(m.negociosInBase),
    clientes: Array.from(m.clientes),
    sources: Array.from(m.sources),
    sampleDenominacion: m.sampleRow['DENOMINACION'] || m.sampleRow['UBICACION'] || '-',
    sugerenciaNegocio: Array.from(m.negociosInBase)[0] || (m.originalName.toLowerCase().includes('ct') || m.originalName.toLowerCase().includes('snbc') ? 'Cash Today' : 'ATM')
  })),
  allBaseModelsWithStatus: Array.from(baseModels.values()).map(m => {
    const isMissing = missingModels.some(miss => miss.key === m.key);
    const matched = matchedModels.find(mat => mat.key === m.key);
    return {
      modelo: m.originalName,
      count: m.count,
      marca: Array.from(m.marcas).join(', '),
      negocio: Array.from(m.negociosInBase).join(', '),
      mpcrMatch: matched ? (matched.matchedWith.mpcr || matched.matchedWith.modelos) : 'NO REGISTRADO EN MPCR',
      negocioMpcr: matched ? matched.matchedWith.negocio : null,
      estaEnMpcr: !isMissing,
      fuentes: Array.from(m.sources)
    };
  })
};

fs.writeFileSync(path.join(__dirname, '../src/data/modelosDiscrepanciasData.json'), JSON.stringify(exportData, null, 2), 'utf-8');
console.log('\nExported resultados to src/data/modelosDiscrepanciasData.json');
