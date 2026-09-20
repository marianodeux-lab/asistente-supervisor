const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../src/data');

// Dynamic reference date: always use the current date at processing time
const REF_DATE = new Date();
const REF_DATE_ISO = REF_DATE.toISOString().split('T')[0];
const REF_DATE_FORMATTED = `${String(REF_DATE.getDate()).padStart(2, '0')}/${String(REF_DATE.getMonth() + 1).padStart(2, '0')}/${REF_DATE.getFullYear()}`;
const REF_TIME = REF_DATE.getTime();
console.log(`🚀 Processing all Flow Pro reports (ref date: ${REF_DATE_FORMATTED})...`);

// 1. Codigos de Cierre Dictionary
const codigosCierre = {
  "COMPL": { desc: "Completo (Cierre Exitoso en Campo)", tipo: "EXITO", esRemoto: false, esCampo: true, color: "emerald" },
  "PPR": { desc: "Pendiente por Repuesto", tipo: "REPUESTO", esRemoto: false, esCampo: true, color: "amber" },
  "PPRC": { desc: "Pendiente por Repuesto (Cliente)", tipo: "REPUESTO", esRemoto: false, esCampo: true, color: "amber" },
  "PCCV": { desc: "Pendiente Cliente con Visita", tipo: "CLIENTE", esRemoto: false, esCampo: true, color: "blue" },
  "PCSI": { desc: "Pendiente Cliente sin ir", tipo: "CLIENTE", esRemoto: true, esCampo: false, color: "slate" },
  "PPE": { desc: "Pendiente por Especialistas", tipo: "SOPORTE", esRemoto: false, esCampo: true, color: "purple" },
  "PPH": { desc: "Pendiente", tipo: "PENDIENTE", esRemoto: false, esCampo: true, color: "slate" },
  "PSUP": { desc: "Pendiente Supervisor", tipo: "SUPERVISION", esRemoto: false, esCampo: true, color: "red" },
  "SPRSI": { desc: "Supervisor sin ir", tipo: "SUPERVISION", esRemoto: true, esCampo: false, color: "red" },
  "DERIV": { desc: "Derivado de Mesa Cash Today al Servicio Técnico", tipo: "MESA_CTD", esRemoto: true, esCampo: false, color: "cyan" },
  "MONITOREO": { desc: "Mesa de Servicios Cash Today (Soporte Remoto)", tipo: "REMOTO", esRemoto: true, esCampo: false, color: "teal" },
  "TELCA": { desc: "Cierre Telefónico / Remoto Exitoso", tipo: "REMOTO", esRemoto: true, esCampo: false, color: "teal" },
  "TELCA2": { desc: "Cierre Telefónico / Remoto Exitoso (Mesa CTD)", tipo: "REMOTO", esRemoto: true, esCampo: false, color: "teal" },
  "TELCA3": { desc: "Cierre Telefónico / Remoto Exitoso (Mesa CTD)", tipo: "REMOTO", esRemoto: true, esCampo: false, color: "teal" },
  "TELFA": { desc: "Cierre Telefónico Facturable (Soporte Remoto)", tipo: "REMOTO", esRemoto: true, esCampo: false, color: "teal" },
  "CEF": { desc: "Cierre Efectivo Facturable", tipo: "FACTURABLE", esRemoto: false, esCampo: true, color: "yellow" },
  "CEFIC": { desc: "Cierre Efectivo Facturable Incluido en Contrato", tipo: "FACTURABLE", esRemoto: false, esCampo: true, color: "yellow" },
  "CGTIA": { desc: "En Garantía", tipo: "GARANTIA", esRemoto: false, esCampo: true, color: "emerald" },
  "FACT": { desc: "Facturable", tipo: "FACTURABLE", esRemoto: false, esCampo: true, color: "yellow" },
  "FACT2": { desc: "Facturable", tipo: "FACTURABLE", esRemoto: false, esCampo: true, color: "yellow" }
};
fs.writeFileSync(path.join(outDir, 'codigosCierreData.json'), JSON.stringify(codigosCierre, null, 2));

// 2. Load Zonas Técnicos as Master Reference Source of Truth
const fileZonas = path.resolve(__dirname, '../Reportes/Base Instalada/Zonas Técnicos.xlsx');
const tecToZonaMap = new Map(); // tecCleanLower -> { nombre, zonaTecnica, region, zonaLocal, atm, cashToday, subTotal }
const zonasListRef = [];
const misTecnicosNombres = new Set();
const misZonasTecnicas = new Set();

if (fs.existsSync(fileZonas)) {
  const wbZ = XLSX.readFile(fileZonas);
  const rawZ = XLSX.utils.sheet_to_json(wbZ.Sheets['Tecnicos Base Instalada'] || wbZ.Sheets[wbZ.SheetNames[0]]);
  rawZ.forEach(r => {
    const tec = String(r['TECNICO ZONA'] || '').trim();
    if (!tec || tec.toLowerCase() === 'total') return;
    misTecnicosNombres.add(tec.toLowerCase());
    const zt = String(r['ZONA TÉCNICA'] || '').trim();
    if (zt) misZonasTecnicas.add(zt);

    const item = {
      nombre: tec,
      zonaTecnica: zt,
      region: String(r['REGIÓN'] || 'PATAGONIA').trim(),
      zonaLocal: String(r['Zona Local'] || r['Zonas Locales'] || '').trim(),
      atm: Number(r['ATM'] || 0),
      cashToday: Number(r['Cash Today'] || 0),
      subTotal: Number(r['Sub-Total'] || (Number(r['ATM'] || 0) + Number(r['Cash Today'] || 0)))
    };
    zonasListRef.push(item);
    tecToZonaMap.set(tec.toLowerCase(), item);
  });
  fs.writeFileSync(path.join(outDir, 'zonasTecnicosReferencia.json'), JSON.stringify(zonasListRef, null, 2));
  console.log(`✅ Zonas Técnicos Fuente de Verdad: ${zonasListRef.length} técnicos configurados`);
}

// Centro-Oeste technicians under Mariano Deus supervision
const marianoCoTechs = new Set([
  'xavier, hernan',
  'bastias, carlos ignacio',
  'ochoa, diego armando',
  'fiorio, andres ezequiel',
  'lorca biassi, enzo martin',
  'olivencia, emmanuel matias',
  'deus, mariano',
  'gonzalez, elio fabian',
  'lazzaro, leonardo',
  'gonzalez, leonardo',
  'torres, florencia',
  'ibañez, pablo fernando',
  'meneses, cristian'
]);

// Helper to parse dates into ISO / standard format
function parseDateAny(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    try {
      const d = XLSX.SSF.parse_date_code(val);
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    } catch (e) {
      return String(val);
    }
  }
  const s = String(val).trim();
  // Handle DD/MM/YYYY
  if (s.includes('/')) {
    const parts = s.split(' ')[0].split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${y}-${m}-${d}`;
    }
  }
  return s;
}

// Helper to parse strict DD/MM/YYYY [HH:mm[:ss]] strings into a Date object
function parseExcelDateTime(str) {
  if (!str) return null;
  const s = String(str).trim();
  const num = Number(s);
  if (!isNaN(num) && num > 30000 && num < 70000) {
    const utcDays = num - 25569;
    return new Date(utcDays * 86400 * 1000);
  }
  const match = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? parseInt(match[5], 10) : 0;
    const sec = match[6] ? parseInt(match[6], 10) : 0;
    return new Date(year, month, day, hour, min, sec);
  }
  const isoMatch = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

// Helper function to parse part string into Base Module PN + Lab QR Code
function parsePartCode(code) {
  if (!code || typeof code !== 'string') return { raw: '-', pnBase: '-', qr: '-' };
  let s = code.trim();
  if (s.endsWith('-')) s = s.slice(0, -1);
  
  const parts = s.split('-');
  if (parts.length >= 4) {
    const qr = parts[parts.length - 1];
    const pnBase = parts.slice(0, -1).join('-');
    return { raw: s, pnBase, qr };
  } else if (parts.length === 3 && (/^[0-9]{4}$/i.test(parts[2]) || /^0GEN$/i.test(parts[2]))) {
    const qr = parts[2];
    const pnBase = parts.slice(0, 2).join('-');
    return { raw: s, pnBase, qr };
  }
  return { raw: s, pnBase: s, qr: 'Sin QR' };
}

// 3. Load Stock Fijo map (Tecnico + PN Base -> cantMinima)
const fileStockFijo = path.resolve(__dirname, '../Reportes/Datos/StockFijo.xls');
const sfMap = new Map();
if (fs.existsSync(fileStockFijo)) {
  const sfWb = XLSX.readFile(fileStockFijo);
  const sfWs = sfWb.Sheets[sfWb.SheetNames[0]];
  const sfRaw = XLSX.utils.sheet_to_json(sfWs);
  sfRaw.forEach(r => {
    const tec = String(r['BASESTOCK'] || '').trim().toLowerCase();
    const pn = String(r['PN'] || '').trim().toUpperCase();
    const cant = Number(r['CANTMINIMA'] || 0);
    if (tec && pn) {
      sfMap.set(tec + '|' + pn, cant);
    }
  });
  console.log(`✅ Stock Fijo referenciado: ${sfMap.size} asignaciones mapeadas`);
}

// 3b. Load Master LP (PN -> Descripcion)
const fileMasterLp = path.resolve(__dirname, '../Reportes/Datos/Master LP.xlsx');
const masterLpMap = new Map();
const masterLpDict = {};
if (fs.existsSync(fileMasterLp)) {
  const mlpWb = XLSX.readFile(fileMasterLp);
  const mlpWs = mlpWb.Sheets['Master LP'] || mlpWb.Sheets[mlpWb.SheetNames[0]];
  const mlpRaw = XLSX.utils.sheet_to_json(mlpWs, { defval: '' });
  mlpRaw.forEach(r => {
    const pn = String(r['PN'] || '').trim().toUpperCase();
    const desc = String(r['DESCRIPCION'] || '').trim();
    if (pn && desc) {
      masterLpMap.set(pn, desc);
      masterLpDict[pn] = desc;
    }
  });
  fs.writeFileSync(path.join(outDir, 'masterLpMap.json'), JSON.stringify(masterLpDict, null, 2));
  console.log(`✅ Master LP cargado: ${masterLpMap.size} repuestos con descripción técnica oficial`);
}

// 4. Read Buzon de Movimientos
const fileBuzon = path.resolve(__dirname, '../Reportes/Reporte Buzon Movimientos.xlsx');
let buzonMap = new Map();
let buzonList = [];

if (fs.existsSync(fileBuzon)) {
  const wb = XLSX.readFile(fileBuzon);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  
  raw.forEach(r => {
    const rawPed = String(r['PEDIDO'] || '').trim();
    if (!rawPed) return;
    const cleanPed = rawPed.split('-')[0];
    const tec = String(r['TECNICO'] || '').trim();
    const rawInst = String(r['IDUNICOINSTALA'] || '').trim();
    const rawRet = String(r['IDUNICORETIRA'] || '').trim();
    
    const instParsed = parsePartCode(rawInst);
    const retParsed = parsePartCode(rawRet);
    
    const sfKey = tec.toLowerCase() + '|' + instParsed.pnBase.toUpperCase();
    const cantAsignadaSf = sfMap.get(sfKey) || 0;
    const esStockFijo = cantAsignadaSf > 0;

    const fechaVal = parseDateAny(r['FECHA']);

    const instalaDesc = masterLpMap.get(instParsed.pnBase.toUpperCase()) || masterLpMap.get(rawInst.toUpperCase()) || '';
    const retiraDesc = masterLpMap.get(retParsed.pnBase.toUpperCase()) || masterLpMap.get(rawRet.toUpperCase()) || '';

    const item = {
      pedido: rawPed,
      cleanPed,
      fecha: fechaVal,
      hora: r['HORA'] || '',
      idInstala: rawInst,
      idRetira: rawRet,
      instalaBase: instParsed.pnBase,
      instalaDesc,
      instalaQr: instParsed.qr,
      retiraBase: retParsed.pnBase,
      retiraDesc,
      retiraQr: retParsed.qr,
      esStockFijo,
      cantAsignadaSf,
      origenStock: esStockFijo ? 'Stock Fijo Técnico' : 'Stock Central (Retorno Semanal)',
      tecnico: tec,
      obs: r['OBSPROCESO'] || ''
    };
    buzonList.push(item);

    if (!buzonMap.has(cleanPed)) buzonMap.set(cleanPed, []);
    buzonMap.get(cleanPed).push(item);
  });
}

// Keep all movements for our regional technicians (or all if none matched)
const patagoniaBuzonList = buzonList.filter(item => {
  const normTec = String(item.tecnico || '').toLowerCase().trim();
  return misTecnicosNombres.has(normTec);
});
fs.writeFileSync(path.join(outDir, 'buzonMovimientosData.json'), JSON.stringify(patagoniaBuzonList.length > 0 ? patagoniaBuzonList : buzonList, null, 2));
console.log(`✅ Buzón Movimientos: ${patagoniaBuzonList.length} transacciones de técnicos de la región guardadas (${buzonMap.size} pedidos con repuestos asociados)`);

// 5. Read Suspendidos for History per Equipment & Map cleanPed -> Luno
const suspendidosHistoryMap = new Map();
const cleanPedToLunoMap = new Map();

function loadSuspendidosFile(filePath, defaultZona) {
  if (!fs.existsSync(filePath)) return;
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  
  raw.forEach(r => {
    const luno = String(r['ATM'] || r['Luno'] || '').trim();
    if (!luno || luno.length < 3) return;

    const ped = String(r['PEDIDO'] || r['Pedido'] || '').trim();
    const cleanPed = ped.split('-')[0];
    if (cleanPed && luno) {
      cleanPedToLunoMap.set(cleanPed, luno);
    }
    const codCierre = String(r['CODIGOCIERRE'] || r['CODCIERRE'] || r['CODCIE'] || r['Cod Cierre'] || '').trim();
    const cpto = String(r['CONCEPTOLLAMADA'] || r['CONCEPTO LLAMADA'] || r['Concepto'] || '').trim();
    const obs = String(r['OBSERVACIONESCONTROL'] || r['OBSERVACIONES CONTROL'] || r['DETALLEFALLA'] || r['DETALLE FALLA'] || '').trim();
    const tec = String(r['TECNICOASISTIO'] || r['TECNICO'] || r['TECNICOZONA'] || '').trim();
    const fecha = parseDateAny(r['FECHAFIN'] || r['MARCA FIN'] || r['FECHAALTA'] || '2026-02-28');
    const zona = String(r['ZONA'] || r['ZONALOCAL'] || defaultZona).trim();

    const infoCierre = codigosCierre[codCierre] || { 
      desc: codCierre || 'Cerrado', 
      tipo: 'GENERICO', 
      esRemoto: ['TELCA', 'TELCA2', 'TELCA3', 'TELFA', 'MONITOREO'].includes(codCierre),
      esCampo: !['TELCA', 'TELCA2', 'TELCA3', 'TELFA', 'MONITOREO'].includes(codCierre),
      color: 'slate' 
    };

    const esSoporteRemoto = infoCierre.esRemoto || ['TELCA', 'TELCA2', 'TELCA3', 'TELFA', 'MONITOREO'].includes(codCierre);
    const tuvoTecnico = tec && tec !== '-' && tec !== '0' && tec.toLowerCase() !== 'sin asignar';
    const esVisitaCampo = tuvoTecnico && !esSoporteRemoto;

    if (!suspendidosHistoryMap.has(luno)) {
      suspendidosHistoryMap.set(luno, []);
    }

    suspendidosHistoryMap.get(luno).push({
      pedido: cleanPed,
      fecha,
      concepto: cpto || 'SERVICE CALL',
      codCierre,
      cierreInfo: infoCierre,
      tecnico: tec || 'Mesa Soporte Remoto',
      tuvoTecnico,
      esSoporteRemoto,
      esVisitaCampo,
      categoria: esSoporteRemoto ? 'Soporte Remoto' : 'Visita de Campo',
      observaciones: obs,
      zona
    });
  });
}

loadSuspendidosFile(path.resolve(__dirname, '../Reportes/Reporte Suspendidos Patagonia.xls'), 'Patagonia');
loadSuspendidosFile(path.resolve(__dirname, '../Reportes/Reporte Suspendidos Suroeste.xls'), 'Suroeste');
console.log(`✅ Suspendidos: ${suspendidosHistoryMap.size} Equipos con historial de intervenciones cargado (${cleanPedToLunoMap.size} pedidos mapeados a luno)`);

// 6. Map MP Pendientes per Luno
const mpPendingByLuno = new Map(); // luno -> { pedido, detalleFalla, tecAsignado, esSinAsignar }
function loadMpPending(filePath, zona) {
  if (!fs.existsSync(filePath)) return [];
  const wb = XLSX.readFile(filePath);
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  return data.map(r => {
    const luno = String(r['Luno'] || r['LUNO'] || r['ATM'] || '').trim();
    const ped = String(r['Pedido'] || r['PEDIDO'] || '').trim();
    const tecAsig = String(r['Tec Asignado'] || r['TECNICO'] || 'SIN ASIGNAR').trim();
    const esSinAsignar = !tecAsig || tecAsig.toUpperCase() === 'SIN ASIGNAR' || tecAsig === '-';
    const detalle = String(r['Detalle Falla'] || r['Desc Problema'] || 'Mantenimiento Preventivo').trim();

    if (luno) {
      mpPendingByLuno.set(luno, {
        pedido: ped,
        detalleFalla: detalle,
        tecAsignado: tecAsig,
        esSinAsignar
      });
    }

    return {
      pedido: ped,
      cliente: r['Cliente'] || r['CLIENTE'] || 'Cliente',
      luno,
      direccion: r['Direccion'] || r['DIRECCION'] || '',
      localidad: r['Localidad'] || r['LOCALIDAD'] || zona,
      tecnico: tecAsig,
      modelo: r['Modelo'] || r['MODELO'] || 'ATM/CTD',
      zona,
      negocio: r['TipoSeg'] || 'ATM',
      fabricante: r['Fabricante'] || 'Fabricante',
      detalleFalla: detalle,
      esSinAsignar
    };
  }).filter(p => p.pedido);
}

const mpPat = loadMpPending(path.resolve(__dirname, '../Reportes/MP Pendientes Patagonia.xls'), 'Patagonia');
const mpSur = loadMpPending(path.resolve(__dirname, '../Reportes/MP Pendientes Suroeste.xls'), 'Suroeste');
const mpBar = loadMpPending(path.resolve(__dirname, '../Reportes/MP Pendientes Bariloche.xls'), 'Bariloche');
const allMpPending = [...mpPat, ...mpSur, ...mpBar];
console.log(`✅ MP Pendientes: ${allMpPending.length} preventivos pendientes (${mpPendingByLuno.size} equipos identificados)`);

// 7. Map Adicionales per Luno
const adicionalesByLuno = new Map(); // luno -> { pedido, detalleFalla, concepto, tec }
const fileAdicionales = path.resolve(__dirname, '../Reportes/Agenda Diaria/Adicionales.xls');
if (fs.existsSync(fileAdicionales)) {
  const adWb = XLSX.readFile(fileAdicionales);
  const adData = XLSX.utils.sheet_to_json(adWb.Sheets[adWb.SheetNames[0]]);
  adData.forEach(r => {
    const luno = String(r['Luno'] || r['LUNO'] || '').trim();
    if (!luno) return;
    adicionalesByLuno.set(luno, {
      pedido: String(r['Pedido'] || r['PEDIDO'] || ''),
      detalleFalla: String(r['Detalle Falla'] || r['Desc Problema'] || 'AIEC Adicional').trim(),
      concepto: String(r['Cpto Llamada'] || 'AIEC').trim(),
      tecnico: String(r['Tec Zona'] || r['Tecnico'] || '').trim()
    });
  });
  console.log(`✅ Adicionales mapeados: ${adicionalesByLuno.size} equipos con AIEC Adicional`);
}

// 8. Merge Agenda Diaria Files with Precise Regional Filter for Asignados
const allowedSuroesteZones = ['IN BAR', 'IN CIP', 'IN NQN', 'Suroeste', 'Bariloche', 'Cipolletti', 'Neuquen', 'Neuquén'];
const ambaRegions = ['CABA', 'ZONA NORTE', 'ZONA SUR', 'ZONA OESTE', 'C2D', 'AMBA'];
const litoralRegions = ['LITORAL-NORTE', 'LITORAL'];
const patagoniaRegions = ['PATAGONIA', 'SUROESTE'];

function formatTimeStr(val) {
  if (val === null || val === undefined || val === '') return '09:00';
  if (typeof val === 'number') {
    const totalSeconds = Math.round(val * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
  }
  const s = String(val).trim();
  const parts = s.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return s;
}

function parseDateFormatted(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    try {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return '';
    }
  }
  const s = String(val).trim();
  if (s.includes('/')) {
    const parts = s.split(' ')[0].split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${d}/${m}/${y}`;
    }
  }
  return s;
}

function toIsoDate(val) {
  if (!val && val !== 0) return '';
  const num = typeof val === 'number' ? val : (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val.trim()) ? Number(val.trim()) : NaN);
  if (!isNaN(num) && num > 30000 && num < 70000) {
    const utcDays = num - 25569;
    const utcMs = utcDays * 86400 * 1000;
    const d = new Date(utcMs);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${year}-${month}-${day}`;
  }
  const str = String(val).trim();
  if (str.includes('/')) {
    const p = str.split(' ')[0].split('/');
    if (p.length === 3) {
      const d = p[0].padStart(2, '0');
      const m = p[1].padStart(2, '0');
      const y = p[2].length === 2 ? `20${p[2]}` : p[2];
      return `${y}-${m}-${d}`;
    }
  }
  if (str.includes('-')) {
    return str.split('T')[0];
  }
  return '';
}

// Load MP Cerrados (Patagonia & Suroeste) with T Asis & Quality Evaluation
let mpCerradosMap = {};

function loadMpCerrados(filePath) {
  if (!fs.existsSync(filePath)) return;
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  
  raw.forEach(r => {
    const luno = String(r['Luno'] || r['LUNO'] || r['ATM'] || '').trim();
    if (!luno || luno.length < 3) return;

    const ped = String(r['Pedido'] || r['PEDIDO'] || '').split('-')[0].trim();
    if (ped) cleanPedToLunoMap.set(ped, luno);

    const fFinRaw = r['F Fin'] || r['Fecha'] || r['MARCA FIN'] || r['F Alta'];
    const fechaFormatted = parseDateFormatted(fFinRaw);
    const fechaIso = toIsoDate(fFinRaw);
    const tecMp = String(r['Tec Asignado'] || r['Tec Zona'] || r['TECNICO'] || '').trim();
    const obsMp = String(r['Obs Control'] || r['OBSERVACIONESCONTROL'] || r['DETALLEFALLA'] || '').trim();

    // Parse T Asis
    const rawTAsis = r['T Asis'];
    let minutosAsis = 0;
    let displayTAsis = 'No registrado';
    if (typeof rawTAsis === 'number') {
      minutosAsis = Math.round(rawTAsis * 24 * 60);
      const h = Math.floor(minutosAsis / 60);
      const m = minutosAsis % 60;
      displayTAsis = h > 0 ? `${h}h ${m}m` : `${m}m`;
    } else if (rawTAsis) {
      const parts = String(rawTAsis).trim().split(':');
      if (parts.length >= 2) {
        minutosAsis = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
        const h = Math.floor(minutosAsis / 60);
        const m = minutosAsis % 60;
        displayTAsis = h > 0 ? `${h}h ${m}m` : `${m}m`;
      }
    }

    // Quality Alert logic:
    // ATM: average 60m, alert < 45m
    // Cash Today: min 30m, alert < 30m
    // Glory/CIMA: min 60m, alert < 60m
    const modeloMp = String(r['Modelo'] || '').toUpperCase();
    let tieneAlertaMp = false;
    let mensajeAlertaMp = '';
    let umbralMinutos = 45;
    let tipoEquipo = 'ATM';

    if (modeloMp.includes('GLORY') || modeloMp.includes('CIMA')) {
      umbralMinutos = 60;
      tipoEquipo = 'GLORY_CIMA';
      if (minutosAsis > 0 && minutosAsis < 60) {
        tieneAlertaMp = true;
        mensajeAlertaMp = `⚠️ Tiempo MP insuficiente en Glory/CIMA (${minutosAsis} min vs mínimo requerido 60 min)`;
      }
    } else if (
      modeloMp.includes('CTI') || 
      modeloMp.includes('CTE') || 
      modeloMp.includes('KISAN') || 
      modeloMp.includes('TAS') || 
      modeloMp.includes('TDE') || 
      modeloMp.includes('CASH') || 
      modeloMp.includes('SNBC')
    ) {
      umbralMinutos = 30;
      tipoEquipo = 'CASH_TODAY';
      if (minutosAsis > 0 && minutosAsis < 30) {
        tieneAlertaMp = true;
        mensajeAlertaMp = `⚠️ Tiempo MP insuficiente en Cash Today (${minutosAsis} min vs mínimo requerido 30 min)`;
      }
    } else {
      umbralMinutos = 45;
      tipoEquipo = 'ATM';
      if (minutosAsis > 0 && minutosAsis < 45) {
        tieneAlertaMp = true;
        mensajeAlertaMp = `⚠️ Tiempo MP insuficiente en ATM (${minutosAsis} min vs media de 45-60 min)`;
      }
    }

    mpCerradosMap[luno] = {
      ultimoMpFecha: fechaFormatted,
      rawDateIso: fechaIso,
      tecMp,
      obsMp,
      tiempoAsistencia: displayTAsis,
      tiempoAsistenciaMinutos: minutosAsis,
      alertaTiempoMp: tieneAlertaMp ? {
        tieneAlerta: true,
        mensaje: mensajeAlertaMp,
        minutos: minutosAsis,
        umbral: umbralMinutos,
        tipoEquipo
      } : null
    };
  });
}

loadMpCerrados(path.resolve(__dirname, '../Reportes/MP Cerrados Patagonia.xls'));
loadMpCerrados(path.resolve(__dirname, '../Reportes/MP Cerrados Suroeste.xls'));
fs.writeFileSync(path.join(outDir, 'mpCerradosMap.json'), JSON.stringify(mpCerradosMap, null, 2));
console.log(`✅ MP Cerrados procesados: ${Object.keys(mpCerradosMap).length} equipos auditados con T Asis`);

// Build lunoToRepuestosMap from buzonList
const lunoToRepuestosMap = new Map();
buzonList.forEach(item => {
  const luno = cleanPedToLunoMap.get(item.cleanPed);
  if (!luno) return;
  if (!lunoToRepuestosMap.has(luno)) lunoToRepuestosMap.set(luno, []);
  lunoToRepuestosMap.get(luno).push({
    pedido: item.cleanPed,
    fecha: item.fecha,
    hora: item.hora,
    tecnico: item.tecnico,
    instalaBase: item.instalaBase,
    instalaDesc: item.instalaDesc || masterLpMap.get(item.instalaBase) || item.instalaBase,
    instalaQr: item.instalaQr,
    retiraBase: item.retiraBase,
    retiraDesc: item.retiraDesc || masterLpMap.get(item.retiraBase) || item.retiraBase,
    retiraQr: item.retiraQr,
    esStockFijo: item.esStockFijo,
    origenStock: item.origenStock,
    obs: item.obs
  });
});

for (const [luno, parts] of lunoToRepuestosMap.entries()) {
  parts.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
}
const lunoToRepDict = {};
for (const [luno, parts] of lunoToRepuestosMap.entries()) {
  lunoToRepDict[luno] = parts;
}
fs.writeFileSync(path.join(outDir, 'lunoToRepuestosMap.json'), JSON.stringify(lunoToRepDict, null, 2));
console.log(`✅ Repuestos Reemplazados por Equipo: ${lunoToRepuestosMap.size} equipos con historial de partes`);

// Helper to extract real client, branch, and real address from RELEVAMIENTOS CASH TODAY observations
function extractRelevamientoClient(detalle) {
  if (!detalle) return null;
  const lines = String(detalle).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  // Template pattern with 'Contacto del cliente' separator
  const contactIdx = lines.findIndex(l => /Contacto (del )?cliente/i.test(l));
  if (contactIdx !== -1 && contactIdx + 1 < lines.length) {
    const dataLines = lines.slice(contactIdx + 1);
    if (dataLines[0] && !dataLines[0].startsWith('¿') && !dataLines[0].startsWith('-')) {
      return {
        clienteReal: dataLines[0],
        obra: dataLines[1] || '',
        sucursal: dataLines[2] || '',
        direccionReal: dataLines[3] || '',
        localidadReal: dataLines[4] || ''
      };
    }
  }

  // Non-template format: check line right after "relevamiento"
  const idxNombre = lines.findIndex(l => /relevamiento/i.test(l));
  if (idxNombre !== -1 && lines[idxNombre + 1]) {
    const nextLine = lines[idxNombre + 1];
    if (nextLine && !nextLine.startsWith('¿') && !/^(A entregar|A mover|Nombre|El técnico)/i.test(nextLine)) {
      return {
        clienteReal: nextLine,
        obra: lines[idxNombre + 2] || '',
        sucursal: lines[idxNombre + 3] || '',
        direccionReal: lines[idxNombre + 4] || '',
        localidadReal: lines[idxNombre + 5] || ''
      };
    }
  }

  // Search for company indicators (S.A., S.R.L., etc.)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(S\.?A\.?|S\.?R\.?L\.?|S\.?A\.?S\.?|INC|SOCIEDAD|ASOCIADOS|ARGENTINA)/i.test(line) && 
        !line.includes('¿') && !/Nombre Cliente/i.test(line) && !/relevamiento/i.test(line) && !/El técnico/i.test(line)) {
      return { 
        clienteReal: line, 
        sucursal: lines[i + 2] || lines[i + 1] || '' 
      };
    }
  }
  
  return null;
}

function parseAgendaSheet(filePath, tipoOrigen, defaultZona) {
  if (!fs.existsSync(filePath)) return [];
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  
  // Filter visible rows if sheet has Excel autofilter / hidden rows
  const visibleRaw = [];
  for (let i = 0; i < raw.length; i++) {
    const rowMeta = ws['!rows'] && ws['!rows'][i + 1];
    const isHidden = rowMeta && (rowMeta.hidden === true || rowMeta.hidden === 1);
    if (!isHidden) {
      visibleRaw.push(raw[i]);
    }
  }

  return visibleRaw.map(r => {
    const ped = String(r['Pedido'] || r['PEDIDO'] || '').trim();
    if (!ped) return null;

    const luno = String(r['Luno'] || r['LUNO'] || r['ATM'] || '').trim();
    const cliente = String(r['Cliente'] || r['CLIENTE'] || 'Cliente').trim();
    const tecAsignado = String(r['Tec Asignado'] || r['Tecnico'] || r['TECNICO'] || r['Tec Zona'] || 'Sin Asignar').trim();
    const tecZona = String(r['Tec Zona'] || tecAsignado).trim();
    const loc = String(r['Localidad'] || r['LOCALIDAD'] || 'Patagonia').trim();
    const dir = String(r['Direccion'] || r['DIRECCION'] || '').trim();
    const rawZona = String(r['Zona'] || r['Zona Local'] || defaultZona || 'Patagonia').trim();
    const regTec = String(r['Region Tec'] || defaultZona || '').trim().toUpperCase();
    const lidReg = String(r['Lider Region'] || '').trim();
    const detalleFalla = String(r['Detalle Falla'] || r['Desc Problema'] || r['Problema'] || '-').trim();
    
    // Column H ("M"): Móvil notificado / coordinado
    const mValue = String(r['M'] || '').trim().toUpperCase();
    const notificadoMovil = mValue === 'S';

    // Dates and Times
    const fCoorDate = parseDateFormatted(r['F Coor']);
    const hCoor = formatTimeStr(r['H Coor'] || r['Hora Coor']);
    const fechaCoordinadaDisplay = `${fCoorDate} ${hCoor}`.trim();

    // Check Region & Zone attribution
    let regionFinal = defaultZona;
    let zonaTecnica = rawZona;
    let zonaLocal = '';

    const tecMaster = tecToZonaMap.get(tecAsignado.toLowerCase()) || tecToZonaMap.get(tecZona.toLowerCase());
    if (tecMaster) {
      regionFinal = tecMaster.region;
      zonaTecnica = tecMaster.zonaTecnica || rawZona;
      zonaLocal = tecMaster.zonaLocal;
    } else {
      if (patagoniaRegions.includes(regTec)) {
        regionFinal = regTec;
      } else if (regTec === 'SUROESTE' || allowedSuroesteZones.some(z => rawZona.toLowerCase().includes(z.toLowerCase()) || loc.toLowerCase().includes(z.toLowerCase()))) {
        regionFinal = 'SUROESTE';
      } else if (defaultZona === 'Patagonia' || defaultZona === 'Suroeste') {
        regionFinal = defaultZona.toUpperCase();
      } else {
        regionFinal = 'OTRA';
      }
    }

    // NOTE: Using patagoniaRegions and allowedSuroesteZones from outer scope (lines 385-388)

    // STRICT REGIONAL FILTER: Discard any ticket outside Patagonia & Suroeste
    if (regionFinal !== 'PATAGONIA' && regionFinal !== 'SUROESTE') {
      return null;
    }

    // Filter Asignados: Only keep Mis Técnicos in Patagonia with M === 'S' (informados al móvil: 31 pedidos exactos)
    if (tipoOrigen === 'Asignados') {
      const isM_S = mValue === 'S';
      const isMyPatTec = regTec === 'PATAGONIA' || lidReg === 'Hernandez, Marcos Alberto' || misTecnicosNombres.has(tecAsignado.toLowerCase());
      if (!isM_S || !isMyPatTec) {
        return null;
      }
    }

    // Filter Suroeste Pendientes: Strictly keep the 3 supervisor zones (IN BAR, IN CIP, IN NQN: 10 pedidos exactos)
    if (tipoOrigen === 'Suroeste' || defaultZona === 'Suroeste') {
      const isAllowedZone = allowedSuroesteZones.includes(rawZona) || 
                            allowedSuroesteZones.some(z => rawZona.toUpperCase().includes(z) || loc.toUpperCase().includes(z));
      if (!isAllowedZone) return null;
    }

    let slaVal = 0;
    const rawSla = r['% SLA'] || r['SLA'];
    if (typeof rawSla === 'number') slaVal = rawSla <= 1 ? Math.round(rawSla * 100) : Math.round(rawSla);
    else if (typeof rawSla === 'string') slaVal = parseFloat(rawSla.replace('%', '')) || 0;

    // Cross-reference with Buzón de Movimientos
    const cleanPed = ped.split('-')[0];
    const stockMovs = buzonMap.get(cleanPed) || buzonMap.get(ped) || [];

    // Cross-reference with Suspendidos History (SORTED MOST RECENT FIRST)
    const historialTotal = (suspendidosHistoryMap.get(luno) || []).slice().sort((a, b) => {
      const dateA = new Date(a.fecha).getTime() || 0;
      const dateB = new Date(b.fecha).getTime() || 0;
      return dateB - dateA;
    });

    const visitasCampo = historialTotal.filter(h => h.esVisitaCampo);
    const soporteRemoto = historialTotal.filter(h => h.esSoporteRemoto);

    // Cross-reference with MP Pendientes
    const mpInfo = mpPendingByLuno.get(luno) || null;
    const alertaMpSinAsignar = mpInfo ? mpInfo.esSinAsignar : false;

    // Cross-reference with Adicionales
    const adInfo = adicionalesByLuno.get(luno) || null;
    const tieneAdicional = !!adInfo;

    // Cross-reference with MP Cerrados (Detección de MP Deficiente < 30 días)
    const mpCerrado = luno ? mpCerradosMap[luno] : null;
    let ultimoMpFecha = null;
    let diasDesdeUltimoMp = null;
    let esMpDeficiente = false;
    let tecnicoUltimoMp = null;
    let obsUltimoMp = null;

    if (mpCerrado) {
      ultimoMpFecha = mpCerrado.ultimoMpFecha || null;
      tecnicoUltimoMp = mpCerrado.tecMp || null;
      obsUltimoMp = mpCerrado.obsMp || null;
      if (mpCerrado.rawDateIso) {
        const mpDate = new Date(mpCerrado.rawDateIso);
        // Compare with dynamic reference date (current processing date)
        const diffDays = Math.round((REF_TIME - mpDate.getTime()) / (1000 * 60 * 60 * 24));
        diasDesdeUltimoMp = diffDays >= 0 ? diffDays : null;
        esMpDeficiente = diffDays >= 0 && diffDays <= 30;
      }
    }

    // Días desde última atención
    let diasDesdeUltimaAtencion = String(r['Días desde última atención'] || '').trim();
    if (!diasDesdeUltimaAtencion || diasDesdeUltimaAtencion === '-') {
      if (visitasCampo.length > 0 && visitasCampo[0].fecha) {
        const dIso = toIsoDate(visitasCampo[0].fecha);
        if (dIso) {
          const days = Math.round((REF_TIME - new Date(dIso).getTime()) / (1000 * 60 * 60 * 24));
          diasDesdeUltimaAtencion = days <= 1 ? '1 día' : (days < 30 ? `${days} días` : `${Math.round(days / 30)} mes(es)`);
        } else {
          diasDesdeUltimaAtencion = '1 día';
        }
      } else {
        diasDesdeUltimaAtencion = '1 día';
      }
    }

    // Reincidencias Counter
    const rRaw = parseInt(r['R'] || '0', 10) || 0;
    const reincidenciaCount = rRaw > 0 ? rRaw : (visitasCampo.length > 0 ? visitasCampo.length : 0);

    // Concepto & Flujo
    const conceptoLlamada = tipoOrigen === 'Adicionales' ? 'AIEC' : (r['Cpto Llamada'] || 'SERVICE CALL');
    const isSinAsignar = !tecAsignado || tecAsignado.toLowerCase() === 'sin asignar' || tecAsignado.toLowerCase().includes('sin asignar');
    const esScVigente = conceptoLlamada !== 'AIEC' && tipoOrigen !== 'Adicionales';
    let origenFlujo = 'SC_PENDIENTE';
    if (tipoOrigen === 'Adicionales') {
      origenFlujo = 'ADICIONAL';
    } else if (mpInfo) {
      origenFlujo = 'MP_PENDIENTE';
    } else if (tipoOrigen === 'Asignados') {
      origenFlujo = 'ASIGNADO_COT';
    } else {
      origenFlujo = 'SC_PENDIENTE';
    }

    let clienteReal = null;
    let sucursalRelevamiento = null;
    if (/relevamiento/i.test(cliente) || /cash today/i.test(cliente) || /relevamiento/i.test(detalleFalla)) {
      const parsedRelev = extractRelevamientoClient(detalleFalla);
      if (parsedRelev) {
        clienteReal = parsedRelev.clienteReal;
        sucursalRelevamiento = parsedRelev.sucursal;
      }
    }

    // Check if this coordinated order was previously suspended on this equipment
    const suspMatch = historialTotal.find(h => h.pedido === cleanPed);
    const esPedidoSuspendidoPrevio = !!suspMatch;
    const suspensionPrevia = suspMatch ? {
      pedido: suspMatch.pedido,
      fecha: suspMatch.fecha,
      codigoCierre: suspMatch.codCierre,
      descCierre: suspMatch.cierreInfo?.desc || suspMatch.codCierre,
      observaciones: suspMatch.observaciones,
      tecnico: suspMatch.tecnico
    } : null;

    // True SLA remaining hours calculation without forcing 1h on expired tickets
    let realHsSla = 0;
    const vtoDate = parseExcelDateTime(r['Fecha Vto']);
    const refTime = REF_TIME;
    if (vtoDate) {
      realHsSla = Math.round((vtoDate.getTime() - refTime) / (1000 * 60 * 60));
    } else {
      realHsSla = slaVal >= 100 ? 0 : Math.round((100 - slaVal) / 12);
    }
    if (slaVal >= 100 && realHsSla > 0) realHsSla = 0;

    return {
      id: ped,
      pedido: cleanPed,
      pedidoFull: ped,
      cliente,
      clienteReal,
      sucursalRelevamiento,
      luno,
      equipo: luno,
      tecnico: tecAsignado,
      tecnicoZona: tecZona,
      estado: tipoOrigen === 'Adicionales' ? 'AIEC Abierto' : (r['Estado'] || 'SEG Registrado'),
      slaPorcentaje: slaVal,
      hsSla: realHsSla,
      fechaVencimiento: r['Fecha Vto'] || 'Hasta 07/09/2026 18:00:00',
      fechaCoordinada: fechaCoordinadaDisplay,
      fCoorDate,
      hCoor,
      diasUltimaAtencion: diasDesdeUltimaAtencion,
      diasDesdeUltimaAtencion,
      reincidenciaCount,
      ultimoMpFecha,
      diasDesdeUltimoMp,
      esMpDeficiente,
      tecnicoUltimoMp,
      obsUltimoMp,
      tiempoAsistenciaMp: mpCerrado?.tiempoAsistencia || null,
      tiempoAsistenciaMinutosMp: mpCerrado?.tiempoAsistenciaMinutos || null,
      alertaTiempoMp: mpCerrado?.alertaTiempoMp || null,
      repuestosHistoricos: lunoToRepuestosMap.get(luno) || [],
      esPedidoSuspendidoPrevio,
      suspensionPrevia,
      origenFlujo,
      esScVigente,
      alertaSinAsignar: isSinAsignar,
      controlInicio: r['Ctrl Inicio'] || 'Normal',
      stock: String(r['Stock'] || '0'),
      repuestos: r['Repuestos'] || '-',
      concepto: conceptoLlamada,
      detalleFalla,
      zona: rawZona,
      zonaTecnica,
      zonaLocal,
      region: regionFinal,
      localidad: loc,
      direccion: dir,
      modelo: r['Modelo'] || 'ATM/CTD',
      esAdicional: tipoOrigen === 'Adicionales' || tieneAdicional,
      esAsignadoCOT: tipoOrigen === 'Asignados',
      notificadoMovil,
      m: mValue,
      origenReporte: tipoOrigen,
      
      // CALLOUTS / LLAMADAS
      alertaMpPendiente: !!mpInfo,
      alertaMpSinAsignar,
      mpPendienteDetalle: mpInfo ? { pedido: mpInfo.pedido, detalleFalla: mpInfo.detalleFalla, tecAsignado: mpInfo.tecAsignado } : null,
      alertaAdicionalPendiente: tieneAdicional,
      adicionalDetalle: adInfo ? { pedido: adInfo.pedido, detalleFalla: adInfo.detalleFalla, concepto: adInfo.concepto } : null,

      movimientosStock: stockMovs,
      cantidadVisitasHistoricas: visitasCampo.length,
      cantidadSoporteRemoto: soporteRemoto.length,
      historialPrevioLuno: historialTotal.slice(0, 10)
    };
  }).filter(Boolean);
}

const agendaAsignados = parseAgendaSheet(path.resolve(__dirname, '../Reportes/Agenda Diaria/Asignados.xls'), 'Asignados', 'Patagonia');
const agendaPatagonia = parseAgendaSheet(path.resolve(__dirname, '../Reportes/Agenda Diaria/Pendientes Patagonia.xls'), 'Patagonia', 'Patagonia');
const agendaSuroeste = parseAgendaSheet(path.resolve(__dirname, '../Reportes/Agenda Diaria/Pendientes Suroeste.xls'), 'Suroeste', 'Suroeste');
const agendaAdicionales = parseAgendaSheet(path.resolve(__dirname, '../Reportes/Agenda Diaria/Adicionales.xls'), 'Adicionales', 'Patagonia');

// Lookup map from all Asignados.xls to cross-match whether the 18 pending orders were assigned in COT
const asigLookupMap = new Map();
if (fs.existsSync(path.resolve(__dirname, '../Reportes/Agenda Diaria/Asignados.xls'))) {
  const wbAllAsig = XLSX.readFile(path.resolve(__dirname, '../Reportes/Agenda Diaria/Asignados.xls'));
  const rawAllAsig = XLSX.utils.sheet_to_json(wbAllAsig.Sheets[wbAllAsig.SheetNames[0]], { defval: '' });
  rawAllAsig.forEach(r => {
    const p = String(r['Pedido'] || r['PEDIDO'] || '').split('-')[0].trim();
    if (p) asigLookupMap.set(p, r);
  });
}

// 1. Asignados a técnicos con móvil (M='S'): exactamente 31 pedidos
const agendaAsignadosUnicos = agendaAsignados.map(t => ({
  ...t,
  id: `asig_${t.pedido}`,
  esAsignadoCOT: true,
  notificadoMovil: true
}));

// 2. Pendientes Patagonia (8) y Suroeste (10): exactamente 18 pedidos
const agendaPendientesUnicos = [...agendaPatagonia, ...agendaSuroeste].map(t => {
  const match = asigLookupMap.get(t.pedido);
  const esAsignado = !!match;
  const tecCot = match ? String(match['Tec Asignado'] || match['Tecnico'] || '').trim() : 'SIN ASIGNAR';
  const mCot = match ? String(match['M'] || '').trim().toUpperCase() : 'N';
  const estadoCot = match ? String(match['Estado'] || '').trim() : t.estado;
  const cierreCot = match ? String(match['Cierre'] || '').trim() : '';

  return {
    ...t,
    id: `pend_${t.pedido}`,
    esPendiente: true,
    esAsignadoEnCot: esAsignado,
    tecAsignadoCot: tecCot,
    mCot: mCot,
    estadoCot: estadoCot,
    cierreCot: cierreCot,
    alertaSinAsignar: !esAsignado
  };
});

// TOTAL EN AGENDA = 31 ASIGNADOS + 18 PENDIENTES = 49 PEDIDOS
const unifiedAgenda = [...agendaAsignadosUnicos, ...agendaPendientesUnicos];

fs.writeFileSync(path.join(outDir, 'agendaData.json'), JSON.stringify(unifiedAgenda, null, 2));
const asignadosCotEnPendientes = agendaPendientesUnicos.filter(p => p.esAsignadoEnCot).length;
const sinAsignarEnPendientes = agendaPendientesUnicos.filter(p => !p.esAsignadoEnCot).length;
console.log(`✅ Agenda Diaria Unificada: ${unifiedAgenda.length} pedidos totales (31 Asignados Móvil + 18 Pendientes: ${asignadosCotEnPendientes} asignados en COT / ${sinAsignarEnPendientes} sin asignar)`);

// 9. Generate Control de Inicio de Jornada Data (Primer Pedido del Día / Marcaje)
let excelCI = [];
const fileAgendaMaster = path.resolve(__dirname, '../Agenda Diaria.xlsx');
if (fs.existsSync(fileAgendaMaster)) {
  const wbAgenda = XLSX.readFile(fileAgendaMaster);
  if (wbAgenda.Sheets['Control Inicio']) {
    excelCI = XLSX.utils.sheet_to_json(wbAgenda.Sheets['Control Inicio'], { defval: '' });
  }
}

const controlInicioList = zonasListRef.map(tec => {
  const tecNorm = tec.nombre.toLowerCase().trim();
  const matches = excelCI.filter(r => {
    const t = String(r['TECNICO'] || r['Técnico'] || '').toLowerCase().trim();
    return t === tecNorm || t.includes(tecNorm) || tecNorm.includes(t);
  });

  const validRows = matches.filter(m => m.Cliente && m.Luno);
  validRows.sort((a, b) => {
    const hA = typeof a['Hora Coordinada'] === 'number' ? a['Hora Coordinada'] : 0.5;
    const hB = typeof b['Hora Coordinada'] === 'number' ? b['Hora Coordinada'] : 0.5;
    return hA - hB;
  });

  const first = validRows.length > 0 ? validRows[0] : null;
  const estadoStr = first ? String(first['Estado'] || '').trim() : (matches.length > 0 ? String(matches[0]['Estado'] || '') : 'Sin pedidos asignados');
  const esAsistencia = estadoStr === 'SEG Asistencia' || estadoStr === 'SEG Control Final' || estadoStr === 'SEG Fin Asistencia';

  let primerClienteReal = undefined;
  let primerSucursalRelev = undefined;
  if (first) {
    const rawCli = String(first['Cliente'] || '').trim();
    const rawObs = String(first['Observaciones'] || first['Detalle de falla'] || first['Detalle Falla'] || '');
    if (/relevamiento/i.test(rawCli) || /cash today/i.test(rawCli) || /relevamiento/i.test(rawObs)) {
      const parsedRelev = extractRelevamientoClient(rawObs);
      if (parsedRelev) {
        primerClienteReal = parsedRelev.clienteReal;
        primerSucursalRelev = parsedRelev.sucursal;
      }
    }
  }

  return {
    tecnico: tec.nombre,
    zonaLocal: tec.zonaLocal,
    zonaTecnica: tec.zonaTecnica,
    region: tec.region,
    tienePedidos: !!first,
    primerPedido: first ? {
      pedido: String(first['Pedido'] || '').trim(),
      concepto: String(first['Concepto'] || first['Cpto Llamada'] || 'SC').trim(),
      cliente: String(first['Cliente'] || '').trim(),
      clienteReal: primerClienteReal,
      sucursalRelevamiento: primerSucursalRelev,
      luno: String(first['Luno'] || '').trim(),
      direccion: String(first['Direccion'] || '').trim(),
      localidad: String(first['Localidad'] || '').trim(),
      horaCoordinada: formatTimeStr(first['Hora Coordinada']),
      fechaVto: String(first['Fecha Vto'] || '').trim(),
      estado: estadoStr,
      cumplePrimerHorario: esAsistencia
    } : null,
    estadoMarcaje: !first ? 'SIN_PEDIDOS' : (esAsistencia ? 'ASISTENCIA_OK' : 'PENDIENTE_INICIO')
  };
});

fs.writeFileSync(path.join(outDir, 'controlInicioData.json'), JSON.stringify(controlInicioList, null, 2));
console.log(`✅ Control de Inicio de Jornada: ${controlInicioList.length} técnicos procesados (Asistencia OK: ${controlInicioList.filter(c => c.estadoMarcaje === 'ASISTENCIA_OK').length})`);

// Update preventivosData.json with MP Pendientes
const currentPreventivos = JSON.parse(fs.readFileSync(path.join(outDir, 'preventivosData.json'), 'utf8'));
currentPreventivos.totalPendientes = allMpPending.length;
currentPreventivos.pendientesDetalle = allMpPending;
fs.writeFileSync(path.join(outDir, 'preventivosData.json'), JSON.stringify(currentPreventivos, null, 2));

console.log('🎉 Full Master Cross-Referencing Finished Successfully!');

