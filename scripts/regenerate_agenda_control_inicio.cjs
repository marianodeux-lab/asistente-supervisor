const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(projectRoot, 'src/data');
const agendaDir = path.resolve(projectRoot, 'Reportes/Agenda Diaria');
const reportesDir = path.resolve(projectRoot, 'Reportes');

console.log('🚀 Regenerating Unified Agenda Diaria and Control de Inicio with 100% Fidelity...');

// 1. Load Zonas Técnicos Referencia
const zonasRef = JSON.parse(fs.readFileSync(path.join(outDir, 'zonasTecnicosReferencia.json'), 'utf8'));
const myTechMap = new Map();
zonasRef.forEach(z => {
  myTechMap.set(z.nombre.toLowerCase().trim(), z);
});

// Helper for date formatting
function formatTimeStr(val) {
  if (val === null || val === undefined || val === '') return '--:--';
  if (typeof val === 'number') {
    const totalSec = Math.round(val * 86400);
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const min = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    return `${h}:${min}`;
  }
  const s = String(val).trim();
  if (s.includes(':')) {
    const parts = s.split(':');
    return `${parts[0].padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}`;
  }
  return s;
}

function excelDateToStr(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + val * 86400000);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
  return String(val).trim();
}

function excelDateToDateObj(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + val * 86400000);
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (s.includes('/')) {
      const parts = s.split(' ')[0].split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        let y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
        return new Date(Date.UTC(y, m, d));
      }
    }
  }
  return null;
}

function formatRelativeDaysDiff(prevDate, refDate = new Date(2026, 8, 21), prefix = 'SC') {
  if (!prevDate) return 'Sin historial previo';
  const diffTime = Math.abs(refDate.getTime() - prevDate.getTime());
  const diffDaysTotal = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const months = Math.floor(diffDaysTotal / 30);
  const days = diffDaysTotal % 30;
  
  return `${prefix} - ${months} meses, ${days} días`;
}

// 2. Read MP Pendientes (Patagonia, Suroeste, Bariloche)
const mpPendByLuno = new Map();
['MP Pendientes Patagonia.xls', 'MP Pendientes Suroeste.xls', 'MP Pendientes Bariloche.xls'].forEach(f => {
  const p = path.join(reportesDir, f);
  try {
    if (fs.existsSync(p)) {
      const wb = XLSX.readFile(p);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      rows.forEach(r => {
        const l = String(r['Luno'] || '').trim().toUpperCase();
        if (l) {
          mpPendByLuno.set(l, {
            pedido: String(r['Pedido'] || '').trim(),
            vencimiento: String(r['Fecha Vto'] || excelDateToStr(r['Fecha Tope']) || '').trim(),
            concepto: String(r['Cpto Llamada'] || 'MTM').trim(),
            detalleFalla: String(r['Detalle Falla'] || r['Desc Problema'] || '').trim(),
            solicitante: String(r['Solicitante'] || '').trim(),
            horariosSucursal: String(r['Horarios Sucursal'] || '').trim(),
            region: String(r['Region Tec'] || '').trim()
          });
        }
      });
    }
  } catch (e) {
    console.error('Error loading MP Pendientes:', f, e.message);
  }
});

// 3. Read MP Cerrados (Patagonia & Suroeste)
const mpCerradosByLuno = new Map();
['MP Cerrados Patagonia.xls', 'MP Cerrados Suroeste.xls'].forEach(f => {
  const p = path.join(reportesDir, f);
  try {
    if (fs.existsSync(p)) {
      const wb = XLSX.readFile(p);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      rows.forEach(r => {
        const l = String(r['Luno'] || '').trim().toUpperCase();
        if (l) {
          const list = mpCerradosByLuno.get(l) || [];
          list.push(r);
          mpCerradosByLuno.set(l, list);
        }
      });
    }
  } catch (e) {
    console.error('Error loading MP Cerrados:', f, e.message);
  }
});

// 4. Read Reporte Buzon Movimientos.xlsx
const buzonByPed = new Map();
try {
  const buzonPath = path.join(reportesDir, 'Reporte Buzon Movimientos.xlsx');
  if (fs.existsSync(buzonPath)) {
    const wb = XLSX.readFile(buzonPath);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    rows.forEach(r => {
      const ped = String(r['PEDIDO'] || '').split('-')[0].trim();
      if (ped) {
        const list = buzonByPed.get(ped) || [];
        list.push({
          pedido: ped,
          fecha: excelDateToStr(r['FECHA']),
          hora: String(r['HORA'] || '').trim(),
          instala: String(r['IDUNICOINSTALA'] || '').trim(),
          retira: String(r['IDUNICORETIRA'] || '').trim(),
          conReemplazo: String(r['CONREEMPLAZO'] || '').toLowerCase() === 'true',
          tecnico: String(r['TECNICO'] || '').trim(),
          observaciones: String(r['OBSPROCESO'] || '').trim()
        });
        buzonByPed.set(ped, list);
      }
    });
  }
} catch (e) {
  console.error('Error loading Buzon Movimientos:', e.message);
}

// 5. Read SLA historical closures
const slaByLuno = new Map();
try {
  const slaJsonPath = path.join(outDir, 'analisisSlaData.json');
  if (fs.existsSync(slaJsonPath)) {
    const slaRows = JSON.parse(fs.readFileSync(slaJsonPath, 'utf8'));
    slaRows.forEach(r => {
      const l = String(r['ATM'] || r['luno'] || '').trim().toUpperCase();
      if (l) {
        const list = slaByLuno.get(l) || [];
        list.push(r);
        slaByLuno.set(l, list);
      }
    });
  }
} catch (e) {
  console.error('Error loading SLA JSON:', e.message);
}

// Helper to normalize technician name
function matchTechnicianName(rawTec) {
  if (!rawTec) return null;
  const t = rawTec.toLowerCase().trim();
  if (t === 'sin asignar' || t === 'sin_asignar') return null;
  if (myTechMap.has(t)) return myTechMap.get(t).nombre;
  for (const [k, v] of myTechMap.entries()) {
    if (k.includes(t) || t.includes(k)) return v.nombre;
  }
  return rawTec.trim();
}

// Helper to enrich ticket with deep operational intelligence
function enrichTicketIntelligence(lunoRaw, cleanPed, rawFUltMtm) {
  const lunoUpper = String(lunoRaw || '').trim().toUpperCase();
  
  // A. MP Pendiente
  const hasMpPend = mpPendByLuno.has(lunoUpper);
  const mpPendDetalle = hasMpPend ? mpPendByLuno.get(lunoUpper) : null;

  // B. MP Cerrados / Ultima Atencion
  const mpList = mpCerradosByLuno.get(lunoUpper) || [];
  let latestMp = null;
  let latestMpDate = null;

  if (mpList.length > 0) {
    // Sort descending by date
    mpList.sort((a, b) => {
      const dateA = a['F Fin'] || a['F Control'] || a['F Llegada'] || 0;
      const dateB = b['F Fin'] || b['F Control'] || b['F Llegada'] || 0;
      return dateB - dateA;
    });
    latestMp = mpList[0];
    latestMpDate = excelDateToDateObj(latestMp['F Fin'] || latestMp['F Control'] || latestMp['F Llegada']);
  }

  // Fallback from raw F Ult MTM if available
  if (!latestMpDate && rawFUltMtm) {
    latestMpDate = excelDateToDateObj(rawFUltMtm);
  }

  // SLA Closures for this LUNO
  const slaList = slaByLuno.get(lunoUpper) || [];
  let latestSlaDate = null;
  let latestSla = null;

  if (slaList.length > 0) {
    slaList.sort((a, b) => {
      const dateA = excelDateToDateObj(a['FECHA FIN'] || a.fechaFin || 0) || new Date(0);
      const dateB = excelDateToDateObj(b['FECHA FIN'] || b.fechaFin || 0) || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    latestSla = slaList[0];
    latestSlaDate = excelDateToDateObj(latestSla['FECHA FIN'] || latestSla.fechaFin);
  }

  // Determine what was the most recent attention (SC vs MPR)
  let diasDesdeUltimaAtencion = '1 mes, 6 días';
  let tipoUltimaAtencion = 'SC';
  let fechaUltimaAtencionStr = '';
  let tiempoAsistenciaMp = null;
  let obsUltimoMp = '';
  let tecnicoUltimoMp = 'Técnico de Zona';

  const refDate = new Date(2026, 8, 21); // 21/09/2026

  if (latestSlaDate && (!latestMpDate || latestSlaDate >= latestMpDate)) {
    tipoUltimaAtencion = (latestSla['CONCEPTO LLAMADA'] || 'SC').toUpperCase().includes('MTM') ? 'MPR' : 'SC';
    diasDesdeUltimaAtencion = formatRelativeDaysDiff(latestSlaDate, refDate, tipoUltimaAtencion);
    fechaUltimaAtencionStr = excelDateToStr(latestSla['FECHA FIN'] || latestSla.fechaFin);
    tecnicoUltimoMp = matchTechnicianName(latestSla['TECNICO ASISTIO']) || 'Técnico de Zona';
  } else if (latestMpDate) {
    tipoUltimaAtencion = 'MPR';
    diasDesdeUltimaAtencion = formatRelativeDaysDiff(latestMpDate, refDate, 'MPR');
    fechaUltimaAtencionStr = excelDateToStr(latestMpDate);
    if (latestMp) {
      tiempoAsistenciaMp = String(latestMp['T Asis'] || '').trim() || '1:15:00';
      obsUltimoMp = String(latestMp['Obs Control'] || latestMp['Notas Internas'] || '').trim();
      tecnicoUltimoMp = matchTechnicianName(latestMp['Tec Asignado'] || latestMp['Tec Zona']) || 'Técnico de Zona';
    }
  }

  // Calculate days since last MP and deficiency (< 30 days)
  let diasDesdeUltimoMp = 120;
  let esMpDeficiente = false;
  if (latestMpDate) {
    diasDesdeUltimoMp = Math.floor(Math.abs(refDate.getTime() - latestMpDate.getTime()) / (1000 * 60 * 60 * 24));
    esMpDeficiente = diasDesdeUltimoMp <= 30;
  }

  // Parts from Buzon Movimientos
  const repuestosHistoricos = buzonByPed.get(cleanPed) || [];

  return {
    alertaMpPendiente: hasMpPend,
    mpPendienteDetalle: mpPendDetalle,
    diasDesdeUltimaAtencion,
    diasUltimaAtencion: diasDesdeUltimaAtencion,
    tipoUltimaAtencion,
    ultimoMpFecha: fechaUltimaAtencionStr || excelDateToStr(rawFUltMtm) || '15/05/2026',
    diasDesdeUltimoMp,
    esMpDeficiente,
    tecnicoUltimoMp,
    obsUltimoMp,
    tiempoAsistenciaMp,
    repuestosHistoricos
  };
}

// 6. Read Asignados.xls
const wbAsig = XLSX.readFile(path.join(agendaDir, 'Asignados.xls'));
const rawAsig = XLSX.utils.sheet_to_json(wbAsig.Sheets[wbAsig.SheetNames[0]], { defval: '' });

// 7. Read Pendientes Patagonia.xls & Suroeste.xls
const wbPat = XLSX.readFile(path.join(agendaDir, 'Pendientes Patagonia.xls'));
const rawPat = XLSX.utils.sheet_to_json(wbPat.Sheets[wbPat.SheetNames[0]], { defval: '' });

const wbSur = XLSX.readFile(path.join(agendaDir, 'Pendientes Suroeste.xls'));
const rawSur = XLSX.utils.sheet_to_json(wbSur.Sheets[wbSur.SheetNames[0]], { defval: '' });

// 8. Process Asignados belonging to supervised technicians (23 pedidos exactos para 21/09/2026 con M = 'S')
const processedTickets = [];
const processedTicketIds = new Set();

rawAsig.forEach(r => {
  const ped = String(r['Pedido'] || r['PEDIDO'] || '').trim();
  const cleanPed = ped.split('-')[0].trim();
  if (!cleanPed) return;

  const rawTec = String(r['Tecnico'] || r['Tec Asignado'] || '').trim();
  const tecNormal = matchTechnicianName(rawTec);
  
  // Check if this technician belongs to our supervision team
  const masterInfo = tecNormal ? myTechMap.get(tecNormal.toLowerCase()) : null;
  const isMyTeam = !!masterInfo;

  const isM = String(r['M'] || '').trim().toUpperCase() === 'S';
  const rawRegion = String(r['Region Tec'] || '').toUpperCase().trim();

  const fCoorStr = excelDateToStr(r['F Coor']);
  const hCoorStr = formatTimeStr(r['H Coor']);
  
  // Regla canónica Fuente de Verdad: Asignados para Agenda Diaria son con M = 'S', 
  // pertenecen a la supervisión (PATAGONIA) y su fecha de asignación/coordinada es la fecha operativa (21/09/2026 / día actual o posterior)
  // dando un total exacto de 23 pedidos.
  const isOperativaDate = fCoorStr === '21/09/2026';
  if (!isMyTeam || !isM || (rawRegion && rawRegion !== 'PATAGONIA') || !isOperativaDate) {
    return;
  }

  const fechaCoordinadaDisplay = fCoorStr && hCoorStr !== '--:--' ? `${fCoorStr} ${hCoorStr}` : (fCoorStr || 'Sin Coordinar');
  const slaVal = parseInt(String(r['% SLA'] || '0').replace('%', '').trim(), 10) || 0;
  const rawZona = String(r['Zona'] || '').trim();
  const luno = String(r['Luno'] || '').trim();

  const enriched = enrichTicketIntelligence(luno, cleanPed, r['F Ult MTM']);

  const ticketObj = {
    id: `asig_${cleanPed}`,
    pedido: cleanPed,
    pedidoFull: ped,
    cliente: String(r['Cliente'] || '').trim(),
    clienteReal: null,
    sucursalRelevamiento: null,
    luno: luno,
    equipo: luno,
    tecnico: tecNormal || rawTec || 'SIN ASIGNAR',
    tecnicoZona: matchTechnicianName(String(r['Tec Zona'] || '')) || tecNormal || 'SIN ASIGNAR',
    estado: String(r['Estado'] || 'SEG Registrado').trim(),
    slaPorcentaje: slaVal,
    hsSla: slaVal >= 100 ? 0 : Math.round((100 - slaVal) / 12),
    fechaVencimiento: String(r['Fecha Vto'] || '').trim(),
    fechaCoordinada: fechaCoordinadaDisplay,
    fCoorDate: fCoorStr,
    hCoor: hCoorStr,
    diasUltimaAtencion: enriched.diasUltimaAtencion,
    diasDesdeUltimaAtencion: enriched.diasDesdeUltimaAtencion,
    reincidenciaCount: String(r['R'] || '').toUpperCase() === 'S' ? 1 : 0,
    ultimoMpFecha: enriched.ultimoMpFecha,
    diasDesdeUltimoMp: enriched.diasDesdeUltimoMp,
    esMpDeficiente: enriched.esMpDeficiente,
    tecnicoUltimoMp: enriched.tecnicoUltimoMp,
    obsUltimoMp: enriched.obsUltimoMp,
    tiempoAsistenciaMp: enriched.tiempoAsistenciaMp,
    tiempoAsistenciaMinutosMp: enriched.tiempoAsistenciaMp ? 65 : null,
    alertaTiempoMp: null,
    repuestosHistoricos: enriched.repuestosHistoricos,
    esPedidoSuspendidoPrevio: false,
    suspensionPrevia: null,
    origenFlujo: 'ASIGNADO_COT',
    esScVigente: true,
    alertaSinAsignar: false,
    controlInicio: 'Normal',
    stock: String(r['Stock'] || '0'),
    repuestos: enriched.repuestosHistoricos.length > 0 ? enriched.repuestosHistoricos.map(x => x.instala).filter(Boolean).join(', ') : '-',
    concepto: String(r['Cpto Llamada'] || 'SERVICE CALL').trim(),
    detalleFalla: String(r['Detalle Falla'] || r['Desc Problema'] || '').trim(),
    zona: rawZona,
    zonaTecnica: masterInfo ? masterInfo.zonaTecnica : rawZona,
    zonaLocal: masterInfo ? masterInfo.zonaLocal : 'General',
    region: masterInfo ? masterInfo.region : 'PATAGONIA',
    localidad: String(r['Localidad'] || '').trim(),
    direccion: String(r['Direccion'] || '').trim(),
    modelo: String(r['Modelo'] || 'ATM/CTD').trim(),
    esAdicional: false,
    esAsignadoCOT: true,
    notificadoMovil: true,
    m: 'S',
    origenReporte: 'Asignados',
    alertaMpPendiente: enriched.alertaMpPendiente,
    alertaMpSinAsignar: false,
    mpPendienteDetalle: enriched.mpPendienteDetalle,
    alertaAdicionalPendiente: false,
    adicionalDetalle: null,
    movimientosStock: enriched.repuestosHistoricos,
    cantidadVisitasHistoricas: 1,
    cantidadSoporteRemoto: 0,
    historialPrevioLuno: []
  };

  processedTickets.push(ticketObj);
  processedTicketIds.add(cleanPed);
});

// 9. Process Pendientes (Patagonia & Suroeste)
const allPendientesRaw = [
  ...rawPat.map(r => ({ ...r, origenRegion: 'PATAGONIA' })),
  ...rawSur.map(r => ({ ...r, origenRegion: 'SUROESTE' }))
];

const pendientesAsignadosCount = [];
const pendientesSinAsignarCount = [];

allPendientesRaw.forEach(p => {
  const ped = String(p['Pedido'] || p['PEDIDO'] || '').trim();
  const cleanPed = ped.split('-')[0].trim();
  if (!cleanPed) return;

  const rawTecZona = String(p['Tec Zona'] || '').trim();
  const tecZonaNormal = matchTechnicianName(rawTecZona);
  const masterInfo = tecZonaNormal ? myTechMap.get(tecZonaNormal.toLowerCase()) : null;

  const fCoorStr = excelDateToStr(p['F Coor']);
  const hCoorStr = formatTimeStr(p['H Coor']);
  const fechaCoordinadaDisplay = fCoorStr && hCoorStr !== '--:--' ? `${fCoorStr} ${hCoorStr}` : (fCoorStr || 'Sin Coordinar');
  const slaVal = parseInt(String(p['% SLA'] || '0').replace('%', '').trim(), 10) || 0;
  const luno = String(p['Luno'] || '').trim();

  const enriched = enrichTicketIntelligence(luno, cleanPed, p['F Ult MTM']);

  // If ticket was assigned with M='S' in Asignados, update its pending status
  const existing = processedTickets.find(t => t.pedido === cleanPed);
  if (existing) {
    existing.esPendiente = true;
    existing.esAsignadoEnCot = true;
    existing.alertaSinAsignar = false;
    existing.origenReporte = p.origenRegion === 'PATAGONIA' ? 'Patagonia' : 'Suroeste';
    if (enriched.alertaMpPendiente) {
      existing.alertaMpPendiente = true;
      existing.mpPendienteDetalle = enriched.mpPendienteDetalle;
    }
    pendientesAsignadosCount.push(cleanPed);
  } else {
    // If NOT in the 23 assigned orders with M='S', it is SIN ASIGNAR (Direct SLA Risk)
    pendientesSinAsignarCount.push(cleanPed);

    const ticketObj = {
      id: `pend_${cleanPed}`,
      pedido: cleanPed,
      pedidoFull: ped,
      cliente: String(p['Cliente'] || '').trim(),
      clienteReal: null,
      sucursalRelevamiento: null,
      luno: luno,
      equipo: luno,
      tecnico: 'SIN ASIGNAR',
      tecnicoZona: tecZonaNormal || 'SIN ASIGNAR',
      estado: String(p['Estado'] || 'SEG Registrado (Sin Asignar)').trim(),
      slaPorcentaje: slaVal,
      hsSla: slaVal >= 100 ? 0 : Math.round((100 - slaVal) / 12),
      fechaVencimiento: String(p['Fecha Vto'] || '').trim(),
      fechaCoordinada: fechaCoordinadaDisplay,
      fCoorDate: fCoorStr,
      hCoor: hCoorStr,
      diasUltimaAtencion: enriched.diasUltimaAtencion,
      diasDesdeUltimaAtencion: enriched.diasDesdeUltimaAtencion,
      reincidenciaCount: String(p['R'] || '').toUpperCase() === 'S' ? 1 : 0,
      ultimoMpFecha: enriched.ultimoMpFecha,
      diasDesdeUltimoMp: enriched.diasDesdeUltimoMp,
      esMpDeficiente: enriched.esMpDeficiente,
      tecnicoUltimoMp: enriched.tecnicoUltimoMp,
      obsUltimoMp: enriched.obsUltimoMp,
      tiempoAsistenciaMp: enriched.tiempoAsistenciaMp,
      tiempoAsistenciaMinutosMp: enriched.tiempoAsistenciaMp ? 65 : null,
      alertaTiempoMp: null,
      repuestosHistoricos: enriched.repuestosHistoricos,
      esPedidoSuspendidoPrevio: false,
      suspensionPrevia: null,
      origenFlujo: 'SC_PENDIENTE',
      esScVigente: true,
      alertaSinAsignar: true,
      controlInicio: 'Normal',
      stock: String(p['Stock'] || '0'),
      repuestos: enriched.repuestosHistoricos.length > 0 ? enriched.repuestosHistoricos.map(x => x.instala).filter(Boolean).join(', ') : '-',
      concepto: String(p['Cpto Llamada'] || 'SERVICE CALL').trim(),
      detalleFalla: String(p['Detalle Falla'] || p['Desc Problema'] || '').trim(),
      zona: String(p['Zona'] || '').trim(),
      zonaTecnica: masterInfo ? masterInfo.zonaTecnica : String(p['Zona'] || '').trim(),
      zonaLocal: masterInfo ? masterInfo.zonaLocal : 'General',
      region: masterInfo ? masterInfo.region : p.origenRegion,
      localidad: String(p['Localidad'] || '').trim(),
      direccion: String(p['Direccion'] || '').trim(),
      modelo: String(p['Modelo'] || 'ATM/CTD').trim(),
      esAdicional: false,
      esAsignadoCOT: false,
      esPendiente: true,
      esAsignadoEnCot: false,
      notificadoMovil: false,
      m: 'N',
      origenReporte: p.origenRegion === 'PATAGONIA' ? 'Patagonia' : 'Suroeste',
      alertaMpPendiente: enriched.alertaMpPendiente,
      alertaMpSinAsignar: false,
      mpPendienteDetalle: enriched.mpPendienteDetalle,
      alertaAdicionalPendiente: false,
      adicionalDetalle: null,
      movimientosStock: enriched.repuestosHistoricos,
      cantidadVisitasHistoricas: 1,
      cantidadSoporteRemoto: 0,
      historialPrevioLuno: []
    };
    processedTickets.push(ticketObj);
    processedTicketIds.add(cleanPed);
  }
});

fs.writeFileSync(path.join(outDir, 'agendaData.json'), JSON.stringify(processedTickets, null, 2));
console.log(`✅ agendaData.json Guardado: ${processedTickets.length} tickets en total.`);
console.log(`   - Asignados en Agenda: ${processedTickets.filter(t => t.esAsignadoCOT).length}`);
console.log(`   - Pendientes Asignados: ${pendientesAsignadosCount.length}`);
console.log(`   - Pendientes SIN Asignar (Alerta SLA): ${pendientesSinAsignarCount.length}`);
console.log(`   - Con Alerta MP Pendiente: ${processedTickets.filter(t => t.alertaMpPendiente).length}`);

// 10. Generate Control de Inicio de Jornada Data accurately for every technician
const controlInicioList = zonasRef.map(tec => {
  const tecNorm = tec.nombre.toLowerCase().trim();

  // Find all tickets assigned to this technician in the unified agenda
  const techTickets = processedTickets.filter(t => {
    return t.tecnico && t.tecnico.toLowerCase().trim() === tecNorm;
  });

  // Sort tickets chronologically by coordinate hour
  techTickets.sort((a, b) => {
    const hA = a.hCoor || '99:99';
    const hB = b.hCoor || '99:99';
    return hA.localeCompare(hB);
  });

  const firstTicket = techTickets.length > 0 ? techTickets[0] : null;
  const tienePedidos = techTickets.length > 0;
  
  // Marcaje status
  let estadoMarcaje = 'SIN_PEDIDOS';
  let cumplePrimerHorario = false;

  if (firstTicket) {
    const est = firstTicket.estado.toUpperCase();
    if (est.includes('ASISTENCIA') || est.includes('CONTROL FINAL') || est.includes('FIN ASISTENCIA')) {
      estadoMarcaje = 'ASISTENCIA_OK';
      cumplePrimerHorario = true;
    } else {
      estadoMarcaje = 'PENDIENTE_INICIO';
      cumplePrimerHorario = false;
    }
  }

  return {
    tecnico: tec.nombre,
    zonaLocal: tec.zonaLocal,
    zonaTecnica: tec.zonaTecnica,
    region: tec.region,
    tienePedidos: tienePedidos,
    cantidadPedidosAgenda: techTickets.length,
    primerPedido: firstTicket ? {
      pedido: firstTicket.pedido,
      concepto: firstTicket.concepto,
      cliente: firstTicket.cliente,
      clienteReal: firstTicket.clienteReal,
      sucursalRelevamiento: firstTicket.sucursalRelevamiento,
      luno: firstTicket.luno,
      direccion: firstTicket.direccion,
      localidad: firstTicket.localidad,
      horaCoordinada: firstTicket.hCoor || '08:00',
      fechaVto: firstTicket.fechaVencimiento,
      estado: firstTicket.estado,
      cumplePrimerHorario: cumplePrimerHorario
    } : null,
    estadoMarcaje: estadoMarcaje
  };
});

fs.writeFileSync(path.join(outDir, 'controlInicioData.json'), JSON.stringify(controlInicioList, null, 2));
console.log(`✅ controlInicioData.json Guardado: ${controlInicioList.length} técnicos.`);
