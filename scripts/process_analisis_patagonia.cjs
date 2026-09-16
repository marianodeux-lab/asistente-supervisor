const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(projectRoot, 'src/data');

const candidatePaths = [
  path.resolve(projectRoot, 'Análisis Patagonia 2026.xlsx'),
  'D:\\Trabajo\\Análisis Patagonia\\Planillas\\Análisis Patagonia 2026.xlsx',
  'D:\\Trabajo\\Análisis Patagonia\\Planillas\\Análisis Patagonia.xlsx'
];

let targetExcel = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    targetExcel = p;
    break;
  }
}

if (!targetExcel) {
  console.error('❌ Error: No se encontró el archivo Excel Análisis Patagonia 2026.xlsx');
  process.exit(1);
}

console.log('📖 Leyendo archivo Excel:', targetExcel);
const wb = XLSX.readFile(targetExcel);

// Helpers para normalización de fechas y duraciones
function excelDateToString(val, includeTime = true) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) {
    const d = val.getDate().toString().padStart(2, '0');
    const m = (val.getMonth() + 1).toString().padStart(2, '0');
    const y = val.getFullYear();
    if (!includeTime) return `${d}/${m}/${y}`;
    const h = val.getHours().toString().padStart(2, '0');
    const min = val.getMinutes().toString().padStart(2, '0');
    return `${d}/${m}/${y} ${h}:${min}`;
  }
  if (typeof val === 'number') {
    if (val < 1) {
      // Fracción de día -> HH:mm:ss
      const totalSec = Math.round(val * 86400);
      const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
      const min = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
      const sec = (totalSec % 60).toString().padStart(2, '0');
      return `${h}:${min}:${sec}`;
    }
    // Serial date de Excel
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + val * 86400000);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    if (!includeTime) return `${day}/${month}/${year}`;
    const h = d.getUTCHours().toString().padStart(2, '0');
    const min = d.getUTCMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${h}:${min}`;
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

// 1. PROCESAR REPORTE SUSPENDIDOS (Encabezados en fila índice 5)
console.log('⚙️ Procesando hoja "Reporte Suspendidos"...');
const wsSuspendidos = wb.Sheets['Reporte Suspendidos'];
let suspendidosData = [];

if (wsSuspendidos) {
  const raw = XLSX.utils.sheet_to_json(wsSuspendidos, { range: 5, defval: '' });
  suspendidosData = raw.filter(r => r.PEDIDO || r.ATM || r.CLIENTE).map((r, idx) => {
    const row = {};
    for (const [k, v] of Object.entries(r)) {
      const cleanKey = k.trim();
      if (!cleanKey || cleanKey.startsWith('__EMPTY')) continue;
      
      // Formateo de fechas y duraciones
      if (['MARCA ALTA', 'MARCA INICIO', 'MARCA FIN'].includes(cleanKey)) {
        row[cleanKey] = excelDateToString(v, true);
      } else if (cleanKey === 'TIEMPO DE ASISTENCIA') {
        row[cleanKey] = excelDateToString(v, true);
      } else if (cleanKey === 'CUMPLIO SLA') {
        row[cleanKey] = Number(v) === 1 ? 1 : 0;
      } else if (cleanKey === 'Semana' || cleanKey === 'Mes' || cleanKey === 'Año') {
        row[cleanKey] = v !== '' ? Number(v) : '';
      } else {
        row[cleanKey] = typeof v === 'string' ? v.trim() : v;
      }
    }
    
    // Normalizaciones clave
    if (!row['NEGOCIO']) row['NEGOCIO'] = 'Cash Today';
    if (!row['FALLA RECURRENTE']) row['FALLA RECURRENTE'] = 'N';
    if (!row['Utiliza Repuesto']) row['Utiliza Repuesto'] = 'No';
    if (!row['Fin de semana']) row['Fin de semana'] = 'No';
    if (!row['id']) row['id'] = `susp_${row['PEDIDO'] || idx}`;

    return row;
  });
  console.log(`✅ Suspendidos procesados: ${suspendidosData.length} registros`);
}

// 2. PROCESAR REPORTE SLA (Encabezados en fila índice 3)
console.log('⚙️ Procesando hoja "Reporte SLA"...');
const wsSla = wb.Sheets['Reporte SLA'];
let slaData = [];

if (wsSla) {
  const raw = XLSX.utils.sheet_to_json(wsSla, { range: 3, defval: '' });
  slaData = raw.filter(r => r.Pedido || r['ATM ID'] || r.Cliente).map((r, idx) => {
    const row = {};
    for (const [k, v] of Object.entries(r)) {
      const cleanKey = k.trim();
      if (!cleanKey || cleanKey.startsWith('__EMPTY')) continue;

      if (['Fecha Alta', 'Fecha Vto SLA', 'Marca Arribo', 'Marca Fin'].includes(cleanKey)) {
        row[cleanKey] = excelDateToString(v, true);
      } else if (cleanKey === 'Cumplio SLA TS') {
        row[cleanKey] = Number(v) === 1 ? 1 : 0;
      } else if (cleanKey === 'Semana del año' || cleanKey === 'Año') {
        row[cleanKey] = v !== '' ? Number(v) : '';
      } else {
        row[cleanKey] = typeof v === 'string' ? v.trim() : v;
      }
    }

    // Unificación de nombres de propiedades para compatibilidad de filtros
    row['PEDIDO'] = row['Pedido'];
    row['CLIENTE'] = row['Cliente'];
    row['ATM'] = row['ATM ID'];
    row['DIRECCION'] = row['Direccion'];
    row['LOCALIDAD'] = row['Localidad'];
    row['TECNICO ASISTIO'] = row['Tecnico Asig'] || row['Tecnico Zona'] || '';
    row['TECNICO ZONA'] = row['Tecnico Zona'] || '';
    row['NEGOCIO'] = row['Negocio'] || 'Cash Today';
    row['ZONA LOCAL'] = row['Zona Local'] || 'Sur';
    row['CUMPLIO SLA'] = row['Cumplio SLA TS'] === 1 ? 1 : 0;
    row['FALLA RECURRENTE'] = row['Falla Recurrente'] || 'N';
    row['CODIGO CIERRE'] = row['Cod Cierre'] || 'COMPL';
    row['CONCEPTO LLAMADA'] = row['Tipo'] || 'SERVICE CALL';
    row['Semana'] = row['Semana del año'] || '';
    row['Mes'] = row['Nombre del mes'] || '';
    row['id'] = `sla_${row['Pedido'] || idx}`;

    return row;
  });
  console.log(`✅ Reporte SLA procesado: ${slaData.length} registros`);
}

// 3. PROCESAR CERRADOS TELCA / ASISTENCIA REMOTA (Encabezados en fila índice 1)
console.log('⚙️ Procesando hoja "Cerrados TELCA"...');
const wsTelca = wb.Sheets['Cerrados TELCA'];
let telcaData = [];

if (wsTelca) {
  const raw = XLSX.utils.sheet_to_json(wsTelca, { range: 1, defval: '' });
  telcaData = raw.filter(r => r.PEDIDO || r.ATM || r.CLIENTE).map((r, idx) => {
    const row = {};
    for (const [k, v] of Object.entries(r)) {
      const cleanKey = k.trim();
      if (!cleanKey || cleanKey.startsWith('__EMPTY')) continue;

      if (['MARCA ALTA', 'MARCA FIN'].includes(cleanKey)) {
        row[cleanKey] = excelDateToString(v, true);
      } else {
        row[cleanKey] = typeof v === 'string' ? v.trim() : v;
      }
    }

    // Derivar Día, Semana, Fin de semana si falta a partir de MARCA ALTA
    let dia = 'lunes';
    let semana = 1;
    let finDeSemana = 'No';
    if (r['MARCA ALTA'] && typeof r['MARCA ALTA'] === 'number') {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(epoch.getTime() + r['MARCA ALTA'] * 86400000);
      dia = DIAS_SEMANA[d.getUTCDay()];
      semana = getWeekNumber(d);
      finDeSemana = (d.getUTCDay() === 0 || d.getUTCDay() === 6) ? 'Sí' : 'No';
    }

    row['Día'] = row['Día'] || dia;
    row['Semana'] = row['Semana'] || semana;
    row['Fin de semana'] = row['Fin de semana'] || finDeSemana;
    row['CUMPLIO SLA'] = 1; // TELCA cerrado exitosamente
    row['Utiliza Repuesto'] = 'No'; // Soporte remoto no lleva repuestos
    row['TECNICO ASISTIO'] = ''; // En asistencia remota NO hay técnico asignado/asistió presencial
    if (!row['NEGOCIO']) row['NEGOCIO'] = 'Cash Today';
    if (!row['FALLA RECURRENTE']) row['FALLA RECURRENTE'] = 'N';
    row['id'] = `telca_${row['PEDIDO'] || idx}`;

    return row;
  });
  console.log(`✅ Cerrados TELCA procesados: ${telcaData.length} registros`);
}

// Guardar archivos JSON
fs.writeFileSync(path.join(outDir, 'analisisSuspendidosData.json'), JSON.stringify(suspendidosData));
fs.writeFileSync(path.join(outDir, 'analisisSlaData.json'), JSON.stringify(slaData));
fs.writeFileSync(path.join(outDir, 'analisisTelcaData.json'), JSON.stringify(telcaData));

// Guardar archivo con resumen metadata
const summary = {
  fechaActualizacion: '09/03/2026',
  fuente: 'Análisis Patagonia 2026.xlsx',
  totalSuspendidos: suspendidosData.length,
  totalSla: slaData.length,
  totalTelca: telcaData.length,
  totalGeneral: suspendidosData.length + slaData.length + telcaData.length
};
fs.writeFileSync(path.join(outDir, 'analisisMetadata.json'), JSON.stringify(summary, null, 2));

console.log('🎉 Extracción y normalización de Análisis Patagonia completada con éxito!');
console.log(summary);
