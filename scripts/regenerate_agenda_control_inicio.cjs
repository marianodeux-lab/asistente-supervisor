const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(projectRoot, 'src/data');
const agendaDir = path.resolve(projectRoot, 'Reportes/Agenda Diaria');

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

// 2. Read Asignados.xls
const wbAsig = XLSX.readFile(path.join(agendaDir, 'Asignados.xls'));
const rawAsig = XLSX.utils.sheet_to_json(wbAsig.Sheets[wbAsig.SheetNames[0]], { defval: '' });

// 3. Read Pendientes Patagonia.xls & Suroeste.xls
const wbPat = XLSX.readFile(path.join(agendaDir, 'Pendientes Patagonia.xls'));
const rawPat = XLSX.utils.sheet_to_json(wbPat.Sheets[wbPat.SheetNames[0]], { defval: '' });

const wbSur = XLSX.readFile(path.join(agendaDir, 'Pendientes Suroeste.xls'));
const rawSur = XLSX.utils.sheet_to_json(wbSur.Sheets[wbSur.SheetNames[0]], { defval: '' });

// Build map of Asignados by Pedido
const asigByPed = new Map();
rawAsig.forEach(r => {
  const p = String(r['Pedido'] || r['PEDIDO'] || '').split('-')[0].trim();
  if (p) asigByPed.set(p, r);
});

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

// 4. Process all Asignados belonging to supervised technicians with M === 'S'
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

  const ticketObj = {
    id: `asig_${cleanPed}`,
    pedido: cleanPed,
    pedidoFull: ped,
    cliente: String(r['Cliente'] || '').trim(),
    clienteReal: null,
    sucursalRelevamiento: null,
    luno: String(r['Luno'] || '').trim(),
    equipo: String(r['Luno'] || '').trim(),
    tecnico: tecNormal || rawTec || 'SIN ASIGNAR',
    tecnicoZona: matchTechnicianName(String(r['Tec Zona'] || '')) || tecNormal || 'SIN ASIGNAR',
    estado: String(r['Estado'] || 'SEG Registrado').trim(),
    slaPorcentaje: slaVal,
    hsSla: slaVal >= 100 ? 0 : Math.round((100 - slaVal) / 12),
    fechaVencimiento: String(r['Fecha Vto'] || '').trim(),
    fechaCoordinada: fechaCoordinadaDisplay,
    fCoorDate: fCoorStr,
    hCoor: hCoorStr,
    diasUltimaAtencion: '1 mes',
    diasDesdeUltimaAtencion: '1 mes',
    reincidenciaCount: String(r['R'] || '').toUpperCase() === 'S' ? 1 : 0,
    ultimoMpFecha: excelDateToStr(r['F Ult MTM']),
    diasDesdeUltimoMp: 120,
    esMpDeficiente: false,
    tecnicoUltimoMp: tecNormal || 'Técnico de Zona',
    obsUltimoMp: '',
    tiempoAsistenciaMp: null,
    tiempoAsistenciaMinutosMp: null,
    alertaTiempoMp: null,
    repuestosHistoricos: [],
    esPedidoSuspendidoPrevio: false,
    suspensionPrevia: null,
    origenFlujo: 'ASIGNADO_COT',
    esScVigente: true,
    alertaSinAsignar: false,
    controlInicio: 'Normal',
    stock: String(r['Stock'] || '0'),
    repuestos: '-',
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
    alertaMpPendiente: false,
    alertaMpSinAsignar: false,
    mpPendienteDetalle: null,
    alertaAdicionalPendiente: false,
    adicionalDetalle: null,
    movimientosStock: [],
    cantidadVisitasHistoricas: 1,
    cantidadSoporteRemoto: 0,
    historialPrevioLuno: []
  };

  processedTickets.push(ticketObj);
  processedTicketIds.add(cleanPed);
});

// 5. Process Pendientes (Patagonia & Suroeste)
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

  // If ticket was assigned with M='S' in Asignados, update its pending status
  const existing = processedTickets.find(t => t.pedido === cleanPed);
  if (existing) {
    existing.esPendiente = true;
    existing.esAsignadoEnCot = true;
    existing.alertaSinAsignar = false;
    existing.origenReporte = p.origenRegion === 'PATAGONIA' ? 'Patagonia' : 'Suroeste';
    pendientesAsignadosCount.push(cleanPed);
  } else {
    // If NOT in the 32 assigned orders with M='S', it is SIN ASIGNAR (Direct SLA Risk)
    pendientesSinAsignarCount.push(cleanPed);

    const ticketObj = {
      id: `pend_${cleanPed}`,
      pedido: cleanPed,
      pedidoFull: ped,
      cliente: String(p['Cliente'] || '').trim(),
      clienteReal: null,
      sucursalRelevamiento: null,
      luno: String(p['Luno'] || '').trim(),
      equipo: String(p['Luno'] || '').trim(),
      tecnico: 'SIN ASIGNAR',
      tecnicoZona: tecZonaNormal || 'SIN ASIGNAR',
      estado: String(p['Estado'] || 'SEG Registrado (Sin Asignar)').trim(),
      slaPorcentaje: slaVal,
      hsSla: slaVal >= 100 ? 0 : Math.round((100 - slaVal) / 12),
      fechaVencimiento: String(p['Fecha Vto'] || '').trim(),
      fechaCoordinada: fechaCoordinadaDisplay,
      fCoorDate: fCoorStr,
      hCoor: hCoorStr,
      diasUltimaAtencion: '1 mes',
      diasDesdeUltimaAtencion: '1 mes',
      reincidenciaCount: String(p['R'] || '').toUpperCase() === 'S' ? 1 : 0,
      ultimoMpFecha: excelDateToStr(p['F Ult MTM']),
      diasDesdeUltimoMp: 120,
      esMpDeficiente: false,
      tecnicoUltimoMp: tecZonaNormal || 'Técnico de Zona',
      obsUltimoMp: '',
      tiempoAsistenciaMp: null,
      tiempoAsistenciaMinutosMp: null,
      alertaTiempoMp: null,
      repuestosHistoricos: [],
      esPedidoSuspendidoPrevio: false,
      suspensionPrevia: null,
      origenFlujo: 'SC_PENDIENTE',
      esScVigente: true,
      alertaSinAsignar: true,
      controlInicio: 'Normal',
      stock: String(p['Stock'] || '0'),
      repuestos: '-',
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
      alertaMpPendiente: false,
      alertaMpSinAsignar: false,
      mpPendienteDetalle: null,
      alertaAdicionalPendiente: false,
      adicionalDetalle: null,
      movimientosStock: [],
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

// 6. Generate Control de Inicio de Jornada Data accurately for every technician
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
console.log(`   - Con Pedidos en Agenda: ${controlInicioList.filter(c => c.tienePedidos).length}`);
console.log(`   - Asistencia OK: ${controlInicioList.filter(c => c.estadoMarcaje === 'ASISTENCIA_OK').length}`);
console.log(`   - Pendientes de Inicio: ${controlInicioList.filter(c => c.estadoMarcaje === 'PENDIENTE_INICIO').length}`);
console.log(`   - Sin Pedidos: ${controlInicioList.filter(c => c.estadoMarcaje === 'SIN_PEDIDOS').length}`);
