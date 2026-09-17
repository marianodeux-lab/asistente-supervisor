const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(projectRoot, 'src/data');

console.log('🚀 Procesando Reportes de Análisis Atenciones (Patagonia & Suroeste)...');

// Cargar técnicos de referencia de la supervisión
const misTecnicosData = require(path.resolve(projectRoot, 'src/data/zonasTecnicosReferencia.json'));
const myTechSet = new Set(misTecnicosData.map(t => (t.nombre || '').toLowerCase().trim()));
myTechSet.add('deus, mariano');
myTechSet.add('hernandez, marcos alberto');
myTechSet.add('lazzaro, leonardo');
myTechSet.add('ibañez, pablo fernando');
myTechSet.add('torres, florencia');
myTechSet.add('costanzo, pablo');

const mySuroesteZones = new Set(['IN BAR', 'IN CIP', 'IN NQN']);

// Helper para convertir tanto números seriales de Excel como strings a fecha formateada 'dd/mm/yyyy' y 'dd/mm/yyyy hh:mm'
function excelDateToString(val, includeTime = true, timeStr = '') {
  if (val === null || val === undefined || val === '') return '';
  
  let d = null;
  if (val instanceof Date) {
    d = val;
  } else if (typeof val === 'number') {
    if (val < 1) {
      const totalSec = Math.round(val * 86400);
      const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
      const min = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
      return `${h}:${min}`;
    }
    const epoch = new Date(Date.UTC(1899, 11, 30));
    d = new Date(epoch.getTime() + val * 86400000);
  } else if (typeof val === 'string') {
    const s = val.trim();
    if (s.includes('/')) {
      const parts = s.split(' ')[0].split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        d = new Date(year, month, day);
      }
    } else if (s.includes('-')) {
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) d = parsed;
    }
  }

  if (d && !isNaN(d.getTime())) {
    const day = (d.getUTCDate ? d.getUTCDate() : d.getDate()).toString().padStart(2, '0');
    const month = ((d.getUTCMonth ? d.getUTCMonth() : d.getMonth()) + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear ? d.getUTCFullYear() : d.getFullYear();
    const dateStr = `${day}/${month}/${year}`;
    if (!includeTime) return dateStr;
    const time = timeStr ? String(timeStr).trim().slice(0, 5) : '00:00';
    return `${dateStr} ${time}`.trim();
  }

  return String(val).trim();
}

function getWeekNumber(date) {
  if (!date) return 1;
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_NOMBRES = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
};

// Helper universal para extraer información de calendario (Día, Semana, Mes, Fin de Semana)
function getDateInfo(val, fechaStrFallback) {
  let d = null;
  if (typeof val === 'number') {
    d = new Date(Date.UTC(1899, 11, 30) + val * 86400000);
  } else {
    const s = String(val || fechaStrFallback || '').trim();
    if (s.includes('/')) {
      const parts = s.split(' ')[0].split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        d = new Date(Date.UTC(year, month, day));
      }
    } else if (s.includes('-')) {
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) d = parsed;
    }
  }

  if (d && !isNaN(d.getTime())) {
    const dayIndex = d.getUTCDay();
    return {
      dia: DIAS_SEMANA[dayIndex],
      semana: getWeekNumber(d),
      mes: MESES_NOMBRES[d.getUTCMonth() + 1] || 'Septiembre',
      finDeSemana: (dayIndex === 0 || dayIndex === 6) ? 'Sí' : 'No',
      ts: d.getTime()
    };
  }

  return {
    dia: 'miércoles',
    semana: 38,
    mes: 'Septiembre',
    finDeSemana: 'No',
    ts: 0
  };
}

// Helper para discriminar Negocio: SMART BOX = Cash Today
function getNegocio(r) {
  const tipo = String(r['TIPO'] || r['Tipo'] || '').trim().toUpperCase();
  const mod = String(r['MODELO'] || r['Modelo'] || '').trim().toUpperCase();
  const tipoSeg = String(r['TIPOSEG'] || r['Tipo Seg'] || '').trim();
  if (tipo.includes('SMART BOX') || mod.includes('SMART BOX') || mod.includes('CIMA') || mod.includes('CTI')) {
    return 'Cash Today';
  }
  return tipoSeg || 'ATM';
}

// 1. PROCESAR SUSPENDIDOS (Excluyendo TELCA y exigiendo visitas en perímetro de supervisión)
console.log('⚙️ Procesando Reportes de Suspendidos...');
const fSuspPat = path.resolve(projectRoot, 'Reportes/Reporte Suspendidos Patagonia.xls');
const fSuspSur = path.resolve(projectRoot, 'Reportes/Reporte Suspendidos Suroeste.xls');

let suspendidosData = [];
let maxFechaFinSuspendidosTs = 0;
let maxFechaFinSuspendidosStr = '16/09/2026';

function processSuspendidosFile(filePath, isSuroeste = false) {
  if (!fs.existsSync(filePath)) return [];
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const result = [];
  raw.forEach((r) => {
    const ped = String(r['PEDIDO'] || r['Pedido'] || '').trim();
    if (!ped) return;

    // 1. Regla: Excluir cierres TELCA (se muestran exclusivamente en la pestaña homónima)
    const codCierre = String(r['CODIGOCIERRE'] || r['Cod Cierre'] || '').trim().toUpperCase();
    if (codCierre.startsWith('TELCA') || codCierre === 'TELFA') {
      return;
    }

    // 2. Regla: Pedidos que tuvieron visitas de técnicos a campo
    const tecAsistio = String(r['TECNICOASISTIO'] || '').trim();
    const tecAsignado = String(r['TECNICO'] || '').trim();
    const tecZona = String(r['TECNICOZONA'] || '').trim();
    const tecFinal = tecAsistio || tecAsignado || tecZona;

    // Excluir cierres sin técnico asignado/asistiendo (cierres de mesa o desvíos automáticos sin visita)
    if (!tecFinal || tecFinal.toUpperCase() === 'SIN ASIGNAR') {
      return;
    }

    const rawZona = String(r['ZONA'] || r['Zona'] || '').trim();
    const isMyZone = !isSuroeste || mySuroesteZones.has(rawZona);
    const isMyTech = myTechSet.has(tecFinal.toLowerCase()) ||
                     (tecAsistio && myTechSet.has(tecAsistio.toLowerCase())) ||
                     (tecAsignado && myTechSet.has(tecAsignado.toLowerCase()));

    // Regla: Pedidos que tuvieron visitas de mis técnicos a cargo,
    // o algún otro técnico atendiendo pedidos en la región de Patagonia o Suroeste que me compete
    if (!isMyTech && !isMyZone) {
      return;
    }

    const rawFechaFin = r['FECHAFIN'] || r['FECHA FIN'] || r['Fecha Fin'] || r['MARCA FIN'];
    const rawHoraFin = r['HORAFIN'] || r['Hora Fin'] || '';
    const marcaFinStr = excelDateToString(rawFechaFin, true, rawHoraFin);
    const fechaFinStr = excelDateToString(rawFechaFin, false);

    const dateInfo = getDateInfo(rawFechaFin, fechaFinStr);
    if (dateInfo.ts > maxFechaFinSuspendidosTs) {
      maxFechaFinSuspendidosTs = dateInfo.ts;
      maxFechaFinSuspendidosStr = fechaFinStr;
    }

    const negocio = getNegocio(r);

    const row = {
      id: `susp_${ped}`,
      PEDIDO: ped,
      CLIENTE: String(r['CLIENTE'] || r['Cliente'] || '').trim(),
      ATM: String(r['ATM'] || r['ATM ID'] || '').trim(),
      DIRECCION: String(r['DIRECCION'] || r['Direccion'] || '').trim(),
      LOCALIDAD: String(r['LOCALIDAD'] || r['Localidad'] || '').trim(),
      PROVINCIA: String(r['PROVINCIA'] || r['Provincia'] || '').trim(),
      ZONA: rawZona,
      'ZONA LOCAL': isSuroeste ? 'Suroeste' : 'Patagonia',
      'TECNICO ASISTIO': tecAsistio || tecAsignado,
      'TECNICO ZONA': tecZona,
      FECHAALTA: excelDateToString(r['FECHAALTA'] || r['FECHA ALTA'], false),
      'FECHA FIN': fechaFinStr,
      'MARCA FIN': marcaFinStr,
      'CODIGO CIERRE': codCierre || 'COMPL',
      'TIEMPO DE ASISTENCIA': excelDateToString(r['TIEMPODEASISTENCIA'] || r['TIEMPO DE ASISTENCIA']),
      'CUMPLIO SLA': (String(r['CUMPLIOSLASOLUCION']).toUpperCase() === 'S' || Number(r['CUMPLIOSLASOLUCION']) === 1) ? 1 : 0,
      'FALLA RECURRENTE': String(r['FALLARECURRENTE'] || r['Falla Recurrente'] || 'N').trim().toUpperCase() === 'S' ? 'S' : 'N',
      NEGOCIO: negocio,
      'Utiliza Repuesto': r['REMITO'] ? 'Sí' : 'No',
      'Fin de semana': dateInfo.finDeSemana,
      Semana: dateInfo.semana,
      Mes: dateInfo.mes,
      Día: dateInfo.dia
    };
    result.push(row);
  });
  return result;
}

if (fs.existsSync(fSuspPat)) {
  const patRows = processSuspendidosFile(fSuspPat, false);
  const surRows = processSuspendidosFile(fSuspSur, true);
  suspendidosData = [...patRows, ...surRows];
  console.log(`✅ Suspendidos con visitas procesados desde Reportes/: ${suspendidosData.length} registros (Patagonia: ${patRows.length}, Suroeste: ${surRows.length})`);
  console.log(`   Última FECHA FIN detectada en Suspendidos: ${maxFechaFinSuspendidosStr}`);
} else {
  console.log('⚠️ No se encontraron archivos en Reportes/, leyendo fallback...');
}

// 2. PROCESAR SLA (Patagonia + Suroeste filtrado a mis zonas)
console.log('⚙️ Procesando Reportes de SLA...');
const fSlaPat = path.resolve(projectRoot, 'Reportes/Reporte Sla Patagonia.xls');
const fSlaSur = path.resolve(projectRoot, 'Reportes/Reporte Sla Suroeste.xls');

let slaData = [];
let maxFechaFinSlaTs = 0;
let maxFechaFinSlaStr = '13/09/2026';

function processSlaFile(filePath, isSuroeste = false) {
  if (!fs.existsSync(filePath)) return [];
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { range: 5, defval: '' });

  const result = [];
  raw.forEach((r) => {
    const ped = String(r['Pedido'] || r['PEDIDO'] || '').trim();
    if (!ped) return;

    const rawZona = String(r['Zona'] || r['ZONA'] || '').trim();
    if (isSuroeste && !mySuroesteZones.has(rawZona)) {
      return;
    }

    const rawFechaFin = r['Fecha Fin'] || r['FECHA FIN'] || r['Marca Fin'];
    const rawHoraFin = r['Hora Fin'] || r['HORA FIN'] || '';
    const marcaFinStr = excelDateToString(rawFechaFin, true, rawHoraFin);
    const fechaFinStr = excelDateToString(rawFechaFin, false);

    const dateInfo = getDateInfo(rawFechaFin, fechaFinStr);
    if (dateInfo.ts > maxFechaFinSlaTs) {
      maxFechaFinSlaTs = dateInfo.ts;
      maxFechaFinSlaStr = fechaFinStr;
    }

    const cumplioSlaVal = Number(r['Cumplio SLA TS']) === 1 || String(r['Cumplio SLA TS']).toUpperCase() === 'S' ? 1 : 0;
    const negocio = getNegocio(r);

    const row = {
      id: `sla_${ped}`,
      PEDIDO: ped,
      CLIENTE: String(r['Cliente'] || r['CLIENTE'] || '').trim(),
      ATM: String(r['ATM ID'] || r['ATM'] || '').trim(),
      DIRECCION: String(r['Direccion'] || r['DIRECCION'] || '').trim(),
      LOCALIDAD: String(r['Localidad'] || r['LOCALIDAD'] || '').trim(),
      PROVINCIA: String(r['Provincia'] || r['PROVINCIA'] || '').trim(),
      ZONA: rawZona,
      'ZONA LOCAL': isSuroeste ? 'Suroeste' : 'Patagonia',
      'TECNICO ASISTIO': String(r['Tecnico Asig'] || r['Tecnico Zona'] || '').trim(),
      'TECNICO ZONA': String(r['Tecnico Zona'] || '').trim(),
      'FECHA FIN': fechaFinStr,
      'MARCA FIN': marcaFinStr,
      'CODIGO CIERRE': String(r['Cod Cierre'] || r['CODIGOCIERRE'] || 'COMPL').trim(),
      'CUMPLIO SLA': cumplioSlaVal,
      'FALLA RECURRENTE': String(r['Falla Recurrente'] || 'N').trim().toUpperCase() === 'S' ? 'S' : 'N',
      NEGOCIO: negocio,
      'CONCEPTO LLAMADA': String(r['Tipo'] || 'SERVICE CALL').trim(),
      'Fin de semana': dateInfo.finDeSemana,
      Semana: dateInfo.semana,
      Mes: dateInfo.mes,
      Día: dateInfo.dia
    };
    result.push(row);
  });
  return result;
}

if (fs.existsSync(fSlaPat)) {
  const patSlaRows = processSlaFile(fSlaPat, false);
  const surSlaRows = processSlaFile(fSlaSur, true);
  slaData = [...patSlaRows, ...surSlaRows];
  console.log(`✅ SLA procesado desde Reportes/: ${slaData.length} registros (Patagonia: ${patSlaRows.length}, Suroeste: ${surSlaRows.length})`);
  console.log(`   Última Fecha Fin detectada en SLA: ${maxFechaFinSlaStr}`);
}

// 3. MANTENER O PROCESAR CERRADOS TELCA
let telcaData = [];
const existingTelcaPath = path.join(outDir, 'analisisTelcaData.json');
if (fs.existsSync(existingTelcaPath)) {
  try {
    telcaData = JSON.parse(fs.readFileSync(existingTelcaPath, 'utf8'));
    console.log(`✅ Telca Data cargada (${telcaData.length} registros previos)`);
  } catch (e) {
    console.warn('No se pudo leer analisisTelcaData.json previo');
  }
}

// Guardar archivos JSON
if (suspendidosData.length > 0) {
  fs.writeFileSync(path.join(outDir, 'analisisSuspendidosData.json'), JSON.stringify(suspendidosData));
}
if (slaData.length > 0) {
  fs.writeFileSync(path.join(outDir, 'analisisSlaData.json'), JSON.stringify(slaData));
}

// Guardar metadata
const summary = {
  fechaActualizacion: maxFechaFinSuspendidosStr || '16/09/2026',
  fechaActualizacionSuspendidos: maxFechaFinSuspendidosStr || '16/09/2026',
  fechaActualizacionSla: maxFechaFinSlaStr || '13/09/2026',
  fechaActualizacionTelca: '16/09/2026',
  fuente: 'Reportes Activos (Patagonia & Suroeste)',
  totalSuspendidos: suspendidosData.length,
  totalSla: slaData.length,
  totalTelca: telcaData.length,
  totalGeneral: suspendidosData.length + slaData.length + telcaData.length
};
fs.writeFileSync(path.join(outDir, 'analisisMetadata.json'), JSON.stringify(summary, null, 2));

console.log('🎉 Extracción y normalización de Análisis Atenciones completada con éxito!');
console.log(summary);
