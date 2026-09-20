const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../src/data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('=== RE-PROCESSING BASE INSTALADA CON FUENTE DE VERDAD ===');

// Load Fuente de Verdad JSON
const fdvPath = path.join(outDir, 'fuenteDeVerdadData.json');
let catalogMap = new Map();
if (fs.existsSync(fdvPath)) {
  const fdv = JSON.parse(fs.readFileSync(fdvPath, 'utf8'));
  (fdv.catalog || []).forEach(item => {
    const key = `${(item.marcaOriginal || '').trim().toUpperCase()}|||${(item.modeloOriginal || '').trim().toUpperCase()}`;
    catalogMap.set(key, item);
  });
}

// Inline taxonomy resolver matching src/core/fuenteDeVerdad.ts
function resolveTaxonomy(marcaRaw, modeloRaw) {
  const marca = (marcaRaw || '').trim();
  const modelo = (modeloRaw || '').trim();
  const key = `${marca.toUpperCase()}|||${modelo.toUpperCase()}`;
  if (catalogMap.has(key)) {
    return catalogMap.get(key);
  }

  // Fallback rule if key wasn't in catalog
  const marcaUpper = marca.toUpperCase();
  const modeloUpper = modelo.toUpperCase();

  let negocio = 'ATM';
  if (marcaUpper.includes('SMART BOX') || marcaUpper.includes('SMARTBOX') || marcaUpper.includes('GUNNEBO')) {
    negocio = 'Cash Today';
  } else if (marcaUpper.includes('CRP')) {
    negocio = 'CRP';
  }

  return {
    marcaOriginal: marca,
    modeloOriginal: modelo,
    negocio,
    fabricante: negocio === 'CRP' ? 'Prosegur CRP' : (negocio === 'Cash Today' ? 'SNBC' : 'Diebold Nixdorf'),
    modeloBase: modelo,
    modeloEstandar: modelo,
    mpcr: negocio === 'Cash Today' ? 'GLORY' : (negocio === 'CRP' ? 'CRP' : 'OPTEVA'),
    callRateTarget: 0.5
  };
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

// 1. Process Agosto 2026 for active runtime
const fileAgo = path.resolve(__dirname, '../Reportes/Base Instalada/2026/2026/Agosto.xlsx');
let baseInstaladaClientesList = [];
if (fs.existsSync(fileAgo)) {
  const wbAgo = XLSX.readFile(fileAgo);
  const wsAgo = wbAgo.Sheets['BASE'] || wbAgo.Sheets[wbAgo.SheetNames[0]];
  const rawAgo = XLSX.utils.sheet_to_json(wsAgo, { defval: '' });
  
  baseInstaladaClientesList = rawAgo.map(r => {
    const d = parseDate(r['FECHAHABILITACION']);
    const slaText = r['SLA_R'] ? (`${r['SLA_R']}h`) : (r['SLA_S'] ? (`${r['SLA_S']}h`) : '-');
    const marcaRaw = String(r['MARCA_DESC'] || r['MARCA'] || '').trim();
    const modeloRaw = String(r['MODELO_DESC'] || r['MODELO'] || '').trim();
    const red = String(r['RED'] || '').trim();
    
    // Exact taxonomy resolution from Fuente de Verdad
    const tax = resolveTaxonomy(marcaRaw, modeloRaw);

    return {
      cliente: String(r['CLIENTE_DESC'] || r['CLIENTE'] || '').trim(),
      atm: String(r['COD_EQUIPO'] || r['ATM'] || r['LUNO'] || '').trim(),
      serie: String(r['SERIE_ATM'] || r['SERIE'] || '').trim(),
      direccion: String(r['DENOMINACION'] || r['UBICACION'] || r['DIRECCION'] || '').trim(),
      localidad: String(r['LOCALIDAD'] || '').trim(),
      provincia: String(r['PROVINCIA'] || '').trim(),
      distancia: String(r['KM'] || '0').trim(),
      mpcr: tax.mpcr,
      red: red,
      sla: slaText,
      tecnicoZona: String(r['TECNICO_ZONA'] || '').trim(),
      antiguedad: calcAntiguedad(d),
      fechaHabilitacion: formatFecha(d),
      // Standardized Fuente de Verdad Fields:
      fabricante: tax.fabricante,
      modelo: tax.modeloEstandar,
      modeloBase: tax.modeloBase,
      modeloOriginal: modeloRaw,
      marcaOriginal: marcaRaw,
      region: String(r['REGIONTECNICO'] || 'PATAGONIA').trim(),
      plantaCabecera: getPlantaCabecera(r['ZONA_DESC'], r['LOCALIDAD']),
      negocio: tax.negocio,
      esCashToday: tax.negocio === 'Cash Today',
      recaudador: String(r['RECAUDADOR'] || '').trim(),
      callRateTarget: tax.callRateTarget
    };
  }).filter(e => e.cliente || e.atm);
}

fs.writeFileSync(path.join(outDir, 'baseInstaladaClientesData.json'), JSON.stringify(baseInstaladaClientesList, null, 2));

console.log(`✅ Base Instalada Guardada con Fuente de Verdad: ${baseInstaladaClientesList.length} equipos.`);

// Check counts by Negocio
const negocioCounts = {};
baseInstaladaClientesList.forEach(e => {
  negocioCounts[e.negocio] = (negocioCounts[e.negocio] || 0) + 1;
});
console.log('Distribución por Negocio en Agosto 2026:');
console.log(negocioCounts);

// Check if any OPTEVA / DIEBOLD has negocio === 'Cash Today'
const badOpteva = baseInstaladaClientesList.filter(e => e.mpcr.toUpperCase().includes('OPTEVA') && e.negocio === 'Cash Today');
console.log(`Opteva marcados erróneamente como Cash Today: ${badOpteva.length} (Debe ser 0)`);
