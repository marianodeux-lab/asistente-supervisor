const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(projectRoot, 'src/data');
const reportesDir = path.resolve(projectRoot, 'Reportes');

console.log('🚀 Generating Accurate Preventivos Data with Single Source of Truth...');

// 1. Zonas Técnicas a Zona Local
const ZONA_TECNICA_TO_LOCAL = {
  'IN MDP 1': 'Atlántica',
  'IN MDP 2': 'Atlántica',
  'IN MDP3': 'Atlántica',
  'IN COS': 'Atlántica',
  'IN SRO': 'La Pampa',
  'IN PCO': 'La Pampa',
  'IN PCO1': 'La Pampa',
  'IN TDL': 'Oeste',
  'IN TRQ': 'Oeste',
  'IN OLA': 'Oeste',
  'IN BB2': 'Centro',
  'IN VIE': 'Centro',
  'IN TRE': 'Sur',
  'IN COM': 'Sur',
  'IN BAR': 'Suroeste',
  'IN CIP': 'Suroeste',
  'IN NQN': 'Suroeste',
  'IN RIT': 'Contratistas',
  'IN TDF': 'Contratistas',
  'IN RGA': 'Contratistas'
};

const ZONAS_LOCALES = ['Atlántica', 'Centro', 'Oeste', 'La Pampa', 'Suroeste', 'Sur', 'Contratistas'];

// Load Zonas Referencia for base counts
const zonasRef = JSON.parse(fs.readFileSync(path.join(outDir, 'zonasTecnicosReferencia.json'), 'utf8'));
const myTechMap = new Map();
zonasRef.forEach(z => {
  myTechMap.set(z.nombre.toLowerCase().trim(), z);
});

function resolveEquipmentNegocio(modeloRaw, marcaRaw) {
  const m = (modeloRaw || '').toUpperCase();
  const b = (marcaRaw || '').toUpperCase();
  if (b.includes('SMART BOX') || b.includes('SMARTBOX') || b.includes('GUNNEBO')) return 'Cash Today';
  if (b.includes('CRP')) return 'CRP';
  if (m.includes('GLORY') || m.includes('SNBC') || m.includes('CIMA') || m.includes('CTI') || 
      m.includes('CTE') || m.includes('SDM') || m.includes('INLANE') || m.includes('P500') || 
      m.includes('P1000') || m.includes('P1001') || m.includes('KISAN') || m.includes('PMINI') || 
      m.includes('MEI') || m.includes('TAS')) {
    return 'Cash Today';
  }
  return 'ATM';
}

function resolveFabricante(modeloRaw) {
  const m = (modeloRaw || '').toUpperCase();
  if (m.includes('GLORY') || m.includes('P500') || m.includes('P1000') || m.includes('P1001') || m.includes('TAS')) return 'GLORY';
  if (m.includes('SNBC') || m.includes('CTI') || m.includes('CTE') || m.includes('DI90S')) return 'SNBC';
  if (m.includes('CIMA') || m.includes('INLANE') || m.includes('SDM500')) return 'CIMA';
  if (m.includes('CS280') || m.includes('CS285') || m.includes('CS2070') || m.includes('WINCOR')) return 'Wincor';
  if (m.includes('GRG') || m.includes('DT-7000') || m.includes('H22') || m.includes('H34') || m.includes('H68')) return 'GRG Banking';
  if (m.includes('OPTEVA') || m.includes('DIEBOLD')) return 'Diebold Nixdorf';
  return 'Diebold Nixdorf';
}

function matchTechnicianName(rawTec) {
  if (!rawTec) return 'Sin Asignar';
  const t = rawTec.toLowerCase().trim();
  if (t === 'sin asignar' || t === 'sin_asignar') return 'Sin Asignar';
  if (myTechMap.has(t)) return myTechMap.get(t).nombre;
  for (const [k, v] of myTechMap.entries()) {
    if (k.includes(t) || t.includes(k)) return v.nombre;
  }
  return rawTec.trim();
}

// 2. Parse MP Pendientes
const pendientesDetalle = [];
const pendByZonaLocal = {};
ZONAS_LOCALES.forEach(z => {
  pendByZonaLocal[z] = { atm: 0, ctd: 0, total: 0 };
});

const pendByLocalidad = {};

const pendFiles = [
  { file: 'MP Pendientes Patagonia.xls', isSur: false },
  { file: 'MP Pendientes Suroeste.xls', isSur: true },
  { file: 'MP Pendientes Bariloche.xls', isSur: true }
];

pendFiles.forEach(({ file, isSur }) => {
  const p = path.join(reportesDir, file);
  if (!fs.existsSync(p)) return;
  const wb = XLSX.readFile(p);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  rows.forEach(r => {
    const rawZona = String(r.Zona || r.ZONA || '').trim();
    let zLoc = ZONA_TECNICA_TO_LOCAL[rawZona];
    if (!zLoc) {
      zLoc = isSur ? 'Suroeste' : 'Patagonia';
    }

    const modelo = String(r.Modelo || r.MODELO || '').trim();
    const negocio = resolveEquipmentNegocio(modelo, r.Marca || r.MARCA_DESC);
    const fabricante = resolveFabricante(modelo);
    const ped = String(r.Pedido || r.PEDIDO || '').trim();
    const luno = String(r.Luno || r.LUNO || '').trim();
    const cliente = String(r.Cliente || r.CLIENTE || '').trim();
    const localidad = String(r.Localidad || r.LOCALIDAD || '').trim() || 'Sin Localidad';
    const direccion = String(r.Direccion || r.DIRECCION || '').trim();
    const tecZona = String(r['Tec Zona'] || '').trim();
    const tecAsig = String(r['Tec Asignado'] || '').trim();
    const tecFinal = matchTechnicianName(tecAsig !== 'SIN ASIGNAR' && tecAsig ? tecAsig : tecZona);

    const item = {
      pedido: ped,
      cliente: cliente,
      luno: luno,
      direccion: direccion,
      localidad: localidad,
      tecnico: tecFinal,
      modelo: modelo || 'ATM / CTD',
      zonaTecnica: rawZona,
      zonaLocal: zLoc,
      zona: zLoc,
      negocio: negocio,
      fabricante: fabricante,
      detalleFalla: String(r['Detalle Falla'] || r['Desc Problema'] || 'MANTENIMIENTO PREVENTIVO').trim(),
      esSinAsignar: tecFinal === 'Sin Asignar' || tecAsig === 'SIN ASIGNAR'
    };

    pendientesDetalle.push(item);

    // Accumulate by Zona Local
    if (pendByZonaLocal[zLoc]) {
      if (negocio === 'ATM') pendByZonaLocal[zLoc].atm++;
      else pendByZonaLocal[zLoc].ctd++;
      pendByZonaLocal[zLoc].total++;
    }

    // Accumulate by Localidad
    if (!pendByLocalidad[localidad]) {
      pendByLocalidad[localidad] = {
        localidad: localidad,
        zonaLocal: zLoc,
        zonaTecnica: rawZona,
        atm: 0,
        ctd: 0,
        total: 0,
        tecnicos: new Set()
      };
    }
    if (negocio === 'ATM') pendByLocalidad[localidad].atm++;
    else pendByLocalidad[localidad].ctd++;
    pendByLocalidad[localidad].total++;
    if (tecFinal !== 'Sin Asignar') {
      pendByLocalidad[localidad].tecnicos.add(tecFinal);
    }
  });
});

// 3. Parse MP Cerrados to count Realizados per Zona
const cerradosByZonaLocal = {};
ZONAS_LOCALES.forEach(z => {
  cerradosByZonaLocal[z] = { atm: 0, ctd: 0, total: 0 };
});

const cerradosFiles = [
  { file: 'MP Cerrados Patagonia.xls', isSur: false },
  { file: 'MP Cerrados Suroeste.xls', isSur: true }
];

cerradosFiles.forEach(({ file, isSur }) => {
  const p = path.join(reportesDir, file);
  if (!fs.existsSync(p)) return;
  const wb = XLSX.readFile(p);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  rows.forEach(r => {
    const rawZona = String(r.Zona || r.ZONA || '').trim();
    let zLoc = ZONA_TECNICA_TO_LOCAL[rawZona];
    if (!zLoc) {
      zLoc = isSur ? 'Suroeste' : 'Patagonia';
    }

    const modelo = String(r.Modelo || r.MODELO || '').trim();
    const negocio = resolveEquipmentNegocio(modelo, r.Marca || r.MARCA_DESC);

    if (cerradosByZonaLocal[zLoc]) {
      if (negocio === 'ATM') cerradosByZonaLocal[zLoc].atm++;
      else cerradosByZonaLocal[zLoc].ctd++;
      cerradosByZonaLocal[zLoc].total++;
    }
  });
});

// Base Parque calculation per Zona Local
const baseParqueByZonaLocal = {
  'Atlántica': { atm: 185, ctd: 115 },
  'Centro': { atm: 92, ctd: 46 },
  'Oeste': { atm: 192, ctd: 41 },
  'La Pampa': { atm: 173, ctd: 14 },
  'Suroeste': { atm: 76, ctd: 150 },
  'Sur': { atm: 36, ctd: 59 },
  'Contratistas': { atm: 14, ctd: 38 }
};

// Build Por Zona Array
const porZona = ZONAS_LOCALES.map(z => {
  const base = baseParqueByZonaLocal[z] || { atm: 100, ctd: 50 };
  const realizados = cerradosByZonaLocal[z]?.total || 0;
  const pendientes = pendByZonaLocal[z]?.total || 0;
  const meta = realizados + pendientes;
  const cumplimiento = meta > 0 ? parseFloat(((realizados / meta) * 100).toFixed(1)) : 100.0;
  const ritmoDiario = pendientes > 0 ? parseFloat((pendientes / 17).toFixed(1)) : 0;

  return {
    zona: z,
    baseAtm: base.atm,
    baseCtd: base.ctd,
    pendientes: pendientes,
    realizados: realizados,
    meta: meta,
    cumplimiento: cumplimiento,
    ritmoDiario: ritmoDiario
  };
});

// Build Resumen por Localidad Array
const resumenPorLocalidad = Object.values(pendByLocalidad).map(l => ({
  localidad: l.localidad,
  zonaLocal: l.zonaLocal,
  zonaTecnica: l.zonaTecnica,
  atm: l.atm,
  ctd: l.ctd,
  total: l.total,
  tecnicos: Array.from(l.tecnicos).join(', ') || 'Técnico de Zona'
})).sort((a, b) => b.total - a.total);

const totalPendientesGlobal = pendientesDetalle.length;
const totalRealizadosGlobal = Object.values(cerradosByZonaLocal).reduce((acc, v) => acc + v.total, 0);

const preventivosFinal = {
  totalPendientes: totalPendientesGlobal,
  totalRealizados: totalRealizadosGlobal,
  metaMensual: totalPendientesGlobal + totalRealizadosGlobal,
  diasHabilesRestantes: 17,
  ritmoDiarioRequerido: parseFloat((totalPendientesGlobal / 17).toFixed(1)),
  porZona: porZona,
  pendientesDetalle: pendientesDetalle,
  resumenPorLocalidad: resumenPorLocalidad
};

fs.writeFileSync(path.join(outDir, 'preventivosData.json'), JSON.stringify(preventivosFinal, null, 2));
console.log(`✅ preventivosData.json Guardado:`);
console.log(`   - Total Pendientes: ${totalPendientesGlobal} (ATM: ${pendientesDetalle.filter(x => x.negocio === 'ATM').length}, CTD: ${pendientesDetalle.filter(x => x.negocio !== 'ATM').length})`);
console.log(`   - Total Realizados: ${totalRealizadosGlobal}`);
console.log(`   - Total Localidades: ${resumenPorLocalidad.length}`);
console.log(`   - Zonas Locales: ${porZona.map(z => `${z.zona} (${z.pendientes} pend)`).join(', ')}`);
