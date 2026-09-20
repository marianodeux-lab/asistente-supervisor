const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const agendaDir = path.resolve('D:/Asistente Supervisor/Reportes/Agenda Diaria');

const wbAsig = xlsx.readFile(path.join(agendaDir, 'Asignados.xls'));
const rawAsig = xlsx.utils.sheet_to_json(wbAsig.Sheets[wbAsig.SheetNames[0]], { defval: '' });

const wbPat = xlsx.readFile(path.join(agendaDir, 'Pendientes Patagonia.xls'));
const rawPat = xlsx.utils.sheet_to_json(wbPat.Sheets[wbPat.SheetNames[0]], { defval: '' });

const wbSur = xlsx.readFile(path.join(agendaDir, 'Pendientes Suroeste.xls'));
const rawSur = xlsx.utils.sheet_to_json(wbSur.Sheets[wbSur.SheetNames[0]], { defval: '' });

console.log('=== MATCHING PENDIENTES VS ASIGNADOS ===');

const asigMap = new Map();
rawAsig.forEach(r => {
  const p = String(r['Pedido'] || r['PEDIDO'] || '').split('-')[0].trim();
  if (p) asigMap.set(p, r);
});

const allPendientes = [
  ...rawPat.map(r => ({ ...r, origen: 'Patagonia' })),
  ...rawSur.map(r => ({ ...r, origen: 'Suroeste' }))
];

const pendientesAsignados = [];
const pendientesSinAsignar = [];

allPendientes.forEach(p => {
  const ped = String(p['Pedido'] || p['PEDIDO'] || '').trim();
  const match = asigMap.get(ped);
  const tecAsig = String(p['Tec Asignado'] || p['Tecnico'] || '').trim();
  const isSinAsig = !match && (!tecAsig || tecAsig.toLowerCase() === 'sin asignar' || tecAsig.toLowerCase().includes('sin asignar'));

  if (match || (!isSinAsig && tecAsig)) {
    pendientesAsignados.push({
      pedido: ped,
      cliente: p['Cliente'],
      luno: p['Luno'],
      origen: p.origen,
      tecReporte: tecAsig,
      tecEnAsignados: match ? (match['Tecnico'] || match['Tec Asignado']) : 'Asignado en reporte',
      estado: match ? match['Estado'] : p['Estado'],
      fCoor: match ? match['F Coor'] : p['F Coor'],
      hCoor: match ? match['H Coor'] : p['H Coor']
    });
  } else {
    pendientesSinAsignar.push({
      pedido: ped,
      cliente: p['Cliente'],
      luno: p['Luno'],
      localidad: p['Localidad'],
      zona: p['Zona'],
      origen: p.origen,
      tecZona: p['Tec Zona'],
      sla: p['SLA'],
      porcentajeSla: p['% SLA'],
      fechaVto: p['Fecha Vto'],
      falla: p['Detalle Falla']
    });
  }
});

console.log(`\nTotal Pendientes: ${allPendientes.length}`);
console.log(`- Pendientes Asignados: ${pendientesAsignados.length}`);
console.log(`- Pendientes SIN Asignar: ${pendientesSinAsignar.length}`);

console.log('\n--- PENDIENTES SIN ASIGNAR (DETALLE) ---');
console.log(JSON.stringify(pendientesSinAsignar, null, 2));

console.log('\n--- PENDIENTES ASIGNADOS (MUESTRA) ---');
console.log(JSON.stringify(pendientesAsignados.slice(0, 5), null, 2));
