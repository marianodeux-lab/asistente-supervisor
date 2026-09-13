import * as XLSX from 'xlsx';
import { 
  StockDeudaItem, 
  StockTecnicoItem, 
  RetornoSemanalItem, 
  TecnicoStockAuditoria, 
  StockAuditoriaState 
} from '../types';
import zonasReferencia from '../data/zonasTecnicosReferencia.json';
import stockFijoData from '../data/stockFijoData.json';

// Technicians reference map (Strictly Patagonia & Suroeste)
const tecToZonaMap = new Map<string, typeof zonasReferencia[0]>();
const misTecsSet = new Set<string>();

zonasReferencia.forEach(z => {
  const norm = z.nombre.toLowerCase().trim();
  tecToZonaMap.set(norm, z);
  misTecsSet.add(norm);
});

// Map Stock Fijo Quotas: tecNorm|PN -> cantMinima
const sfQuotaMap = new Map<string, number>();
stockFijoData.forEach(item => {
  const k = `${item.tecnico.toLowerCase().trim()}|${item.pn.toUpperCase().trim()}`;
  sfQuotaMap.set(k, item.cantMinima);
});

function parseFileRows(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function processStockFiles(
  files: File[]
): Promise<{ result: StockAuditoriaState; processedFiles: string[] }> {
  let rawDeuda: any[] = [];
  let rawTecnico: any[] = [];
  let rawConsumibles: any[] = [];
  const processedFiles: string[] = [];

  for (const file of files) {
    const lowerName = file.name.toLowerCase();
    const isDeuda = lowerName.includes('deuda') || lowerName.includes('recambio');
    const isTecnico = lowerName.includes('stock tecnico') || lowerName.includes('stock técnico') || lowerName.includes('tecnico.xls') || lowerName.includes('técnico.xls');
    const isConsumibles = lowerName.includes('consumible') || lowerName.includes('pendientes');

    if (isDeuda) {
      const rows = await parseFileRows(file);
      rawDeuda = rows;
      processedFiles.push(file.name);
    } else if (isTecnico) {
      const rows = await parseFileRows(file);
      rawTecnico = rows;
      processedFiles.push(file.name);
    } else if (isConsumibles) {
      const rows = await parseFileRows(file);
      rawConsumibles = rows;
      processedFiles.push(file.name);
    }
  }

  return {
    result: buildStockAuditoriaState(rawDeuda, rawTecnico, rawConsumibles),
    processedFiles
  };
}

export function buildStockAuditoriaState(rawDeuda: any[], rawTecnico: any[], _rawConsumibles: any[] = []): StockAuditoriaState {
  const tecSummary = new Map<string, TecnicoStockAuditoria>();

  // Initialize ALL assigned technicians from zonasTecnicosReferencia so none is missed
  zonasReferencia.forEach(z => {
    const norm = z.nombre.toLowerCase().trim();
    tecSummary.set(norm, {
      nombre: z.nombre,
      norm,
      esMiTecnico: true,
      zonaTecnica: z.zonaTecnica,
      region: z.region,
      zonaLocal: z.zonaLocal,
      totalAdeudado: 0,
      deudaRealEnManoCount: 0,
      enTransitoConOrCount: 0,
      deudaRecambiosCount: 0,
      deudaGenCount: 0,
      retornosSemanalesCount: 0,
      stockTecnicoTotalCount: 0,
      stockFijoCount: 0,
      deudaRecambios: [],
      partesEnTransito: [],
      retornosSemanales: [],
      stockTecnicoItems: []
    });
  });

  // 1. Process Stock Deuda (Filtrado estricto a Mis Técnicos y evaluación de Dev en tránsito/OR)
  rawDeuda.forEach(r => {
    const tec = String(r['Base Stock'] || r['Tecnico Ret'] || '').trim();
    if (!tec) return;
    const norm = tec.toLowerCase().trim();

    // FILTRADO ESTRICTO: Descartar técnicos foráneos
    if (!misTecsSet.has(norm)) return;

    const tObj = tecSummary.get(norm)!;
    const idUnico = String(r['Id Unico'] || '').trim();
    const esGen = idUnico.toUpperCase().endsWith('-GEN') || String(r['Marca Desc'] || '').toUpperCase() === 'GEN';
    
    // REGLA CLAVE: Si Dev en transito/OR tiene valor, NO es deuda del técnico, está en viaje
    const dev = String(r['Dev en transito/OR'] || '').trim();
    const esEnTransito = Boolean(dev && dev !== '0' && dev !== '-' && dev.toLowerCase() !== 'null');
    const orMetro = String(r['Fecha OR Metro'] || r['Obs OR Metro'] || '').trim();
    const transMetro = String(r['Transporte OR Metro'] || '').trim();

    const deudaItem: StockDeudaItem = {
      pn: String(r['PN'] || '').trim(),
      idUnico,
      esGen,
      descripcion: String(r['Descripcion Parte'] || '').trim(),
      tecnico: tec,
      pedRetiro: String(r['Ped Retiro'] || '').trim(),
      codEquipo: String(r['Cod Equipo'] || '').trim(),
      cliente: String(r['Cliente Desc'] || '').trim(),
      fecha: String(r['F Ing Lab'] || r['F Mov Stock'] || ''),
      marca: String(r['Marca Desc'] || '').trim(),
      ubicacion: String(r['Ubicacion en deposito'] || '').trim(),
      devEnTransito: dev,
      esEnTransito,
      fechaOrMetro: orMetro,
      transporteOrMetro: transMetro
    };

    if (esEnTransito) {
      tObj.partesEnTransito.push(deudaItem);
    } else {
      tObj.deudaRecambios.push(deudaItem);
    }
  });

  // 2. Process Stock Tecnico (Filtrado estricto a Mis Técnicos)
  rawTecnico.forEach(r => {
    const tec = String(r['Base Stock'] || '').trim();
    if (!tec) return;
    const norm = tec.toLowerCase().trim();

    // FILTRADO ESTRICTO: Descartar técnicos foráneos
    if (!misTecsSet.has(norm)) return;

    const tObj = tecSummary.get(norm)!;
    const pn = String(r['PN'] || '').trim().toUpperCase();
    const dev = String(r['Dev en transito/OR'] || '').trim();
    const esEnTransito = Boolean(dev && dev !== '0' && dev !== '-' && dev.toLowerCase() !== 'null');

    tObj.stockTecnicoItems.push({
      pn,
      idUnico: String(r['Id Unico'] || '').trim(),
      descripcion: String(r['Descripcion Parte'] || '').trim(),
      tecnico: tec,
      pedidoCot: String(r['Pedido Cot Solicita'] || '').trim(),
      pedidoStock: String(r['Pedido Stock Solicita'] || '').trim(),
      cliente: String(r['Cliente Cot Solicita'] || '').trim(),
      fechaMov: String(r['F Mov Stock'] || ''),
      ubicacion: String(r['Ubicacion en deposito'] || '').trim(),
      devEnTransito: dev,
      esEnTransito,
      transporteOrMetro: String(r['Transporte OR Metro'] || '').trim()
    });
  });

  // 3. Cross-reference Stock Tecnico with Stock Fijo
  tecSummary.forEach(tObj => {
    const pnMap = new Map<string, StockTecnicoItem[]>();
    tObj.stockTecnicoItems.forEach(item => {
      if (!pnMap.has(item.pn)) pnMap.set(item.pn, []);
      pnMap.get(item.pn)!.push(item);
    });

    pnMap.forEach((items, pn) => {
      const quota = sfQuotaMap.get(`${tObj.norm}|${pn}`) || 0;
      const totalQty = items.length;

      if (quota === 0) {
        // Fuera de Stock Fijo -> Repuestos pedidos para un reclamo que deben devolverse
        items.forEach(it => {
          const retornoItem: RetornoSemanalItem = {
            ...it,
            esStockFijo: false,
            motivo: 'FUERA_DE_STOCK_FIJO',
            detalleMotivo: 'Repuesto pedido para service call puntual no autorizado en Stock Fijo',
            cantAutorizadaSf: 0,
            cantActualEnStock: totalQty
          };

          if (it.esEnTransito) {
            tObj.partesEnTransito.push(retornoItem);
          } else {
            tObj.retornosSemanales.push(retornoItem);
          }
        });
      } else {
        // Marcamos las autorizadas como SF
        items.forEach((it, idx) => {
          if (idx < quota) {
            it.esStockFijo = true;
            tObj.stockFijoCount++;
          } else {
            // Excedentes de Stock Fijo
            it.esStockFijo = false;
            const retornoItem: RetornoSemanalItem = {
              ...it,
              motivo: 'EXCEDENTE_STOCK_FIJO',
              detalleMotivo: `Excede cuota de Stock Fijo autorizada (Tiene ${totalQty}, Autorizado ${quota})`,
              cantAutorizadaSf: quota,
              cantActualEnStock: totalQty
            };

            if (it.esEnTransito) {
              tObj.partesEnTransito.push(retornoItem);
            } else {
              tObj.retornosSemanales.push(retornoItem);
            }
          }
        });
      }
    });

    tObj.deudaRealEnManoCount = tObj.deudaRecambios.length;
    tObj.deudaGenCount = tObj.deudaRecambios.filter(d => d.esGen).length;
    tObj.retornosSemanalesCount = tObj.retornosSemanales.length;
    tObj.enTransitoConOrCount = tObj.partesEnTransito.length;
    tObj.stockTecnicoTotalCount = tObj.stockTecnicoItems.length;

    // TOTAL ADEUDADO EXIGIBLE = Solo lo que tiene en mano (descontando lo que ya tiene OR/remito)
    tObj.totalAdeudado = tObj.deudaRealEnManoCount + tObj.retornosSemanalesCount;
  });

  const misTecsList = Array.from(tecSummary.values());

  // Ordenar: mayor deuda real exigible primero
  misTecsList.sort((a, b) => b.totalAdeudado - a.totalAdeudado);

  // Totales Regionales
  const totalAdeudadoRegion = misTecsList.reduce((sum, t) => sum + t.totalAdeudado, 0);
  const totalDeudaRealRegion = misTecsList.reduce((sum, t) => sum + t.deudaRealEnManoCount, 0);
  const totalGenRegion = misTecsList.reduce((sum, t) => sum + t.deudaGenCount, 0);
  const totalRetornosSemanalesRegion = misTecsList.reduce((sum, t) => sum + t.retornosSemanalesCount, 0);
  const totalEnTransitoRegion = misTecsList.reduce((sum, t) => sum + t.enTransitoConOrCount, 0);
  const totalTecnicosConDeuda = misTecsList.filter(t => t.totalAdeudado > 0).length;

  return {
    fechaCorte: new Date().toLocaleDateString('es-AR'),
    totalAdeudadoRegion,
    totalDeudaRealRegion,
    totalEnTransitoRegion,
    totalStockDeudaRegion: totalDeudaRealRegion,
    totalGenRegion,
    totalRetornosSemanalesRegion,
    totalTecnicosConDeuda,
    tecnicos: misTecsList
  };
}
