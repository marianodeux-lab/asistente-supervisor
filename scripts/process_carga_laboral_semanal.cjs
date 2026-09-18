const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

console.log('⚙️ Procesando Carga Laboral Semanal (Réplica del modelo Excel)...');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'src/data');

// 1. Cargar referencias de Técnicos y Zonas
const zRef = JSON.parse(fs.readFileSync(path.join(outDir, 'zonasTecnicosReferencia.json'), 'utf8'));
const tecToZonaMap = new Map();
zRef.forEach(z => {
  tecToZonaMap.set(z.nombre.toLowerCase().trim(), {
    zonaLocal: z.zonaLocal,
    region: z.region,
    zonaTecnica: z.zonaTecnica
  });
});

// 2. Cargar Base Instalada para Distancia KM y ATM ID
const baseClientes = JSON.parse(fs.readFileSync(path.join(outDir, 'baseInstaladaClientesData.json'), 'utf8'));
const atmDistanciaMap = new Map(); // atm -> km
const cliDirToAtmMap = new Map(); // cli|dir -> { atm, km }

baseClientes.forEach(b => {
  const atm = String(b.atm || '').trim();
  const km = Number(b.distancia) || 5;
  if (atm) atmDistanciaMap.set(atm, km);

  const cli = String(b.cliente || '').trim().toLowerCase();
  const dir = String(b.direccion || '').trim().toLowerCase();
  if (cli && dir) {
    cliDirToAtmMap.set(`${cli}|${dir}`, { atm, km });
  }
});

// 3. Cargar Reportes Suspendidos para enriquecer con ATM y Observaciones
const susMap = new Map(); // key: cli|dir -> { atm, obs, km }

function indexSuspendidos(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log('Indexando:', filePath);
  const wb = XLSX.readFile(filePath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 0 });
  rows.forEach(r => {
    const cli = String(r.CLIENTE || '').trim().toLowerCase();
    const dir = String(r.DIRECCION || '').trim().toLowerCase();
    const atm = String(r.ATM || r['ATM ID'] || '').trim();
    const km = Number(r.KM) || 5;
    const obs = String(r.DETALLEFALLA || r.OBSERVACIONESCONTROL || r.DETALLEPROBLEMA || r.PROBLEMAENCONTRADO || '').trim();

    if (cli && dir && !susMap.has(`${cli}|${dir}`)) {
      susMap.set(`${cli}|${dir}`, { atm, obs, km });
    }
  });
}

indexSuspendidos(path.join(projectRoot, 'Reportes/Reporte Suspendidos Patagonia.xls'));
indexSuspendidos(path.join(projectRoot, 'Reportes/Reporte Suspendidos Suroeste.xls'));

// Helpers de conversión de tiempo y fechas de Excel
function fractionToMinutes(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') {
    return Math.round(val * 24 * 60);
  }
  if (typeof val === 'string' && val.includes(':')) {
    const p = val.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }
  return 0;
}

function fractionToTimeStr(val) {
  if (val === undefined || val === null || val === '') return '00:00';
  if (typeof val === 'string' && val.includes(':')) {
    const p = val.split(':');
    return `${p[0].padStart(2, '0')}:${p[1].padStart(2, '0')}`;
  }
  const totalMinutes = Math.round(Number(val) * 24 * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function minutesToHoursStr(mins) {
  const isNeg = mins < 0;
  const absM = Math.abs(mins);
  const h = Math.floor(absM / 60);
  const m = absM % 60;
  return `${isNeg ? '-' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function minutesToDisplay(mins) {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function getDiaSemanaNombre(numDia) {
  const nombres = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  return nombres[numDia] || 'Lunes';
}

function getDayOfWeekFromExcelDate(serial) {
  if (typeof serial === 'number') {
    const utcDays = serial - 25569;
    const d = new Date(utcDays * 86400 * 1000);
    const day = d.getUTCDay();
    return day === 0 ? 7 : day;
  }
  return 1;
}

// 4. Leer Hoja 'Datos Carga' de Análisis Patagonia 2026.xlsx
const wbAnalisis = XLSX.readFile(path.join(projectRoot, 'Análisis Patagonia 2026.xlsx'), { sheets: ['Datos Carga'] });
const rawDatosCarga = XLSX.utils.sheet_to_json(wbAnalisis.Sheets['Datos Carga'], { range: 1 });
console.log(`Leídos ${rawDatosCarga.length} registros de Datos Carga`);

// 5. Agrupar por técnico y por semana
const weeklyMap = new Map();
const allWeeksSet = new Set();
const allTecsSet = new Set();

rawDatosCarga.forEach(r => {
  const tec = String(r['TECNICO ASISTIO'] || '').trim();
  if (!tec) return;
  const normTec = tec.toLowerCase().trim();
  const semana = Number(r['Semana del año']) || 1;

  allWeeksSet.add(semana);
  allTecsSet.add(tec);

  const key = `${normTec}|${semana}`;
  if (!weeklyMap.has(key)) {
    const tecInfo = tecToZonaMap.get(normTec) || { zonaLocal: 'Atlántica', region: 'PATAGONIA', zonaTecnica: 'IN' };
    weeklyMap.set(key, {
      tecnico: tec,
      zonaLocal: tecInfo.zonaLocal,
      region: tecInfo.region,
      zonaTecnica: tecInfo.zonaTecnica,
      semana,
      registros: []
    });
  }

  // Cross-reference info
  const cli = String(r['CLIENTE'] || '').trim();
  const dir = String(r['DIRECCION'] || '').trim();
  const loc = String(r['LOCALIDAD'] || '').trim();
  const lookupKey = `${cli.toLowerCase()}|${dir.toLowerCase()}`;

  const matchSus = susMap.get(lookupKey);
  const matchBase = cliDirToAtmMap.get(lookupKey);

  const atm = matchSus?.atm || matchBase?.atm || 'S/D';
  const obs = matchSus?.obs || 'Atención técnica registrada en jornada laboral';
  const kmVal = Number(r['KM']) || matchSus?.km || matchBase?.km || 5;

  const hIniMins = fractionToMinutes(r['Hora Inicio']);
  const hFinMins = fractionToMinutes(r['Hora Fin']);
  const tAsisMins = fractionToMinutes(r['TIEMPO DE ASISTENCIA']) || (hFinMins >= hIniMins ? hFinMins - hIniMins : 30);

  const fechaSerial = r['Fecha'];
  const diaSemanaNum = getDayOfWeekFromExcelDate(fechaSerial);

  weeklyMap.get(key).registros.push({
    cliente: cli,
    direccion: dir,
    localidad: loc,
    equipo: atm,
    observaciones: obs,
    km: kmVal,
    horaInicio: fractionToTimeStr(r['Hora Inicio']),
    horaFin: fractionToTimeStr(r['Hora Fin']),
    horaInicioMinutos: hIniMins,
    horaFinMinutos: hFinMins,
    tiempoLaboralMinutos: tAsisMins,
    tiempoLaboralStr: minutesToDisplay(tAsisMins),
    fechaSerial,
    diaMes: r['Día'],
    diaSemanaNum,
    diaSemanaNombre: getDiaSemanaNombre(diaSemanaNum)
  });
});

// 6. Construir estructura final para cada semana y técnico
const RATIO_KM = 0.8; // 0.8 minutos por km para trayectos >= 25 km
const DIAS_SEMANA = [
  { num: 1, nombre: 'Lunes' },
  { num: 2, nombre: 'Martes' },
  { num: 3, nombre: 'Miércoles' },
  { num: 4, nombre: 'Jueves' },
  { num: 5, nombre: 'Viernes' },
  { num: 6, nombre: 'Sábado' },
  { num: 7, nombre: 'Domingo' }
];

const resumenSemanas = [];

for (const entry of weeklyMap.values()) {
  const { tecnico, zonaLocal, region, zonaTecnica, semana, registros } = entry;

  let totalMinutosTrabajadosSemana = 0;
  let totalKmSemana = 0;
  let diasConActividad = 0;

  const detalleDias = DIAS_SEMANA.map(dDef => {
    // Filtrar pedidos de este día y ordenar por hora de inicio ascendente
    const pedidosDia = registros
      .filter(r => r.diaSemanaNum === dDef.num)
      .sort((a, b) => a.horaInicioMinutos - b.horaInicioMinutos);

    if (pedidosDia.length === 0) {
      return {
        diaSemana: dDef.nombre,
        diaNum: dDef.num,
        tieneActividad: false,
        totalPedidos: 0,
        primerPedido: null,
        ultimoPedido: null,
        horasLaboralesDiaStr: '00:00',
        horasLaboralesDiaMinutos: 0,
        kmEstimadosDia: 0,
        pedidos: []
      };
    }

    diasConActividad++;
    const primerPedido = pedidosDia[0];
    const ultimoPedido = pedidosDia[pedidosDia.length - 1];

    // Cálculo exacto del Excel:
    // 1. Tiempo transcurrido en sitio entre el inicio del primer pedido y el fin del último pedido
    const tiempoEnSitio = Math.max(0, ultimoPedido.horaFinMinutos - primerPedido.horaInicioMinutos);

    // 2. Tiempo de viaje ida: si KM >= 25 => (KM * 0.8) minutos
    const viajeIdaMins = primerPedido.km >= 25 ? Math.round(primerPedido.km * RATIO_KM) : 0;

    // 3. Tiempo de viaje vuelta: si KM >= 25 => (KM * 0.8) minutos
    const viajeVueltaMins = ultimoPedido.km >= 25 ? Math.round(ultimoPedido.km * RATIO_KM) : 0;

    // Horas totales del día = sitio + viaje ida + viaje vuelta
    const totalDiaMins = tiempoEnSitio + viajeIdaMins + viajeVueltaMins;
    totalMinutosTrabajadosSemana += totalDiaMins;

    // KM estimados del día = KM del primer pedido + KM del último pedido
    const kmDia = primerPedido.km + ultimoPedido.km;
    totalKmSemana += kmDia;

    return {
      diaSemana: dDef.nombre,
      diaNum: dDef.num,
      tieneActividad: true,
      totalPedidos: pedidosDia.length,
      primerPedido: {
        cliente: primerPedido.cliente,
        direccion: primerPedido.direccion,
        localidad: primerPedido.localidad,
        distanciaKm: primerPedido.km,
        horaInicio: primerPedido.horaInicio,
        horaFin: primerPedido.horaFin,
        equipo: primerPedido.equipo,
        observaciones: primerPedido.observaciones,
        tiempoLaboral: primerPedido.tiempoLaboralStr
      },
      ultimoPedido: {
        cliente: ultimoPedido.cliente,
        direccion: ultimoPedido.direccion,
        localidad: ultimoPedido.localidad,
        distanciaKm: ultimoPedido.km,
        horaInicio: ultimoPedido.horaInicio,
        horaFin: ultimoPedido.horaFin,
        equipo: ultimoPedido.equipo,
        observaciones: ultimoPedido.observaciones,
        tiempoLaboral: ultimoPedido.tiempoLaboralStr
      },
      horasLaboralesDiaStr: minutesToHoursStr(totalDiaMins),
      horasLaboralesDiaMinutos: totalDiaMins,
      kmEstimadosDia: kmDia,
      pedidos: pedidosDia.map(p => ({
        cliente: p.cliente,
        equipo: p.equipo,
        direccion: p.direccion,
        localidad: p.localidad,
        distanciaKm: p.km,
        horaInicio: p.horaInicio,
        horaFin: p.horaFin,
        tiempoLaboral: p.tiempoLaboralStr,
        observaciones: p.observaciones
      }))
    };
  });

  // Balance semanal contra 45 hs (2700 minutos)
  const HORAS_DISPONIBLES_MINUTOS = 45 * 60; // 2700 min
  const difMinutos = totalMinutosTrabajadosSemana - HORAS_DISPONIBLES_MINUTOS;
  const promedioDiaMins = diasConActividad > 0 ? Math.round(totalMinutosTrabajadosSemana / diasConActividad) : 0;

  resumenSemanas.push({
    tecnico,
    zonaLocal,
    region,
    zonaTecnica,
    semana,
    diasConActividad,
    totalPedidosSemana: registros.length,
    totalHorasTrabajadasStr: minutesToHoursStr(totalMinutosTrabajadosSemana),
    totalHorasTrabajadasMinutos: totalMinutosTrabajadosSemana,
    promedioHorasDiaStr: minutesToHoursStr(promedioDiaMins),
    horasDisponiblesSemanales: '45:00',
    diferenciaHorasStr: minutesToHoursStr(difMinutos),
    esDeficitario: difMinutos < 0,
    totalKmSemana,
    dias: detalleDias
  });
}

// Ordenar por semana descendente y por técnico
resumenSemanas.sort((a, b) => b.semana - a.semana || a.tecnico.localeCompare(b.tecnico));

const outputPayload = {
  semanaActual: 38,
  semanasDisponibles: Array.from(allWeeksSet).sort((a, b) => b - a),
  tecnicosDisponibles: Array.from(allTecsSet).sort(),
  resumenSemanas
};

fs.writeFileSync(path.join(outDir, 'cargaLaboralSemanalData.json'), JSON.stringify(outputPayload, null, 2));
console.log(`✅ Carga Laboral Semanal generada con éxito: ${resumenSemanas.length} registros técnico-semana`);
