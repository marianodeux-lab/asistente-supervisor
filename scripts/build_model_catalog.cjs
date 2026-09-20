const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const modelosPath = path.resolve('D:/Asistente Supervisor/Reportes/Datos/Modelos MPCR.xlsx');
const wbMpcr = xlsx.readFile(modelosPath);
const mpcrRows = xlsx.utils.sheet_to_json(wbMpcr.Sheets['MPCR']);

// Let's collect unique equipment definitions from Modelos MPCR
// Key: Fabricante + Modelo Base + MODELOS + MPCR + Negocio
const catalog = new Map();

mpcrRows.forEach((r, idx) => {
  const fab = (r['Fabricante'] || '').toString().trim();
  const modBase = (r['Modelo Base'] || '').toString().trim();
  const modelos = (r['MODELOS'] || '').toString().trim();
  const mpcr = (r['MPCR'] || '').toString().trim();
  let negocio = (r['Negocio'] || '').toString().trim();
  if (negocio === 'CTD') negocio = 'Cash Today';

  if (!fab && !modBase && !modelos) return;

  const key = `${fab} | ${modBase} | ${modelos} | ${mpcr} | ${negocio}`;
  if (!catalog.has(key)) {
    catalog.set(key, {
      fabricante: fab,
      modeloBase: modBase,
      modelo: modelos,
      mpcr: mpcr,
      negocio: negocio,
      associatedBaseDesc: new Set()
    });
  }

  const baseMarca = (r['MARCA_DESC'] || '').toString().trim();
  const baseModelo = (r['MODELO_DESC'] || '').toString().trim();
  if (baseMarca || baseModelo) {
    catalog.get(key).associatedBaseDesc.add(`${baseMarca} -> ${baseModelo}`);
  }
});

console.log('Unique Hardware Catalog Items from Modelos MPCR:', catalog.size);

const catalogArray = Array.from(catalog.values()).map(c => ({
  ...c,
  associatedBaseDesc: Array.from(c.associatedBaseDesc)
}));

console.log('\n--- FIRST 20 CATALOG ITEMS ---');
console.log(JSON.stringify(catalogArray.slice(0, 20), null, 2));

// Also let's inspect the Base Instalada 2026 actual MARCA_DESC and MODELO_DESC to see how each maps!
const baseDir = path.resolve('D:/Asistente Supervisor/Reportes/Base Instalada/2026/2026');
const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.xlsx'));

const baseEquipMap = new Map();
for (const file of files) {
  const wb = xlsx.readFile(path.join(baseDir, file));
  const sheet = wb.Sheets[wb.SheetNames.find(s => s.toUpperCase() === 'BASE') || wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);
  rows.forEach(r => {
    const marca = (r['MARCA_DESC'] || '').toString().trim();
    const modelo = (r['MODELO_DESC'] || '').toString().trim();
    const red = (r['RED'] || '').toString().trim();
    const cliente = (r['CLIENTE_DESC'] || '').toString().trim();
    const key = `${marca} ||| ${modelo}`;
    if (!baseEquipMap.has(key)) {
      baseEquipMap.set(key, { marca, modelo, count: 0, sampleRed: red, sampleCliente: cliente });
    }
    baseEquipMap.get(key).count++;
  });
}

console.log('\n--- ALL UNIQUE MARCA_DESC / MODELO_DESC IN BASE INSTALADA 2026 ---');
const baseUniqueList = Array.from(baseEquipMap.values()).sort((a, b) => a.marca.localeCompare(b.marca) || a.modelo.localeCompare(b.modelo));
console.log(`Total: ${baseUniqueList.length}`);
baseUniqueList.forEach((b, i) => {
  console.log(`${i + 1}. [${b.marca}] - [${b.modelo}] (Count: ${b.count}, Red: ${b.sampleRed}, Cliente: ${b.sampleCliente})`);
});
