const XLSX = require('xlsx');

// 1. 8 from Patagonia
const wbPat = XLSX.readFile('Reportes/Agenda Diaria/Pendientes Patagonia.xls');
const rowsPat = XLSX.utils.sheet_to_json(wbPat.Sheets[wbPat.SheetNames[0]]);
const patOrders = rowsPat.map(r => ({
  pedido: String(r['Pedido'] || '').trim(),
  zona: r['Zona'],
  tec: r['Tec Asignado'],
  m: r['M'],
  estado: r['Estado'],
  source: 'Pendientes Patagonia'
}));

// 2. 10 from Suroeste (IN BAR, IN CIP, IN NQN)
const wbSur = XLSX.readFile('Reportes/Agenda Diaria/Pendientes Suroeste.xls');
const rowsSur = XLSX.utils.sheet_to_json(wbSur.Sheets[wbSur.SheetNames[0]]);
const surMyZones = ['IN BAR', 'IN CIP', 'IN NQN'];
const surOrders = rowsSur.filter(r => surMyZones.includes(String(r['Zona'] || '').trim())).map(r => ({
  pedido: String(r['Pedido'] || '').trim(),
  zona: r['Zona'],
  tec: r['Tec Asignado'],
  m: r['M'],
  estado: r['Estado'],
  source: 'Pendientes Suroeste'
}));

const all18 = [...patOrders, ...surOrders];
const wbAsig = XLSX.readFile('Reportes/Agenda Diaria/Asignados.xls');
const asigRows = XLSX.utils.sheet_to_json(wbAsig.Sheets[wbAsig.SheetNames[0]]);

console.log('--- ANALYSIS OF THE 18 PENDING ORDERS ---');
let asignadosCount = 0;
let sinAsignarCount = 0;
all18.forEach((item, idx) => {
  const match = asigRows.find(r => String(r['Pedido'] || '').trim() === item.pedido);
  if (match) {
    asignadosCount++;
    console.log(`${idx + 1}. [${item.source}] ${item.pedido} (${item.zona}) -> EN ASIGNADOS: Tec=${match['Tec Asignado']} | M=${match['M']} | Cierre=${match['Cierre'] || 'SIN CIERRE'} | Estado=${match['Estado']}`);
  } else {
    sinAsignarCount++;
    console.log(`${idx + 1}. [${item.source}] ${item.pedido} (${item.zona}) -> NO EN ASIGNADOS (SIN ASIGNAR)`);
  }
});
console.log('Total asignados en Asignados.xls:', asignadosCount);
console.log('Total sin asignar (no encontrados en Asignados):', sinAsignarCount);
