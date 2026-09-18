const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const outDir = path.resolve(__dirname, '../src/data');

console.log('Calculating strict Reincidencias from Reporte SLA (last 60 days) + MTM date tracking...');

// 1. Gather all MTM (Preventivos) dates per equipo from MP Cerrados
const lastMtmMap = new Map();

function formatExcelDate(val) {
  if (!val && val !== 0) return '';
  const num = typeof val === 'number' ? val : (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val.trim()) ? Number(val.trim()) : NaN);
  if (!isNaN(num) && num > 30000 && num < 70000) {
    const utcDays = num - 25569;
    const utcMs = utcDays * 86400 * 1000;
    const d = new Date(utcMs);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
  const str = String(val).trim();
  if (str.includes('-')) {
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return str;
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

function readMpCerrados(filePath) {
  if (!fs.existsSync(filePath)) return;
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  raw.forEach(r => {
    const equipo = String(r['Luno'] || r['LUNO'] || r['ATM'] || r['ATM ID'] || '').trim();
    if (!equipo || equipo.length < 3) return;
    const fecha = formatExcelDate(r['Fecha'] || r['F Fin'] || r['MARCA FIN'] || '15/02/2026');
    lastMtmMap.set(equipo, fecha);
  });
}

readMpCerrados(path.resolve(__dirname, '../Reportes/MP Cerrados Patagonia.xls'));
readMpCerrados(path.resolve(__dirname, '../Reportes/MP Cerrados Suroeste.xls'));
console.log(`✅ Registrados ${lastMtmMap.size} equipos con historial de MTM preventivo`);

// 2. Read Reporte SLA Patagonia & Suroeste
const allowedSuroesteZones = ['IN BAR', 'IN CIP', 'IN NQN', 'Bariloche', 'Cipolletti', 'Neuquen', 'Neuquén', 'San Carlos De Bariloche'];
const slaFailuresMap = new Map(); // key: equipo -> list of SLA service calls

function readSlaFile(filePath, defaultZona) {
  if (!fs.existsSync(filePath)) return;
  console.log('Processing SLA:', filePath);
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (!raw || raw.length < 7) return;

  const headerRow = raw[5]; // Row 6 is index 5
  const headers = headerRow.map(h => String(h || '').trim());
  const pedIdx = headers.indexOf('Pedido');
  const cliIdx = headers.indexOf('Cliente');
  const atmIdx = headers.indexOf('ATM ID') !== -1 ? headers.indexOf('ATM ID') : headers.indexOf('ATM');
  const modIdx = headers.indexOf('Modelo');
  const locIdx = headers.indexOf('Localidad');
  const dirIdx = headers.indexOf('Direccion');
  const tecIdx = headers.indexOf('Tecnico Asig') !== -1 
    ? headers.indexOf('Tecnico Asig') 
    : (headers.indexOf('Tecnico Zona') !== -1 ? headers.indexOf('Tecnico Zona') : headers.indexOf('Tecnico'));
  const fallaIdx = headers.indexOf('Observaciones') !== -1
    ? headers.indexOf('Observaciones')
    : (headers.indexOf('Falla Encontrada') !== -1 ? headers.indexOf('Falla Encontrada') : headers.indexOf('Falla Informada'));
  const fAltaIdx = headers.indexOf('Fecha Alta') !== -1 ? headers.indexOf('Fecha Alta') : headers.indexOf('F Alta');
  const fFinIdx = headers.indexOf('Fecha Fin') !== -1 ? headers.indexOf('Fecha Fin') : headers.indexOf('F Fin');
  const codCierreIdx = headers.indexOf('Cod Cierre');

  for (let i = 6; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r[atmIdx]) continue;

    const equipo = String(r[atmIdx]).trim();
    if (equipo.length < 3) continue;

    const loc = String(r[locIdx] || defaultZona).trim();
    if (defaultZona === 'Suroeste') {
      const isAllowed = allowedSuroesteZones.some(z => loc.toLowerCase().includes(z.toLowerCase()));
      if (!isAllowed) continue;
    }

    const ped = String(r[pedIdx] || '-').trim();
    const cliente = String(r[cliIdx] || 'Cliente').trim();
    const modelo = String(r[modIdx] || 'ATM/CTD').trim();
    const tec = String((tecIdx !== -1 ? r[tecIdx] : '') || 'Técnico de Zona').trim();
    const dir = String(r[dirIdx] || '').trim();
    const rawVal = r[fFinIdx] || r[fAltaIdx] || '2026-02-28';
    const fecha = formatExcelDate(rawVal);
    const rawDateIso = toIsoDate(rawVal) || '2026-02-28';
    const codCierre = String(codCierreIdx !== -1 && r[codCierreIdx] ? r[codCierreIdx] : 'COMPL').trim().toUpperCase();
    const esRemotoTelca = codCierre.startsWith('TELCA') || codCierre === 'TELFA';
    const esVisitaCampo = !esRemotoTelca;

    if (!slaFailuresMap.has(equipo)) {
      slaFailuresMap.set(equipo, {
        equipo,
        cliente,
        modelo,
        direccion: dir,
        localidad: loc,
        zona: defaultZona,
        fallasSla: [],
        tecnicos: new Set()
      });
    }

    const entry = slaFailuresMap.get(equipo);
    if (tec && tec !== 'Técnico' && tec !== '-' && !esRemotoTelca) {
      entry.tecnicos.add(tec);
    }
    entry.fallasSla.push({
      pedido: ped,
      fecha,
      rawDateIso,
      codCierre,
      esRemotoTelca,
      esVisitaCampo,
      falla: (r[fallaIdx] || 'Falla de Service Call registrada en SLA').slice(0, 180),
      tecnico: tec,
      origen: esRemotoTelca ? 'SOPORTE REMOTO (TELCA2)' : 'SLA SERVICE CALL',
      causa: esRemotoTelca ? 'Atención Remota' : 'Visita a Campo'
    });
  }
}

readSlaFile(path.resolve(__dirname, '../Reportes/Reporte Sla Patagonia.xls'), 'Patagonia');
readSlaFile(path.resolve(__dirname, '../Reportes/Reporte Sla Suroeste.xls'), 'Suroeste');

// Sort failures for each equipment by rawDateIso descending
for (const item of slaFailuresMap.values()) {
  item.fallasSla.sort((a, b) => (b.rawDateIso || '').localeCompare(a.rawDateIso || ''));
}

// Default 60-day window: 2026-07-08 to 2026-09-07
const defaultMin60dIso = '2026-07-08';
const defaultMax60dIso = '2026-09-07';

// Load lunoToRepuestosMap, mpCerradosMap, zonasReferencia, baseInstalada, and agenda
let lunoToRepMap = {};
try {
  const ltrPath = path.join(outDir, 'lunoToRepuestosMap.json');
  if (fs.existsSync(ltrPath)) lunoToRepMap = JSON.parse(fs.readFileSync(ltrPath, 'utf8'));
} catch (e) {}

let mpCerradosMap = {};
try {
  const mpcPath = path.join(outDir, 'mpCerradosMap.json');
  if (fs.existsSync(mpcPath)) mpCerradosMap = JSON.parse(fs.readFileSync(mpcPath, 'utf8'));
} catch (e) {}

// Build Local Zone lookup maps
const tecToLocalMap = new Map();
try {
  const zRef = JSON.parse(fs.readFileSync(path.join(outDir, 'zonasTecnicosReferencia.json'), 'utf8'));
  zRef.forEach(z => {
    if (z.nombre && z.zonaLocal) {
      tecToLocalMap.set(z.nombre.toLowerCase().trim(), z.zonaLocal);
    }
  });
} catch (e) {}

const locToLocalMap = new Map();
const atmToLocalMap = new Map();

try {
  const agenda = JSON.parse(fs.readFileSync(path.join(outDir, 'agendaData.json'), 'utf8'));
  agenda.forEach(a => {
    if (a.localidad && a.zonaLocal) {
      locToLocalMap.set(a.localidad.toLowerCase().trim(), a.zonaLocal);
    }
  });
} catch (e) {}

try {
  const baseClientes = JSON.parse(fs.readFileSync(path.join(outDir, 'baseInstaladaClientesData.json'), 'utf8'));
  baseClientes.forEach(b => {
    const zl = b.tecnicoZona ? tecToLocalMap.get(b.tecnicoZona.toLowerCase().trim()) : null;
    if (b.atm && zl) {
      atmToLocalMap.set(String(b.atm).trim(), zl);
    }
    if (b.localidad && zl && !locToLocalMap.has(b.localidad.toLowerCase().trim())) {
      locToLocalMap.set(b.localidad.toLowerCase().trim(), zl);
    }
  });
} catch (e) {}

// Fallback direct locality mapping
const LOCALIDAD_ZONA_FALLBACK = {
  'bahia blanca': 'Centro',
  'viedma': 'Centro',
  'punta alta': 'Centro',
  'carmen de patagones': 'Centro',
  'coronel dorrego': 'Centro',
  'coronel pringles': 'Centro',
  'mar del plata': 'Atlántica',
  'miramar': 'Atlántica',
  'balcarce': 'Atlántica',
  'necochea': 'Atlántica',
  'quequen': 'Atlántica',
  'general madariaga': 'Atlántica',
  'pinamar': 'Atlántica',
  'villa gesell': 'Atlántica',
  'chapadmalal': 'Atlántica',
  'batan': 'Atlántica',
  'santa clara del mar': 'Atlántica',
  'trenque lauquen': 'Oeste',
  'pehuajo': 'Oeste',
  'general villegas': 'Oeste',
  'olavarria': 'Oeste',
  'azul': 'Oeste',
  'bolivar': 'Oeste',
  'hinojo': 'Oeste',
  'pigue': 'Oeste',
  'carhue': 'Oeste',
  'santa rosa': 'La Pampa',
  'general pico': 'La Pampa',
  'general acha': 'La Pampa',
  'realico': 'La Pampa',
  'eduardo castex': 'La Pampa',
  'macachin': 'La Pampa',
  'neuquen': 'Suroeste',
  'neuquén': 'Suroeste',
  'cipolletti': 'Suroeste',
  'bariloche': 'Suroeste',
  'san carlos de bariloche': 'Suroeste',
  'villa la angostura': 'Suroeste',
  'san martin de los andes': 'Suroeste',
  'trelew': 'Sur',
  'rawson': 'Sur',
  'puerto madryn': 'Sur',
  'comodoro rivadavia': 'Sur',
  'rio gallegos': 'Sur',
  'caleta olivia': 'Sur',
  'ushuaia': 'Contratistas',
  'rio grande': 'Contratistas',
  'las grutas': 'Contratistas'
};

function resolveZonaLocal(equipo, localidad, tecnicos, zonaDefault) {
  const eqKey = String(equipo).trim();
  if (atmToLocalMap.has(eqKey)) return atmToLocalMap.get(eqKey);

  for (const t of tecnicos) {
    const norm = String(t).toLowerCase().trim();
    if (tecToLocalMap.has(norm)) return tecToLocalMap.get(norm);
  }

  const locNorm = String(localidad || '').toLowerCase().trim();
  if (locToLocalMap.has(locNorm)) return locToLocalMap.get(locNorm);
  if (LOCALIDAD_ZONA_FALLBACK[locNorm]) return LOCALIDAD_ZONA_FALLBACK[locNorm];

  if (zonaDefault === 'Suroeste') return 'Suroeste';
  return 'Centro';
}

function isAtmEquipment(modelo, tipo) {
  const m = String(modelo || '').toUpperCase();
  const t = String(tipo || '').toUpperCase();
  if (
    t.includes('SMART BOX') ||
    m.includes('SMART BOX') ||
    m.includes('SMARTBOX') ||
    m.includes('CTI') || 
    m.includes('CTE') || 
    m.includes('KISAN') || 
    m.includes('TAS') || 
    m.includes('TDE') || 
    m.includes('CASH') ||
    m.includes('SNBC') ||
    m.includes('CIMA')
  ) {
    return false; // Cash Today
  }
  return true; // Cajero Automático ATM
}

// Build strict Reincidentes Array
const reincidentesEstrictos = Array.from(slaFailuresMap.values())
  .filter(item => item.fallasSla.length >= 2) // repeated failures
  .map(item => {
    const isAtm = isAtmEquipment(item.modelo);

    // Failures strictly in last 60 days
    const fallas60d = item.fallasSla.filter(f => f.rawDateIso >= defaultMin60dIso && f.rawDateIso <= defaultMax60dIso);
    const cantFallas60d = fallas60d.length > 0 ? fallas60d.length : item.fallasSla.length;
    const visitasCampo60d = (fallas60d.length > 0 ? fallas60d : item.fallasSla).filter(f => f.esVisitaCampo).length;
    
    // ATMs NEVER have TELCA closures
    const remotoTelca60d = isAtm 
      ? 0 
      : (fallas60d.length > 0 ? fallas60d : item.fallasSla).filter(f => f.esRemotoTelca).length;

    let estadoSalud = "ADVERTENCIA";
    let nivelCriticidad = 2;
    if (cantFallas60d >= 4 || visitasCampo60d >= 3) {
      estadoSalud = "CRÍTICO";
      nivelCriticidad = 3;
    }

    const ultimoMtm = lastMtmMap.get(item.equipo) || null;
    const mpInfo = mpCerradosMap[item.equipo] || null;
    const zonaLocal = resolveZonaLocal(item.equipo, item.localidad, item.tecnicos, item.zona);

    // Dynamic Causes map: For ATM, do NOT include TELCA
    const causasFrecuentes = {
      "Visitas a Campo": visitasCampo60d
    };
    if (!isAtm && remotoTelca60d > 0) {
      causasFrecuentes["Soporte Remoto (TELCA2)"] = remotoTelca60d;
    }

    // Recommendation logic: strictly no TELCA mention for ATM
    let recomendacion = '';
    if (isAtm) {
      recomendacion = estadoSalud === 'CRÍTICO'
        ? `Reincidencia severa (${visitasCampo60d} visitas a campo en período). ${ultimoMtm ? `Último preventivo: ${ultimoMtm}.` : 'Sin MTM reciente.'} Se sugiere auditoría en sitio y recambio de módulo crítico.`
        : `Reincidente moderado (${visitasCampo60d} visitas de campo). Revisar calibración y estado de componentes en próxima visita.`;
    } else {
      if (remotoTelca60d > 0) {
        recomendacion = estadoSalud === 'CRÍTICO'
          ? `Reincidencia severa (${visitasCampo60d} visitas a campo, ${remotoTelca60d} cierres TELCA2 en período). ${ultimoMtm ? `Último preventivo: ${ultimoMtm}.` : 'Sin MTM reciente.'} Se sugiere auditoría en sitio y recambio de módulo crítico.`
          : `Reincidente moderado (${visitasCampo60d} visitas de campo, ${remotoTelca60d} atenciones TELCA2). Revisar calibración y estado de componentes en próxima visita.`;
      } else {
        recomendacion = estadoSalud === 'CRÍTICO'
          ? `Reincidencia severa (${visitasCampo60d} visitas a campo en período). ${ultimoMtm ? `Último preventivo: ${ultimoMtm}.` : 'Sin MTM reciente.'} Se sugiere auditoría en sitio y recambio de módulo crítico.`
          : `Reincidente moderado (${visitasCampo60d} visitas de campo). Revisar calibración y estado de componentes en próxima visita.`;
      }
    }

    return {
      luno: item.equipo,
      equipo: item.equipo,
      cliente: item.cliente,
      modelo: item.modelo,
      direccion: item.direccion,
      localidad: item.localidad,
      zona: item.zona,
      zonaLocal,
      tipoSeg: isAtm ? 'ATM' : 'Cash Today',
      totalFallas: cantFallas60d,
      fallasServiceCall: cantFallas60d,
      totalVisitasCampo: visitasCampo60d,
      totalSoporteRemoto: remotoTelca60d,
      fallasTelca: remotoTelca60d,
      fallasOtros: 0,
      estadoSalud,
      nivelCriticidad,
      topCausa: "Falla Reiterada en SLA (60 días)",
      ultimoMtmFecha: ultimoMtm,
      tiempoPostMtm: ultimoMtm ? "Equipo visitado por MTM previamente" : "Sin registro de MTM reciente",
      tiempoAsistenciaMp: mpInfo?.tiempoAsistencia || null,
      tiempoAsistenciaMinutosMp: mpInfo?.tiempoAsistenciaMinutos || null,
      alertaTiempoMp: mpInfo?.alertaTiempoMp || null,
      repuestosHistoricos: lunoToRepMap[item.equipo] || [],
      tecnicosInvolucrados: Array.from(item.tecnicos),
      ultimasFallas: item.fallasSla.slice(0, 10),
      todasFallas: item.fallasSla,
      causasFrecuentes,
      recomendacion
    };
  })
  .sort((a, b) => b.totalFallas - a.totalFallas);

fs.writeFileSync(path.join(outDir, 'reincidenciasData.json'), JSON.stringify(reincidentesEstrictos, null, 2));
console.log(`✅ Reincidencias estrictas generadas con zonaLocal y regla No-TELCA en ATM: ${reincidentesEstrictos.length} equipos`);

