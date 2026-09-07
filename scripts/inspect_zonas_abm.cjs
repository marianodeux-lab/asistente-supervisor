const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const fileZonas = path.resolve('Reportes/Base Instalada/Zonas Técnicos.xlsx');
const wb = XLSX.readFile(fileZonas);
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

console.log('=== FUENTE DE VERDAD: TÉCNICOS Y ZONAS A CARGO ===');
console.log('Total técnicos a cargo:', raw.length);

const tecnicosSupervisados = [];
raw.forEach((r, idx) => {
  const tec = String(r['TECNICO ZONA'] || '').trim();
  const zona = String(r['ZONA TÉCNICA'] || '').trim();
  const region = String(r['REGIÓN'] || '').trim();
  const subzona = String(r['Zona Local'] || '').trim();
  const atm = Number(r['ATM']) || 0;
  const ctd = Number(r['Cash Today']) || 0;
  const total = Number(r['Sub-Total']) || (atm + ctd);

  tecnicosSupervisados.push({
    index: idx + 1,
    tecnico: tec,
    codigoZona: zona,
    region,
    subzonaLocal: subzona,
    baseAtm: atm,
    baseCtd: ctd,
    totalEquipos: total
  });

  console.log(`${idx + 1}. ${tec} | Zona: ${zona} | Región: ${region} (${subzona}) | ATM: ${atm} | CTD: ${ctd} | Total: ${total}`);
});

const totalAtm = tecnicosSupervisados.reduce((acc, t) => acc + t.baseAtm, 0);
const totalCtd = tecnicosSupervisados.reduce((acc, t) => acc + t.baseCtd, 0);
console.log('\n---------------------------------------------');
console.log(`TOTAL GENERAL: ${totalAtm + totalCtd} Equipos (${totalAtm} ATM / ${totalCtd} Cash Today)`);

// Now let's compare with Base Instalada monthly files to analyze Altas, Bajas, Modificaciones (ABM)
const dir2026 = path.resolve('Reportes/Base Instalada/2026/2026');
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto'];
const monthlyBases = [];

// Set of supervised zones and technicians for strict filtering
const supervisedZones = new Set(tecnicosSupervisados.map(t => t.codigoZona.toUpperCase()));
const supervisedTecnicos = new Set(tecnicosSupervisados.map(t => t.tecnico.toUpperCase()));

console.log('\n=== ANÁLISIS MENSUAL DE BASE INSTALADA (2026) ===');

monthNames.forEach(mName => {
  const fPath = path.join(dir2026, `${mName}.xlsx`);
  if (!fs.existsSync(fPath)) return;
  const wbM = XLSX.readFile(fPath);
  const sheetName = wbM.SheetNames.includes('BASE') ? 'BASE' : wbM.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wbM.Sheets[sheetName], { defval: '' });

  // Filter only our supervised technicians / zones
  const supervisedRows = rows.filter(r => {
    const z = String(r['ZONA_DESC'] || r['ZONA TÉCNICA'] || '').toUpperCase();
    const t = String(r['TECNICO_ZONA'] || r['TECNICO'] || '').toUpperCase();
    return supervisedZones.has(z) || supervisedTecnicos.has(t);
  });

  const countAtm = supervisedRows.filter(r => String(r['NEGOCIO'] || '').toUpperCase() === 'ATM').length;
  const countCtd = supervisedRows.filter(r => String(r['NEGOCIO'] || '').toUpperCase() !== 'ATM').length;

  monthlyBases.push({
    mes: mName,
    totalNacional: rows.length,
    totalSupervisado: supervisedRows.length,
    atm: countAtm,
    ctd: countCtd,
    equipos: supervisedRows.map(r => ({
      codEquipo: String(r['COD_EQUIPO'] || r['NUMER'] || r['SERIE_ATM'] || '').trim(),
      serie: String(r['SERIE_ATM'] || '').trim(),
      cliente: String(r['CLIENTE_DESC'] || r['CLIENTE'] || '').trim(),
      modelo: String(r['MODELO_DESC'] || r['MODELO'] || '').trim(),
      marca: String(r['MARCA_DESC'] || '').trim(),
      negocio: String(r['NEGOCIO'] || 'ATM').trim(),
      zona: String(r['ZONA_DESC'] || '').trim(),
      tecnico: String(r['TECNICO_ZONA'] || '').trim(),
      localidad: String(r['LOCALIDAD'] || '').trim(),
      direccion: String(r['DENOMINACION'] || '').trim(),
      habilitado: String(r['H'] || 'S').trim()
    }))
  });

  console.log(`${mName}: Total Supervisado = ${supervisedRows.length} (${countAtm} ATM / ${countCtd} CTD) | Total País = ${rows.length}`);
});

// Calculate ABM (Altas, Bajas, Modificaciones) month-over-month
const abmResults = [];
for (let i = 1; i < monthlyBases.length; i++) {
  const prevMonth = monthlyBases[i - 1];
  const currMonth = monthlyBases[i];

  const prevMap = new Map(prevMonth.equipos.map(e => [e.codEquipo || e.serie, e]));
  const currMap = new Map(currMonth.equipos.map(e => [e.codEquipo || e.serie, e]));

  const altas = [];
  const bajas = [];
  const modificaciones = [];

  for (const [key, eq] of currMap.entries()) {
    if (!prevMap.has(key)) {
      altas.push(eq);
    } else {
      const prevEq = prevMap.get(key);
      const changes = [];
      if (prevEq.tecnico !== eq.tecnico) changes.push(`Técnico: ${prevEq.tecnico} → ${eq.tecnico}`);
      if (prevEq.zona !== eq.zona) changes.push(`Zona: ${prevEq.zona} → ${eq.zona}`);
      if (prevEq.cliente !== eq.cliente) changes.push(`Cliente: ${prevEq.cliente} → ${eq.cliente}`);
      if (prevEq.modelo !== eq.modelo) changes.push(`Modelo: ${prevEq.modelo} → ${eq.modelo}`);
      if (changes.length > 0) {
        modificaciones.push({ equipo: eq, changes });
      }
    }
  }

  for (const [key, eq] of prevMap.entries()) {
    if (!currMap.has(key)) {
      bajas.push(eq);
    }
  }

  abmResults.push({
    periodo: `${prevMonth.mes} → ${currMonth.mes}`,
    mesActual: currMonth.mes,
    mesAnterior: prevMonth.mes,
    totalAnterior: prevMonth.totalSupervisado,
    totalActual: currMonth.totalSupervisado,
    variacionNeta: currMonth.totalSupervisado - prevMonth.totalSupervisado,
    altasCount: altas.length,
    bajasCount: bajas.length,
    modificacionesCount: modificaciones.length,
    altasDetalle: altas,
    bajasDetalle: bajas,
    modificacionesDetalle: modificaciones
  });

  console.log(`\nABM ${prevMonth.mes} → ${currMonth.mes}:`);
  console.log(`  + Altas: ${altas.length}`);
  console.log(`  - Bajas: ${bajas.length}`);
  console.log(`  ~ Modificaciones (reasignaciones): ${modificaciones.length}`);
  console.log(`  = Variación neta: ${currMonth.totalSupervisado - prevMonth.totalSupervisado} (de ${prevMonth.totalSupervisado} a ${currMonth.totalSupervisado})`);
}
