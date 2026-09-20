const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const agendaDir = path.resolve('D:/Asistente Supervisor/Reportes/Agenda Diaria');
const zonasRef = JSON.parse(fs.readFileSync('D:/Asistente Supervisor/src/data/zonasTecnicosReferencia.json', 'utf8'));

console.log('=== ANALYZING ALL AGENDA DIARIA & PENDIENTES BY TECHNICIAN ===');

// Load Asignados
const wbAsig = xlsx.readFile(path.join(agendaDir, 'Asignados.xls'));
const rawAsig = xlsx.utils.sheet_to_json(wbAsig.Sheets[wbAsig.SheetNames[0]], { defval: '' });
console.log(`Total rows in Asignados.xls: ${rawAsig.length}`);

// Load Pendientes Patagonia
const wbPat = xlsx.readFile(path.join(agendaDir, 'Pendientes Patagonia.xls'));
const rawPat = xlsx.utils.sheet_to_json(wbPat.Sheets[wbPat.SheetNames[0]], { defval: '' });
console.log(`Total rows in Pendientes Patagonia.xls: ${rawPat.length}`);

// Load Pendientes Suroeste
const wbSur = xlsx.readFile(path.join(agendaDir, 'Pendientes Suroeste.xls'));
const rawSur = xlsx.utils.sheet_to_json(wbSur.Sheets[wbSur.SheetNames[0]], { defval: '' });
console.log(`Total rows in Pendientes Suroeste.xls: ${rawSur.length}`);

// Technician map
const techMap = new Map();
zonasRef.forEach(z => {
  techMap.set(z.nombre.toLowerCase().trim(), {
    nombre: z.nombre,
    zonaTecnica: z.zonaTecnica,
    region: z.region,
    zonaLocal: z.zonaLocal,
    asignados: [],
    pendientes: []
  });
});

rawAsig.forEach(r => {
  const tec = String(r['Tecnico'] || r['Tec Asignado'] || r['TECNICO'] || '').toLowerCase().trim();
  let found = techMap.get(tec);
  if (!found) {
    for (const [k, v] of techMap.entries()) {
      if (k.includes(tec) || tec.includes(k)) {
        found = v;
        break;
      }
    }
  }
  if (found) {
    found.asignados.push(r);
  }
});

[...rawPat, ...rawSur].forEach(r => {
  const tec = String(r['Tec Asignado'] || r['Tec Zona'] || '').toLowerCase().trim();
  let found = techMap.get(tec);
  if (!found) {
    for (const [k, v] of techMap.entries()) {
      if (k.includes(tec) || tec.includes(k)) {
        found = v;
        break;
      }
    }
  }
  if (found) {
    found.pendientes.push(r);
  }
});

console.log('\n--- BREAKDOWN BY SUPERVISED TECHNICIAN ---');
let totalAsigTechs = 0;
let totalPendTechs = 0;

for (const [k, v] of techMap.entries()) {
  totalAsigTechs += v.asignados.length;
  totalPendTechs += v.pendientes.length;
  console.log(`${v.nombre} (${v.zonaTecnica} - ${v.zonaLocal}): ${v.asignados.length} Asignados | ${v.pendientes.length} Pendientes`);
  if (v.asignados.length > 0) {
    console.log('   Sample Asignado:', {
      pedido: v.asignados[0]['Pedido'],
      cliente: v.asignados[0]['Cliente'],
      luno: v.asignados[0]['Luno'],
      estado: v.asignados[0]['Estado'],
      fCoor: v.asignados[0]['F Coor'],
      hCoor: v.asignados[0]['H Coor']
    });
  }
}

console.log(`\nTOTAL Asignados matched to supervised techs: ${totalAsigTechs}`);
console.log(`TOTAL Pendientes matched to supervised techs: ${totalPendTechs}`);
