const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Read Modelos MPCR.xlsx
const mpcrPath = path.join(__dirname, '../Reportes/Datos/Modelos MPCR.xlsx');
const mpcrWorkbook = XLSX.readFile(mpcrPath);
console.log('Modelos MPCR Sheet Names:', mpcrWorkbook.SheetNames);

const mpcrSheet = mpcrWorkbook.Sheets[mpcrWorkbook.SheetNames[0]];
const mpcrData = XLSX.utils.sheet_to_json(mpcrSheet);
console.log('Total rows in Modelos MPCR:', mpcrData.length);
console.log('Sample row from Modelos MPCR:', mpcrData[0]);

// Collect all unique models in Modelos MPCR
const knownModelsMap = new Map();
const knownModelsSet = new Set();
mpcrData.forEach(r => {
  const modeloKey = (r['MODELO'] || r['Modelo'] || r['modelo'] || '').toString().trim();
  const negocio = (r['NEGOCIO'] || r['Negocio'] || r['negocio'] || '').toString().trim();
  const mpcr = (r['MPCR'] || r['mpcr'] || '').toString().trim();
  const fabricante = (r['FABRICANTE'] || r['Fabricante'] || '').toString().trim();
  if (modeloKey) {
    knownModelsSet.add(modeloKey.toUpperCase());
    knownModelsMap.set(modeloKey.toUpperCase(), {
      modelo: modeloKey,
      negocio,
      mpcr,
      fabricante,
      raw: r
    });
  }
});
console.log(`Unique models in Modelos MPCR: ${knownModelsSet.size}`);

// 2. Read Base Instalada files
const baseInstaladaDir = path.join(__dirname, '../Reportes/Base Instalada/2026/2026');
const baseFiles = fs.readdirSync(baseInstaladaDir).filter(f => f.endsWith('.xlsx'));
console.log('Base Instalada files found:', baseFiles);

const baseModelsCounts = new Map(); // modelUpper -> { count, originalNames: Set, sampleRow, sources: Set }

baseFiles.forEach(file => {
  const filePath = path.join(baseInstaladaDir, file);
  try {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    data.forEach(r => {
      const modelVal = (r['MODELO'] || r['Modelo'] || r['MODELO_EQUIPO'] || '').toString().trim();
      if (!modelVal) return;
      const modelUpper = modelVal.toUpperCase();
      if (!baseModelsCounts.has(modelUpper)) {
        baseModelsCounts.set(modelUpper, {
          count: 0,
          originalNames: new Set(),
          sampleRow: r,
          sources: new Set()
        });
      }
      const entry = baseModelsCounts.get(modelUpper);
      entry.count++;
      entry.originalNames.add(modelVal);
      entry.sources.add(file);
    });
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
});

console.log(`\nUnique models in Base Instalada: ${baseModelsCounts.size}`);

// 3. Find Missing Models (in Base Instalada but NOT in Modelos MPCR)
const missingModels = [];
baseModelsCounts.forEach((info, modelUpper) => {
  if (!knownModelsSet.has(modelUpper)) {
    missingModels.push({
      modelUpper,
      originalNames: Array.from(info.originalNames),
      count: info.count,
      sources: Array.from(info.sources),
      fabricante: info.sampleRow['FABRICANTE'] || info.sampleRow['Fabricante'] || '-',
      cliente: info.sampleRow['CLIENTE'] || info.sampleRow['Cliente'] || '-',
      red: info.sampleRow['RED'] || info.sampleRow['Red'] || '-',
      mpcr: info.sampleRow['MPCR'] || info.sampleRow['mpcr'] || '-'
    });
  }
});

console.log(`\n=== MISSING MODELS NOT FOUND IN MODELOS MPCR: ${missingModels.length} ===`);
missingModels.sort((a, b) => b.count - a.count).forEach(m => {
  console.log(`- Modelo: "${m.originalNames.join(' / ')}" | Equipos: ${m.count} | Fabricante: ${m.fabricante} | Cliente ejemplo: ${m.cliente} | Fuentes: ${m.sources.join(', ')}`);
});
