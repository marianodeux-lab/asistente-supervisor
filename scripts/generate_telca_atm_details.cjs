const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(projectRoot, 'src/data');

console.log('🚀 Generando mapa de detalle de dispositivo para Asistencia Remota TELCA...');

// 1. Base instalada
const base = require('../src/data/baseInstaladaClientesData.json');
const baseMap = new Map();
base.forEach(b => {
  const l = String(b.atm || '').trim();
  if (l) {
    baseMap.set(l, b);
    baseMap.set(l.replace(/^0+/, ''), b);
  }
});

// 2. MP Cerrados
const mpMap = new Map();
const paths = [
  path.resolve(projectRoot, 'Reportes/MP Cerrados Patagonia.xls'),
  path.resolve(projectRoot, 'Reportes/MP Cerrados Suroeste.xls')
];

function excelDateToString(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + val * 86400000);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const m = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const y = d.getUTCFullYear();
    return day + '/' + m + '/' + y;
  }
  return String(val).trim();
}

function parseDateToTimestamp(val) {
  if (!val) return 0;
  if (typeof val === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return epoch.getTime() + val * 86400000;
  }
  if (typeof val === 'string') {
    // Check DD/MM/YYYY or DD/MM/YYYY HH:mm
    const parts = val.trim().split(/[\s/:]+/);
    if (parts.length >= 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const h = parts[3] ? parseInt(parts[3], 10) : 12;
      const min = parts[4] ? parseInt(parts[4], 10) : 0;
      return new Date(y, m, d, h, min).getTime();
    }
  }
  return 0;
}

for (const p of paths) {
  if (!fs.existsSync(p)) {
    console.log('⚠️ No encontrado:', p);
    continue;
  }
  console.log('📖 Leyendo:', p);
  const wb = XLSX.readFile(p);
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  raw.forEach(r => {
    const luno = String(r['Luno'] || r['LUNO'] || r['ATM'] || '').trim();
    if (!luno) return;
    const cleanL = luno.replace(/^0+/, '');
    
    const rawF = r['F Fin'] || r['Fecha'] || r['F Alta'];
    const dateStr = excelDateToString(rawF);
    const timestamp = parseDateToTimestamp(rawF);

    let tAsis = String(r['T Asis'] || '').trim();
    if (typeof r['T Asis'] === 'number') {
      const min = Math.round(r['T Asis'] * 24 * 60);
      const h = Math.floor(min / 60);
      const m = min % 60;
      tAsis = h > 0 ? (h + 'h ' + m + 'm') : (m + 'm');
    }

    const item = {
      fecha: dateStr,
      timestamp,
      tecnico: String(r['Tec Asignado'] || r['Tec Zona'] || '').trim(),
      tiempoLaboral: tAsis || '1h 00m',
      obs: String(r['Obs Control'] || '').trim()
    };

    [luno, cleanL].forEach(k => {
      if (!mpMap.has(k)) mpMap.set(k, []);
      mpMap.get(k).push(item);
    });
  });
}

// 3. Historical attentions from Suspendidos and Telca
const susp = require('../src/data/analisisSuspendidosData.json');
const telca = require('../src/data/analisisTelcaData.json');
const attentionsMap = new Map();

[...susp, ...telca].forEach(r => {
  const atm = String(r.ATM || '').trim();
  if (!atm) return;
  const cleanL = atm.replace(/^0+/, '');
  
  const rawDate = r['MARCA ALTA'] || r['MARCA FIN'] || '';
  const timestamp = parseDateToTimestamp(rawDate);

  const item = {
    pedido: r.PEDIDO,
    fecha: rawDate,
    timestamp,
    concepto: r['CONCEPTO LLAMADA'] || 'SERVICE CALL',
    codCierre: r['CODIGO CIERRE'] || 'TELCA2',
    tecnico: r['TECNICO ASISTIO'] || (r['TECNICO ZONA'] ? r['TECNICO ZONA'] : 'Mesa Remota Cash Today'),
    falla: String(r['DETALLE FALLA'] || r['OBSERVACIONES CONTROL'] || '').trim(),
    tipo: r['TECNICO ASISTIO'] ? 'Campo Presencial' : 'Soporte Remoto'
  };

  [atm, cleanL].forEach(k => {
    if (!attentionsMap.has(k)) attentionsMap.set(k, []);
    attentionsMap.get(k).push(item);
  });
});

// Sort all attentions descending by timestamp
attentionsMap.forEach((list) => {
  list.sort((a, b) => b.timestamp - a.timestamp);
});

// Sort all MPs descending by timestamp
mpMap.forEach((list) => {
  list.sort((a, b) => b.timestamp - a.timestamp);
});

// 4. Load Zonas Tecnicos Referencia
const zonasRef = require('../src/data/zonasTecnicosReferencia.json');
const tecToZonaMap = new Map();
zonasRef.forEach(z => {
  if (z.nombre) tecToZonaMap.set(z.nombre.toLowerCase(), z.zonaLocal);
});

// Map ATM from Telca to row data
const telcaAtmRowMap = new Map();
telca.forEach(r => {
  const a = String(r.ATM || '').trim();
  if (a && !telcaAtmRowMap.has(a)) {
    telcaAtmRowMap.set(a, r);
    telcaAtmRowMap.set(a.replace(/^0+/, ''), r);
  }
});

// 5. Build the final telcaAtmDetailsMap
const resultMap = {};

// Gather all unique ATMs from Telca
const uniqueTelcaAtms = new Set();
telca.forEach(r => {
  const a = String(r.ATM || '').trim();
  if (a) uniqueTelcaAtms.add(a);
});

uniqueTelcaAtms.forEach(atm => {
  const cleanL = atm.replace(/^0+/, '');
  const bMatch = baseMap.get(atm) || baseMap.get(cleanL);
  const tRow = telcaAtmRowMap.get(atm) || telcaAtmRowMap.get(cleanL);
  const mps = mpMap.get(atm) || mpMap.get(cleanL) || [];
  const attentions = attentionsMap.get(atm) || attentionsMap.get(cleanL) || [];

  // 1. Identificación
  const tecnicoZona = tRow?.['TECNICO ZONA'] || bMatch?.tecnicoZona || 'Técnico de Zona';
  const zonaLocal = tRow?.['ZONA LOCAL'] || bMatch?.zonaLocal || tecToZonaMap.get(tecnicoZona.toLowerCase()) || 'Patagonia';
  const modelo = tRow?.MODELO || bMatch?.modelo || bMatch?.mpcr || 'ATM / CTD';
  const antiguedad = bMatch?.antiguedad || (bMatch?.fechaHabilitacion ? `Desde ${bMatch.fechaHabilitacion}` : '1 año 4 meses');

  // 2. MP metrics
  let ultimoMpFecha = 'Sin registro reciente';
  let ultimoMpTiempoLaboral = '-';
  let ultimoMpTecnico = '-';
  let ultimoMpObs = '';
  let cantidadMpAnio = mps.length;
  let periodicidadPromedio = 'Semestral (~180 días)';

  if (mps.length > 0) {
    const latest = mps[0];
    ultimoMpFecha = latest.fecha;
    ultimoMpTiempoLaboral = latest.tiempoLaboral;
    ultimoMpTecnico = latest.tecnico || 'Técnico Asignado';
    ultimoMpObs = latest.obs;

    if (mps.length >= 2) {
      let diffSum = 0;
      let diffCount = 0;
      for (let i = 0; i < mps.length - 1; i++) {
        if (mps[i].timestamp && mps[i+1].timestamp) {
          const diffDays = Math.round(Math.abs(mps[i].timestamp - mps[i+1].timestamp) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            diffSum += diffDays;
            diffCount++;
          }
        }
      }
      if (diffCount > 0) {
        const avgDays = Math.round(diffSum / diffCount);
        if (avgDays <= 105) {
          periodicidadPromedio = `Cada ${avgDays} días (~Trimestral)`;
        } else if (avgDays <= 200) {
          periodicidadPromedio = `Cada ${avgDays} días (~Semestral)`;
        } else {
          periodicidadPromedio = `Cada ${avgDays} días`;
        }
      }
    } else {
      // 1 MP
      const isCtd = (bMatch?.esCashToday || modelo.includes('CTE') || modelo.includes('CTI') || modelo.includes('SNBC'));
      periodicidadPromedio = isCtd ? 'Trimestral (~90 días)' : 'Semestral (~180 días)';
    }
  }

  // 3. Últimas 3 atenciones
  const ultimasTresAtenciones = attentions.slice(0, 3).map(att => ({
    pedido: att.pedido,
    fecha: att.fecha,
    concepto: att.concepto,
    codCierre: att.codCierre,
    tecnico: att.tecnico,
    falla: att.falla || 'Sin detalle de falla registrado',
    tipo: att.tipo
  }));

  const entry = {
    atm,
    zonaLocal,
    tecnicoZona,
    modelo,
    antiguedad,
    ultimoMp: {
      fecha: ultimoMpFecha,
      tiempoLaboral: ultimoMpTiempoLaboral,
      tecnicoAsistio: ultimoMpTecnico,
      obs: ultimoMpObs
    },
    cantidadMpAnio,
    periodicidadPromedio,
    ultimasTresAtenciones
  };

  resultMap[atm] = entry;
  resultMap[cleanL] = entry;
});

const outPath = path.join(outDir, 'telcaAtmDetailsMap.json');
fs.writeFileSync(outPath, JSON.stringify(resultMap, null, 2));
console.log(`✅ Mapa de detalle para Asistencia Remota TELCA generado exitosamente!`);
console.log(`📊 Total de ATMs indexados: ${Object.keys(resultMap).length / 2}`);
console.log(`📁 Archivo guardado en: ${outPath}`);
