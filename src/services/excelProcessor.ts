import * as XLSX from 'xlsx';
import { Ticket, EquipoCronico, MpPendienteDetalle, MovimientoStockItem, VisitaHistoricaLuno } from '../types';
import zonasReferencia from '../data/zonasTecnicosReferencia.json';
import preventivosData from '../data/preventivosData.json';
import buzonMovimientosData from '../data/buzonMovimientosData.json';
import reincidenciasData from '../data/reincidenciasData.json';
import mpCerradosMap from '../data/mpCerradosMap.json';
import ultimasAtencionesMap from '../data/ultimasAtencionesMap.json';
import { formatTimeClean, ZONA_TECNICA_TO_LOCAL, extractRelevamientoClient } from '../utils/formatters';

// 1. Map Technicians to Reference Zones & Regions
const masterTecMap = new Map<string, typeof zonasReferencia[0]>();
const misTecnicosNombres = new Set<string>();

zonasReferencia.forEach(z => {
  const normName = z.nombre.toLowerCase().trim();
  masterTecMap.set(normName, z);
  misTecnicosNombres.add(normName);
});

// Centro-Oeste technicians under Mariano Deus supervision
const marianoCoTechs = new Set([
  'xavier, hernan',
  'bastias, carlos ignacio',
  'ochoa, diego armando',
  'fiorio, andres ezequiel',
  'lorca biassi, enzo martin',
  'olivencia, emmanuel matias',
  'deus, mariano',
  'gonzalez, elio fabian',
  'lazzaro, leonardo',
  'gonzalez, leonardo',
  'torres, florencia',
  'ibañez, pablo fernando',
  'meneses, cristian'
]);

// 2. Map Stock Movements from Buzón de Movimientos by Clean Pedido
const buzonMap = new Map<string, MovimientoStockItem[]>();
if (Array.isArray(buzonMovimientosData)) {
  (buzonMovimientosData as unknown as MovimientoStockItem[]).forEach(item => {
    const p = String(item.cleanPed || item.pedido || '').split('-')[0].trim();
    if (p) {
      if (!buzonMap.has(p)) buzonMap.set(p, []);
      buzonMap.get(p)!.push(item);
    }
  });
}

// 3. Map MP Pendientes per Luno
const mpPendingByLuno = new Map<string, { pedido: string; detalleFalla: string; tecAsignado: string; esSinAsignar: boolean }>();
if (preventivosData && Array.isArray((preventivosData as any).pendientesDetalle)) {
  (preventivosData as any).pendientesDetalle.forEach((item: any) => {
    const luno = String(item.luno || item.ATM || '').trim();
    if (luno) {
      mpPendingByLuno.set(luno, {
        pedido: String(item.pedido || ''),
        detalleFalla: String(item.detalleFalla || 'Mantenimiento Preventivo'),
        tecAsignado: String(item.tecnico || 'SIN ASIGNAR'),
        esSinAsignar: !!item.esSinAsignar
      });
    }
  });
}

// 4. Map Historical Failures / Reincidencias per Luno
const cronicosMap = new Map<string, any>();
if (Array.isArray(reincidenciasData)) {
  reincidenciasData.forEach((item: any) => {
    const l = String(item.luno || item.equipo || '').trim();
    if (l) cronicosMap.set(l, item);
  });
}

// Regional boundaries and allowed zones: strictly Patagonia and Suroeste
const allowedSuroesteZones = ['IN BAR', 'IN CIP', 'IN NQN', 'Suroeste', 'Bariloche', 'Cipolletti', 'Neuquen', 'Neuquén'];
const patagoniaRegions = ['PATAGONIA', 'SUROESTE'];

// Helper to parse dates from Excel numbers or strings into DD/MM/YYYY
export function parseExcelDate(val: any): { dateStr: string; rawIso: string } {
  if (!val) return { dateStr: '07/09/2026', rawIso: new Date().toISOString() };
  
  if (typeof val === 'number') {
    try {
      const d = XLSX.SSF.parse_date_code(val);
      const day = String(d.d).padStart(2, '0');
      const month = String(d.m).padStart(2, '0');
      const year = d.y;
      return {
        dateStr: `${day}/${month}/${year}`,
        rawIso: `${year}-${month}-${day}`
      };
    } catch (e) {
      return { dateStr: '07/09/2026', rawIso: new Date().toISOString() };
    }
  }

  const s = String(val).trim();
  if (s.includes('/')) {
    const parts = s.split(' ')[0].split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return {
        dateStr: `${day}/${month}/${year}`,
        rawIso: `${year}-${month}-${day}`
      };
    }
  }
  return { dateStr: s, rawIso: s };
}

// Helper to parse time from Excel numbers or strings into HH:mm
export function parseExcelTime(val: any): string {
  if (val === null || val === undefined || val === '') return '09:00';
  if (typeof val === 'number') {
    const totalSeconds = Math.round(val * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  return formatTimeClean(s);
}

export interface ProcessedExcelResult {
  tickets: Ticket[];
  cronicos: EquipoCronico[];
  mpPendientes: MpPendienteDetalle[];
  fileName: string;
  uploadDate: string;
  rowCount: number;
}

export function parseExcelFile(file: File): Promise<ProcessedExcelResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const tickets: Ticket[] = [];
        let totalRows = 0;

        const lowerFileName = file.name.toLowerCase();
        const isAdicionalesFile = lowerFileName.includes('adicional');
        const isAsignadosFile = lowerFileName.includes('asignado');
        const isSuroesteFile = lowerFileName.includes('suroeste');
        const defaultFileOrigin = isAdicionalesFile ? 'Adicionales' : (isAsignadosFile ? 'Asignados' : (isSuroesteFile ? 'Suroeste' : 'Patagonia'));
        const defaultFileZona = isSuroesteFile ? 'Suroeste' : 'Patagonia';

        // Try reading known sheets or fallback to first sheet
        workbook.SheetNames.forEach(sheetName => {
          const ws = workbook.Sheets[sheetName];
          const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (!rawData || rawData.length < 2) return;

          totalRows += rawData.length;

          // Check header row
          const headerIdx = rawData.findIndex(row => 
            row && (row.includes('Pedido') || row.includes('PEDIDO') || row.includes('Nro Pedido') || row.includes('Luno') || row.includes('Equipo') || row.includes('EQUIPO'))
          );

          if (headerIdx !== -1) {
            const headers = rawData[headerIdx].map(h => String(h || '').trim());
            
            const pedIdx = headers.findIndex(h => /pedido/i.test(h));
            const cliIdx = headers.findIndex(h => /cliente/i.test(h));
            const lunoIdx = headers.findIndex(h => /luno|atm|equipo/i.test(h));
            const tecIdx = headers.findIndex(h => /tec\s*asignado|tecnico|asistio/i.test(h));
            const tecZonaIdx = headers.findIndex(h => /tec\s*zona/i.test(h));
            const estIdx = headers.findIndex(h => /^estado/i.test(h));
            const slaIdx = headers.findIndex(h => /%?\s*sla/i.test(h));
            const dirIdx = headers.findIndex(h => /direccion/i.test(h));
            const locIdx = headers.findIndex(h => /localidad/i.test(h));
            const repIdx = headers.findIndex(h => /repuesto/i.test(h));
            const stkIdx = headers.findIndex(h => /stock/i.test(h));
            const zonaIdx = headers.findIndex(h => /^zona$/i.test(h));
            const regIdx = headers.findIndex(h => /region/i.test(h));
            const fCoorIdx = headers.findIndex(h => /f\s*coor|fecha\s*coor/i.test(h));
            const hCoorIdx = headers.findIndex(h => /h\s*coor|hora\s*coor/i.test(h));
            const mIdx = headers.findIndex(h => /^m$/i.test(h));
            const fallaIdx = headers.findIndex(h => /detalle\s*falla|desc\s*problema|problema/i.test(h));
            const cptoIdx = headers.findIndex(h => /cpto|concepto/i.test(h));
            const modIdx = headers.findIndex(h => /modelo/i.test(h));
            const fVtoIdx = headers.findIndex(h => /vto|vencimiento/i.test(h));

            const lidIdx = headers.findIndex(h => /lider/i.test(h));

            for (let i = headerIdx + 1; i < rawData.length; i++) {
              const row = rawData[i];
              if (!row || !row[pedIdx]) continue;

              // Check if row is hidden by Excel autofilter
              const rowMeta = (ws as any)['!rows'] && (ws as any)['!rows'][i];
              if (rowMeta && (rowMeta.hidden === true || rowMeta.hidden === 1)) {
                continue;
              }

              const fullPed = String(row[pedIdx]).trim();
              const cleanPed = fullPed.split('-')[0].trim();
              const luno = lunoIdx !== -1 && row[lunoIdx] ? String(row[lunoIdx]).trim() : '';
              const cliente = cliIdx !== -1 && row[cliIdx] ? String(row[cliIdx]).trim() : 'Cliente';
              const tecAsignado = tecIdx !== -1 && row[tecIdx] ? String(row[tecIdx]).trim() : 'Sin Asignar';
              const tecZona = tecZonaIdx !== -1 && row[tecZonaIdx] ? String(row[tecZonaIdx]).trim() : tecAsignado;
              const rawZona = zonaIdx !== -1 && row[zonaIdx] ? String(row[zonaIdx]).trim() : defaultFileZona;
              const rawReg = regIdx !== -1 && row[regIdx] ? String(row[regIdx]).trim().toUpperCase() : defaultFileZona.toUpperCase();
              const rawLid = lidIdx !== -1 && row[lidIdx] ? String(row[lidIdx]).trim() : '';
              const estado = estIdx !== -1 && row[estIdx] ? String(row[estIdx]).trim() : (isAdicionalesFile ? 'AIEC Abierto' : 'SEG Registrado');
              const mVal = mIdx !== -1 && row[mIdx] ? String(row[mIdx]).trim().toUpperCase() : '';
              const detalleFalla = fallaIdx !== -1 && row[fallaIdx] ? String(row[fallaIdx]).trim() : '-';
              const concepto = cptoIdx !== -1 && row[cptoIdx] ? String(row[cptoIdx]).trim() : (isAdicionalesFile ? 'AIEC' : 'SERVICE CALL');
              const loc = locIdx !== -1 && row[locIdx] ? String(row[locIdx]).trim() : defaultFileZona;
              const dir = dirIdx !== -1 && row[dirIdx] ? String(row[dirIdx]).trim() : '';
              const modelo = modIdx !== -1 && row[modIdx] ? String(row[modIdx]).trim() : 'ATM/CTD';

              // Date & Time parsing
              const fCoorParsed = fCoorIdx !== -1 ? parseExcelDate(row[fCoorIdx]) : parseExcelDate(null);
              const hCoorParsed = hCoorIdx !== -1 ? parseExcelTime(row[hCoorIdx]) : '09:00';

              // SLA calculation
              let slaVal = 0;
              if (slaIdx !== -1 && row[slaIdx] !== undefined) {
                if (typeof row[slaIdx] === 'number') {
                  slaVal = row[slaIdx] <= 1 ? Math.round(row[slaIdx] * 100) : Math.round(row[slaIdx]);
                } else {
                  slaVal = parseFloat(String(row[slaIdx]).replace('%', '')) || 0;
                }
              }

              // Technician & Master Zone mapping
              let finalRegion = defaultFileZona;
              let zonaTecnica = rawZona;
              let zonaLocal = ZONA_TECNICA_TO_LOCAL[rawZona] || '';

              const tecMaster = masterTecMap.get(tecAsignado.toLowerCase()) || masterTecMap.get(tecZona.toLowerCase());
              if (tecMaster) {
                finalRegion = tecMaster.region;
                zonaTecnica = tecMaster.zonaTecnica || rawZona;
                zonaLocal = tecMaster.zonaLocal || zonaLocal;
              } else {
                if (patagoniaRegions.includes(rawReg)) {
                  finalRegion = rawReg;
                } else if (rawReg === 'SUROESTE' || allowedSuroesteZones.some(z => rawZona.toLowerCase().includes(z.toLowerCase()) || loc.toLowerCase().includes(z.toLowerCase()))) {
                  finalRegion = 'SUROESTE';
                } else if (defaultFileZona === 'Patagonia' || defaultFileZona === 'Suroeste') {
                  finalRegion = defaultFileZona.toUpperCase();
                } else {
                  finalRegion = 'OTRA';
                }
              }

              // STRICT REGIONAL FILTER: Exclude any ticket outside Patagonia & Suroeste
              if (finalRegion !== 'PATAGONIA' && finalRegion !== 'SUROESTE') {
                continue;
              }

              // Filter Asignados: Only keep Mis Técnicos in Patagonia and Suroeste
              if (isAsignadosFile) {
                const isMyPatTec = misTecnicosNombres.has(tecAsignado.toLowerCase()) || misTecnicosNombres.has(tecZona.toLowerCase());
                const isMyCoTec = marianoCoTechs.has(tecAsignado.toLowerCase()) || rawLid === 'Deus, Mariano';
                const isPatOrSur = finalRegion === 'PATAGONIA' || finalRegion === 'SUROESTE';

                if (!((isMyPatTec || isMyCoTec) && isPatOrSur)) {
                  continue; // Skip NOA, Córdoba, CABA, AMBA, Litoral, Centro-Oeste, etc.
                }
              }

              // Filter Suroeste if necessary
              if (isSuroesteFile || finalRegion === 'SUROESTE') {
                const isAllowed = allowedSuroesteZones.some(z => 
                  loc.toLowerCase().includes(z.toLowerCase()) || 
                  dir.toLowerCase().includes(z.toLowerCase()) || 
                  rawZona.toLowerCase().includes(z.toLowerCase()) ||
                  tecAsignado.toLowerCase().includes('lazzaro') ||
                  tecAsignado.toLowerCase().includes('ibañez') ||
                  tecAsignado.toLowerCase().includes('torres')
                );
                if (!isAllowed) continue;
              }

              // Cross-reference with Buzón de Movimientos (Repuestos / Stock Fijo)
              const stockMovs = buzonMap.get(cleanPed) || buzonMap.get(fullPed) || [];

              // Cross-reference with MP Pendientes
              const mpInfo = luno ? mpPendingByLuno.get(luno) : null;

              // Cross-reference with Reincidencias / Cronicos
              const cronicoInfo = luno ? cronicosMap.get(luno) : null;

              // Cross-reference with Ultimas Atenciones (from Agenda Diaria / Suspendidos)
              const atencionInfo = luno ? (ultimasAtencionesMap as Record<string, any>)[luno] : null;
              const diasDesdeUltimaAtencion = atencionInfo?.diasUltimaAtencion || 'SC - 1 mes';
              const reincidenciaCount = atencionInfo?.reincidenciaCount !== undefined ? atencionInfo.reincidenciaCount : (cronicoInfo ? cronicoInfo.totalFallas : 0);

              // Cross-reference with MP Cerrados (Detección de MP Deficiente < 30 días)
              const mpCerrado = luno ? (mpCerradosMap as Record<string, any>)[luno] : null;
              let ultimoMpFecha: string | null = null;
              let diasDesdeUltimoMp: number | null = null;
              let esMpDeficiente = false;
              let tecnicoUltimoMp: string | null = null;
              let obsUltimoMp: string | null = null;

              if (mpCerrado) {
                ultimoMpFecha = mpCerrado.ultimoMpFecha;
                tecnicoUltimoMp = mpCerrado.tecMp;
                obsUltimoMp = mpCerrado.obsMp;
                const mpDate = new Date(mpCerrado.rawDateIso);
                const diffDays = Math.round((Date.now() - mpDate.getTime()) / (1000 * 60 * 60 * 24));
                diasDesdeUltimoMp = diffDays >= 0 ? diffDays : null;
                esMpDeficiente = diffDays >= 0 && diffDays <= 30;
              }

              const isSinAsignar = !tecAsignado || tecAsignado.toLowerCase() === 'sin asignar' || tecAsignado.toLowerCase().includes('sin asignar');
              const esScVigente = concepto !== 'AIEC' && !isAdicionalesFile;
              let origenFlujo: 'SC_PENDIENTE' | 'ASIGNADO_COT' | 'ADICIONAL' | 'MP_PENDIENTE' = 'SC_PENDIENTE';
              if (isAdicionalesFile) {
                origenFlujo = 'ADICIONAL';
              } else if (mpInfo) {
                origenFlujo = 'MP_PENDIENTE';
              } else if (isAsignadosFile) {
                origenFlujo = 'ASIGNADO_COT';
              } else {
                origenFlujo = 'SC_PENDIENTE';
              }

              let clienteReal = undefined;
              let sucursalRelevamiento = undefined;
              if (/relevamiento/i.test(cliente) || /cash today/i.test(cliente) || /relevamiento/i.test(detalleFalla)) {
                const parsedRelev = extractRelevamientoClient(detalleFalla);
                if (parsedRelev) {
                  clienteReal = parsedRelev.clienteReal;
                  sucursalRelevamiento = parsedRelev.sucursal;
                }
              }

              tickets.push({
                id: fullPed,
                pedido: cleanPed,
                pedidoFull: fullPed,
                cliente,
                clienteReal,
                sucursalRelevamiento,
                luno,
                equipo: luno,
                tecnico: tecAsignado,
                tecnicoZona: tecZona,
                estado,
                slaPorcentaje: slaVal,
                hsSla: Math.max(1, Math.round((100 - slaVal) / 12)),
                fechaVencimiento: fVtoIdx !== -1 && row[fVtoIdx] ? String(row[fVtoIdx]) : new Date(Date.now() + (100 - slaVal) * 3600000).toISOString(),
                fechaCoordinada: `${fCoorParsed.dateStr} ${hCoorParsed}`.trim(),
                fCoorDate: fCoorParsed.dateStr,
                hCoor: hCoorParsed,
                diasUltimaAtencion: diasDesdeUltimaAtencion,
                diasDesdeUltimaAtencion,
                reincidenciaCount,
                ultimoConcepto: atencionInfo?.diasUltimaAtencion?.split('-')[0]?.trim() || 'SC',
                ultimoMpFecha,
                diasDesdeUltimoMp,
                esMpDeficiente,
                tecnicoUltimoMp,
                obsUltimoMp,
                origenFlujo,
                esScVigente,
                alertaSinAsignar: isSinAsignar,
                controlInicio: 'Normal',
                stock: stkIdx !== -1 && row[stkIdx] ? String(row[stkIdx]) : '0',
                repuestos: repIdx !== -1 && row[repIdx] ? String(row[repIdx]) : '-',
                concepto,
                detalleFalla,
                zona: rawZona,
                zonaTecnica,
                zonaLocal,
                region: finalRegion,
                localidad: loc,
                direccion: dir,
                modelo,
                notificadoMovil: mVal === 'S',
                m: mVal,
                origenReporte: defaultFileOrigin,
                esAdicional: isAdicionalesFile || /aiec/i.test(concepto),
                esAsignadoCOT: isAsignadosFile,

                // Deep Cross-referencing Alerts
                alertaMpPendiente: !!mpInfo,
                alertaMpSinAsignar: mpInfo ? mpInfo.esSinAsignar : false,
                mpPendienteDetalle: mpInfo ? { pedido: mpInfo.pedido, detalleFalla: mpInfo.detalleFalla, tecAsignado: mpInfo.tecAsignado } : null,
                movimientosStock: stockMovs,
                cantidadVisitasHistoricas: cronicoInfo ? cronicoInfo.totalFallas : 0,
                cantidadSoporteRemoto: cronicoInfo ? cronicoInfo.fallasTelca : 0
              });
            }
          }
        });

        resolve({
          tickets,
          cronicos: [],
          mpPendientes: [],
          fileName: file.name,
          uploadDate: new Date().toLocaleString('es-AR'),
          rowCount: totalRows
        });

      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}
