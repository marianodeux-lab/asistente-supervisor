const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

console.log('🔄 Procesando Informe Semanal de Stock Fijo, Consumibles, Herramientas y Stock Regional...');

const inputFile = path.resolve(__dirname, '../Reportes/Repuestos/Informe Stock Fijo - Consumibles - Herramientas y S. regional.xlsx');
const outDir = path.resolve(__dirname, '../src/data');

if (!fs.existsSync(inputFile)) {
  console.error(`❌ Archivo no encontrado: ${inputFile}`);
  process.exit(1);
}

// 1. Cargar referencias
const zonasRefFile = path.resolve(outDir, 'zonasTecnicosReferencia.json');
const masterLpFile = path.resolve(outDir, 'masterLpMap.json');

const zonasRef = fs.existsSync(zonasRefFile) ? JSON.parse(fs.readFileSync(zonasRefFile, 'utf8')) : [];
const masterLp = fs.existsSync(masterLpFile) ? JSON.parse(fs.readFileSync(masterLpFile, 'utf8')) : {};

// Normalizar nombres de técnicos supervisados
const myTechMap = new Map();
zonasRef.forEach(z => {
  const norm = z.nombre.toLowerCase().trim();
  myTechMap.set(norm, z);
});

// Helper de fechas Excel
function parseExcelDate(val) {
  if (!val) return '-';
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  const s = String(val).trim();
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) year = '20' + year;
      return `${day}/${month}/${year}`;
    }
  }
  return s || '-';
}

const wb = XLSX.readFile(inputFile);

// 2. Extraer Stock Regional Planta Mar del Plata (Exclusivo Atlántica)
const tecnicosAtlantica = [
  'Buratti, Fabian (IN MDP 2)',
  'Castaño, Matias (IN MDP3)',
  'Chiriello, Pablo Javier (IN MDP 1)',
  'Montiel, Juan Fernando (IN COS)',
  'Aldayturriaga, Martin (IN TDL - Oeste/Atlántica)'
];

let stockRegionalMdpList = [];
if (wb.Sheets['Stock Mar del Plata']) {
  const rawMdp = XLSX.utils.sheet_to_json(wb.Sheets['Stock Mar del Plata'], { defval: '' });
  
  stockRegionalMdpList = rawMdp.map(r => {
    const pn = String(r['PN'] || '').trim().toUpperCase();
    const cantMin = Number(r['CANTMINIMA']) || 0;
    const unidades = Number(r['UNIDADES']) || 0;
    const dif = Math.max(0, cantMin - unidades);
    const descMaster = masterLp[pn] || '';
    const desc = descMaster || `Repuesto ${pn}`;

    let estado = 'DISPONIBLE';
    if (unidades === 0) {
      estado = 'SIN_STOCK';
    } else if (unidades < cantMin) {
      estado = 'BAJO_MINIMO';
    }

    return {
      pn,
      descripcion: desc,
      baseStock: String(r['BASESTOCK'] || 'Stock Mar Del Plata').trim(),
      tipo: String(r['TIPO'] || 'STOCK REGIONAL').trim(),
      cantMinima: cantMin,
      unidades,
      diferencia: dif,
      estado,
      planta: 'Planta Mar del Plata',
      subzonaAsignada: 'Atlántica'
    };
  }).filter(item => item.pn && item.pn.length > 2);
}

fs.writeFileSync(path.join(outDir, 'stockRegionalMdpData.json'), JSON.stringify(stockRegionalMdpList, null, 2));

// 3. Extraer Solicitudes de Stock Fijo, Consumibles y Herramientas (filtradas a la dotación de supervisión)
function mapSolicitud(r, defaultConcepto) {
  const pn = String(r['PN'] || '').trim().toUpperCase();
  const descExcel = String(r['DESCRIPCION'] || '').trim();
  const descMaster = masterLp[pn] || '';
  const descripcion = descMaster || descExcel || `Repuesto ${pn}`;

  const cant = Number(r['CANTIDAD']) || 0;
  
  // Analizar CANTSTKCENTRAL
  let cantCentral = null;
  const rawCentral = String(r['CANTSTKCENTRAL'] || '').replace(/\u00a0/g, ' ').trim();
  if (rawCentral !== '' && !isNaN(Number(rawCentral))) {
    cantCentral = Number(rawCentral);
  }
  const tieneStockCentral = cantCentral !== null && cantCentral > 0;
  const estadoCentral = tieneStockCentral ? 'DISPONIBLE_CENTRAL' : 'SIN_STOCK_CENTRAL';

  const tecNombre = String(r['TECNICONOMBRE'] || '').trim();
  const tecNorm = tecNombre.toLowerCase().trim();
  const tecInfo = myTechMap.get(tecNorm);

  return {
    solicitud: String(r['SOLICITUD'] || '').trim(),
    pn,
    descripcion,
    fecha: parseExcelDate(r['FECHA']),
    cantidad: cant,
    cantStkCentral: cantCentral,
    tieneStockCentral,
    estadoCentral,
    tipoParte: String(r['TIPOPARTE'] || '').trim(),
    concepto: String(r['CONCEPTOLLAMADA'] || defaultConcepto).trim(),
    tecnico: tecNombre,
    tecnicoZona: tecInfo ? tecInfo.zonaTecnica : String(r['TECNICOZONA'] || '').trim(),
    region: tecInfo ? tecInfo.region : 'PATAGONIA',
    zonaLocal: tecInfo ? tecInfo.zonaLocal : ''
  };
}

// Extraer solicitudes de Stock Fijo
const rawSf = wb.Sheets['Stock fijo'] ? XLSX.utils.sheet_to_json(wb.Sheets['Stock fijo'], { defval: '' }) : [];
const solicitudesSfList = rawSf
  .filter(r => {
    const t = String(r['TECNICONOMBRE'] || '').toLowerCase().trim();
    return myTechMap.has(t);
  })
  .map(r => mapSolicitud(r, 'STOCK FIJO'));

// Extraer solicitudes de Consumibles
const rawCons = wb.Sheets['Consumibles'] ? XLSX.utils.sheet_to_json(wb.Sheets['Consumibles'], { defval: '' }) : [];
const solicitudesConsList = rawCons
  .filter(r => {
    const t = String(r['TECNICONOMBRE'] || '').toLowerCase().trim();
    return myTechMap.has(t);
  })
  .map(r => mapSolicitud(r, 'SOLICITUD DE CONSUMIBLES'));

// Extraer solicitudes de Herramientas y Stock regional
const rawHerr = wb.Sheets['Herramientas y Stock regional'] ? XLSX.utils.sheet_to_json(wb.Sheets['Herramientas y Stock regional'], { defval: '' }) : [];
const solicitudesHerrList = rawHerr
  .filter(r => {
    const t = String(r['TECNICONOMBRE'] || '').toLowerCase().trim();
    return myTechMap.has(t);
  })
  .map(r => mapSolicitud(r, 'HERRAMIENTAS'));

// Métricas agregadas
const todasSolicitudes = [...solicitudesSfList, ...solicitudesConsList, ...solicitudesHerrList];
const conStockCentral = todasSolicitudes.filter(s => s.tieneStockCentral).length;
const sinStockCentral = todasSolicitudes.filter(s => !s.tieneStockCentral).length;
const tecnicosConSolicitudes = new Set(todasSolicitudes.map(s => s.tecnico)).size;

const solicitudesStockData = {
  fechaCorte: new Date().toLocaleDateString('es-AR'),
  metricas: {
    totalSolicitudes: todasSolicitudes.length,
    totalStockFijo: solicitudesSfList.length,
    totalConsumibles: solicitudesConsList.length,
    totalHerramientas: solicitudesHerrList.length,
    conStockCentral,
    sinStockCentral,
    tecnicosInvolucrados: tecnicosConSolicitudes
  },
  tecnicosAtlanticaHabilitados: tecnicosAtlantica,
  stockFijo: solicitudesSfList,
  consumibles: solicitudesConsList,
  herramientas: solicitudesHerrList
};

fs.writeFileSync(path.join(outDir, 'solicitudesStockData.json'), JSON.stringify(solicitudesStockData, null, 2));

console.log(`✅ Procesamiento completado:
- ${stockRegionalMdpList.length} partes en Stock Regional Planta Mar del Plata (${stockRegionalMdpList.filter(s => s.estado === 'DISPONIBLE').length} disponibles, ${stockRegionalMdpList.filter(s => s.estado !== 'DISPONIBLE').length} con faltante)
- ${solicitudesSfList.length} solicitudes de Stock Fijo para técnicos de la región
- ${solicitudesConsumibles = solicitudesConsList.length} solicitudes de Consumibles no retornables
- ${solicitudesHerrList.length} solicitudes de Herramientas
- ${conStockCentral} solicitudes con stock disponible en Central (demora logística)
- ${sinStockCentral} solicitudes en quiebre de stock en Central`);
