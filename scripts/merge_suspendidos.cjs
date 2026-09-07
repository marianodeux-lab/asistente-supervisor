const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../src/data');

console.log('Processing Reporte Suspendidos + Suspendidos Suroeste...');

const files = [
  path.resolve(__dirname, '../Reportes/Reporte Suspendidos.xls'),
  path.resolve(__dirname, '../Reportes/Reporte Suspendidos Suroeste.xls')
];

let allCronicosMap = new Map();

function excelDateToISO(serial) {
  if (!serial || isNaN(serial)) return null;
  const utcDays = Math.floor(serial - 25569);
  const dateInfo = new Date(utcDays * 86400 * 1000);
  return dateInfo.toISOString();
}

function processSuspendedFile(filePath, defaultZona) {
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    return;
  }
  console.log('Reading:', filePath);
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (!raw || raw.length < 2) return;

  const headerIdx = raw.findIndex(r => r && (r.includes('PEDIDO') || r.includes('Pedido')));
  if (headerIdx === -1) return;

  const headers = raw[headerIdx].map(h => String(h || '').trim());
  const pedIdx = headers.indexOf('PEDIDO') !== -1 ? headers.indexOf('PEDIDO') : headers.indexOf('Pedido');
  const cliIdx = headers.indexOf('CLIENTE') !== -1 ? headers.indexOf('CLIENTE') : headers.indexOf('Cliente');
  const atmIdx = headers.indexOf('ATM') !== -1 ? headers.indexOf('ATM') : headers.indexOf('Luno');
  const tecIdx = headers.indexOf('TECNICO ASISTIO') !== -1 ? headers.indexOf('TECNICO ASISTIO') : headers.indexOf('TECNICO ZONA');
  const cptoIdx = headers.indexOf('CONCEPTO LLAMADA') !== -1 ? headers.indexOf('CONCEPTO LLAMADA') : headers.indexOf('Concepto');
  const fallaIdx = headers.indexOf('OBSERVACIONES CONTROL') !== -1 ? headers.indexOf('OBSERVACIONES CONTROL') : headers.indexOf('PROBLEMA ENCONTRADO');
  const modIdx = headers.indexOf('MPCR') !== -1 ? headers.indexOf('MPCR') : headers.indexOf('Fabricante');
  const fFinIdx = headers.indexOf('MARCA FIN') !== -1 ? headers.indexOf('MARCA FIN') : headers.indexOf('Fecha');
  const zonaIdx = headers.indexOf('ZONA LOCAL') !== -1 ? headers.indexOf('ZONA LOCAL') : headers.indexOf('Zona');

  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r[atmIdx]) continue;

    const luno = String(r[atmIdx]).trim();
    if (luno.length < 3) continue;

    const ped = String(r[pedIdx] || '-').trim();
    const cliente = String(r[cliIdx] || 'Cliente').trim();
    const modelo = String(r[modIdx] || 'ATM/CTD').trim();
    const tecnico = String(r[tecIdx] || 'Técnico').trim();
    const concepto = String(r[cptoIdx] || 'SERVICE CALL').trim();
    const falla = String(r[fallaIdx] || 'Sin detalle').trim();
    const fecha = typeof r[fFinIdx] === 'number' ? excelDateToISO(r[fFinIdx]) : '2026-02-28';
    const zona = String(r[zonaIdx] || defaultZona || 'Patagonia').trim();

    if (!allCronicosMap.has(luno)) {
      allCronicosMap.set(luno, {
        luno,
        cliente,
        modelo,
        totalFallas: 0,
        fallasServiceCall: 0,
        fallasTelca: 0,
        fallasOtros: 0,
        ultimasFallas: [],
        zona,
        tecnicosInvolucrados: new Set(),
        causasFrecuentes: {},
        conceptosFrecuentes: {}
      });
    }

    const entry = allCronicosMap.get(luno);
    entry.totalFallas++;
    if (concepto === 'SERVICE CALL') entry.fallasServiceCall++;
    else if (concepto === 'TELCA' || concepto === 'TELCA2') entry.fallasTelca++;
    else entry.fallasOtros++;

    entry.conceptosFrecuentes[concepto] = (entry.conceptosFrecuentes[concepto] || 0) + 1;
    if (tecnico) entry.tecnicosInvolucrados.add(tecnico);

    // Classify cause
    let causa = "Otras fallas";
    const desc = falla.toLowerCase();
    if (desc.includes('atasco') || desc.includes('recontadora') || desc.includes('escrow') || desc.includes('billete')) causa = "Atasco / Recontadora";
    else if (desc.includes('router') || desc.includes('conectividad') || desc.includes('red') || desc.includes('comunic')) causa = "Conectividad / Router";
    else if (desc.includes('impresora') || desc.includes('papel') || desc.includes('ticket')) causa = "Impresora / Papel";
    else if (desc.includes('placa') || desc.includes('sensor') || desc.includes('hardware') || desc.includes('mother')) causa = "Placas / Sensores";
    else if (desc.includes('calibrac') || desc.includes('software') || desc.includes('config') || desc.includes('actualiz')) causa = "Software / Calibración";
    else if (desc.includes('dispens') || desc.includes('gaveta') || desc.includes('presenter')) causa = "Dispensador / Gavetas";

    entry.causasFrecuentes[causa] = (entry.causasFrecuentes[causa] || 0) + 1;

    if (entry.ultimasFallas.length < 10) {
      entry.ultimasFallas.push({
        pedido: ped,
        fecha: fecha?.split('T')[0] || fecha,
        falla: falla.slice(0, 200),
        tecnico,
        origen: concepto,
        causa
      });
    }
  }
}

processSuspendedFile(files[0], 'Patagonia');
processSuspendedFile(files[1], 'Suroeste');

const mergedList = Array.from(allCronicosMap.values()).map(item => {
  let estadoSalud = "NORMAL";
  let nivelCriticidad = 1;
  if (item.totalFallas >= 6) {
    estadoSalud = "CRÍTICO";
    nivelCriticidad = 3;
  } else if (item.totalFallas >= 3) {
    estadoSalud = "ADVERTENCIA";
    nivelCriticidad = 2;
  }

  const topCausa = Object.entries(item.causasFrecuentes).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Atascos / Mantenimiento';

  return {
    ...item,
    tecnicosInvolucrados: Array.from(item.tecnicosInvolucrados),
    estadoSalud,
    nivelCriticidad,
    topCausa,
    recomendacion: item.totalFallas >= 5
      ? `Equipo con ${item.totalFallas} intervenciones. Causa dominante: ${topCausa}. Se aconseja revisión integral de cabezal/sensores y auditoría de repuestos en próxima visita.`
      : `Revisar calibración y limpieza de sensores ópticos en la próxima asistencia coordinada.`
  };
}).sort((a,b) => b.totalFallas - a.totalFallas);

fs.writeFileSync(path.join(outDir, 'reincidenciasData.json'), JSON.stringify(mergedList.slice(0, 200), null, 2));

console.log(`✅ Processed total of ${mergedList.length} unique LUNOs across Patagonia and Suroeste! Top 200 saved.`);
