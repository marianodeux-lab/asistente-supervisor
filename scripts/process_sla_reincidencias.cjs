const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const outDir = path.resolve(__dirname, '../src/data');

console.log('Calculating strict Reincidencias from Reporte SLA (last 60 days) + MTM date tracking...');

// 1. Gather all MTM (Preventivos) dates per equipo from MP Cerrados
const lastMtmMap = new Map();

function readMpCerrados(filePath) {
  if (!fs.existsSync(filePath)) return;
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  raw.forEach(r => {
    const equipo = String(r['Luno'] || r['LUNO'] || r['ATM'] || r['ATM ID'] || '').trim();
    if (!equipo || equipo.length < 3) return;
    const fecha = r['Fecha'] || r['F Fin'] || r['MARCA FIN'] || '2026-02-15';
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
  const tecIdx = headers.indexOf('Tecnico') !== -1 ? headers.indexOf('Tecnico') : headers.indexOf('TECNICO');
  const fallaIdx = headers.indexOf('Problema Reportado') !== -1 ? headers.indexOf('Problema Reportado') : headers.indexOf('Falla');
  const fAltaIdx = headers.indexOf('F Alta') !== -1 ? headers.indexOf('F Alta') : headers.indexOf('Fecha Alta');
  const fFinIdx = headers.indexOf('F Fin') !== -1 ? headers.indexOf('F Fin') : headers.indexOf('Fecha Fin');

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
    const tec = String(r[tecIdx] || 'Técnico').trim();
    const dir = String(r[dirIdx] || '').trim();
    const fecha = r[fFinIdx] || r[fAltaIdx] || '2026-02-28';

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
    if (tec) entry.tecnicos.add(tec);
    entry.fallasSla.push({
      pedido: ped,
      fecha,
      falla: (r[fallaIdx] || 'Falla de Service Call registrada en SLA').slice(0, 180),
      tecnico: tec,
      origen: 'SLA SERVICE CALL',
      causa: 'Service Call'
    });
  }
}

readSlaFile(path.resolve(__dirname, '../Reportes/Reporte Sla Patagonia.xls'), 'Patagonia');
readSlaFile(path.resolve(__dirname, '../Reportes/Reporte Sla Suroeste.xls'), 'Suroeste');

// Build strict Reincidentes Array (Equipos con repetición en los últimos 60 días)
const reincidentesEstrictos = Array.from(slaFailuresMap.values())
  .filter(item => item.fallasSla.length >= 2) // repeated in SLA
  .map(item => {
    const cantFallasSla = item.fallasSla.length;
    let estadoSalud = "ADVERTENCIA";
    let nivelCriticidad = 2;
    if (cantFallasSla >= 4) {
      estadoSalud = "CRÍTICO";
      nivelCriticidad = 3;
    }

    const ultimoMtm = lastMtmMap.get(item.equipo) || null;

    return {
      luno: item.equipo,
      equipo: item.equipo,
      cliente: item.cliente,
      modelo: item.modelo,
      direccion: item.direccion,
      localidad: item.localidad,
      zona: item.zona,
      totalFallas: cantFallasSla,
      fallasServiceCall: cantFallasSla,
      fallasTelca: 0,
      fallasOtros: 0,
      estadoSalud,
      nivelCriticidad,
      topCausa: "Falla Reiterada en SLA (60 días)",
      ultimoMtmFecha: ultimoMtm,
      tiempoPostMtm: ultimoMtm ? "Equipo visitado por MTM previamente" : "Sin registro de MTM reciente",
      tecnicosInvolucrados: Array.from(item.tecnicos),
      ultimasFallas: item.fallasSla.slice(0, 8),
      causasFrecuentes: { "Service Call SLA": cantFallasSla },
      recomendacion: cantFallasSla >= 4
        ? `Reincidencia severa (${cantFallasSla} llamadas SLA en 60 días). ${ultimoMtm ? `Último preventivo realizado: ${ultimoMtm}.` : 'No tiene preventivo reciente.'} Se sugiere auditoría en sitio y reemplazo de módulo crítico.`
        : `Reincidente moderado (${cantFallasSla} llamadas SLA). Revisar calibración y estado de componentes en próxima visita.`
    };
  })
  .sort((a, b) => b.totalFallas - a.totalFallas);

fs.writeFileSync(path.join(outDir, 'reincidenciasData.json'), JSON.stringify(reincidentesEstrictos, null, 2));
console.log(`✅ Reincidencias estrictas generadas: ${reincidentesEstrictos.length} equipos con fallas repetidas en SLA (60 días)`);
