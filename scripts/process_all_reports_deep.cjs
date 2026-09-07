const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../src/data');

console.log('🚀 Processing all Flow Pro reports with full Source of Truth rules & cross-referencing...');

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

// Helper to parse dates into ISO / standard format
function parseDateAny(val) {
  if (!val) return '2026-02-28';
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

    const item = {
      pedido: rawPed,
      cleanPed,
      fecha: fechaVal,
      hora: r['HORA'] || '',
      idInstala: rawInst,
      idRetira: rawRet,
      instalaBase: instParsed.pnBase,
      instalaQr: instParsed.qr,
      retiraBase: retParsed.pnBase,
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
fs.writeFileSync(path.join(outDir, 'buzonMovimientosData.json'), JSON.stringify(buzonList.slice(0, 500), null, 2));
console.log(`✅ Buzón Movimientos: ${buzonList.length} transacciones procesadas (${buzonMap.size} pedidos con repuestos asociados)`);

// 5. Read Suspendidos for History per Equipment
const suspendidosHistoryMap = new Map();

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
console.log(`✅ Suspendidos: ${suspendidosHistoryMap.size} Equipos con historial de intervenciones cargado`);

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
  if (!val) return '07/09/2026';
  if (typeof val === 'number') {
    try {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return '07/09/2026';
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

function parseAgendaSheet(filePath, tipoOrigen, defaultZona) {
  if (!fs.existsSync(filePath)) return [];
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  
  return raw.map(r => {
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
      if (ambaRegions.includes(regTec) || rawZona.startsWith('C2D') || rawZona.startsWith('NORTE') || rawZona.startsWith('SUR') || rawZona.startsWith('OESTE') || rawZona.startsWith('CABA')) {
        regionFinal = 'AMBA';
      } else if (litoralRegions.includes(regTec) || rawZona.startsWith('IN2 SFE') || rawZona.startsWith('IN2 ROS') || rawZona.startsWith('IN2 PAR') || rawZona.startsWith('IN2 COR') || rawZona.startsWith('IN2 POS') || rawZona.startsWith('IN2 RES')) {
        regionFinal = 'LITORAL';
      } else if (patagoniaRegions.includes(regTec)) {
        regionFinal = regTec;
      }
    }

    // Filter Asignados: Only keep Mis Técnicos, AMBA, and Litoral
    if (tipoOrigen === 'Asignados') {
      const isMyTec = misTecnicosNombres.has(tecAsignado.toLowerCase()) || misTecnicosNombres.has(tecZona.toLowerCase());
      const isAmba = regionFinal === 'AMBA' || ambaRegions.includes(regTec);
      const isLitoral = regionFinal === 'LITORAL' || litoralRegions.includes(regTec);
      const isPatagonia = regionFinal === 'PATAGONIA' || regionFinal === 'SUROESTE';

      if (!isMyTec && !isAmba && !isLitoral && !isPatagonia) {
        return null; // Discard NOA, Córdoba, Cuyo, etc.
      }
    }

    // Filter Suroeste if necessary
    if (defaultZona === 'Suroeste' || regionFinal === 'SUROESTE') {
      const isAllowed = allowedSuroesteZones.some(z => 
        loc.toLowerCase().includes(z.toLowerCase()) || 
        dir.toLowerCase().includes(z.toLowerCase()) || 
        rawZona.toLowerCase().includes(z.toLowerCase()) ||
        tecAsignado.toLowerCase().includes('lazzaro') ||
        tecAsignado.toLowerCase().includes('ibañez') ||
        tecAsignado.toLowerCase().includes('torres')
      );
      if (!isAllowed) return null;
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

    return {
      id: ped,
      pedido: cleanPed,
      pedidoFull: ped,
      cliente,
      luno,
      equipo: luno,
      tecnico: tecAsignado,
      tecnicoZona: tecZona,
      estado: tipoOrigen === 'Adicionales' ? 'AIEC Abierto' : (r['Estado'] || 'SEG Registrado'),
      slaPorcentaje: slaVal,
      hsSla: Math.max(1, Math.round((100 - slaVal) / 12)),
      fechaVencimiento: r['Fecha Vto'] || 'Hasta 07/09/2026 18:00:00',
      fechaCoordinada: fechaCoordinadaDisplay,
      fCoorDate,
      hCoor,
      diasUltimaAtencion: r['Días desde última atención'] || '1 día',
      controlInicio: r['Ctrl Inicio'] || 'Normal',
      stock: String(r['Stock'] || '0'),
      repuestos: r['Repuestos'] || '-',
      concepto: tipoOrigen === 'Adicionales' ? 'AIEC' : (r['Cpto Llamada'] || 'SERVICE CALL'),
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

const agendaPatagonia = parseAgendaSheet(path.resolve(__dirname, '../Reportes/Agenda Diaria/Pendientes Patagonia.xls'), 'Patagonia', 'Patagonia');
const agendaSuroeste = parseAgendaSheet(path.resolve(__dirname, '../Reportes/Agenda Diaria/Pendientes Suroeste.xls'), 'Suroeste', 'Suroeste');
const agendaAdicionales = parseAgendaSheet(path.resolve(__dirname, '../Reportes/Agenda Diaria/Adicionales.xls'), 'Adicionales', 'Patagonia');
const agendaAsignados = parseAgendaSheet(path.resolve(__dirname, '../Reportes/Agenda Diaria/Asignados.xls'), 'Asignados', 'Patagonia');

// Merge and deduplicate by clean Pedido
const unifiedAgendaMap = new Map();
[...agendaPatagonia, ...agendaSuroeste, ...agendaAdicionales, ...agendaAsignados].forEach(t => {
  if (!unifiedAgendaMap.has(t.pedido)) {
    unifiedAgendaMap.set(t.pedido, t);
  }
});

const unifiedAgenda = Array.from(unifiedAgendaMap.values());
fs.writeFileSync(path.join(outDir, 'agendaData.json'), JSON.stringify(unifiedAgenda, null, 2));
console.log(`✅ Agenda Diaria Unificada: ${unifiedAgenda.length} pedidos combinados con filtros de región (Mis Técnicos + AMBA + Litoral)`);

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

  return {
    tecnico: tec.nombre,
    zonaLocal: tec.zonaLocal,
    zonaTecnica: tec.zonaTecnica,
    region: tec.region,
    tienePedidos: !!first,
    primerPedido: first ? {
      cliente: String(first['Cliente'] || '').trim(),
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

