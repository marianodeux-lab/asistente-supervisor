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

// Technicians reference map
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
  const processedFiles: string[] = [];

  for (const file of files) {
    const lowerName = file.name.toLowerCase();
    const isDeuda = lowerName.includes('deuda') || lowerName.includes('recambio');
    const isTecnico = lowerName.includes('stock tecnico') || lowerName.includes('stock técnico') || lowerName.includes('tecnico.xls') || lowerName.includes('técnico.xls');

    if (isDeuda) {
      const rows = await parseFileRows(file);
      rawDeuda = rows;
      processedFiles.push(file.name);
    } else if (isTecnico) {
      const rows = await parseFileRows(file);
      rawTecnico = rows;
      processedFiles.push(file.name);
    }
  }

  return {
    result: buildStockAuditoriaState(rawDeuda, rawTecnico),
    processedFiles
  };
}

export function buildStockAuditoriaState(rawDeuda: any[], rawTecnico: any[]): StockAuditoriaState {
  const tecSummary = new Map<string, TecnicoStockAuditoria>();

  function getOrCreateTec(tecName: string): TecnicoStockAuditoria {
    const norm = tecName.toLowerCase().trim();
    if (!tecSummary.has(norm)) {
      const zInfo = tecToZonaMap.get(norm);
      tecSummary.set(norm, {
        nombre: tecName,
        norm,
        esMiTecnico: !!zInfo,
        zonaTecnica: zInfo ? zInfo.zonaTecnica : 'Otra',
        region: zInfo ? zInfo.region : 'Otra',
        zonaLocal: zInfo ? zInfo.zonaLocal : '',
        totalAdeudado: 0,
        deudaRecambiosCount: 0,
        deudaGenCount: 0,
        retornosSemanalesCount: 0,
        stockTecnicoTotalCount: 0,
        stockFijoCount: 0,
        deudaRecambios: [],
        retornosSemanales: [],
        stockTecnicoItems: []
      });
    }
    return tecSummary.get(norm)!;
  }

  // 1. Process Stock Deuda (Recambios de campo a devolver)
  rawDeuda.forEach(r => {
    const tec = String(r['Base Stock'] || r['Tecnico Ret'] || '').trim();
    if (!tec) return;
    const tObj = getOrCreateTec(tec);
    const idUnico = String(r['Id Unico'] || '').trim();
    const esGen = idUnico.toUpperCase().endsWith('-GEN') || String(r['Marca Desc'] || '').toUpperCase() === 'GEN';

    tObj.deudaRecambios.push({
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
      ubicacion: String(r['Ubicacion en deposito'] || '').trim()
    });
  });

  // 2. Process Stock Tecnico
  rawTecnico.forEach(r => {
    const tec = String(r['Base Stock'] || '').trim();
    if (!tec) return;
    const tObj = getOrCreateTec(tec);
    const pn = String(r['PN'] || '').trim().toUpperCase();

    tObj.stockTecnicoItems.push({
      pn,
      idUnico: String(r['Id Unico'] || '').trim(),
      descripcion: String(r['Descripcion Parte'] || '').trim(),
      tecnico: tec,
      pedidoCot: String(r['Pedido Cot Solicita'] || '').trim(),
      pedidoStock: String(r['Pedido Stock Solicita'] || '').trim(),
      cliente: String(r['Cliente Cot Solicita'] || '').trim(),
      fechaMov: String(r['F Mov Stock'] || ''),
      ubicacion: String(r['Ubicacion en deposito'] || '').trim()
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
        // Fuera de Stock Fijo -> 100% de estas piezas deben ser devueltas en la semana
        items.forEach(it => {
          tObj.retornosSemanales.push({
            ...it,
            esStockFijo: false,
            motivo: 'FUERA_DE_STOCK_FIJO',
            detalleMotivo: 'Repuesto pedido para service call puntual no autorizado como Stock Fijo',
            cantAutorizadaSf: 0,
            cantActualEnStock: totalQty
          });
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
            tObj.retornosSemanales.push({
              ...it,
              motivo: 'EXCEDENTE_STOCK_FIJO',
              detalleMotivo: `Excede cuota de Stock Fijo autorizada (Tiene ${totalQty}, Autorizado ${quota})`,
              cantAutorizadaSf: quota,
              cantActualEnStock: totalQty
            });
          }
        });
      }
    });

    tObj.deudaRecambiosCount = tObj.deudaRecambios.length;
    tObj.deudaGenCount = tObj.deudaRecambios.filter(d => d.esGen).length;
    tObj.retornosSemanalesCount = tObj.retornosSemanales.length;
    tObj.stockTecnicoTotalCount = tObj.stockTecnicoItems.length;
    tObj.totalAdeudado = tObj.deudaRecambiosCount + tObj.retornosSemanalesCount;
  });

  const allTecs = Array.from(tecSummary.values());

  // Order technicians: misTecnicos first, then by totalAdeudado desc
  allTecs.sort((a, b) => {
    if (a.esMiTecnico && !b.esMiTecnico) return -1;
    if (!a.esMiTecnico && b.esMiTecnico) return 1;
    return b.totalAdeudado - a.totalAdeudado;
  });

  // Calculate Region KPIs (Mis Técnicos)
  const misTecsList = allTecs.filter(t => t.esMiTecnico);
  const totalAdeudadoRegion = misTecsList.reduce((sum, t) => sum + t.totalAdeudado, 0);
  const totalStockDeudaRegion = misTecsList.reduce((sum, t) => sum + t.deudaRecambiosCount, 0);
  const totalGenRegion = misTecsList.reduce((sum, t) => sum + t.deudaGenCount, 0);
  const totalRetornosSemanalesRegion = misTecsList.reduce((sum, t) => sum + t.retornosSemanalesCount, 0);
  const totalTecnicosConDeuda = misTecsList.filter(t => t.totalAdeudado > 0).length;

  return {
    fechaCorte: new Date().toLocaleDateString('es-AR'),
    totalAdeudadoRegion,
    totalStockDeudaRegion,
    totalGenRegion,
    totalRetornosSemanalesRegion,
    totalTecnicosConDeuda,
    tecnicos: allTecs
  };
}
