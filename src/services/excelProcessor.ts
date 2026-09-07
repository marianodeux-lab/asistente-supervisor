import * as XLSX from 'xlsx';
import { Ticket, EquipoCronico, MpPendienteDetalle } from '../types';

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
        
        let tickets: Ticket[] = [];
        let cronicos: EquipoCronico[] = [];
        let mpPendientes: MpPendienteDetalle[] = [];
        let totalRows = 0;

        // Try reading known sheets or fallback to first sheet
        workbook.SheetNames.forEach(sheetName => {
          const ws = workbook.Sheets[sheetName];
          const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (!rawData || rawData.length < 2) return;

          totalRows += rawData.length;

          // Check if sheet looks like Agenda / Orders
          const headerIdx = rawData.findIndex(row => 
            row && (row.includes('Pedido') || row.includes('PEDIDO') || row.includes('Nro Pedido') || row.includes('Luno') || row.includes('Equipo') || row.includes('EQUIPO'))
          );

          if (headerIdx !== -1) {
            const headers = rawData[headerIdx].map(h => String(h || '').trim());
            const pedIdx = headers.findIndex(h => /pedido/i.test(h));
            const cliIdx = headers.findIndex(h => /cliente/i.test(h));
            const lunoIdx = headers.findIndex(h => /luno|atm|equipo/i.test(h));
            const tecIdx = headers.findIndex(h => /tecnico|asistio|asignado/i.test(h));
            const estIdx = headers.findIndex(h => /estado/i.test(h));
            const slaIdx = headers.findIndex(h => /sla/i.test(h));
            const dirIdx = headers.findIndex(h => /direccion/i.test(h));
            const locIdx = headers.findIndex(h => /localidad/i.test(h));
            const repIdx = headers.findIndex(h => /repuesto/i.test(h));
            const stkIdx = headers.findIndex(h => /stock/i.test(h));

            for (let i = headerIdx + 1; i < rawData.length; i++) {
              const row = rawData[i];
              if (!row || !row[pedIdx]) continue;

              const ped = String(row[pedIdx]).trim();
              let slaVal = 50;
              if (slaIdx !== -1 && row[slaIdx] !== undefined) {
                if (typeof row[slaIdx] === 'number') {
                  slaVal = row[slaIdx] <= 1 ? Math.round(row[slaIdx] * 100) : Math.round(row[slaIdx]);
                } else {
                  slaVal = parseFloat(String(row[slaIdx]).replace('%', '')) || 50;
                }
              }

              tickets.push({
                id: ped,
                pedido: ped,
                cliente: cliIdx !== -1 && row[cliIdx] ? String(row[cliIdx]).trim() : 'Cliente',
                luno: lunoIdx !== -1 && row[lunoIdx] ? String(row[lunoIdx]).trim() : '',
                tecnico: tecIdx !== -1 && row[tecIdx] ? String(row[tecIdx]).trim() : 'Sin Asignar',
                estado: estIdx !== -1 && row[estIdx] ? String(row[estIdx]).trim() : 'SEG Registrado',
                slaPorcentaje: slaVal,
                hsSla: Math.max(1, Math.round((100 - slaVal) / 15)),
                fechaVencimiento: new Date(Date.now() + (100 - slaVal) * 3600000).toISOString(),
                fechaCoordinada: '09:00',
                diasUltimaAtencion: 'Hoy',
                controlInicio: 'Normal',
                stock: stkIdx !== -1 && row[stkIdx] ? String(row[stkIdx]) : '-',
                repuestos: repIdx !== -1 && row[repIdx] ? String(row[repIdx]) : '-',
                concepto: 'SERVICE CALL',
                zona: 'Patagonia',
                localidad: locIdx !== -1 && row[locIdx] ? String(row[locIdx]).trim() : 'Patagonia',
                direccion: dirIdx !== -1 && row[dirIdx] ? String(row[dirIdx]).trim() : ''
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
