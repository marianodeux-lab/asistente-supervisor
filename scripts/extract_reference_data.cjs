const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../src/data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Extracting Reference Files & Base Instalada...');

// 1. Extract Zonas Técnicos (Supervisor Reference Base)
let fileZt = path.resolve(__dirname, '../Reportes/Base Instalada/Zonas Técnicos.xlsx');
if (!fs.existsSync(fileZt)) {
  fileZt = path.resolve(__dirname, '../Reportes/Datos/Zonas Técnicos.xlsx');
}

let zonasTecnicosList = [];
if (fs.existsSync(fileZt)) {
  const wb = XLSX.readFile(fileZt);
  const ws = wb.Sheets['Tecnicos Base Instalada'] || wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  
  zonasTecnicosList = raw.map(r => ({
    nombre: String(r['TECNICO ZONA'] || '').trim(),
    zonaTecnica: String(r['ZONA TÉCNICA'] || '').trim(),
    region: String(r['REGIÓN'] || 'PATAGONIA').trim(),
    zonaLocal: String(r['Zona Local'] || '').trim(),
    atm: Number(r['ATM']) || 0,
    cashToday: Number(r['Cash Today']) || 0,
    subTotal: Number(r['Sub-Total']) || 0
  })).filter(z => z.nombre && z.zonaLocal && z.nombre.toLowerCase() !== 'total');
}
fs.writeFileSync(path.join(outDir, 'zonasTecnicosReferencia.json'), JSON.stringify(zonasTecnicosList, null, 2));

const mySupervisorTechNames = new Set(zonasTecnicosList.map(z => z.nombre.trim().toLowerCase()));

// 2. Extract Modelos MPCR
const fileMpcr = path.resolve(__dirname, '../Reportes/Datos/Modelos MPCR.xlsx');
let modelosMpcrList = [];
let callRateBenchmarks = [];

if (fs.existsSync(fileMpcr)) {
  const wb = XLSX.readFile(fileMpcr);
  if (wb.Sheets['MPCR']) {
    const raw = XLSX.utils.sheet_to_json(wb.Sheets['MPCR'], { defval: '' });
    modelosMpcrList = raw.map(r => ({
      fabricante: r['Fabricante'] || '',
      modeloBase: r['Modelo Base'] || '',
      modelos: r['MODELOS'] || '',
      mpcr: r['MPCR'] || '',
      negocio: r['Negocio'] || 'ATM',
      marcaDesc: r['MARCA_DESC'] || '',
      modeloDesc: r['MODELO_DESC'] || ''
    })).filter(m => m.fabricante || m.modeloBase || m.mpcr);
  }

  if (wb.Sheets['Call Rate']) {
    const rawCr = XLSX.utils.sheet_to_json(wb.Sheets['Call Rate'], { defval: '' });
    callRateBenchmarks = rawCr.map(r => ({
      fabricante: r['Fabricante'] || '',
      mpcr: r['MPCR'] || '',
      callRateTarget: typeof r['Call Rate'] === 'number' ? r['Call Rate'] : parseFloat(r['Call Rate']) || 0.35
    })).filter(c => c.fabricante || c.mpcr);
  }
}
fs.writeFileSync(path.join(outDir, 'modelosMpcrData.json'), JSON.stringify({ modelos: modelosMpcrList, benchmarks: callRateBenchmarks }, null, 2));

// Helper for MPCR lookup
function getMpcr(marca, modelo) {
  const mNorm = String(modelo || '').trim().toLowerCase();
  const maNorm = String(marca || '').trim().toLowerCase();
  const found = modelosMpcrList.find(m => {
    if (m.modeloDesc && m.modeloDesc.toLowerCase() === mNorm) return true;
    if (m.modelos && mNorm.includes(m.modelos.toLowerCase())) return true;
    if (m.modeloBase && mNorm.includes(m.modeloBase.toLowerCase())) return true;
    return false;
  });
  if (found) return found.mpcr;
  if (maNorm.includes('grg')) return 'GRG';
  if (maNorm.includes('opteva')) return 'OPTEVA';
  if (maNorm.includes('glory')) return 'GLORY';
  if (maNorm.includes('snbc')) return 'SNBC';
  return marca || 'OTRO';
}

function getPlantaCabecera(zona, localidad) {
  const z = String(zona || '').trim().toUpperCase();
  if (z.includes('BB2') || z.includes('BAHIA')) return 'Bahía Blanca';
  if (z.includes('MDP') || z.includes('COS') || z.includes('MAR DEL PLATA')) return 'Mar del Plata';
  if (z.includes('TDL') || z.includes('TANDIL')) return 'Tandil';
  if (z.includes('OLA') || z.includes('OLAVARRIA')) return 'Olavarría';
  if (z.includes('TRQ') || z.includes('TRENQUE')) return 'Trenque Lauquen';
  if (z.includes('SRO') || z.includes('SANTA ROSA')) return 'Santa Rosa';
  if (z.includes('PCO') || z.includes('PICO')) return 'General Pico';
  if (z.includes('VIE') || z.includes('VIEDMA')) return 'Viedma';
  if (z.includes('TRE') || z.includes('TRELEW') || z.includes('MADRYN')) return 'Trelew';
  if (z.includes('COM') || z.includes('COMODORO')) return 'Comodoro Rivadavia';
  if (z.includes('RGA') || z.includes('GALLEGOS')) return 'Río Gallegos';
  if (z.includes('RIT') || z.includes('TERCERO')) return 'Río Tercero';
  if (z.includes('TDF') || z.includes('USHUAIA') || z.includes('GRANDE')) return 'Ushuaia';
  if (z.includes('BAR') || z.includes('BARILOCHE')) return 'Bariloche';
  if (z.includes('CIP') || z.includes('CIPOLLETTI')) return 'Cipolletti';
  if (z.includes('NQN') || z.includes('NEUQUEN')) return 'Neuquén';
  if (localidad) return String(localidad).trim();
  return zona || 'Sin Asignar';
}

function parseDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const s = String(val).trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      let y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
      return new Date(y, m, d);
    }
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatFecha(d) {
  if (!d) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function calcAntiguedad(d) {
  if (!d) return '-';
  const refDate = new Date(2026, 8, 7); // Septiembre 2026
  let years = refDate.getFullYear() - d.getFullYear();
  let months = refDate.getMonth() - d.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 0) return '0 meses';
  if (years === 0 && months === 0) return '< 1 mes';
  if (years === 0) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  if (months === 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
  return `${years} ${years === 1 ? 'año' : 'años'} ${months} ${months === 1 ? 'mes' : 'meses'}`;
}

// 3. Extract Stock Fijo (ONLY SUPERVISOR ASSIGNED TECHNICIANS)
const fileSf = path.resolve(__dirname, '../Reportes/Datos/StockFijo.xls');
let stockFijoList = [];
if (fs.existsSync(fileSf)) {
  const wb = XLSX.readFile(fileSf);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  stockFijoList = raw.map(r => ({
    pn: String(r['PN'] || '').trim(),
    tecnico: String(r['BASESTOCK'] || '').trim(),
    tipo: String(r['TIPO'] || 'STOCK FIJO').trim(),
    cantMinima: Number(r['CANTMINIMA']) || 0,
    unidades: Number(r['UNIDADES']) || 0,
    diferencia: Number(r['DIFERENCIA']) || 0
  })).filter(s => {
    if (!s.pn || !s.tecnico) return false;
    // Strict filter: ONLY supervisor's technicians
    return mySupervisorTechNames.has(s.tecnico.trim().toLowerCase());
  });
}
fs.writeFileSync(path.join(outDir, 'stockFijoData.json'), JSON.stringify(stockFijoList, null, 2));

// 4. Extract Base Instalada Clientes (Agosto 2026 BASE)
const fileAgo = path.resolve(__dirname, '../Reportes/Base Instalada/2026/2026/Agosto.xlsx');
let baseInstaladaClientesList = [];
if (fs.existsSync(fileAgo)) {
  const wbAgo = XLSX.readFile(fileAgo);
  const wsAgo = wbAgo.Sheets['BASE'] || wbAgo.Sheets[wbAgo.SheetNames[0]];
  const rawAgo = XLSX.utils.sheet_to_json(wsAgo, { defval: '' });
  
  baseInstaladaClientesList = rawAgo.map(r => {
    const d = parseDate(r['FECHAHABILITACION']);
    const slaText = r['SLA_R'] ? (`${r['SLA_R']}h`) : (r['SLA_S'] ? (`${r['SLA_S']}h`) : '-');
    return {
      cliente: String(r['CLIENTE_DESC'] || r['CLIENTE'] || '').trim(),
      atm: String(r['COD_EQUIPO'] || r['ATM'] || r['LUNO'] || '').trim(),
      serie: String(r['SERIE_ATM'] || r['SERIE'] || '').trim(),
      direccion: String(r['DENOMINACION'] || r['UBICACION'] || r['DIRECCION'] || '').trim(),
      localidad: String(r['LOCALIDAD'] || '').trim(),
      provincia: String(r['PROVINCIA'] || '').trim(),
      distancia: String(r['KM'] || '0').trim(),
      mpcr: getMpcr(r['MARCA_DESC'], r['MODELO_DESC']),
      red: String(r['RED'] || '').trim(),
      sla: slaText,
      tecnicoZona: String(r['TECNICO_ZONA'] || '').trim(),
      antiguedad: calcAntiguedad(d),
      fechaHabilitacion: formatFecha(d),
      // Metadata for dependent cascading filters
      fabricante: String(r['MARCA_DESC'] || '').trim(),
      modelo: String(r['MODELO_DESC'] || '').trim(),
      region: String(r['REGIONTECNICO'] || '').trim(),
      plantaCabecera: getPlantaCabecera(r['ZONA_DESC'], r['LOCALIDAD']),
      negocio: String(r['NEGOCIO'] || 'ATM').trim(),
      recaudador: String(r['RECAUDADOR'] || '').trim()
    };
  }).filter(e => e.cliente || e.atm);
}
fs.writeFileSync(path.join(outDir, 'baseInstaladaClientesData.json'), JSON.stringify(baseInstaladaClientesList, null, 2));

console.log(`✅ Extracted:
- ${modelosMpcrList.length} Modelos MPCR
- ${stockFijoList.length} Registros de Stock Fijo (Exclusivo Técnicos Asignados)
- ${zonasTecnicosList.length} Técnicos con Base Normalizada
- ${baseInstaladaClientesList.length} Equipos en Base Instalada`);
