const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(projectRoot, 'src/data');

console.log('🚀 Iniciando Motor de Causalidades SLA Patagonia & Suroeste...');

// 1. Cargar Nómina de Técnicos de Referencia
const zonasRef = require(path.resolve(projectRoot, 'src/data/zonasTecnicosReferencia.json'));
const myTechMap = new Map();
zonasRef.forEach(t => {
  const norm = (t.nombre || '').toLowerCase().trim();
  myTechMap.set(norm, t);
});

// Zonas oficiales de la supervisión
const mySuroesteZones = new Set(['IN BAR', 'IN CIP', 'IN NQN']);

// 2. Cargar Master LP (Descripciones de PNs)
const masterLpMap = new Map();
const fileMasterLp = path.resolve(projectRoot, 'Reportes/Datos/Master LP.xlsx');
if (fs.existsSync(fileMasterLp)) {
  const wb = XLSX.readFile(fileMasterLp);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws);
  raw.forEach(r => {
    const pn = String(r['PN'] || '').toUpperCase().trim();
    const desc = String(r['DESCRIPCION'] || '').trim();
    if (pn) masterLpMap.set(pn, desc);
  });
  console.log(`📦 Master LP cargado: ${masterLpMap.size} repuestos catalogados.`);
}

// 3. Cargar Buzón de Movimientos (Partes realmente instaladas)
// Relación: Reporte SLA[Pedido] = Buzón Movimientos[PEDIDO]
// PN = IDUNICOINSTALA eliminando los últimos 5 caracteres
const buzonMap = new Map();
const fileBuzon = path.resolve(projectRoot, 'Reportes/Reporte Buzon Movimientos.xlsx');
if (fs.existsSync(fileBuzon)) {
  const wb = XLSX.readFile(fileBuzon);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws);
  raw.forEach(r => {
    const rawPed = String(r['PEDIDO'] || '').trim();
    if (!rawPed) return;
    const cleanPed = rawPed.split('-')[0].trim();
    const rawInst = String(r['IDUNICOINSTALA'] || '').trim();
    const rawRet = String(r['IDUNICORETIRA'] || '').trim();
    
    // Regla canónica del prompt: PN = IDUNICOINSTALA eliminando los últimos 5 caracteres
    let pnInst = '';
    if (rawInst.length > 5) {
      pnInst = rawInst.slice(0, -5).trim();
    } else {
      pnInst = rawInst;
    }
    
    let pnRet = '';
    if (rawRet.length > 5) {
      pnRet = rawRet.slice(0, -5).trim();
    } else {
      pnRet = rawRet;
    }

    const descInst = masterLpMap.get(pnInst.toUpperCase()) || masterLpMap.get(rawInst.toUpperCase()) || '';

    const mov = {
      rawPedido: rawPed,
      cleanPed,
      fecha: r['FECHA'],
      hora: r['HORA'] || '',
      idUnicoInstala: rawInst,
      pnInstalado: pnInst,
      descInstalado: descInst,
      idUnicoRetira: rawRet,
      pnRetirado: pnRet,
      tecnico: String(r['TECNICO'] || '').trim(),
      obs: String(r['OBSPROCESO'] || '').trim()
    };

    // Guardar por pedido limpio
    if (!buzonMap.has(cleanPed)) {
      buzonMap.set(cleanPed, []);
    }
    buzonMap.get(cleanPed).push(mov);
  });
  console.log(`📬 Buzón de Movimientos cargado: ${buzonMap.size} pedidos con movimientos indexados.`);
}

// 4. Cargar Stock Fijo de los Técnicos (Stock Fijo Asignado.xls)
// Relación: Técnico + PN - Solo Columnas A a D (PN, BASESTOCK, TIPO, CANTMINIMA)
const stockFijoSet = new Set();
const stockFijoDetailMap = new Map();
let fileStockFijo = path.resolve(projectRoot, 'Reportes/Repuestos/Stock Fijo Asignado.xls');
if (!fs.existsSync(fileStockFijo)) {
  fileStockFijo = path.resolve(projectRoot, 'Reportes/Datos/StockFijo.xls');
}
if (fs.existsSync(fileStockFijo)) {
  const wb = XLSX.readFile(fileStockFijo);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws);
  raw.forEach(r => {
    const tec = String(r['BASESTOCK'] || '').toLowerCase().trim();
    const pn = String(r['PN'] || '').toUpperCase().trim();
    // Filtro estricto: solo técnicos de supervisión
    if (tec && pn && myTechMap.has(tec)) {
      const key = `${tec}|${pn}`;
      stockFijoSet.add(key);
      stockFijoDetailMap.set(key, {
        pn,
        cantMinima: Number(r['CANTMINIMA'] || 0)
      });
    }
  });
  console.log(`🧰 Stock Fijo cargado: ${stockFijoSet.size} combinaciones Técnico-PN (Columnas A-D, Técnicos Supervisión).`);
}

// 5. Cargar Solicitudes Pendientes de Reposición (Informe Stock Fijo - Consumibles - Herramientas y S. regional.xlsx)
// Hojas: 'Stock fijo', 'Consumibles', 'Herramientas y Stock regional'
const solicitudesPendientesMap = new Map();
const fileSolicitudes = path.resolve(projectRoot, 'Reportes/Repuestos/Informe Stock Fijo - Consumibles - Herramientas y S. regional.xlsx');
if (fs.existsSync(fileSolicitudes)) {
  const wb = XLSX.readFile(fileSolicitudes);
  const sheetsToProcess = ['Stock fijo', 'Consumibles', 'Herramientas y Stock regional'];
  
  sheetsToProcess.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const raw = XLSX.utils.sheet_to_json(ws);
    raw.forEach(r => {
      const tec = String(r['TECNICONOMBRE'] || '').toLowerCase().trim();
      const pn = String(r['PN'] || '').toUpperCase().trim();
      if (!tec || !pn) return;

      const key = `${tec}|${pn}`;
      if (!solicitudesPendientesMap.has(key)) {
        solicitudesPendientesMap.set(key, []);
      }

      // Parse date
      let fechaStr = '';
      if (typeof r['FECHA'] === 'number') {
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const d = new Date(epoch.getTime() + r['FECHA'] * 86400000);
        fechaStr = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
      } else {
        fechaStr = String(r['FECHA'] || '').trim();
      }

      const cantCentral = r['CANTSTKCENTRAL'] !== undefined && r['CANTSTKCENTRAL'] !== '' && !isNaN(Number(r['CANTSTKCENTRAL']))
        ? Number(r['CANTSTKCENTRAL'])
        : null;

      solicitudesPendientesMap.get(key).push({
        solicitud: r['SOLICITUD'],
        pn,
        descripcion: String(r['DESCRIPCION'] || '').trim(),
        fechaRaw: r['FECHA'],
        fechaStr,
        cantidad: Number(r['CANTIDAD'] || 1),
        cantStkCentral: cantCentral,
        tipoParte: String(r['TIPOPARTE'] || '').trim(),
        concepto: String(r['CONCEPTOLLAMADA'] || sheetName).trim(),
        tecnico: String(r['TECNICONOMBRE'] || '').trim(),
        hojaOrigen: sheetName
      });
    });
  });
  console.log(`📋 Solicitudes Pendientes cargadas: ${solicitudesPendientesMap.size} combinaciones Técnico-PN con pedidos abiertos.`);
}

// Helper: parsear tiempo excedido
function parseExceededTime(raw) {
  if (!raw) return { str: '00:00', minutes: 0, hours: 0 };
  const s = String(raw).trim();
  const parts = s.split(':').map(Number);
  if (parts.length >= 2) {
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const sec = parts[2] || 0;
    const totalMinutes = h * 60 + m + Math.round(sec / 60);
    const totalHours = Number((totalMinutes / 60).toFixed(1));
    return { str: s, minutes: totalMinutes, hours: totalHours };
  }
  return { str: s, minutes: 0, hours: 0 };
}

// Helper: resolver Zona Local
function resolveZonaLocal(zonaTecnica, tecnicoNombre) {
  const normTec = (tecnicoNombre || '').toLowerCase().trim();
  const ref = myTechMap.get(normTec);
  if (ref && ref.zonaLocal) return ref.zonaLocal;

  const z = (zonaTecnica || '').toUpperCase().trim();
  if (z.includes('MDP') || z.includes('COS')) return 'Atlántica';
  if (z.includes('BB') || z.includes('VIE')) return 'Centro';
  if (z.includes('TDL') || z.includes('TRQ') || z.includes('OLA')) return 'Oeste';
  if (z.includes('SRO') || z.includes('PCO')) return 'La Pampa';
  if (z.includes('TRE') || z.includes('COM')) return 'Sur';
  if (z.includes('RIT') || z.includes('TDF') || z.includes('RGA')) return 'Contratistas';
  if (z.includes('BAR') || z.includes('CIP') || z.includes('NQN')) return 'Suroeste / Centro-Oeste';
  return 'General';
}

// 6. Procesar Archivos SLA Patagonia y Suroeste
const fileSlaPatagonia = path.resolve(projectRoot, 'Reportes/Reporte Sla Patagonia.xls');
const fileSlaSuroeste = path.resolve(projectRoot, 'Reportes/Reporte Sla Suroeste.xls');

const allAuditedItems = [];

function processSlaOrders(filePath, regionName, isSuroeste = false) {
  if (!fs.existsSync(filePath)) return;
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { range: 5, defval: '' });

  raw.forEach(r => {
    const ped = String(r['Pedido'] || r['PEDIDO'] || '').trim();
    if (!ped) return;

    // Solo procesar pedidos VENCIDOS (Cumplio SLA TS = 0)
    const cumplioSla = Number(r['Cumplio SLA TS']);
    if (cumplioSla !== 0) return;

    const zona = String(r['Zona'] || '').trim();
    if (isSuroeste && !mySuroesteZones.has(zona)) {
      return;
    }

    const tecAsig = String(r['Tecnico Asig'] || r['Tecnico Zona'] || '').trim();
    const tecZona = String(r['Tecnico Zona'] || '').trim();
    const cliente = String(r['Cliente'] || '').trim();
    const luno = String(r['ATM ID'] || r['ATM'] || '').trim();
    const equipoModelo = String(r['Modelo'] || '').trim();
    const localidad = String(r['Localidad'] || '').trim();
    const provincia = String(r['Provincia'] || '').trim();
    const zonaLocal = resolveZonaLocal(zona, tecAsig || tecZona);

    // Fechas
    const fechaAlta = r['Fecha Alta'] || '';
    const fechaFin = r['Fecha Fin'] || '';

    // Tiempo Excedido
    const rawTiempoExcedido = r['Tiempo SLA Exededido'] || r['Tiempo SLA Excedido'] || '00:00';
    const parsedTiempo = parseExceededTime(rawTiempoExcedido);

    // Motivo COT
    const motivoCot = String(r['Motivo Fuera Sla'] || r['Motivo Fuera SLA'] || 'Sin motivo informado').trim();
    const motivoCotDetalle = String(r['Motivo Fuera Sla Det'] || '').trim();

    // Stock Flow
    const rawStock = r['Stock'];
    const stockFlowNum = (rawStock && !isNaN(Number(rawStock))) ? Number(rawStock) : 0;
    const tieneStockFlow = stockFlowNum > 0;

    // ─── 7. OBTENER PN INSTALADO (Buzón de Movimientos) ───
    const cleanPed = ped.split('-')[0].trim();
    const movimientos = buzonMap.get(cleanPed) || [];
    
    let tieneRepuestoBuzon = false;
    let idUnicoInstala = '';
    let pnInstalado = '';
    let descInstalado = '';

    if (movimientos.length > 0) {
      // Tomar el movimiento de instalación
      const movConInstala = movimientos.find(m => m.pnInstalado && m.pnInstalado.length >= 3) || movimientos[0];
      if (movConInstala && movConInstala.pnInstalado && movConInstala.pnInstalado !== '-') {
        tieneRepuestoBuzon = true;
        idUnicoInstala = movConInstala.idUnicoInstala;
        pnInstalado = movConInstala.pnInstalado;
        descInstalado = movConInstala.descInstalado || masterLpMap.get(pnInstalado.toUpperCase()) || `Parte ${pnInstalado}`;
      }
    }

    // ─── 8. VERIFICAR SI PERTENECE AL STOCK FIJO ───
    const tecLookupKey = (tecAsig || tecZona).toLowerCase().trim();
    const sfKey = `${tecLookupKey}|${pnInstalado.toUpperCase()}`;
    const esStockFijo = pnInstalado ? stockFijoSet.has(sfKey) : false;

    // ─── 9. VERIFICAR SI EXISTEN REPOSICIONES PENDIENTES ───
    const solicitudes = pnInstalado ? (solicitudesPendientesMap.get(sfKey) || []) : [];
    const tieneSolicitudPendienteSf = solicitudes.length > 0;
    const solicitudPendiente = tieneSolicitudPendienteSf ? solicitudes[0] : null;

    // ─── 10. DETERMINAR CAUSA RAÍZ MÁS PROBABLE Y CLASIFICAR ───
    let categoria = 'CAT_F_SIN_REPUESTO_INFO';
    let categoriaCodigo = 'F';
    let categoriaTitulo = 'Información Insuficiente / Sin Repuesto en Buzón';
    let causaRaizEstimada = '';
    let responsabilidadPrincipal = 'SIN_EVIDENCIA';
    const evidenciaObservable = [];
    const riesgosOperativos = [];
    const accionesRecomendadas = [];

    const normMotivoCot = motivoCot.toLowerCase();

    if (tieneRepuestoBuzon) {
      evidenciaObservable.push(`Repuesto instalado verificado en Buzón: PN ${pnInstalado} (${descInstalado || 'S/D'}).`);

      if (!esStockFijo) {
        // CATEGORÍA A: Dependencia legítima de Stock Central
        categoria = 'CAT_A_STOCK_CENTRAL';
        categoriaCodigo = 'A';
        categoriaTitulo = 'Dependencia Legítima de Stock Central';
        responsabilidadPrincipal = 'LOGISTICA_CENTRAL';
        causaRaizEstimada = `El repuesto instalado (${pnInstalado}) no forma parte del Stock Fijo asignado al técnico. Requirió despacho desde Almacén Central (Flow ${tieneStockFlow ? stockFlowNum : 'sin stock flow registrado'}), cuyos tiempos logísticos excedieron la ventana de SLA.`;
        evidenciaObservable.push(`El PN ${pnInstalado} NO está catalogado en el Stock Fijo de ${tecAsig}.`);
        if (tieneStockFlow) evidenciaObservable.push(`Se registró solicitud Flow Stock N° ${stockFlowNum}.`);
        riesgosOperativos.push('Demoras habituales de transporte de Casa Central hacia el interior.');
        accionesRecomendadas.push(`Evaluar si el PN ${pnInstalado} tiene recurrencia de falla para incorporarlo al Stock Fijo del técnico.`);
      } else {
        // El repuesto pertenece al Stock Fijo del técnico
        evidenciaObservable.push(`El PN ${pnInstalado} figura asignado en la valija/vehículo del técnico como Stock Fijo.`);

        if (tieneSolicitudPendienteSf) {
          // CATEGORÍA B: Probable incumplimiento de reposición SF
          categoria = 'CAT_B_REPOSICION_SF';
          categoriaCodigo = 'B';
          categoriaTitulo = 'Incumplimiento de Reposición Stock Fijo';
          responsabilidadPrincipal = 'LOGISTICA_REPOSICION_SF';
          causaRaizEstimada = `El repuesto (${pnInstalado}) pertenece al Stock Fijo del técnico pero no estaba disponible debido a que existía una solicitud de reposición previa abierta (Sol. ${solicitudPendiente.solicitud}) pendiente de entrega por Logística Central.`;
          evidenciaObservable.push(`Solicitud de reposición abierta N° ${solicitudPendiente.solicitud} de fecha ${solicitudPendiente.fechaStr} (${solicitudPendiente.concepto}).`);
          if (solicitudPendiente.cantStkCentral && solicitudPendiente.cantStkCentral > 0) {
            evidenciaObservable.push(`Casa Central tenía ${solicitudPendiente.cantStkCentral} unidad(es) física(s) en estantería pero no realizó el despacho oportunamente.`);
          }
          riesgosOperativos.push('Técnico operando con valija incompleta por desabastecimiento de Casa Central.');
          accionesRecomendadas.push(`Intimar a Logística Central el despacho inmediato de la Solicitud N° ${solicitudPendiente.solicitud}.`);
        } else {
          // CATEGORÍA C: Posible desvío operativo
          categoria = 'CAT_C_DESVIO_OPERATIVO';
          categoriaCodigo = 'C';
          categoriaTitulo = 'Posible Desvío Operativo';
          responsabilidadPrincipal = 'TECNICA_CAMPO';
          causaRaizEstimada = `El repuesto (${pnInstalado}) pertenece al Stock Fijo autorizado del técnico y no constan solicitudes pendientes de reposición abiertas. La falta de disponibilidad en el momento de la atención sugiere consumo previo no informado o desvío en la gestión de valija.`;
          evidenciaObservable.push(`No se hallaron pedidos de reposición pendientes para el técnico ${tecAsig} y el PN ${pnInstalado}.`);
          riesgosOperativos.push('Falta de control de inventario móvil en vehículo o consumo previo sin solicitud inmediata de reposición.');
          accionesRecomendadas.push('Realizar inventario físico presencial de Stock Fijo con el técnico y revisar hábito de solicitud inmediata tras consumo.');
        }
      }
    } else {
      // No hubo repuesto instalado en buzón
      if (tieneStockFlow) {
        categoria = 'CAT_A_STOCK_CENTRAL';
        categoriaCodigo = 'A';
        categoriaTitulo = 'Dependencia de Abastecimiento Flow Stock';
        responsabilidadPrincipal = 'LOGISTICA_CENTRAL';
        causaRaizEstimada = `Se registró solicitud de repuesto en Flow N° ${stockFlowNum}, pero no figura colocación registrada en buzón. La espera de la pieza desde Central provocó el vencimiento del SLA.`;
        evidenciaObservable.push(`Solicitud de Flow Stock N° ${stockFlowNum} registrada en el reporte SLA.`);
        riesgosOperativos.push('Inconsistencia en buzón: pieza solicitada a central sin cierre de movimiento en sistema.');
        accionesRecomendadas.push(`Relevar con el técnico y el COT el destino final de la parte solicitada con Flow N° ${stockFlowNum}.`);
      } else if (normMotivoCot.includes('cliente') || normMotivoCot.includes('acceso') || normMotivoCot.includes('llave') || normMotivoCot.includes('sucursal') || normMotivoCot.includes('horario')) {
        categoria = 'CAT_E_CLIENTE_TERCEROS';
        categoriaCodigo = 'E';
        categoriaTitulo = 'Cliente / Factores Externos';
        responsabilidadPrincipal = 'CLIENTE_TERCEROS';
        causaRaizEstimada = `Vencimiento provocado por impedimentos de acceso, horario bancario o demoras de terceros en sitio (${motivoCotDetalle || motivoCot}).`;
        evidenciaObservable.push(`Declaración concordante del operador COT: "${motivoCot}" - "${motivoCotDetalle}".`);
        riesgosOperativos.push('Penalizaciones contractuales por demoras imputables a la entidad o cliente.');
        accionesRecomendadas.push('Solicitar dispensa de SLA ante la entidad bancaria con el registro horario de arribo.');
      } else {
        categoria = 'CAT_F_SIN_REPUESTO_INFO';
        categoriaCodigo = 'F';
        categoriaTitulo = 'Atención Sin Cambio de Partes / Causa Operativa';
        responsabilidadPrincipal = 'SIN_EVIDENCIA';
        causaRaizEstimada = `El pedido venció sin registrar instalación de partes en Buzón de Movimientos ni solicitud de Flow Stock. La resolución se realizó mediante ajuste de software, calibración mecánica o coordinación diferida.`;
        evidenciaObservable.push(`Sin repuestos registrados en Buzón de Movimientos.`);
        evidenciaObservable.push(`Stock Flow = 0.`);
        riesgosOperativos.push('COT imputó motivo sin respaldo de trazabilidad de repuestos.');
        accionesRecomendadas.push('Revisar observaciones de cierre y notas del técnico para determinar si existió demora de viaje o coordinación tardía.');
      }
    }

    // ─── 11. COMPARAR CONTRA EL MOTIVO INFORMADO POR COT (VALIDACIÓN CRUZADA) ───
    let consistenciaCot = 'CONSISTENTE';
    let esInconsistenciaCot = false;
    let detalleConsistencia = '';

    if (normMotivoCot.includes('tecnico') || normMotivoCot.includes('técnico')) {
      if (categoria === 'CAT_A_STOCK_CENTRAL' || categoria === 'CAT_B_REPOSICION_SF') {
        consistenciaCot = 'INCONSISTENTE_CULPO_AL_TECNICO';
        esInconsistenciaCot = true;
        detalleConsistencia = `El COT culpó al Técnico ("${motivoCot}"), pero la evidencia objetiva demuestra que el vencimiento fue provocado por falta de repuestos (${categoria === 'CAT_A_STOCK_CENTRAL' ? 'Dependencia de Stock Central' : 'Reposición de Stock Fijo demorada por Central'}).`;
        // Si el desvío del COT es evidente, podemos marcar Categoría D secundaria o clasificar la inconsistencia
      } else if (categoria === 'CAT_C_DESVIO_OPERATIVO') {
        consistenciaCot = 'CONSISTENTE';
        detalleConsistencia = 'Declaración del COT consistente con la falta de disponibilidad de un repuesto de Stock Fijo sin reposición previa.';
      } else {
        detalleConsistencia = 'El COT imputó al técnico en un pedido sin cambio de piezas verificado.';
      }
    } else if (normMotivoCot.includes('repuesto') || normMotivoCot.includes('stock')) {
      if (!tieneRepuestoBuzon && !tieneStockFlow) {
        consistenciaCot = 'INCONSISTENTE_REPUESTO_FICTICIO';
        esInconsistenciaCot = true;
        detalleConsistencia = `El COT informó "Repuesto" como causa fuera de SLA, pero NO existió solicitud de Stock Flow ni se instaló ningún repuesto en Buzón de Movimientos.`;
      } else if (categoria === 'CAT_C_DESVIO_OPERATIVO') {
        consistenciaCot = 'DISCREPANCIA_OPERATIVA';
        esInconsistenciaCot = true;
        detalleConsistencia = `El COT indicó "Repuesto", pero la parte instalada corresponde al Stock Fijo del técnico sin pedidos de reposición abiertos (responsabilidad operativa local).`;
      } else {
        consistenciaCot = 'CONSISTENTE';
        detalleConsistencia = 'Declaración del COT consistente con la necesidad legítima de abastecimiento central de repuestos.';
      }
    } else if (motivoCot === 'Sin motivo informado') {
      consistenciaCot = 'SIN_DECLARACION_COT';
      detalleConsistencia = 'El operador del COT no ingresó motivo de fuera de SLA en el sistema.';
    }

    allAuditedItems.push({
      id: `audit_${ped}`,
      pedido: ped,
      cliente,
      luno,
      entidad: cliente,
      equipo: equipoModelo,
      localidad,
      provincia,
      zona,
      zonaLocal,
      region: regionName,
      tecnicoAsig: tecAsig,
      tecnicoZona: tecZona,
      fechaAlta: String(fechaAlta),
      fechaFin: String(fechaFin),
      tiempoSlaExcedidoStr: parsedTiempo.str,
      tiempoSlaExcedidoMinutos: parsedTiempo.minutes,
      horasExcedidas: parsedTiempo.hours,
      stockFlow: stockFlowNum,
      motivoCot,
      motivoCotDetalle,
      
      tieneRepuestoBuzon,
      idUnicoInstala,
      pnInstalado,
      descInstalado,
      esStockFijo,
      
      tieneSolicitudPendienteSf,
      solicitudPendienteDetalle: solicitudPendiente ? {
        nroSolicitud: solicitudPendiente.solicitud,
        fechaSolicitudStr: solicitudPendiente.fechaStr,
        cantStkCentral: solicitudPendiente.cantStkCentral,
        tipoParte: solicitudPendiente.tipoParte,
        concepto: solicitudPendiente.concepto,
        diasDemora: 0
      } : null,

      categoria,
      categoriaCodigo,
      categoriaTitulo,
      causaRaizEstimada,
      responsabilidadPrincipal,

      consistenciaCot,
      esInconsistenciaCot,
      detalleConsistencia,

      evidenciaObservable,
      riesgosOperativos,
      accionesRecomendadas
    });
  });
}

// Ejecutar en ambos reportes
processSlaOrders(fileSlaPatagonia, 'PATAGONIA', false);
processSlaOrders(fileSlaSuroeste, 'SUROESTE', true);

console.log(`✅ Total pedidos vencidos auditados: ${allAuditedItems.length}`);

// ─── 12. GENERAR RESUMEN EJECUTIVO Y AGREGACIONES ───
let totalHorasPerdidas = 0;
let conRepuestoBuzonCount = 0;

const catCounts = {
  CAT_A_STOCK_CENTRAL: { count: 0, horas: 0, pct: 0 },
  CAT_B_REPOSICION_SF: { count: 0, horas: 0, pct: 0 },
  CAT_C_DESVIO_OPERATIVO: { count: 0, horas: 0, pct: 0 },
  CAT_D_COT_INCORRECTO: { count: 0, horas: 0, pct: 0 },
  CAT_E_CLIENTE_TERCEROS: { count: 0, horas: 0, pct: 0 },
  CAT_F_SIN_REPUESTO_INFO: { count: 0, horas: 0, pct: 0 }
};

let inconsistenciasCotCount = 0;
let cotCulpoTecnicoInjustamente = 0;
let cotInventoRepuesto = 0;

const pnMap = new Map();
const tecMap = new Map();
const entidadMap = new Map();
const locMap = new Map();

allAuditedItems.forEach(item => {
  totalHorasPerdidas += item.horasExcedidas;
  if (item.tieneRepuestoBuzon) conRepuestoBuzonCount++;

  // Categ
  if (catCounts[item.categoria]) {
    catCounts[item.categoria].count++;
    catCounts[item.categoria].horas += item.horasExcedidas;
  }

  // Inconsistencias COT
  if (item.esInconsistenciaCot) {
    inconsistenciasCotCount++;
    if (item.consistenciaCot === 'INCONSISTENTE_CULPO_AL_TECNICO') cotCulpoTecnicoInjustamente++;
    if (item.consistenciaCot === 'INCONSISTENTE_REPUESTO_FICTICIO') cotInventoRepuesto++;
  }

  // PNs
  if (item.pnInstalado) {
    if (!pnMap.has(item.pnInstalado)) {
      pnMap.set(item.pnInstalado, {
        pn: item.pnInstalado,
        desc: item.descInstalado,
        pedidosCount: 0,
        horasPerdidas: 0,
        esSf: item.esStockFijo,
        tecnicos: new Set()
      });
    }
    const entry = pnMap.get(item.pnInstalado);
    entry.pedidosCount++;
    entry.horasPerdidas += item.horasExcedidas;
    if (item.tecnicoAsig) entry.tecnicos.add(item.tecnicoAsig);
  }

  // Técnicos
  const tec = item.tecnicoAsig || item.tecnicoZona || 'Sin Asignar';
  if (!tecMap.has(tec)) {
    tecMap.set(tec, {
      tecnico: tec,
      zona: item.zonaLocal || item.zona,
      vencidosCount: 0,
      horasPerdidas: 0,
      porCatA_B: 0,
      porCatC: 0
    });
  }
  const tecEntry = tecMap.get(tec);
  tecEntry.vencidosCount++;
  tecEntry.horasPerdidas += item.horasExcedidas;
  if (item.categoria === 'CAT_A_STOCK_CENTRAL' || item.categoria === 'CAT_B_REPOSICION_SF') tecEntry.porCatA_B++;
  if (item.categoria === 'CAT_C_DESVIO_OPERATIVO') tecEntry.porCatC++;

  // Entidades
  const ent = item.entidad || 'Otras';
  if (!entidadMap.has(ent)) entidadMap.set(ent, { entidad: ent, vencidosCount: 0, horasPerdidas: 0 });
  entidadMap.get(ent).vencidosCount++;
  entidadMap.get(ent).horasPerdidas += item.horasExcedidas;

  // Localidades
  const loc = item.localidad || 'General';
  if (!locMap.has(loc)) locMap.set(loc, { localidad: loc, vencidosCount: 0, horasPerdidas: 0 });
  locMap.get(loc).vencidosCount++;
  locMap.get(loc).horasPerdidas += item.horasExcedidas;
});

// Pct cálculos
const totalItems = allAuditedItems.length || 1;
Object.keys(catCounts).forEach(k => {
  catCounts[k].pct = Number(((catCounts[k].count / totalItems) * 100).toFixed(1));
  catCounts[k].horas = Number(catCounts[k].horas.toFixed(1));
});

// Ordenar top rankings
const topPnsCriticos = Array.from(pnMap.values())
  .sort((a, b) => b.pedidosCount - a.pedidosCount)
  .slice(0, 15)
  .map(p => ({
    pn: p.pn,
    desc: p.desc,
    pedidosCount: p.pedidosCount,
    horasPerdidas: Number(p.horasPerdidas.toFixed(1)),
    esSf: p.esSf,
    tecnicosAfectados: Array.from(p.tecnicos)
  }));

const topTecnicosAfectados = Array.from(tecMap.values())
  .sort((a, b) => b.vencidosCount - a.vencidosCount)
  .slice(0, 15)
  .map(t => ({
    ...t,
    horasPerdidas: Number(t.horasPerdidas.toFixed(1))
  }));

const topEntidades = Array.from(entidadMap.values())
  .sort((a, b) => b.vencidosCount - a.vencidosCount)
  .slice(0, 10)
  .map(e => ({ ...e, horasPerdidas: Number(e.horasPerdidas.toFixed(1)) }));

const topLocalidades = Array.from(locMap.values())
  .sort((a, b) => b.vencidosCount - a.vencidosCount)
  .slice(0, 10)
  .map(l => ({ ...l, horasPerdidas: Number(l.horasPerdidas.toFixed(1)) }));

// Listado de inconsistencias COT destacadas
const inconsistenciasCotList = allAuditedItems
  .filter(i => i.esInconsistenciaCot)
  .slice(0, 50)
  .map(i => ({
    pedido: i.pedido,
    tecnico: i.tecnicoAsig,
    cliente: i.cliente,
    motivoCot: i.motivoCot,
    categoria: i.categoriaTitulo,
    causaReal: i.causaRaizEstimada,
    tiempoExcedido: i.tiempoSlaExcedidoStr,
    detalleConsistencia: i.detalleConsistencia
  }));

const resumenPayload = {
  fechaCorte: '18/10/2026',
  totalVencidos: allAuditedItems.length,
  totalHorasSlaPerdidas: Number(totalHorasPerdidas.toFixed(1)),
  promedioHorasPorVencido: Number((totalHorasPerdidas / totalItems).toFixed(1)),
  pedidosConRepuestoEnBuzon: conRepuestoBuzonCount,
  porcentajeConRepuesto: Number(((conRepuestoBuzonCount / totalItems) * 100).toFixed(1)),
  
  porCategoria: {
    catA_stockCentral: catCounts.CAT_A_STOCK_CENTRAL,
    catB_reposicionSf: catCounts.CAT_B_REPOSICION_SF,
    catC_desvioOperativo: catCounts.CAT_C_DESVIO_OPERATIVO,
    catD_cotIncorrecto: catCounts.CAT_D_COT_INCORRECTO,
    catE_clienteTerceros: catCounts.CAT_E_CLIENTE_TERCEROS,
    catF_sinRepuestoInfo: catCounts.CAT_F_SIN_REPUESTO_INFO
  },

  responsabilidad: {
    logisticaCentralHoras: Number((catCounts.CAT_A_STOCK_CENTRAL.horas + catCounts.CAT_B_REPOSICION_SF.horas).toFixed(1)),
    logisticaCentralCount: catCounts.CAT_A_STOCK_CENTRAL.count + catCounts.CAT_B_REPOSICION_SF.count,
    logisticaCentralPct: Number((catCounts.CAT_A_STOCK_CENTRAL.pct + catCounts.CAT_B_REPOSICION_SF.pct).toFixed(1)),
    desvioTecnicoHoras: catCounts.CAT_C_DESVIO_OPERATIVO.horas,
    desvioTecnicoCount: catCounts.CAT_C_DESVIO_OPERATIVO.count,
    desvioTecnicoPct: catCounts.CAT_C_DESVIO_OPERATIVO.pct,
    cotInconsistenciasCount: inconsistenciasCotCount,
    cotInconsistenciasPct: Number(((inconsistenciasCotCount / totalItems) * 100).toFixed(1)),
    cotCulpoTecnicoInjustamente,
    cotInventoRepuesto,
    clienteTercerosCount: catCounts.CAT_E_CLIENTE_TERCEROS.count
  },

  topPnsCriticos,
  topTecnicosAfectados,
  topEntidades,
  topLocalidades,
  inconsistenciasCotList
};

const finalOutputFile = path.resolve(outDir, 'analisisSlaCausalidadesData.json');
fs.writeFileSync(finalOutputFile, JSON.stringify({
  metadata: {
    generadoEl: new Date().toISOString(),
    fuente: 'Cruce SLA x Buzon x StockFijo x SolicitudesPendientes'
  },
  resumen: resumenPayload,
  items: allAuditedItems
}, null, 2), 'utf-8');

console.log(`🎉 Datos exportados con éxito a: ${finalOutputFile}`);
console.log('📊 Resumen Operativo:');
console.log(`   - Total pedidos fuera de SLA: ${resumenPayload.totalVencidos}`);
console.log(`   - Horas SLA perdidas acumuladas: ${resumenPayload.totalHorasSlaPerdidas} hs`);
console.log(`   - Imputable a Logística Central (Cat A + B): ${resumenPayload.responsabilidad.logisticaCentralCount} pedidos (${resumenPayload.responsabilidad.logisticaCentralPct}%)`);
console.log(`   - Desvío operativo en campo (Cat C): ${resumenPayload.responsabilidad.desvioTecnicoCount} pedidos (${resumenPayload.responsabilidad.desvioTecnicoPct}%)`);
console.log(`   - Inconsistencias de carga del COT detectadas: ${resumenPayload.responsabilidad.cotInconsistenciasCount} pedidos (${resumenPayload.responsabilidad.cotInconsistenciasPct}%)`);
console.log(`     * COT culpó al técnico falsamente: ${resumenPayload.responsabilidad.cotCulpoTecnicoInjustamente} casos`);
