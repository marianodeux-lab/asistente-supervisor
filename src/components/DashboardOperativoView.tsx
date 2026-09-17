import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Wrench, 
  Package, 
  Users, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Filter, 
  RotateCcw, 
  Search, 
  ArrowUpDown, 
  Calendar, 
  Layers, 
  Sparkles, 
  Download, 
  ShieldCheck, 
  Clock, 
  Activity, 
  Info,
  ChevronDown,
  ArrowUpRight,
  BarChart3,
  Cpu
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { AnalisisRow, StockFijoItem, ZonaTecnicoRef } from '../types';

// Static / Metadata mappings
const MESES_NOMBRES: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre'
};

const ZONAS_LOCALES = [
  'Atlántica',
  'Centro',
  'Contratistas',
  'La Pampa',
  'Oeste',
  'Sur',
  'Suroeste'
];

export interface BaseInstaladaItem {
  cliente: string;
  atm: string;
  serie: string;
  modelo: string;
  fabricante: string;
  mpcr: string;
  tecnicoZona: string;
  plantaCabecera: string;
  region: string;
  negocio: string;
  esCashToday: boolean;
}

export interface TechnicianMetric {
  tecnico: string;
  zona: string;
  pedidosAtendidos: number;
  reincidentesCount: number;
  efectividadPrimeraVisita: number; // FTF %
  mpCount: number;
  mpSinFalla60d: number;
  efectividadMp: number; // MP 60d %
  repuestosUsadosCount: number;
  pedidosConRepuesto: number;
  repuestosEnSfCount: number;
  pctRepuestosEnSf: number; // % asignado a SF
}

export interface SparePartMetric {
  pn: string;
  descripcion: string;
  usos: number;
  pctSobreTotal: number;
  enStockFijo: boolean;
}

export const DashboardOperativoView: React.FC = () => {
  // Navigation Tabs inside Dashboard
  const [activeSubTab, setActiveSubTab] = useState<'OPERACIONES_SLA' | 'REPUESTOS_TECNICOS'>('OPERACIONES_SLA');

  // Loaded Datasets
  const [rawData, setRawData] = useState<AnalisisRow[]>([]);
  const [baseInstalada, setBaseInstalada] = useState<BaseInstaladaItem[]>([]);
  const [stockFijo, setStockFijo] = useState<StockFijoItem[]>([]);
  const [zonasTecnicos, setZonasTecnicos] = useState<ZonaTecnicoRef[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // General Filters (Apply to both SLA line chart and KPIs)
  const [selectedNegocio, setSelectedNegocio] = useState<string>('ALL');
  const [selectedZonaLocal, setSelectedZonaLocal] = useState<string>('ALL');
  const [selectedTecnico, setSelectedTecnico] = useState<string>('ALL');
  const [selectedFabricante, setSelectedFabricante] = useState<string>('ALL');
  const [selectedMpcr, setSelectedMpcr] = useState<string>('ALL');

  // Temporal Filters (Apply to KPIs, but NOT to the Monthly SLA Line Chart!)
  const [selectedMes, setSelectedMes] = useState<string>('ALL');
  const [selectedSemana, setSelectedSemana] = useState<string>('ALL');

  // Search & Sorting States
  const [techSearch, setTechSearch] = useState<string>('');
  const [techSortKey, setTechSortKey] = useState<keyof TechnicianMetric>('pedidosAtendidos');
  const [techSortAsc, setTechSortAsc] = useState<boolean>(false);

  const [partSearch, setPartSearch] = useState<string>('');
  const [partSortKey, setPartSortKey] = useState<'usos' | 'pn' | 'pctSobreTotal'>('usos');
  const [partSortAsc, setPartSortAsc] = useState<boolean>(false);
  const [partPage, setPartPage] = useState<number>(1);
  const PART_PAGE_SIZE = 15;

  // Load datasets asynchronously on mount
  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      setIsLoading(true);
      try {
        const [suspMod, baseMod, sfMod, ztMod] = await Promise.all([
          import('../data/analisisSuspendidosData.json'),
          import('../data/baseInstaladaClientesData.json'),
          import('../data/stockFijoData.json'),
          import('../data/zonasTecnicosReferencia.json')
        ]);
        if (isMounted) {
          setRawData(suspMod.default as unknown as AnalisisRow[]);
          setBaseInstalada(baseMod.default as unknown as BaseInstaladaItem[]);
          setStockFijo(sfMod.default as unknown as StockFijoItem[]);
          setZonasTecnicos(ztMod.default as unknown as ZonaTecnicoRef[]);
        }
      } catch (e) {
        console.error('Error loading dashboard datasets:', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAll();
    return () => { isMounted = false; };
  }, []);

  // Map technician to Zona Local for Base Instalada lookup
  const techToZonaMap = useMemo(() => {
    const map = new Map<string, string>();
    zonasTecnicos.forEach(zt => {
      const name = (zt.nombre || zt.tecnico || '').trim().toLowerCase();
      if (name && zt.zonaLocal) {
        map.set(name, zt.zonaLocal);
      }
    });
    return map;
  }, [zonasTecnicos]);

  // Distinct Options for Dropdowns
  const options = useMemo(() => {
    const negocios = new Set<string>();
    const fabricantes = new Set<string>();
    const mpcrs = new Set<string>();
    const tecnicos = new Set<string>();
    const meses = new Set<number>();
    const monthWeeksMap = new Map<number, Set<number>>();

    rawData.forEach(r => {
      const neg = (r.NEGOCIO || r.Negocio || '').trim();
      if (neg) negocios.add(neg);

      const fab = (r.Fabricante || '').trim();
      if (fab) fabricantes.add(fab);

      const mpcr = (r.MPCR || '').trim();
      if (mpcr) mpcrs.add(mpcr);

      const zona = (r['ZONA LOCAL'] || r['Zona Local'] || '').trim();
      const tec = (r['TECNICO ZONA'] || r['Tecnico Zona'] || '').trim();
      if (tec && tec !== 'Sin Asignar') {
        if (selectedZonaLocal === 'ALL' || zona.toLowerCase() === selectedZonaLocal.toLowerCase()) {
          tecnicos.add(tec);
        }
      }

      const mesNum = Number(r.Mes);
      const semNum = Number(r.Semana);
      if (mesNum && !isNaN(mesNum)) {
        meses.add(mesNum);
        if (semNum && !isNaN(semNum)) {
          if (!monthWeeksMap.has(mesNum)) monthWeeksMap.set(mesNum, new Set());
          monthWeeksMap.get(mesNum)!.add(semNum);
        }
      }
    });

    return {
      negocios: Array.from(negocios).sort(),
      fabricantes: Array.from(fabricantes).sort(),
      mpcrs: Array.from(mpcrs).sort(),
      tecnicos: Array.from(tecnicos).sort(),
      meses: Array.from(meses).sort((a, b) => a - b),
      monthWeeksMap
    };
  }, [rawData, selectedZonaLocal]);

  // Dependent Weeks for selected Month
  const availableWeeks = useMemo(() => {
    if (selectedMes === 'ALL') {
      const allWeeks = new Set<number>();
      options.monthWeeksMap.forEach(set => set.forEach(w => allWeeks.add(w)));
      return Array.from(allWeeks).sort((a, b) => a - b);
    }
    const mesNum = Number(selectedMes);
    const set = options.monthWeeksMap.get(mesNum);
    return set ? Array.from(set).sort((a, b) => a - b) : [];
  }, [options.monthWeeksMap, selectedMes]);

  // Reset dependent week if month changes and week is no longer valid
  useEffect(() => {
    if (selectedSemana !== 'ALL' && selectedMes !== 'ALL') {
      const semNum = Number(selectedSemana);
      if (!availableWeeks.includes(semNum)) {
        setSelectedSemana('ALL');
      }
    }
  }, [selectedMes, selectedSemana, availableWeeks]);

  // Reset filters helper
  const handleResetFilters = () => {
    setSelectedNegocio('ALL');
    setSelectedZonaLocal('ALL');
    setSelectedTecnico('ALL');
    setSelectedFabricante('ALL');
    setSelectedMpcr('ALL');
    setSelectedMes('ALL');
    setSelectedSemana('ALL');
  };

  // -------------------------------------------------------------
  // Filter Layer 1: General Filters (Applied to Monthly SLA Line Chart)
  // Mes and Semana DO NOT filter this layer!
  // -------------------------------------------------------------
  const generalFilteredData = useMemo(() => {
    return rawData.filter(r => {
      // Negocio
      if (selectedNegocio !== 'ALL') {
        const val = (r.NEGOCIO || r.Negocio || '').trim().toLowerCase();
        if (val !== selectedNegocio.toLowerCase()) return false;
      }
      // Zona Local
      if (selectedZonaLocal !== 'ALL') {
        const val = (r['ZONA LOCAL'] || r['Zona Local'] || '').trim().toLowerCase();
        if (val !== selectedZonaLocal.toLowerCase()) return false;
      }
      // Técnico Zona
      if (selectedTecnico !== 'ALL') {
        const val = (r['TECNICO ZONA'] || r['Tecnico Zona'] || '').trim().toLowerCase();
        if (val !== selectedTecnico.toLowerCase()) return false;
      }
      // Fabricante
      if (selectedFabricante !== 'ALL') {
        const val = (r.Fabricante || '').trim().toLowerCase();
        if (val !== selectedFabricante.toLowerCase()) return false;
      }
      // MPCR
      if (selectedMpcr !== 'ALL') {
        const val = (r.MPCR || '').trim().toLowerCase();
        if (val !== selectedMpcr.toLowerCase()) return false;
      }
      return true;
    });
  }, [rawData, selectedNegocio, selectedZonaLocal, selectedTecnico, selectedFabricante, selectedMpcr]);

  // -------------------------------------------------------------
  // Filter Layer 2: Temporal Filters (Applied to KPI Cards and Tables)
  // Inherits General Filters + Month / Week
  // -------------------------------------------------------------
  const temporalFilteredData = useMemo(() => {
    return generalFilteredData.filter(r => {
      // Mes
      if (selectedMes !== 'ALL') {
        const mesNum = Number(r.Mes);
        if (mesNum !== Number(selectedMes)) return false;
      }
      // Semana
      if (selectedSemana !== 'ALL') {
        const semNum = Number(r.Semana);
        if (semNum !== Number(selectedSemana)) return false;
      }
      return true;
    });
  }, [generalFilteredData, selectedMes, selectedSemana]);

  // -------------------------------------------------------------
  // Base Instalada Filtered (For dynamic Call Rate calculation)
  // -------------------------------------------------------------
  const baseInstaladaFiltered = useMemo(() => {
    return baseInstalada.filter(eq => {
      // Negocio
      if (selectedNegocio !== 'ALL') {
        const negNorm = (eq.negocio || (eq.esCashToday ? 'Cash Today' : 'ATM')).toLowerCase();
        if (negNorm !== selectedNegocio.toLowerCase()) return false;
      }
      // Zona Local (Lookup via tech or region)
      if (selectedZonaLocal !== 'ALL') {
        const tec = (eq.tecnicoZona || '').trim().toLowerCase();
        const mappedZona = techToZonaMap.get(tec) || '';
        if (mappedZona.toLowerCase() !== selectedZonaLocal.toLowerCase()) return false;
      }
      // Técnico Zona
      if (selectedTecnico !== 'ALL') {
        const tec = (eq.tecnicoZona || '').trim().toLowerCase();
        if (tec !== selectedTecnico.toLowerCase()) return false;
      }
      // Fabricante
      if (selectedFabricante !== 'ALL') {
        const fab = (eq.fabricante || '').trim().toLowerCase();
        if (fab !== selectedFabricante.toLowerCase()) return false;
      }
      // MPCR
      if (selectedMpcr !== 'ALL') {
        const mpcr = (eq.mpcr || '').trim().toLowerCase();
        if (mpcr !== selectedMpcr.toLowerCase()) return false;
      }
      return true;
    });
  }, [baseInstalada, selectedNegocio, selectedZonaLocal, selectedTecnico, selectedFabricante, selectedMpcr, techToZonaMap]);

  // -------------------------------------------------------------
  // Monthly SLA Evolution Curve (12 Months, Filtered ONLY by General Filters)
  // -------------------------------------------------------------
  const monthlySlaChartData = useMemo(() => {
    const monthsMap = new Map<number, { total: number; cumplio: number }>();
    for (let m = 1; m <= 12; m++) {
      monthsMap.set(m, { total: 0, cumplio: 0 });
    }

    generalFilteredData.forEach(r => {
      const mesNum = Number(r.Mes);
      if (mesNum >= 1 && mesNum <= 12) {
        const item = monthsMap.get(mesNum)!;
        item.total++;
        const cumplio = Number(r['CUMPLIO SLA']) === 1 || Number(r['Cumplio SLA TS']) === 1;
        if (cumplio) item.cumplio++;
      }
    });

    return Array.from(monthsMap.entries())
      .filter(([_, data]) => data.total > 0) // Only show months with activity
      .map(([mesNum, data]) => {
        const pct = data.total > 0 ? (data.cumplio / data.total) * 100 : 0;
        return {
          mesNum,
          mesNombre: MESES_NOMBRES[mesNum] || `Mes ${mesNum}`,
          totalPedidos: data.total,
          pedidosCumplio: data.cumplio,
          pedidosFuera: data.total - data.cumplio,
          pctSla: parseFloat(pct.toFixed(1)),
          metaSla: 95.0,
          isSelected: selectedMes !== 'ALL' && Number(selectedMes) === mesNum
        };
      });
  }, [generalFilteredData, selectedMes]);

  // -------------------------------------------------------------
  // KPI Metrics (Calculated from temporalFilteredData)
  // -------------------------------------------------------------
  const kpis = useMemo(() => {
    const totalPedidos = temporalFilteredData.length;
    let pedidosCumplioSla = 0;
    let pedidosConRepuesto = 0;
    let totalUnidadesRepuestos = 0;
    let preventivosCount = 0;
    let correctivosCount = 0;

    temporalFilteredData.forEach(r => {
      // SLA
      const cumplio = Number(r['CUMPLIO SLA']) === 1 || Number(r['Cumplio SLA TS']) === 1;
      if (cumplio) pedidosCumplioSla++;

      // Repuesto
      const usaRep = (String(r['Utiliza Repuesto'] || '')).toLowerCase() === 'sí' || (String(r['Utiliza Repuesto'] || '')).toLowerCase() === 'si';
      const pnInstala = String(r['PN INSTALA'] || '').trim();
      if (usaRep || (pnInstala && pnInstala !== '-' && pnInstala !== '0')) {
        pedidosConRepuesto++;
        totalUnidadesRepuestos++;
      }

      // Concepto
      const concepto = String(r['CONCEPTO LLAMADA'] || '').toUpperCase();
      if (concepto === 'MTM' || concepto.includes('PREVENTIVO')) {
        preventivosCount++;
      } else {
        correctivosCount++;
      }
    });

    const pctSla = totalPedidos > 0 ? (pedidosCumplioSla / totalPedidos) * 100 : 0;
    const pctConRepuesto = totalPedidos > 0 ? (pedidosConRepuesto / totalPedidos) * 100 : 0;

    // Call Rate vs Base Instalada
    const baseTotal = baseInstaladaFiltered.length;
    const callRateRatio = baseTotal > 0 ? totalPedidos / baseTotal : 0;
    const callRatePct = baseTotal > 0 ? (totalPedidos / baseTotal) * 100 : 0;

    return {
      totalPedidos,
      pedidosCumplioSla,
      pctSla: parseFloat(pctSla.toFixed(1)),
      pedidosConRepuesto,
      pctConRepuesto: parseFloat(pctConRepuesto.toFixed(1)),
      totalUnidadesRepuestos,
      baseTotal,
      callRateRatio: parseFloat(callRateRatio.toFixed(2)),
      callRatePct: parseFloat(callRatePct.toFixed(1)),
      preventivosCount,
      correctivosCount
    };
  }, [temporalFilteredData, baseInstaladaFiltered]);

  // -------------------------------------------------------------
  // ATM Timeline Pre-computation for 60-Day MP Effectiveness
  // -------------------------------------------------------------
  const atmFailuresMap = useMemo(() => {
    const parseDateMs = (dStr: any): number | null => {
      if (!dStr) return null;
      if (typeof dStr === 'number') return dStr;
      const parts = String(dStr).split(/[\s/:]+/);
      if (parts.length >= 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        return new Date(y, m, d).getTime();
      }
      const dt = new Date(dStr).getTime();
      return isNaN(dt) ? null : dt;
    };

    const map = new Map<string, number[]>();
    rawData.forEach(r => {
      const concepto = String(r['CONCEPTO LLAMADA'] || '').toUpperCase();
      const esFalla = concepto.includes('SERVICE') || concepto.includes('SC') || concepto.includes('RECLAMO') || concepto.includes('CORRECTIVO');
      if (esFalla) {
        const atm = String(r.ATM || '').trim();
        if (atm) {
          const t = parseDateMs(r['MARCA INICIO'] || r['MARCA FIN'] || r['MARCA ALTA']);
          if (t) {
            if (!map.has(atm)) map.set(atm, []);
            map.get(atm)!.push(t);
          }
        }
      }
    });
    return map;
  }, [rawData]);

  // Stock Fijo Set per technician for fast SF match lookup
  const stockFijoByTechMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    stockFijo.forEach(sf => {
      const tech = String(sf.tecnico || '').trim().toLowerCase();
      if (!map.has(tech)) map.set(tech, new Set());
      const pn = String(sf.pn || '').trim().toUpperCase();
      if (pn) map.get(tech)!.add(pn);
    });
    return map;
  }, [stockFijo]);

  // Global Stock Fijo Set (to check if a part belongs to ANY SF catalog)
  const globalStockFijoSet = useMemo(() => {
    const set = new Set<string>();
    stockFijo.forEach(sf => {
      const pn = String(sf.pn || '').trim().toUpperCase();
      if (pn) set.add(pn);
    });
    return set;
  }, [stockFijo]);

  // -------------------------------------------------------------
  // PESTAÑA 2: Ranking de Repuestos Más Utilizados
  // Uses generalFilteredData
  // -------------------------------------------------------------
  const sparePartsRanking = useMemo(() => {
    const partsMap = new Map<string, { pn: string; desc: string; usos: number }>();
    let totalRepuestos = 0;

    generalFilteredData.forEach(r => {
      const pn = String(r['PN INSTALA'] || '').trim().toUpperCase();
      const desc = String(r['PN DESCRIPCION'] || '').trim();
      const usaRep = (String(r['Utiliza Repuesto'] || '')).toLowerCase() === 'sí' || (String(r['Utiliza Repuesto'] || '')).toLowerCase() === 'si';

      if (usaRep && pn && pn !== '-' && pn !== '0' && pn !== 'UNDEFINED' && pn !== 'SIN REPUESTO') {
        const key = `${pn}|||${desc}`;
        if (!partsMap.has(key)) {
          partsMap.set(key, { pn, desc: desc || 'Repuesto sin descripción cargada', usos: 0 });
        }
        partsMap.get(key)!.usos++;
        totalRepuestos++;
      }
    });

    const list: SparePartMetric[] = Array.from(partsMap.values()).map(item => {
      const pct = totalRepuestos > 0 ? (item.usos / totalRepuestos) * 100 : 0;
      // Check if part is in Stock Fijo catalog
      const inSf = globalStockFijoSet.has(item.pn) || Array.from(globalStockFijoSet).some(sfPn => item.pn.includes(sfPn));
      return {
        pn: item.pn,
        descripcion: item.desc,
        usos: item.usos,
        pctSobreTotal: parseFloat(pct.toFixed(2)),
        enStockFijo: inSf
      };
    });

    // Filter by search
    const filtered = list.filter(p => 
      p.pn.toLowerCase().includes(partSearch.toLowerCase()) || 
      p.descripcion.toLowerCase().includes(partSearch.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      let comp = 0;
      if (partSortKey === 'usos') comp = b.usos - a.usos;
      else if (partSortKey === 'pctSobreTotal') comp = b.pctSobreTotal - a.pctSobreTotal;
      else comp = a.pn.localeCompare(b.pn);
      return partSortAsc ? -comp : comp;
    });

    return {
      list: filtered,
      totalRepuestos,
      top10: filtered.slice(0, 10)
    };
  }, [generalFilteredData, globalStockFijoSet, partSearch, partSortKey, partSortAsc]);

  // -------------------------------------------------------------
  // PESTAÑA 2: Tabla Resumida y Limpia de Técnicos
  // Columns:
  // 1. Técnico & Zona
  // 2. Pedidos atendidos
  // 3. % Efectividad en la 1ra visita (FTF)
  // 4. Cantidad de MP
  // 5. Efectividad del MP (no fallan en los siguientes 60 días)
  // 6. Cantidad de repuestos utilizados
  // 7. % pedidos con repuesto asignado a su SF
  // -------------------------------------------------------------
  const technicianMetrics = useMemo(() => {
    const parseDateMs = (dStr: any): number | null => {
      if (!dStr) return null;
      if (typeof dStr === 'number') return dStr;
      const parts = String(dStr).split(/[\s/:]+/);
      if (parts.length >= 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        return new Date(y, m, d).getTime();
      }
      const dt = new Date(dStr).getTime();
      return isNaN(dt) ? null : dt;
    };

    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
    const techMap = new Map<string, {
      tecnico: string;
      zona: string;
      pedidos: AnalisisRow[];
    }>();

    generalFilteredData.forEach(r => {
      const tec = String(r['TECNICO ASISTIO'] || r['TECNICO ZONA'] || 'Sin Asignar').trim();
      if (!tec || tec === 'Sin Asignar') return;

      if (!techMap.has(tec)) {
        techMap.set(tec, {
          tecnico: tec,
          zona: String(r['ZONA LOCAL'] || r['Zona Local'] || 'Sin Zona').trim(),
          pedidos: []
        });
      }
      techMap.get(tec)!.pedidos.push(r);
    });

    const results: TechnicianMetric[] = [];

    techMap.forEach((data, tec) => {
      const normTec = tec.toLowerCase();
      const techSfSet = stockFijoByTechMap.get(normTec) || new Set<string>();

      const pedidosAtendidos = data.pedidos.length;
      let reincidentesCount = 0;
      let mpCount = 0;
      let mpSinFalla60d = 0;
      let repuestosUsadosCount = 0;
      let pedidosConRepuesto = 0;
      let repuestosEnSfCount = 0;

      data.pedidos.forEach(r => {
        // First Time Fix (Recurrencia)
        const recurrente = String(r['FALLA RECURRENTE'] || '').trim().toUpperCase();
        if (recurrente === 'S' || recurrente === 'SI' || recurrente === 'SÍ') {
          reincidentesCount++;
        }

        // MTM / Preventivo 60 days
        const concepto = String(r['CONCEPTO LLAMADA'] || '').toUpperCase();
        const esMp = concepto === 'MTM' || concepto.includes('PREVENTIVO');
        if (esMp) {
          mpCount++;
          const atm = String(r.ATM || '').trim();
          const mpTime = parseDateMs(r['MARCA INICIO'] || r['MARCA FIN'] || r['MARCA ALTA']);
          if (mpTime && atmFailuresMap.has(atm)) {
            const failures = atmFailuresMap.get(atm)!;
            // Check if there was any failure strictly within (mpTime + 1 hour, mpTime + 60 days]
            const hadFailureWithin60d = failures.some(ft => ft > mpTime + 3600000 && ft <= mpTime + SIXTY_DAYS_MS);
            if (!hadFailureWithin60d) {
              mpSinFalla60d++;
            }
          } else {
            // No registered subsequent failures on this ATM
            mpSinFalla60d++;
          }
        }

        // Repuesto & Stock Fijo Match
        const usaRep = (String(r['Utiliza Repuesto'] || '')).toLowerCase() === 'sí' || (String(r['Utiliza Repuesto'] || '')).toLowerCase() === 'si';
        const pnInstala = String(r['PN INSTALA'] || '').trim().toUpperCase();
        if (usaRep && pnInstala && pnInstala !== '-' && pnInstala !== '0') {
          pedidosConRepuesto++;
          repuestosUsadosCount++;

          // Check if this technician has this part assigned in Stock Fijo
          const matchedSf = techSfSet.has(pnInstala) || Array.from(techSfSet).some(sfPn => 
            pnInstala.includes(sfPn) || (sfPn.length >= 6 && pnInstala.replace(/^[A-Z]{2}-/, '').startsWith(sfPn))
          );
          if (matchedSf) {
            repuestosEnSfCount++;
          }
        }
      });

      const ftfPct = pedidosAtendidos > 0 
        ? ((pedidosAtendidos - reincidentesCount) / pedidosAtendidos) * 100 
        : 100.0;

      const mpEffPct = mpCount > 0 
        ? (mpSinFalla60d / mpCount) * 100 
        : 100.0;

      const sfCoveragePct = pedidosConRepuesto > 0 
        ? (repuestosEnSfCount / pedidosConRepuesto) * 100 
        : 0.0;

      results.push({
        tecnico: tec,
        zona: data.zona,
        pedidosAtendidos,
        reincidentesCount,
        efectividadPrimeraVisita: parseFloat(ftfPct.toFixed(1)),
        mpCount,
        mpSinFalla60d,
        efectividadMp: parseFloat(mpEffPct.toFixed(1)),
        repuestosUsadosCount,
        pedidosConRepuesto,
        repuestosEnSfCount,
        pctRepuestosEnSf: parseFloat(sfCoveragePct.toFixed(1))
      });
    });

    // Filter by techSearch
    const filtered = results.filter(t => 
      t.tecnico.toLowerCase().includes(techSearch.toLowerCase()) || 
      t.zona.toLowerCase().includes(techSearch.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      let comp = 0;
      if (typeof a[techSortKey] === 'string') {
        comp = String(a[techSortKey]).localeCompare(String(b[techSortKey]));
      } else {
        comp = (a[techSortKey] as number) - (b[techSortKey] as number);
      }
      return techSortAsc ? comp : -comp;
    });

    return filtered;
  }, [generalFilteredData, stockFijoByTechMap, atmFailuresMap, techSearch, techSortKey, techSortAsc]);

  // Export functions
  const handleExportTecnicosCsv = () => {
    const headers = [
      'Técnico',
      'Zona',
      'Pedidos Atendidos',
      'Efectividad 1ra Visita (%)',
      'Cantidad MP',
      'Efectividad MP 60d (%)',
      'Repuestos Utilizados',
      'Pedidos con Repuesto',
      'Repuestos en Stock Fijo',
      '% Asignado a SF'
    ];
    const rows = technicianMetrics.map(t => [
      `"${t.tecnico}"`,
      `"${t.zona}"`,
      t.pedidosAtendidos,
      t.efectividadPrimeraVisita,
      t.mpCount,
      t.efectividadMp,
      t.repuestosUsadosCount,
      t.pedidosConRepuesto,
      t.repuestosEnSfCount,
      t.pctRepuestosEnSf
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rendimiento_Tecnicos_Dashboard_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportRepuestosCsv = () => {
    const headers = ['Ranking', 'Part Number (PN)', 'Descripción', 'Cantidad Utilizada', '% Sobre el Total', 'En Stock Fijo'];
    const rows = sparePartsRanking.list.map((p, i) => [
      i + 1,
      `"${p.pn}"`,
      `"${p.descripcion.replace(/"/g, '""')}"`,
      p.usos,
      p.pctSobreTotal,
      p.enStockFijo ? 'Sí' : 'No'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ranking_Repuestos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
          <Activity className="w-6 h-6 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-lg font-bold text-white tracking-wide">Cargando Dashboard Operativo...</p>
          <p className="text-xs text-slate-400">Procesando métricas de atenciones, base instalada y stock fijo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* ==================================================================== */}
      {/* 1. Header & Tabs Bar */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-950/90 p-5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-600/30 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">Dashboard Operativo & KPIs</h1>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">
                  Control Ejecutivo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Métricas integradas de cumplimiento SLA, Call Rate, análisis de repuestos y efectividad de técnicos
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex items-center bg-black/40 p-1.5 rounded-xl border border-white/10 shadow-inner">
          <button
            onClick={() => setActiveSubTab('OPERACIONES_SLA')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeSubTab === 'OPERACIONES_SLA'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Evolución Operativa & SLA</span>
          </button>
          <button
            onClick={() => setActiveSubTab('REPUESTOS_TECNICOS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeSubTab === 'REPUESTOS_TECNICOS'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Repuestos & Rendimiento Técnicos</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. Filtros Generales y Temporales */}
      {/* ==================================================================== */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4">
        
        {/* Panel A: Filtros Generales */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">Filtros Generales</span>
              <span className="text-[11px] text-slate-400">• Aplican a todas las métricas y al gráfico de SLA</span>
            </div>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar Filtros</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Negocio */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Negocio</label>
              <select
                value={selectedNegocio}
                onChange={(e) => setSelectedNegocio(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              >
                <option value="ALL">Todos los Negocios</option>
                {options.negocios.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {/* Zona Local */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Zona Local</label>
              <select
                value={selectedZonaLocal}
                onChange={(e) => {
                  setSelectedZonaLocal(e.target.value);
                  setSelectedTecnico('ALL');
                }}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              >
                <option value="ALL">Todas las Zonas ({ZONAS_LOCALES.length})</option>
                {ZONAS_LOCALES.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            {/* Técnico Zona */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Técnico Zona</label>
              <select
                value={selectedTecnico}
                onChange={(e) => setSelectedTecnico(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              >
                <option value="ALL">Todos los Técnicos ({options.tecnicos.length})</option>
                {options.tecnicos.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Fabricante */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Fabricante</label>
              <select
                value={selectedFabricante}
                onChange={(e) => setSelectedFabricante(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              >
                <option value="ALL">Todos los Fabricantes ({options.fabricantes.length})</option>
                {options.fabricantes.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* MPCR */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">MPCR</label>
              <select
                value={selectedMpcr}
                onChange={(e) => setSelectedMpcr(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
              >
                <option value="ALL">Todos los MPCR ({options.mpcrs.length})</option>
                {options.mpcrs.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-white/5" />

        {/* Panel B: Filtros Temporales (Aparte & Aislados del gráfico de SLA) */}
        <div className="bg-slate-950/60 rounded-xl p-3 border border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                Filtros Temporales (Período de Análisis KPIs)
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                Independientes del Gráfico SLA Mensual
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>El gráfico de SLA mantiene la evolución anual completa para el segmento filtrado.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Mes */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Mes</label>
              <select
                value={selectedMes}
                onChange={(e) => {
                  setSelectedMes(e.target.value);
                  setSelectedSemana('ALL');
                }}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              >
                <option value="ALL">Todos los Meses (Evolución Completa)</option>
                {options.meses.map(m => (
                  <option key={m} value={m}>{m} - {MESES_NOMBRES[m] || `Mes ${m}`}</option>
                ))}
              </select>
            </div>

            {/* Semana dependiente */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Semana {selectedMes !== 'ALL' ? `(Mes ${selectedMes})` : '(Todas)'}
              </label>
              <select
                value={selectedSemana}
                onChange={(e) => setSelectedSemana(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              >
                <option value="ALL">Todas las Semanas</option>
                {availableWeeks.map(w => (
                  <option key={w} value={w}>Semana {w}</option>
                ))}
              </select>
            </div>

            {/* Resumen del Corte Activo */}
            <div className="sm:col-span-2 flex items-center justify-end">
              <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5 text-xs text-slate-300">
                <span>Registros en segmento: <strong className="text-white font-mono">{generalFilteredData.length.toLocaleString()}</strong></span>
                <span className="text-slate-600">•</span>
                <span>En ventana temporal: <strong className="text-cyan-400 font-mono">{temporalFilteredData.length.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* 3. PESTAÑA 1: Evolución Operativa & Calidad SLA */}
      {/* ==================================================================== */}
      {activeSubTab === 'OPERACIONES_SLA' && (
        <div className="space-y-6">
          
          {/* KPI Cards (Afectadas por Filtros Generales + Temporales) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Cantidad de Pedidos Atendidos */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 p-5 rounded-2xl border border-blue-500/20 shadow-xl shadow-blue-500/5 group hover:border-blue-500/40 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Pedidos Atendidos</span>
                <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-3xl font-black text-white tracking-tight font-mono">
                  {kpis.totalPedidos.toLocaleString()}
                </p>
                <span className="text-xs font-semibold text-slate-400">órdenes</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Preventivos: <strong className="text-slate-200">{kpis.preventivosCount}</strong></span>
                <span>Correctivos: <strong className="text-slate-200">{kpis.correctivosCount}</strong></span>
              </div>
            </div>

            {/* KPI 2: Call Rate en función de la Base Instalada */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 p-5 rounded-2xl border border-cyan-500/20 shadow-xl shadow-cyan-500/5 group hover:border-cyan-500/40 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Call Rate vs Base</span>
                <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-3xl font-black text-cyan-300 tracking-tight font-mono">
                  {kpis.callRateRatio}
                </p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {kpis.callRatePct}%
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Fallas / Equipo</span>
                <span>Base: <strong className="text-slate-200">{kpis.baseTotal.toLocaleString()}</strong> ATMs</span>
              </div>
            </div>

            {/* KPI 3: Pedidos con Repuesto Utilizado */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/90 to-purple-950/40 p-5 rounded-2xl border border-purple-500/20 shadow-xl shadow-purple-500/5 group hover:border-purple-500/40 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Uso de Repuestos</span>
                <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-3xl font-black text-purple-300 tracking-tight font-mono">
                  {kpis.pedidosConRepuesto.toLocaleString()}
                </p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {kpis.pctConRepuesto}%
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Pedidos requirieron repuesto</span>
                <span>Instalados: <strong className="text-slate-200">{kpis.totalUnidadesRepuestos}</strong></span>
              </div>
            </div>

            {/* KPI 4: Cumplimiento SLA del Período */}
            <div className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/90 ${
              kpis.pctSla >= 90 ? 'to-emerald-950/40 border-emerald-500/20 shadow-emerald-500/5' : 'to-amber-950/40 border-amber-500/20 shadow-amber-500/5'
            } p-5 rounded-2xl border shadow-xl transition-all duration-300`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">SLA Período Activo</span>
                <div className={`p-2 rounded-xl border ${
                  kpis.pctSla >= 90 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <p className={`text-3xl font-black font-mono ${kpis.pctSla >= 90 ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {kpis.pctSla}%
                </p>
                <span className="text-xs font-semibold text-slate-400">cumplimiento</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span>En SLA: <strong className="text-slate-200">{kpis.pedidosCumplioSla.toLocaleString()}</strong></span>
                <span>Meta: <strong className="text-amber-400">95.0%</strong></span>
              </div>
            </div>

          </div>

          {/* Gráfico SLA General Mensual de Líneas */}
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-black text-white tracking-tight">Evolución Mensual de Cumplimiento SLA</h3>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 rounded-md">
                    Gráfico de Líneas
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Evolución anual mes a mes para el segmento filtrado ({selectedNegocio !== 'ALL' ? selectedNegocio : 'Todos los negocios'} • {selectedZonaLocal !== 'ALL' ? selectedZonaLocal : 'Todas las zonas'})
                </p>
              </div>

              {/* Legend & Target */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-md shadow-cyan-400/50" />
                  <span className="text-slate-300 font-semibold">% SLA Real</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 border-t-2 border-dashed border-amber-400" />
                  <span className="text-amber-300 font-semibold">Meta SLA (95%)</span>
                </div>
              </div>
            </div>

            {/* Recharts Container */}
            <div className="w-full h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlySlaChartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis 
                    dataKey="mesNombre" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-950/95 border border-cyan-500/30 p-3.5 rounded-xl shadow-2xl backdrop-blur-md min-w-[210px] space-y-2">
                            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                              <span className="text-xs font-bold text-white uppercase tracking-wider">{d.mesNombre}</span>
                              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                                Mes {d.mesNum}
                              </span>
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between text-slate-300">
                                <span>Cumplimiento SLA:</span>
                                <strong className={`font-mono text-sm ${d.pctSla >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {d.pctSla}%
                                </strong>
                              </div>
                              <div className="flex justify-between text-slate-400 text-[11px]">
                                <span>Total Pedidos:</span>
                                <strong className="font-mono text-slate-200">{d.totalPedidos.toLocaleString()}</strong>
                              </div>
                              <div className="flex justify-between text-slate-400 text-[11px]">
                                <span>En SLA:</span>
                                <strong className="font-mono text-emerald-400">{d.pedidosCumplio.toLocaleString()}</strong>
                              </div>
                              <div className="flex justify-between text-slate-400 text-[11px]">
                                <span>Fuera de SLA:</span>
                                <strong className="font-mono text-rose-400">{d.pedidosFuera.toLocaleString()}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine 
                    y={95} 
                    stroke="#f59e0b" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                    label={{ value: 'Meta 95%', position: 'right', fill: '#f59e0b', fontSize: 11, fontWeight: 'bold' }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pctSla" 
                    stroke="#06b6d4" 
                    strokeWidth={3} 
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const isHighlighted = payload.isSelected;
                      return (
                        <circle 
                          key={`dot-${payload.mesNum}`}
                          cx={cx} 
                          cy={cy} 
                          r={isHighlighted ? 7 : 4} 
                          fill={isHighlighted ? '#f59e0b' : '#06b6d4'} 
                          stroke={isHighlighted ? '#ffffff' : '#0f172a'} 
                          strokeWidth={2}
                          className="transition-all duration-200 cursor-pointer"
                        />
                      );
                    }}
                    activeDot={{ r: 7, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Breakdown Table strip */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs text-center border-t border-white/5">
                <thead>
                  <tr className="text-slate-400 font-semibold border-b border-white/5">
                    <th className="py-2 px-2 text-left">Métrica / Mes</th>
                    {monthlySlaChartData.map(d => (
                      <th key={d.mesNum} className={`py-2 px-2 ${d.isSelected ? 'text-amber-400 font-bold bg-amber-500/10' : ''}`}>
                        {d.mesNombre.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300 font-mono">
                  <tr>
                    <td className="py-2 px-2 text-left font-sans text-slate-400 font-medium">Pedidos Atendidos</td>
                    {monthlySlaChartData.map(d => (
                      <td key={d.mesNum} className={`py-2 px-2 ${d.isSelected ? 'bg-amber-500/10 font-bold text-white' : ''}`}>
                        {d.totalPedidos.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-2 text-left font-sans text-slate-400 font-medium">% SLA Cumplido</td>
                    {monthlySlaChartData.map(d => (
                      <td 
                        key={d.mesNum} 
                        className={`py-2 px-2 font-bold ${
                          d.pctSla >= 90 ? 'text-emerald-400' : 'text-amber-400'
                        } ${d.isSelected ? 'bg-amber-500/10 underline' : ''}`}
                      >
                        {d.pctSla}%
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. PESTAÑA 2: Repuestos & Rendimiento de Técnicos */}
      {/* ==================================================================== */}
      {activeSubTab === 'REPUESTOS_TECNICOS' && (
        <div className="space-y-8">
          
          {/* SECCIÓN A: Ranking de los Repuestos más utilizados */}
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-black text-white tracking-tight">Ranking de Repuestos Más Utilizados</h3>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/25 rounded-md">
                    {sparePartsRanking.list.length} partes registradas
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consumo acumulado de repuestos con los filtros generales aplicados ({sparePartsRanking.totalRepuestos.toLocaleString()} unidades totales)
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por PN o descripción..."
                    value={partSearch}
                    onChange={(e) => {
                      setPartSearch(e.target.value);
                      setPartPage(1);
                    }}
                    className="bg-slate-950/80 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 w-60"
                  />
                </div>

                {/* Export CSV */}
                <button
                  onClick={handleExportRepuestosCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
                  title="Descargar ranking a CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar</span>
                </button>
              </div>
            </div>

            {/* Top 10 Visual Bar Chart */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-3">
                Top 10 Repuestos de Mayor Rotación
              </span>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={sparePartsRanking.top10} 
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                    <YAxis 
                      type="category" 
                      dataKey="pn" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false}
                      width={160}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload as SparePartMetric;
                          return (
                            <div className="bg-slate-950/95 border border-purple-500/30 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 max-w-xs">
                              <div className="font-bold text-white">{d.pn}</div>
                              <p className="text-[11px] text-slate-300">{d.descripcion}</p>
                              <div className="pt-1.5 border-t border-white/10 flex justify-between">
                                <span className="text-slate-400">Instalaciones:</span>
                                <strong className="font-mono text-purple-300">{d.usos} unidades ({d.pctSobreTotal}%)</strong>
                              </div>
                              {d.enStockFijo && (
                                <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                                  ✓ Asignado en Stock Fijo
                                </span>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="usos" radius={[0, 4, 4, 0]}>
                      {sparePartsRanking.top10.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 0 ? '#c084fc' : index < 3 ? '#a855f7' : '#7e22ce'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Full Spare Parts Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-white/5">
                  <tr>
                    <th className="py-3 px-3 text-center w-16">Rank</th>
                    <th 
                      onClick={() => {
                        if (partSortKey === 'pn') setPartSortAsc(!partSortAsc);
                        else { setPartSortKey('pn'); setPartSortAsc(true); }
                      }}
                      className="py-3 px-3 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Part Number (PN)</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3">Descripción del Repuesto</th>
                    <th 
                      onClick={() => {
                        if (partSortKey === 'usos') setPartSortAsc(!partSortAsc);
                        else { setPartSortKey('usos'); setPartSortAsc(false); }
                      }}
                      className="py-3 px-3 text-right cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Cantidad Utilizada</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th 
                      onClick={() => {
                        if (partSortKey === 'pctSobreTotal') setPartSortAsc(!partSortAsc);
                        else { setPartSortKey('pctSobreTotal'); setPartSortAsc(false); }
                      }}
                      className="py-3 px-3 text-right cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>% Sobre Total</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center">Catálogo SF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {sparePartsRanking.list.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No se encontraron repuestos con los filtros o búsqueda actuales
                      </td>
                    </tr>
                  ) : (
                    sparePartsRanking.list
                      .slice((partPage - 1) * PART_PAGE_SIZE, partPage * PART_PAGE_SIZE)
                      .map((part, idx) => {
                        const globalIndex = (partPage - 1) * PART_PAGE_SIZE + idx + 1;
                        return (
                          <tr key={part.pn + idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                                globalIndex === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                globalIndex === 2 ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30' :
                                globalIndex === 3 ? 'bg-amber-700/20 text-amber-400 border border-amber-700/30' :
                                'text-slate-500'
                              }`}>
                                {globalIndex}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-cyan-300 whitespace-nowrap">
                              {part.pn}
                            </td>
                            <td className="py-2.5 px-3 text-slate-200 max-w-md truncate" title={part.descripcion}>
                              {part.descripcion}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                              {part.usos.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-purple-300">
                              {part.pctSobreTotal}%
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {part.enStockFijo ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Stock Fijo</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">
                                  Despacho/Gen
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>

              {/* Table Pagination */}
              {sparePartsRanking.list.length > PART_PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 bg-slate-950/60 border-t border-white/5 text-xs text-slate-400">
                  <span>
                    Mostrando {((partPage - 1) * PART_PAGE_SIZE) + 1} a {Math.min(partPage * PART_PAGE_SIZE, sparePartsRanking.list.length)} de {sparePartsRanking.list.length} repuestos
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPartPage(p => Math.max(1, p - 1))}
                      disabled={partPage === 1}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="font-mono text-slate-300">{partPage} / {Math.ceil(sparePartsRanking.list.length / PART_PAGE_SIZE)}</span>
                    <button
                      onClick={() => setPartPage(p => Math.min(Math.ceil(sparePartsRanking.list.length / PART_PAGE_SIZE), p + 1))}
                      disabled={partPage >= Math.ceil(sparePartsRanking.list.length / PART_PAGE_SIZE)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* SECCIÓN B: Tabla Resumida y Limpia de Técnicos */}
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-black text-white tracking-tight">Rendimiento Operativo por Técnico</h3>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 rounded-md">
                    {technicianMetrics.length} técnicos
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Efectividad en primera visita, MTM sin fallas a 60 días, volumen de repuestos y porcentaje cubierto por su Stock Fijo
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Search Technician */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar técnico o zona..."
                    value={techSearch}
                    onChange={(e) => setTechSearch(e.target.value)}
                    className="bg-slate-950/80 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 w-56"
                  />
                </div>

                {/* Export CSV */}
                <button
                  onClick={handleExportTecnicosCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
                  title="Descargar matriz a CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Matriz</span>
                </button>
              </div>
            </div>

            {/* Clean Executive Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/90 text-slate-400 font-semibold uppercase tracking-wider border-b border-white/5">
                  <tr>
                    <th 
                      onClick={() => {
                        if (techSortKey === 'tecnico') setTechSortAsc(!techSortAsc);
                        else { setTechSortKey('tecnico'); setTechSortAsc(true); }
                      }}
                      className="py-3.5 px-4 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1">
                        <span>Técnico & Zona</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>

                    <th 
                      onClick={() => {
                        if (techSortKey === 'pedidosAtendidos') setTechSortAsc(!techSortAsc);
                        else { setTechSortKey('pedidosAtendidos'); setTechSortAsc(false); }
                      }}
                      className="py-3.5 px-3 text-right cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Pedidos Atendidos</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>

                    <th 
                      onClick={() => {
                        if (techSortKey === 'efectividadPrimeraVisita') setTechSortAsc(!techSortAsc);
                        else { setTechSortKey('efectividadPrimeraVisita'); setTechSortAsc(false); }
                      }}
                      className="py-3.5 px-3 text-center cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>% Efectividad 1ª Visita</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>

                    <th 
                      onClick={() => {
                        if (techSortKey === 'mpCount') setTechSortAsc(!techSortAsc);
                        else { setTechSortKey('mpCount'); setTechSortAsc(false); }
                      }}
                      className="py-3.5 px-3 text-right cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Cantidad de MP</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>

                    <th 
                      onClick={() => {
                        if (techSortKey === 'efectividadMp') setTechSortAsc(!techSortAsc);
                        else { setTechSortKey('efectividadMp'); setTechSortAsc(false); }
                      }}
                      className="py-3.5 px-3 text-center cursor-pointer hover:text-white"
                      title="Equipos que no fallaron en los siguientes 60 días posteriores al MP"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Efectividad MP (60d)</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>

                    <th 
                      onClick={() => {
                        if (techSortKey === 'repuestosUsadosCount') setTechSortAsc(!techSortAsc);
                        else { setTechSortKey('repuestosUsadosCount'); setTechSortAsc(false); }
                      }}
                      className="py-3.5 px-3 text-right cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Repuestos Usados</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>

                    <th 
                      onClick={() => {
                        if (techSortKey === 'pctRepuestosEnSf') setTechSortAsc(!techSortAsc);
                        else { setTechSortKey('pctRepuestosEnSf'); setTechSortAsc(false); }
                      }}
                      className="py-3.5 px-4 text-right cursor-pointer hover:text-white"
                      title="% de pedidos con repuestos que están asignados al Stock Fijo del técnico"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>% Repuestos Asignados a SF</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {technicianMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No se encontraron técnicos para los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    technicianMetrics.map((t, idx) => (
                      <tr key={t.tecnico + idx} className="hover:bg-white/[0.02] transition-colors group">
                        {/* 1. Técnico & Zona */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {t.tecnico}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
                            <span>{t.zona}</span>
                          </div>
                        </td>

                        {/* 2. Pedidos Atendidos */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          {t.pedidosAtendidos.toLocaleString()}
                        </td>

                        {/* 3. % Efectividad 1ª Visita (FTF) */}
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                            t.efectividadPrimeraVisita >= 85 
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                              : t.efectividadPrimeraVisita >= 75 
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}>
                            {t.efectividadPrimeraVisita}%
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-0.5">
                            {t.reincidentesCount} reincidentes
                          </span>
                        </td>

                        {/* 4. Cantidad de MP */}
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-200">
                          {t.mpCount.toLocaleString()}
                        </td>

                        {/* 5. Efectividad MP (60 días) */}
                        <td className="py-3 px-3 text-center">
                          {t.mpCount > 0 ? (
                            <div>
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                                t.efectividadMp >= 80 
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                                  : t.efectividadMp >= 65 
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              }`}>
                                {t.efectividadMp}%
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-0.5 font-mono">
                                {t.mpSinFalla60d}/{t.mpCount} sin fallas
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">Sin MPs</span>
                          )}
                        </td>

                        {/* 6. Repuestos Usados */}
                        <td className="py-3 px-3 text-right font-mono font-semibold text-purple-300">
                          {t.repuestosUsadosCount.toLocaleString()}
                        </td>

                        {/* 7. % Asignados a su SF */}
                        <td className="py-3 px-4 text-right">
                          {t.pedidosConRepuesto > 0 ? (
                            <div>
                              <div className="flex items-center justify-end gap-2">
                                <span className={`font-mono font-bold ${
                                  t.pctRepuestosEnSf >= 70 ? 'text-emerald-400' :
                                  t.pctRepuestosEnSf >= 40 ? 'text-amber-400' : 'text-slate-400'
                                }`}>
                                  {t.pctRepuestosEnSf}%
                                </span>
                              </div>
                              <span className="block text-[10px] text-slate-400 mt-0.5 font-mono">
                                {t.repuestosEnSfCount} de {t.pedidosConRepuesto} en SF
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">Sin consumo</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
export default DashboardOperativoView;
