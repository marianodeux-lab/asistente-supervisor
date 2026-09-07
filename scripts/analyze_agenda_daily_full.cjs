const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = 'D:\\Asistente Supervisor\\Reportes\\Agenda Diaria';

function parseFile(filename) {
  const wb = XLSX.readFile(path.join(dir, filename));
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws);
}

const patagonia = parseFile('Pendientes Patagonia.xls');
const suroeste = parseFile('Pendientes Suroeste.xls');
const asignados = parseFile('Asignados.xls');
const adicionales = parseFile('Adicionales.xls');

console.log('Pendientes Patagonia rows:', patagonia.length);
console.log('Pendientes Suroeste rows:', suroeste.length);
console.log('Asignados rows:', asignados.length);
console.log('Adicionales rows:', adicionales.length);

const zonasRef = require('../src/data/zonasTecnicosReferencia.json');
const myTechNames = new Set(zonasRef.map(z => z.nombre.toLowerCase()));

console.log('\n--- Pendientes Patagonia Zonas & Tecnicos ---');
patagonia.forEach(r => {
  console.log(`Ped: ${r.Pedido} | Luno: ${r.Luno} | Cliente: ${r.Cliente} | Zona: ${r.Zona} | TecZona: ${r['Tec Zona']} | TecAsig: ${r['Tec Asignado']} | FCoor: ${r['F Coor']} | HCoor: ${r['H Coor']} | Estado: ${r.Estado}`);
});

console.log('\n--- Pendientes Suroeste Zonas & Tecnicos ---');
suroeste.forEach(r => {
  console.log(`Ped: ${r.Pedido} | Luno: ${r.Luno} | Cliente: ${r.Cliente} | Zona: ${r.Zona} | TecZona: ${r['Tec Zona']} | TecAsig: ${r['Tec Asignado']} | FCoor: ${r['F Coor']} | HCoor: ${r['H Coor']} | Estado: ${r.Estado}`);
});

let asignadosMyTechs = 0;
let asignadosTodayMyTechs = 0;

asignados.forEach(r => {
  const tec = (r['Tec Asignado'] || r['Tec Zona'] || '').toString().toLowerCase();
  const isMyTech = myTechNames.has(tec);
  if (isMyTech) {
    asignadosMyTechs++;
  }
});

console.log(`\nAsignados a mis tecnicos a cargo (total): ${asignadosMyTechs}`);
