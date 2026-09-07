import * as XLSX from 'xlsx';
import { Ticket, EquipoCronico, MpPendienteDetalle } from '../types';
import zonasReferencia from '../data/zonasTecnicosReferencia.json';
import { formatTimeClean, ZONA_TECNICA_TO_LOCAL } from '../utils/formatters';

const masterTecMap = new Map<string, typeof zonasReferencia[0]>();
zonasReferencia.forEach(z => {
  masterTecMap.set(z.nombre.toLowerCase(), z);
});

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
        
        console.log('Workbook loaded:', workbook.SheetNames);
        
        const tickets: Ticket[] = [];
        const cronicos: EquipoCronico[] = [];
        const mpPendientes: MpPendienteDetalle[] = [];
        let totalRows = 0;

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

            for (let i = headerIdx + 1; i < rawData.length; i++) {
              const row = rawData[i];
              if (!row || !row[pedIdx]) continue;

              const ped = String(row[pedIdx]).trim();
              const luno = lunoIdx !== -1 && row[lunoIdx] ? String(row[lunoIdx]).trim() : '';
              const cliente = cliIdx !== -1 && row[cliIdx] ? String(row[cliIdx]).trim() : 'Cliente';
              const tecAsignado = tecIdx !== -1 && row[tecIdx] ? String(row[tecIdx]).trim() : 'Sin Asignar';
              const tecZona = tecZonaIdx !== -1 && row[tecZonaIdx] ? String(row[tecZonaIdx]).trim() : tecAsignado;
              const rawZona = zonaIdx !== -1 && row[zonaIdx] ? String(row[zonaIdx]).trim() : 'Patagonia';
              const rawReg = regIdx !== -1 && row[regIdx] ? String(row[regIdx]).trim().toUpperCase() : 'PATAGONIA';
              const estado = estIdx !== -1 && row[estIdx] ? String(row[estIdx]).trim() : 'SEG Registrado';
              const mVal = mIdx !== -1 && row[mIdx] ? String(row[mIdx]).trim().toUpperCase() : '';
              const detalleFalla = fallaIdx !== -1 && row[fallaIdx] ? String(row[fallaIdx]).trim() : '-';
              const concepto = cptoIdx !== -1 && row[cptoIdx] ? String(row[cptoIdx]).trim() : 'SERVICE CALL';

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

              // Technician & Region mapping
              let finalRegion = rawReg || 'PATAGONIA';
              let zonaTecnica = rawZona;
              let zonaLocal = ZONA_TECNICA_TO_LOCAL[rawZona] || '';

              const tecMaster = masterTecMap.get(tecAsignado.toLowerCase()) || masterTecMap.get(tecZona.toLowerCase());
              if (tecMaster) {
                finalRegion = tecMaster.region;
                zonaTecnica = tecMaster.zonaTecnica || rawZona;
                zonaLocal = tecMaster.zonaLocal;
              }

              tickets.push({
                id: ped,
                pedido: ped.split('-')[0],
                pedidoFull: ped,
                cliente,
                luno,
                equipo: luno,
                tecnico: tecAsignado,
                tecnicoZona: tecZona,
                estado,
                slaPorcentaje: slaVal,
                hsSla: Math.max(1, Math.round((100 - slaVal) / 12)),
                fechaVencimiento: new Date(Date.now() + (100 - slaVal) * 3600000).toISOString(),
                fechaCoordinada: `${fCoorParsed.dateStr} ${hCoorParsed}`.trim(),
                fCoorDate: fCoorParsed.dateStr,
                hCoor: hCoorParsed,
                diasUltimaAtencion: '1 día',
                controlInicio: 'Normal',
                stock: stkIdx !== -1 && row[stkIdx] ? String(row[stkIdx]) : '0',
                repuestos: repIdx !== -1 && row[repIdx] ? String(row[repIdx]) : '-',
                concepto,
                detalleFalla,
                zona: rawZona,
                zonaTecnica,
                zonaLocal,
                region: finalRegion,
                localidad: locIdx !== -1 && row[locIdx] ? String(row[locIdx]).trim() : 'Patagonia',
                direccion: dirIdx !== -1 && row[dirIdx] ? String(row[dirIdx]).trim() : '',
                notificadoMovil: mVal === 'S',
                m: mVal,
                esAdicional: /aiec/i.test(concepto) || /adicional/i.test(file.name),
                esAsignadoCOT: /asignado/i.test(file.name)
              });
            }
          }
        });

        resolve({
          tickets,
          cronicos,
          mpPendientes,
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
