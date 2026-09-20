const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const modelosPath = path.resolve('D:/Asistente Supervisor/Reportes/Datos/Modelos MPCR.xlsx');
const wbMpcr = xlsx.readFile(modelosPath);
const mpcrRows = xlsx.utils.sheet_to_json(wbMpcr.Sheets['MPCR']);

console.log('Total MPCR rows:', mpcrRows.length);
console.log('Columns in MPCR sheet:', Object.keys(mpcrRows[0]));

// Let's print unique Fabricante, Modelo Base, MODELOS, MPCR, Negocio in MPCR sheet
const fabricantes = new Set();
const modelosBase = new Set();
const modelos = new Set();
const mpcrs = new Set();
const negocios = new Set();
const marcasDesc = new Set();

mpcrRows.forEach(r => {
  fabricantes.add(r['Fabricante']);
  modelosBase.add(r['Modelo Base']);
  modelos.add(r['MODELOS']);
  mpcrs.add(r['MPCR']);
  negocios.add(r['Negocio']);
  marcasDesc.add(r['MARCA_DESC']);
});

console.log('\n--- UNIQUE IN MODELOS MPCR ---');
console.log('Fabricantes:', Array.from(fabricantes));
console.log('Negocios:', Array.from(negocios));
console.log('MPCRs:', Array.from(mpcrs));
console.log('MARCA_DESC:', Array.from(marcasDesc));

console.log('\nFirst 25 rows in MPCR sheet:');
console.log(JSON.stringify(mpcrRows.slice(0, 25), null, 2));
