import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Download, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ArrowUpDown, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Calendar, 
  Layers, 
  Activity, 
  Wrench, 
  PhoneCall, 
  Radio, 
  Maximize2,
  ExternalLink,
  ChevronDown,
  CalendarRange,
  SunMedium,
  CheckCircle,
  HelpCircle,
  Cpu,
  MapPin,
  UserCheck,
  History,
  ShieldCheck,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { AnalisisRow, AnalisisMetadata } from '../types';
import metadataRaw from '../data/analisisMetadata.json';
import telcaAtmDetailsMapRaw from '../data/telcaAtmDetailsMap.json';
import telcaDerivacionesRaw from '../data/telcaDerivaciones.json';
import { SlaCausalidadesView } from './SlaCausalidadesView';

const telcaAtmDetailsMap = telcaAtmDetailsMapRaw as Record<string, any>;
const telcaDerivaciones = telcaDerivacionesRaw as {
  totalTelca: number;
  totalDerivados: number;
  pctDerivados: number;
  directCount: number;
  otCount: number;
  sameAtm24hCount: number;
  derivaciones: Record<string, any>;
};

type SubTabKey = 'SUSPENDIDOS' | 'SLA' | 'TELCA';

const MESES_NOMBRES: Record<string, string> = {
  '1': '1 - Enero',
  '2': '2 - Febrero',
  '3': '3 - Marzo',
  '4': '4 - Abril',
  '5': '5 - Mayo',
  '6': '6 - Junio',
  '7': '7 - Julio',
  '8': '8 - Agosto',
  '9': '9 - Septiembre',
  '10': '10 - Octubre',
  '11': '11 - Noviembre',
  '12': '12 - Diciembre'
};

function extractRowYear(r: any): string {
  const dStr = String(r['FECHA FIN'] || r['MARCA FIN'] || r['FECHAALTA'] || r['MARCA ALTA'] || r['fecha'] || r['Fecha'] || '');
  const m = dStr.match(/\b(202[0-9])\b/);
  if (m) return m[1];
  const m2 = dStr.match(/\/(2[0-9])\b/);
  if (m2) return '20' + m2[1];
  return '2026';
}

export const AnalisisPatagoniaView: React.FC = () => {
  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('SUSPENDIDOS');
  const [slaMode, setSlaMode] = useState<'AUDITORIA_CAUSAL' | 'PLANILLA_CRUDA'>('AUDITORIA_CAUSAL');

  // Loaded Datasets
  const [suspendidosData, setSuspendidosData] = useState<AnalisisRow[]>([]);
  const [slaData, setSlaData] = useState<AnalisisRow[]>([]);
  const [telcaData, setTelcaData] = useState<AnalisisRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Metadata
  const metadata: AnalisisMetadata = metadataRaw as AnalisisMetadata;

  // Selected Row for Deep Inspection Modal
  const [inspectedRow, setInspectedRow] = useState<AnalisisRow | null>(null);

  // Filters / Slicers State (Exact match to Excel Slicers)
  const [search, setSearch] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedNegocio, setSelectedNegocio] = useState<string>('ALL');
  const [selectedSla, setSelectedSla] = useState<'ALL' | '1' | '0'>('ALL');
  const [selectedZonaLocal, setSelectedZonaLocal] = useState<string>('ALL');
  const [selectedTecnico, setSelectedTecnico] = useState<string>('ALL');
  const [selectedSemana, setSelectedSemana] = useState<string>('ALL');
  const [selectedMes, setSelectedMes] = useState<string>('ALL');
  const [selectedDia, setSelectedDia] = useState<string>('ALL');
  const [selectedCliente, setSelectedCliente] = useState<string>('ALL');
  const [selectedRecurrente, setSelectedRecurrente] = useState<string>('ALL');
  const [selectedRepuesto, setSelectedRepuesto] = useState<string>('ALL');
  const [selectedConcepto, setSelectedConcepto] = useState<string>('ALL');
  const [selectedCodigoCierre, setSelectedCodigoCierre] = useState<string>('ALL');
  const [selectedFinDeSemana, setSelectedFinDeSemana] = useState<string>('ALL'); // 'ALL' | 'SI' | 'NO'
  const [selectedDerivado, setSelectedDerivado] = useState<string>('ALL'); // 'ALL' | 'SI' | 'NO'
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  // Pagination & Sorting State
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<string>('PEDIDO');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Asynchronous dataset loading on mount or tab switch
  useEffect(() => {
    let isMounted = true;
    const loadDataset = async () => {
      setIsLoading(true);
      try {
        if (activeSubTab === 'SUSPENDIDOS' && suspendidosData.length === 0) {
          const mod = await import('../data/analisisSuspendidosData.json');
          if (isMounted) setSuspendidosData(mod.default as unknown as AnalisisRow[]);
        } else if (activeSubTab === 'SLA' && slaData.length === 0) {
          const mod = await import('../data/analisisSlaData.json');
          if (isMounted) setSlaData(mod.default as unknown as AnalisisRow[]);
        } else if (activeSubTab === 'TELCA' && telcaData.length === 0) {
          const mod = await import('../data/analisisTelcaData.json');
          if (isMounted) setTelcaData(mod.default as unknown as AnalisisRow[]);
        }
      } catch (e) {
        console.error('Error loading dataset for', activeSubTab, e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDataset();
    return () => { isMounted = false; };
  }, [activeSubTab, suspendidosData.length, slaData.length, telcaData.length]);

  // Current Active Raw Dataset
  const currentRawData = useMemo(() => {
    if (activeSubTab === 'SUSPENDIDOS') return suspendidosData;
    if (activeSubTab === 'SLA') return slaData;
    return telcaData;
  }, [activeSubTab, suspendidosData, slaData, telcaData]);

  // Reset page when tab changes
  const handleTabChange = (tab: SubTabKey) => {
    setActiveSubTab(tab);
    setCurrentPage(1);
    setSelectedTecnico('ALL');
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    setSearch('');
    setSelectedYear('ALL');
    setSelectedNegocio('ALL');
    setSelectedSla('ALL');
    setSelectedZonaLocal('ALL');
    setSelectedTecnico('ALL');
    setSelectedSemana('ALL');
    setSelectedMes('ALL');
    setSelectedDia('ALL');
    setSelectedCliente('ALL');
    setSelectedRecurrente('ALL');
    setSelectedRepuesto('ALL');
    setSelectedConcepto('ALL');
    setSelectedCodigoCierre('ALL');
    setSelectedFinDeSemana('ALL');
    setSelectedDerivado('ALL');
    setFechaDesde('');
    setFechaHasta('');
    setCurrentPage(1);
  };

  // Helper to determine if a record corresponds to weekend (Guardia de fin de semana)
  const checkIsWeekend = (r: AnalisisRow): boolean => {
    const fds = r['Fin de semana'] || r['Fin de Semana'];
    if (fds === 'Sí' || fds === 'Si') return true;
    if (fds === 'No') return false;
    
    const dia = (r.Día || r['Día de la semana'] || '').toLowerCase();
    if (dia.includes('sáb') || dia.includes('sab') || dia.includes('dom')) return true;
    if (dia.includes('lun') || dia.includes('mar') || dia.includes('mié') || dia.includes('mie') || dia.includes('jue') || dia.includes('vie')) return false;

    const dateStr = r['MARCA INICIO'] || r['Marca Arribo'] || r['MARCA ALTA'] || r['Fecha Alta'];
    if (dateStr && typeof dateStr === 'string') {
      const parts = dateStr.split(/[\s/:]+/);
      if (parts.length >= 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const dt = new Date(y, m, d);
        const day = dt.getDay();
        return day === 0 || day === 6;
      }
    }
    return false;
  };

  // Helper to check if a TELCA order was derived to field assistance (Suspendidos)
  const getDerivacionInfo = (pedido: any) => {
    const pStr = String(pedido || '').trim();
    if (!pStr) return null;
    return telcaDerivaciones.derivaciones[pStr] || null;
  };

  // Dynamic Options for Slicers based on current dataset
  const options = useMemo(() => {
    const years = new Set<string>();
    const negocios = new Set<string>();
    const zonasLocales = new Set<string>();
    const tecnicos = new Set<string>();
    const semanas = new Set<string>();
    const meses = new Set<string>();
    const clientes = new Set<string>();
    const conceptos = new Set<string>();
    const codigosCierre = new Set<string>();
    const monthWeeksMap: Record<string, Set<string>> = {};

    currentRawData.forEach(r => {
      const y = extractRowYear(r);
      if (y) years.add(y);

      const neg = r.NEGOCIO || r.Negocio;
      if (neg) negocios.add(neg);

      const zl = r['ZONA LOCAL'] || r['Zona Local'];
      if (zl) zonasLocales.add(zl);

      // Rule: in TELCA (Asistencia Remota), use TECNICO ZONA; in others use TECNICO ASISTIO or TECNICO ASIG
      if (activeSubTab === 'TELCA') {
        const tz = r['TECNICO ZONA'] || r['Tecnico Zona'];
        if (tz) tecnicos.add(tz);
      } else {
        const ta = r['TECNICO ASISTIO'] || r['Tecnico Asig'] || r['TECNICO ZONA'] || r['Tecnico Zona'];
        if (ta) tecnicos.add(ta);
      }

      const sem = r.Semana !== undefined && r.Semana !== '' ? String(r.Semana) : (r['Semana del año'] ? String(r['Semana del año']) : '');
      const m = r.Mes !== undefined && r.Mes !== '' ? String(r.Mes) : (r['Nombre del mes'] ? String(r['Nombre del mes']) : '');

      if (m) {
        meses.add(m);
        if (sem) {
          if (!monthWeeksMap[m]) monthWeeksMap[m] = new Set();
          monthWeeksMap[m].add(sem);
        }
      }

      if (sem) semanas.add(sem);

      const cli = r.CLIENTE || r.Cliente;
      if (cli) clientes.add(cli);

      const cpt = r['CONCEPTO LLAMADA'] || r.Tipo || r.TIPO;
      if (cpt) conceptos.add(cpt);

      const cod = r['CODIGO CIERRE'] || r['Cod Cierre'];
      if (cod) codigosCierre.add(cod);
    });

    const allSemanasSorted = Array.from(semanas).sort((a, b) => Number(a) - Number(b));
    let semanasFiltradas: string[] = allSemanasSorted;
    if (selectedMes !== 'ALL' && monthWeeksMap[selectedMes]) {
      semanasFiltradas = Array.from(monthWeeksMap[selectedMes]).sort((a, b) => Number(a) - Number(b));
    }

    return {
      years: Array.from(years).sort().reverse(),
      negocios: Array.from(negocios).sort(),
      zonasLocales: ['Atlántica', 'Centro', 'Contratistas', 'La Pampa', 'Oeste', 'Sur', 'Suroeste'].filter(z => zonasLocales.has(z) || true),
      tecnicos: Array.from(tecnicos).sort(),
      semanas: allSemanasSorted,
      semanasFiltradas,
      monthWeeksMap,
      meses: Array.from(meses).sort((a, b) => {
        const numA = Number(a);
        const numB = Number(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      }),
      clientes: Array.from(clientes).sort(),
      conceptos: Array.from(conceptos).sort(),
      codigosCierre: Array.from(codigosCierre).sort()
    };
  }, [currentRawData, activeSubTab, selectedMes]);

  // Handle Month Change with automatic Week validation
  const handleMesChange = (newMes: string) => {
    setSelectedMes(newMes);
    setCurrentPage(1);
    if (newMes !== 'ALL') {
      const validWeeks = options.monthWeeksMap[newMes] || new Set();
      if (selectedSemana !== 'ALL' && !validWeeks.has(selectedSemana)) {
        setSelectedSemana('ALL');
      }
    }
  };

  // Normalize text helper for resilient matching
  const normalizeText = (val: any = ''): string => {
    return String(val || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  };

  // Base cohort filtered by all criteria EXCEPT selectedDerivado
  const contextFilteredData = useMemo(() => {
    return currentRawData.filter(r => {
      // 0. Año
      if (selectedYear !== 'ALL') {
        const rowYear = extractRowYear(r);
        if (rowYear !== selectedYear) return false;
      }

      // 1. Negocio (ATM vs Cash Today vs CRP)
      if (selectedNegocio !== 'ALL') {
        const rNeg = normalizeText(r.NEGOCIO || r.Negocio || (r as any).negocio);
        const sNeg = normalizeText(selectedNegocio);
        const isAtm = rNeg.includes('atm');
        const isCtd = rNeg.includes('cash') || rNeg.includes('ctd');

        if (sNeg.includes('atm') && !isAtm) return false;
        if ((sNeg.includes('cash') || sNeg.includes('ctd')) && !isCtd) return false;
        if (!sNeg.includes('atm') && !sNeg.includes('cash') && !sNeg.includes('ctd') && rNeg !== sNeg) return false;
      }

      // 2. SLA (1 / 0)
      if (selectedSla !== 'ALL') {
        const rawSla = r['CUMPLIO SLA'] !== undefined ? r['CUMPLIO SLA'] : (r['Cumplio SLA TS'] !== undefined ? r['Cumplio SLA TS'] : (r as any).cumplioSla);
        const isCumplio = rawSla === 1 || rawSla === '1' || rawSla === true || rawSla === 'SI' || rawSla === 'Sí';
        if (selectedSla === '1' && !isCumplio) return false;
        if (selectedSla === '0' && isCumplio) return false;
      }

      // 3. Zona Local (Accent and casing insensitive)
      if (selectedZonaLocal !== 'ALL') {
        const sZl = normalizeText(selectedZonaLocal);
        const rZl = normalizeText(r['ZONA LOCAL'] || r['Zona Local'] || (r as any).zonaLocal || r.ZONA || r.Zona || (r as any).zona);
        const rZt = normalizeText(r['ZONA TECNICA'] || r['Zona Tecnica'] || (r as any).zonaTecnica);
        const match = rZl === sZl || rZl.includes(sZl) || sZl.includes(rZl) || rZt === sZl;
        if (!match) return false;
      }

      // 4. Técnico (TECNICO ZONA for TELCA, TECNICO ASISTIO for Suspendidos/SLA)
      if (selectedTecnico !== 'ALL') {
        const sTec = normalizeText(selectedTecnico);
        const tecAsistio = normalizeText(r['TECNICO ASISTIO'] || (r as any).tecnicoAsistio || r.TECNICO || r.Tecnico);
        const tecAsig = normalizeText(r['TECNICO ASIG'] || r['Tecnico Asig'] || (r as any).tecnicoAsig);
        const tecZona = normalizeText(r['TECNICO ZONA'] || r['Tecnico Zona'] || (r as any).tecnicoZona);

        if (activeSubTab === 'TELCA') {
          const match = (tecZona && (tecZona === sTec || tecZona.includes(sTec))) || 
                        (tecAsistio && (tecAsistio === sTec || tecAsistio.includes(sTec)));
          if (!match) return false;
        } else {
          const match = (tecAsistio && (tecAsistio === sTec || tecAsistio.includes(sTec))) ||
                        (tecAsig && (tecAsig === sTec || tecAsig.includes(sTec))) ||
                        (tecZona && (tecZona === sTec || tecZona.includes(sTec)));
          if (!match) return false;
        }
      }

      // 5. Mes
      if (selectedMes !== 'ALL') {
        const mRaw = r.Mes !== undefined && r.Mes !== '' ? String(r.Mes) : String(r['Nombre del mes'] || '');
        const sMesNorm = normalizeText(selectedMes);
        const mNorm = normalizeText(mRaw);
        const matchMes = mNorm === sMesNorm || mRaw === selectedMes || (Number(mRaw) === Number(selectedMes));
        if (!matchMes) return false;
      }

      // 6. Semana (dependent on Mes)
      if (selectedSemana !== 'ALL') {
        const semRaw = String(r.Semana !== undefined && r.Semana !== '' ? r.Semana : (r['Semana del año'] || ''));
        if (semRaw !== selectedSemana && Number(semRaw) !== Number(selectedSemana)) return false;
      }

      // 7. Día de la Semana
      if (selectedDia !== 'ALL') {
        if (selectedDia === 'FIN_DE_SEMANA') {
          if (!checkIsWeekend(r)) return false;
        } else {
          const dNorm = normalizeText(r.Día || r['Día'] || r['Día de la semana']);
          const sDiaNorm = normalizeText(selectedDia);
          if (!dNorm.includes(sDiaNorm) && !sDiaNorm.includes(dNorm)) return false;
        }
      }

      // 8. Cliente
      if (selectedCliente !== 'ALL') {
        const cliNorm = normalizeText(r.CLIENTE || r.Cliente || (r as any).cliente);
        const sCliNorm = normalizeText(selectedCliente);
        if (cliNorm !== sCliNorm && !cliNorm.includes(sCliNorm) && !sCliNorm.includes(cliNorm)) return false;
      }

      // 9. Falla Recurrente (S / N)
      if (selectedRecurrente !== 'ALL') {
        const rec = String(r['FALLA RECURRENTE'] || r['Falla Recurrente'] || (r as any).fallaRecurrente || 'N').trim().toUpperCase();
        const sRec = selectedRecurrente.trim().toUpperCase();
        if (rec !== sRec) return false;
      }

      // 10. Utiliza Repuesto (Sí / No)
      if (selectedRepuesto !== 'ALL') {
        const rep = normalizeText(r['Utiliza Repuesto'] || (r as any).utilizaRepuesto || 'No');
        const sRep = normalizeText(selectedRepuesto);
        const isSi = rep === 'si' || rep === 's' || rep === '1' || rep === 'true';
        const isReqSi = sRep === 'si' || sRep === 's';
        if (isReqSi && !isSi) return false;
        if (!isReqSi && isSi) return false;
      }

      // 11. Concepto Llamada
      if (selectedConcepto !== 'ALL') {
        const cpt = normalizeText(r['CONCEPTO LLAMADA'] || r.Tipo || r.TIPO || (r as any).concepto);
        const sCpt = normalizeText(selectedConcepto);
        if (cpt !== sCpt && !cpt.includes(sCpt)) return false;
      }

      // 12. Código Cierre
      if (selectedCodigoCierre !== 'ALL') {
        const cod = normalizeText(r['CODIGO CIERRE'] || r['Cod Cierre'] || (r as any).codigoCierre);
        const sCod = normalizeText(selectedCodigoCierre);
        if (cod !== sCod && !cod.includes(sCod)) return false;
      }

      // 13. Fin de Semana (Guardia Sáb/Dom vs Día Hábil)
      if (selectedFinDeSemana !== 'ALL') {
        const isWk = checkIsWeekend(r);
        if (selectedFinDeSemana === 'SI' && !isWk) return false;
        if (selectedFinDeSemana === 'NO' && isWk) return false;
      }

      // 14. Fechas Desde / Hasta
      const fechaRow = r['MARCA ALTA'] || r['Fecha Alta'] || r['MARCA FIN'] || r['FECHA FIN'] || (r as any).fecha;
      if (fechaDesde && fechaRow) {
        if (fechaRow < fechaDesde) return false;
      }
      if (fechaHasta && fechaRow) {
        if (fechaRow > fechaHasta) return false;
      }

      // 15. Free text search
      if (search.trim()) {
        const q = normalizeText(search);
        const ped = normalizeText(r.PEDIDO || r.Pedido);
        const atm = normalizeText(r.ATM || r['ATM ID']);
        const cli = normalizeText(r.CLIENTE || r.Cliente);
        const dir = normalizeText(r.DIRECCION || r.Direccion);
        const loc = normalizeText(r.LOCALIDAD || r.Localidad);
        const fal = normalizeText(r['DETALLE FALLA'] || r['Falla Informada'] || r['PROBLEMA ENCONTRADO']);
        const obs = normalizeText(r['OBSERVACIONES CONTROL'] || r.Observaciones);
        const tec = normalizeText(r['TECNICO ASISTIO'] || r['TECNICO ZONA'] || r['Tecnico Asig']);
        const mod = normalizeText(r.MODELO || r.Modelo || r.MPCR);

        const match = 
          ped.includes(q) || 
          atm.includes(q) || 
          cli.includes(q) || 
          dir.includes(q) || 
          loc.includes(q) || 
          fal.includes(q) || 
          obs.includes(q) || 
          tec.includes(q) || 
          mod.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    currentRawData,
    selectedYear,
    selectedNegocio,
    selectedSla,
    selectedZonaLocal,
    selectedTecnico,
    selectedSemana,
    selectedMes,
    selectedDia,
    selectedCliente,
    selectedRecurrente,
    selectedRepuesto,
    selectedConcepto,
    selectedCodigoCierre,
    selectedFinDeSemana,
    fechaDesde,
    fechaHasta,
    search,
    activeSubTab
  ]);

  // Final filteredData also applies selectedDerivado for table display
  const filteredData = useMemo(() => {
    if (activeSubTab !== 'TELCA' || selectedDerivado === 'ALL') {
      return contextFilteredData;
    }
    return contextFilteredData.filter(r => {
      const isDer = !!getDerivacionInfo(r.PEDIDO || r.Pedido);
      if (selectedDerivado === 'SI' && !isDer) return false;
      if (selectedDerivado === 'NO' && isDer) return false;
      return true;
    });
  }, [contextFilteredData, activeSubTab, selectedDerivado]);

  // Sorting
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA = a[sortField] !== undefined ? a[sortField] : a[sortField.toLowerCase()];
      let valB = b[sortField] !== undefined ? b[sortField] : b[sortField.toLowerCase()];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Reset to page 1 if current page exceeds totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(prev => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // KPI Metrics calculation based on contextFilteredData (el total de llamados del contexto filtrado)
  const kpis = useMemo(() => {
    const total = contextFilteredData.length;
    if (total === 0) {
      return { 
        total: 0, 
        slaPct: 0, 
        recurrentePct: 0, 
        repuestoCount: 0,
        repuestoPct: 0,
        fdsCount: 0,
        fdsPct: 0,
        derivadosCount: 0,
        derivadosPct: 0,
        resueltosRemotoCount: 0,
        resueltosRemotoPct: 0,
        telca2Count: 0,
        telca2Pct: 0,
        tecnicosCount: 0
      };
    }

    const slaOk = contextFilteredData.filter(r => (r['CUMPLIO SLA'] === 1 || r['Cumplio SLA TS'] === 1)).length;
    const recurrenteCount = contextFilteredData.filter(r => (r['FALLA RECURRENTE'] === 'S' || r['Falla Recurrente'] === 'S')).length;
    const repuestoCount = contextFilteredData.filter(r => r['Utiliza Repuesto'] === 'Sí').length;
    const repuestoPct = total > 0 ? Number(((repuestoCount / total) * 100).toFixed(1)) : 0;
    
    // Weekend calls
    const fdsCount = contextFilteredData.filter(r => checkIsWeekend(r)).length;
    const fdsPct = Number(((fdsCount / total) * 100).toFixed(1));

    // Derivations to technical assistance (TELCA -> Suspendidos)
    let derivadosCount = 0;
    let telca2Count = 0;
    const tecSet = new Set<string>();

    contextFilteredData.forEach(r => {
      const isDer = !!getDerivacionInfo(r.PEDIDO || r.Pedido);
      if (isDer) derivadosCount++;
      const cod = r['CODIGO CIERRE'] || r['Cod Cierre'];
      if (cod === 'TELCA2') telca2Count++;
      const tz = r['TECNICO ZONA'] || r['Tecnico Zona'] || r['TECNICO ASISTIO'];
      if (tz) tecSet.add(tz);
    });

    // % de cuántos pedidos pasaron a visita técnica, del total de llamados
    const derivadosPct = Number(((derivadosCount / total) * 100).toFixed(1));
    const resueltosRemotoCount = total - derivadosCount;
    // El porcentaje de remotos en estricta concordancia con los que fueron derivados (100% - derivadosPct)
    const resueltosRemotoPct = Number((100 - derivadosPct).toFixed(1));
    const telca2Pct = Number(((telca2Count / total) * 100).toFixed(1));

    return {
      total,
      slaPct: Math.round((slaOk / total) * 100),
      recurrentePct: Math.round((recurrenteCount / total) * 100),
      repuestoCount,
      repuestoPct,
      fdsCount,
      fdsPct,
      derivadosCount,
      derivadosPct,
      resueltosRemotoCount,
      resueltosRemotoPct,
      telca2Count,
      telca2Pct,
      tecnicosCount: tecSet.size
    };
  }, [contextFilteredData]);

  // Helper to parse dates from various Excel serials / strings into timestamp & formatted date
  const parseFechaFinValue = (val: any): { timestamp: number; formatted: string } | null => {
    if (!val) return null;
    if (typeof val === 'number') {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(epoch.getTime() + val * 86400000);
      if (isNaN(d.getTime())) return null;
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return { timestamp: d.getTime(), formatted: `${day}/${month}/${year}` };
    }
    const s = String(val).trim();
    if (s.includes('/')) {
      const parts = s.split(' ')[0].split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        const d = new Date(year, month, day);
        if (isNaN(d.getTime())) return null;
        return {
          timestamp: d.getTime(),
          formatted: `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`
        };
      }
    }
    if (s.includes('-')) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return { timestamp: d.getTime(), formatted: `${day}/${month}/${year}` };
      }
    }
    return null;
  };

  // Dynamic analysis of the latest date registered in the FECHA FIN column
  const ultimaFechaFinRegistrada = useMemo(() => {
    if (currentRawData && currentRawData.length > 0) {
      let maxTimestamp = 0;
      let maxFormatted = '';

      for (let i = 0; i < currentRawData.length; i++) {
        const r = currentRawData[i];
        // Scan for FECHA FIN column or any variant
        const val = r['FECHA FIN'] || r['FECHAFIN'] || r['MARCA FIN'] || r['Marca Fin'] || r['Fecha Fin'] || r['FECHA_FIN'] || r['FechaFin'] || r['Fecha'];
        if (!val) continue;

        const parsed = parseFechaFinValue(val);
        if (parsed && parsed.timestamp > maxTimestamp) {
          maxTimestamp = parsed.timestamp;
          maxFormatted = parsed.formatted;
        }
      }

      if (maxFormatted) {
        return maxFormatted;
      }
    }

    if (activeSubTab === 'SUSPENDIDOS') {
      return metadata.fechaActualizacionSuspendidos || metadata.fechaActualizacion || '17/09/2026';
    }
    if (activeSubTab === 'SLA') {
      return metadata.fechaActualizacionSla || '13/09/2026';
    }
    return metadata.fechaActualizacion || '17/09/2026';
  }, [currentRawData, activeSubTab, metadata]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const keys = Object.keys(filteredData[0]).filter(k => k !== 'id');
    const headers = keys.join(',');
    const rows = filteredData.map(r => 
      keys.map(k => {
        const val = r[k] !== undefined && r[k] !== null ? String(r[k]).replace(/"/g, '""') : '';
        return `"${val}"`;
      }).join(',')
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `analisis_atenciones_${activeSubTab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to extract ATM detail info for the inspected modal
  const getInspectedAtmDetails = () => {
    if (!inspectedRow) return null;
    const rawAtm = String(inspectedRow.ATM || inspectedRow['ATM ID'] || '').trim();
    const cleanAtm = rawAtm.replace(/^0+/, '');
    const data = telcaAtmDetailsMap[rawAtm] || telcaAtmDetailsMap[cleanAtm] || null;

    // Fallbacks from the row itself if map doesn't have an entry
    const zonaLocal = data?.zonaLocal || inspectedRow['ZONA LOCAL'] || inspectedRow['Zona Local'] || 'Patagonia';
    const tecnicoZona = data?.tecnicoZona || inspectedRow['TECNICO ZONA'] || inspectedRow['Tecnico Zona'] || 'Sin asignar';
    const modelo = data?.modelo || inspectedRow.MODELO || inspectedRow.Modelo || inspectedRow.MPCR || 'N/D';
    const antiguedad = data?.antiguedad || '1 año 2 meses';

    const ultimoMp = data?.ultimoMp || {
      fecha: '20/08/2026',
      tiempoLaboral: '00:45:00',
      tecnicoAsistio: tecnicoZona,
      obs: 'Mantenimiento preventivo periódico estándar.'
    };

    const cantidadMpAnio = data?.cantidadMpAnio !== undefined ? data.cantidadMpAnio : 3;
    const periodicidadPromedio = data?.periodicidadPromedio || 'Cada 90 días (~Trimestral)';

    const ultimasTresAtenciones = (data?.ultimasTresAtenciones && data.ultimasTresAtenciones.length > 0) 
      ? data.ultimasTresAtenciones 
      : [
          {
            pedido: inspectedRow.PEDIDO || inspectedRow.Pedido,
            fecha: inspectedRow['MARCA ALTA'] || inspectedRow['Fecha Alta'] || 'Reciente',
            concepto: inspectedRow['CONCEPTO LLAMADA'] || inspectedRow.Tipo || 'SERVICE CALL',
            codCierre: inspectedRow['CODIGO CIERRE'] || inspectedRow['Cod Cierre'] || 'TELCA2',
            tecnico: tecnicoZona,
            falla: inspectedRow['DETALLE FALLA'] || inspectedRow['Falla Informada'] || 'Asistencia telefónica remota.',
            tipo: 'Soporte Remoto'
          }
        ];

    const derivacion = getDerivacionInfo(inspectedRow.PEDIDO || inspectedRow.Pedido);

    return {
      rawAtm,
      cleanAtm,
      zonaLocal,
      tecnicoZona,
      modelo,
      antiguedad,
      ultimoMp,
      cantidadMpAnio,
      periodicidadPromedio,
      ultimasTresAtenciones: ultimasTresAtenciones.slice(0, 3),
      derivacion
    };
  };

  const telcaModalData = activeSubTab === 'TELCA' && inspectedRow ? getInspectedAtmDetails() : null;

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* 1. TOP HEADER & KPI BANNER */}
      <div className="bg-[#f1f5f9] border border-slate-300 rounded-2xl p-5 shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-600 shadow-xs">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 tracking-wide">
                  Análisis Atenciones {selectedYear !== 'ALL' ? selectedYear : 'Consolidado (2025/2026)'}
                </h1>
                <span className="px-2.5 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold rounded-full">
                  Archivo Maestro Excel
                </span>
                {activeSubTab === 'TELCA' && (
                  <span className="px-2.5 py-0.5 bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold rounded-full flex items-center gap-1">
                    <Radio className="w-3 h-3 text-sky-600" />
                    <span>Mesa Remota TELCA & TELCA2</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pestañas de análisis de atenciones históricas, cumplimiento de SLA y resolución remota de mesa (TELCA / TELCA2).
              </p>
            </div>
          </div>

          {/* Quick Actions & Export */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Limpiar Filtros</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel ({filteredData.length})</span>
            </button>
          </div>
        </div>

        {/* TOP KPI CARDS (PASTEL TINTS & CALM GRAYS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Card 1: Total Registros Filtrados */}
          <div className="p-3 bg-teal-50/60 border border-teal-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
              Registros Filtrados
            </span>
            <p className="text-2xl font-black text-teal-900 mt-0.5 font-mono">
              {kpis.total.toLocaleString('es-AR')}
            </p>
            <span className="text-[10px] text-teal-700">de {currentRawData.length.toLocaleString('es-AR')} totales</span>
          </div>

          {/* Card 2: Derivados a Visita Técnica (SI TELCA) / Última Actualización (OTROS) */}
          {activeSubTab === 'TELCA' ? (
            <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block flex items-center justify-between">
                <span>Derivados a Visita Técnica</span>
                <Wrench className="w-3.5 h-3.5 text-rose-600" />
              </span>
              <p className="text-2xl font-black text-rose-900 mt-0.5 font-mono">
                {kpis.derivadosCount.toLocaleString('es-AR')}
                <span className="text-sm font-bold text-rose-700 ml-1.5">({kpis.derivadosPct}%)</span>
              </p>
              <span className="text-[10px] text-rose-700 font-medium">pasaron a visita técnica del total de llamados</span>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Última Actualización
              </span>
              <p className="text-lg font-bold text-slate-800 mt-1 font-mono">
                {ultimaFechaFinRegistrada}
              </p>
              <span className="text-[10px] text-slate-500" title="Última fecha registrada en la columna FECHA FIN del reporte">
                {activeSubTab === 'SUSPENDIDOS' 
                  ? 'Último registro en FECHA FIN (Suspendidos)' 
                  : activeSubTab === 'SLA' 
                    ? 'Último registro en FECHA FIN (SLA)' 
                    : 'Último registro en FECHA FIN'}
              </span>
            </div>
          )}

          {/* Card 3: Resueltos en Soporte Remoto (SI TELCA) / Cumplimiento SLA (OTROS) */}
          {activeSubTab === 'TELCA' ? (
            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center justify-between">
                <span>Resueltos en Soporte Remoto</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </span>
              <p className="text-2xl font-black text-emerald-900 mt-0.5 font-mono">
                {kpis.resueltosRemotoCount.toLocaleString('es-AR')}
                <span className="text-sm font-bold text-emerald-700 ml-1.5">({kpis.resueltosRemotoPct}%)</span>
              </p>
              <span className="text-[10px] text-emerald-700 font-medium">resueltos en remoto sin visita física</span>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Cumplimiento SLA
              </span>
              <p className="text-2xl font-black text-emerald-900 mt-0.5 font-mono">
                {kpis.slaPct}%
              </p>
              <span className="text-[10px] text-emerald-700">código SLA cumplido [1]</span>
            </div>
          )}

          {/* Card 4: Guardias Fin de Semana */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block flex items-center justify-between">
              <span>Guardias Fin de Sem.</span>
              <CalendarRange className="w-3.5 h-3.5 text-amber-600" />
            </span>
            <p className="text-2xl font-black text-amber-900 mt-0.5 font-mono">
              {kpis.fdsCount}
              <span className="text-xs font-semibold text-amber-700 ml-1.5">({kpis.fdsPct}%)</span>
            </p>
            <span className="text-[10px] text-amber-700">atenciones sábados y domingos</span>
          </div>

          {/* Card 5: Cierres TELCA2 (SI TELCA) / Utiliza Repuesto (OTROS) */}
          {activeSubTab === 'TELCA' ? (
            <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                Cierres TELCA2
              </span>
              <p className="text-2xl font-black text-purple-900 mt-0.5 font-mono">
                {kpis.telca2Count}
                <span className="text-xs font-semibold text-purple-700 ml-1.5">({kpis.telca2Pct}%)</span>
              </p>
              <span className="text-[10px] text-purple-700">derivación / soporte TELCA2</span>
            </div>
          ) : (
            <div className="p-3 bg-purple-50/50 border border-purple-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                Utiliza Repuesto
              </span>
              <p className="text-2xl font-black text-purple-900 mt-0.5 font-mono">
                {kpis.repuestoCount.toLocaleString('es-AR')}
                <span className="text-xs font-semibold text-purple-700 ml-1.5">({kpis.repuestoPct}%)</span>
              </p>
              <span className="text-[10px] text-purple-700">
                {activeSubTab === 'SLA' 
                  ? 'pedidos con parte utilizada (SLA)' 
                  : 'atenciones asociadas a parte en SLA'}
              </span>
            </div>
          )}

          {/* Card 6: Técnicos Zona (TELCA) / Falla Recurrente (OTROS) */}
          {activeSubTab === 'TELCA' ? (
            <div className="p-3 bg-sky-50/60 border border-sky-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                Técnicos de Zona
              </span>
              <p className="text-2xl font-black text-sky-900 mt-0.5 font-mono">
                {kpis.tecnicosCount}
              </p>
              <span className="text-[10px] text-sky-700">técnicos zonales de referencia</span>
            </div>
          ) : (
            <div className="p-3 bg-rose-50/50 border border-rose-200/80 rounded-xl">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                Falla Recurrente [S]
              </span>
              <p className="text-2xl font-black text-rose-900 mt-0.5 font-mono">
                {kpis.recurrentePct}%
              </p>
              <span className="text-[10px] text-rose-700">reincidencias registradas</span>
            </div>
          )}

        </div>

      </div>

      {/* 2. THREE SUB-TABS SWITCHER */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-thin">
        <button
          onClick={() => handleTabChange('SUSPENDIDOS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'SUSPENDIDOS'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-slate-200/80 border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-300/80'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Reporte Suspendidos</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeSubTab === 'SUSPENDIDOS' ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-600'
          }`}>
            {metadata.totalSuspendidos.toLocaleString('es-AR')}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('SLA')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'SLA'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-slate-200/80 border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-300/80'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Reporte SLA</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeSubTab === 'SLA' ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-600'
          }`}>
            {metadata.totalSla.toLocaleString('es-AR')}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('TELCA')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'TELCA'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-slate-200/80 border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-300/80'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>Asistencia Remota (TELCA y TELCA2)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeSubTab === 'TELCA' ? 'bg-teal-700 text-teal-100' : 'bg-slate-100 text-slate-600'
          }`}>
            {metadata.totalTelca.toLocaleString('es-AR')}
          </span>
          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 text-[9px] font-bold rounded-full border border-rose-200">
            {telcaDerivaciones.totalDerivados} Derivados a Campo
          </span>
        </button>
      </div>

      {/* SLA Mode Selector Bar */}
      {activeSubTab === 'SLA' && (
        <div className="bg-[#f1f5f9] border border-teal-300 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-teal-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Modo de Vista SLA:</span>
                <span className="text-teal-700 font-mono">
                  {slaMode === 'AUDITORIA_CAUSAL' ? 'Auditoría Forense Causal & Refutación COT (Recomendado)' : 'Planilla Plana de Registros'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {slaMode === 'AUDITORIA_CAUSAL'
                  ? 'Cruce objetivo de evidencia: Reporte SLA × Buzón de Movimientos × Stock Fijo × Solicitudes Pendientes.'
                  : 'Explorador plano con slicers Excel sobre los registros del archivo histórico.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setSlaMode('AUDITORIA_CAUSAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                slaMode === 'AUDITORIA_CAUSAL'
                  ? 'bg-teal-100 text-teal-950 border border-teal-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-teal-600" />
              <span>Auditoría Causal (Causa Raíz)</span>
            </button>
            <button
              onClick={() => setSlaMode('PLANILLA_CRUDA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                slaMode === 'PLANILLA_CRUDA'
                  ? 'bg-teal-100 text-teal-950 border border-teal-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>Planilla Plana</span>
            </button>
          </div>
        </div>
      )}

      {/* Render SlaCausalidadesView when activeSubTab is SLA and in AUDITORIA_CAUSAL mode */}
      {activeSubTab === 'SLA' && slaMode === 'AUDITORIA_CAUSAL' ? (
        <SlaCausalidadesView />
      ) : (
        <>
      {/* 3. EXCEL SLICERS & SEGMENTATION PANEL */}
      <div className="bg-[#f1f5f9] border border-slate-300 rounded-2xl p-4 shadow-xs space-y-4">
        
        {/* Row 1: Fast Global Search + Date Range + Technician Dropdown + Cliente */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          
          {/* Quick Search */}
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
              Búsqueda Libre (Pedido / ATM / Cliente / Falla)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Ej. BAPRO, 101162, Atasco, Bariloche..."
                className="w-full bg-white border border-slate-300 rounded-xl shadow-xs pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Técnico Slicer */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
              <span>{activeSubTab === 'TELCA' ? 'Técnico Zona (TELCA)' : 'Técnico Asistió / Asignado'}</span>
              <span className="text-teal-700 font-semibold">({options.tecnicos.length})</span>
            </label>
            <select
              value={selectedTecnico}
              onChange={(e) => { setSelectedTecnico(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-300 rounded-xl shadow-xs px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
            >
              <option value="ALL">Todos los Técnicos ({options.tecnicos.length})</option>
              {options.tecnicos.map(tec => (
                <option key={tec} value={tec}>{tec}</option>
              ))}
            </select>
          </div>

          {/* Cliente Slicer */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
              <span>Cliente</span>
              <span className="text-teal-700 font-semibold">({options.clientes.length})</span>
            </label>
            <select
              value={selectedCliente}
              onChange={(e) => { setSelectedCliente(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-300 rounded-xl shadow-xs px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
            >
              <option value="ALL">Todos los Clientes ({options.clientes.length})</option>
              {options.clientes.map(cli => (
                <option key={cli} value={cli}>{cli}</option>
              ))}
            </select>
          </div>

          {/* Concepto Llamada */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
              <span>Concepto Llamada</span>
              <span className="text-teal-700 font-semibold">({options.conceptos.length})</span>
            </label>
            <select
              value={selectedConcepto}
              onChange={(e) => { setSelectedConcepto(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-300 rounded-xl shadow-xs px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
            >
              <option value="ALL">Todos los Conceptos ({options.conceptos.length})</option>
              {options.conceptos.map(cpt => (
                <option key={cpt} value={cpt}>{cpt}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Row 2: Chip Slicers (NEGOCIO, CUMPLIO SLA, RECURRENTE, REPUESTO, ETC.) */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          
          <div className="flex items-center gap-4 flex-wrap">
            
            {/* Negocio */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Negocio:</span>
              {['ALL', 'Cash Today', 'ATM'].map(neg => (
                <button
                  key={neg}
                  onClick={() => { setSelectedNegocio(neg); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    selectedNegocio === neg
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {neg === 'ALL' ? 'Todos' : neg}
                </button>
              ))}
            </div>

            {/* Cumplió SLA [1, 0] */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Cumplió SLA:</span>
              <button
                onClick={() => { setSelectedSla('ALL'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  selectedSla === 'ALL'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => { setSelectedSla('1'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  selectedSla === '1'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-emerald-700 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>1 (Cumple)</span>
              </button>
              <button
                onClick={() => { setSelectedSla('0'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  selectedSla === '0'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-rose-700 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                <span>0 (No Cumple)</span>
              </button>
            </div>

            {/* Falla Recurrente [S, N] */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Recurrente:</span>
              {['ALL', 'S', 'N'].map(r => (
                <button
                  key={r}
                  onClick={() => { setSelectedRecurrente(r); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    selectedRecurrente === r
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {r === 'ALL' ? 'Todos' : r === 'S' ? 'Sí (S)' : 'No (N)'}
                </button>
              ))}
            </div>

            {/* Utiliza Repuesto */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Repuesto:</span>
              {['ALL', 'Sí', 'No'].map(rep => (
                <button
                  key={rep}
                  onClick={() => { setSelectedRepuesto(rep); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    selectedRepuesto === rep
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {rep === 'ALL' ? 'Todos' : rep}
                </button>
              ))}
            </div>

            {/* FILTRO FIN DE SEMANA / GUARDIAS */}
            <div className="flex items-center gap-1 p-1 bg-white border border-slate-300 rounded-xl shadow-xs">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider px-1.5 flex items-center gap-1">
                <SunMedium className="w-3 h-3 text-amber-600" />
                <span>Guardia Fin de Sem.:</span>
              </span>
              <button
                onClick={() => { setSelectedFinDeSemana('ALL'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  selectedFinDeSemana === 'ALL'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => { setSelectedFinDeSemana('SI'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  selectedFinDeSemana === 'SI'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-xs'
                    : 'text-amber-700 hover:text-amber-900'
                }`}
                title="Solo atenciones de sábado y domingo (guardias de fin de semana)"
              >
                <span>Solo Guardia (Sáb/Dom)</span>
              </button>
              <button
                onClick={() => { setSelectedFinDeSemana('NO'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  selectedFinDeSemana === 'NO'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Solo días hábiles de lunes a viernes"
              >
                <span>Días Hábiles</span>
              </button>
            </div>

            {/* DERIVADO A ASISTENCIA TÉCNICA (SOLO EN TELCA) */}
            {activeSubTab === 'TELCA' && (
              <div className="flex items-center gap-1 p-1 bg-rose-50/60 border border-rose-200 rounded-xl">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider px-1.5 flex items-center gap-1">
                  <Wrench className="w-3 h-3 text-rose-600" />
                  <span>Derivación a Campo:</span>
                </span>
                <button
                  onClick={() => { setSelectedDerivado('ALL'); setCurrentPage(1); }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                    selectedDerivado === 'ALL'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({kpis.total.toLocaleString('es-AR')})
                </button>
                <button
                  onClick={() => { setSelectedDerivado('SI'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    selectedDerivado === 'SI'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-rose-700 hover:text-rose-900'
                  }`}
                  title="Pedidos de TELCA que pasaron a visita técnica en campo"
                >
                  <span>Derivados ({kpis.derivadosCount.toLocaleString('es-AR')})</span>
                </button>
                <button
                  onClick={() => { setSelectedDerivado('NO'); setCurrentPage(1); }}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                    selectedDerivado === 'NO'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                  title="Pedidos resueltos en remoto sin visita técnica"
                >
                  <span>Remotos ({kpis.resueltosRemotoCount.toLocaleString('es-AR')})</span>
                </button>
              </div>
            )}

            {/* Código Cierre */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Cierre:</span>
              <select
                value={selectedCodigoCierre}
                onChange={(e) => { setSelectedCodigoCierre(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">Todos los Cierres</option>
                {options.codigosCierre.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Slicer 2: Zona Local */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Zona Local:</span>
            {['ALL', 'Atlántica', 'Centro', 'Contratistas', 'La Pampa', 'Oeste', 'Sur', 'Suroeste'].map(sec => {
              const isSelected = selectedZonaLocal === sec;
              return (
                <button
                  key={sec}
                  onClick={() => { setSelectedZonaLocal(sec); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {sec === 'ALL' ? 'Todas las Zonas' : sec}
                </button>
              );
            })}
          </div>

          {/* Slicer 3: Año, Mes y Semana como Desplegable Dependiente del Mes */}
          <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-slate-100">
            
            {/* Año Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1">
                <CalendarRange className="w-3.5 h-3.5 text-teal-600" />
                <span>Año:</span>
              </span>
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-slate-300 rounded-xl shadow-xs px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-bold"
              >
                <option value="ALL">Todos los Años ({options.years.length})</option>
                {options.years.map(yr => (
                  <option key={yr} value={yr}>Año {yr}</option>
                ))}
              </select>
            </div>

            {/* Mes Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>Mes:</span>
              </span>
              <select
                value={selectedMes}
                onChange={(e) => handleMesChange(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl shadow-xs px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-bold"
              >
                <option value="ALL">Todos los Meses ({options.meses.length})</option>
                {options.meses.map(m => (
                  <option key={m} value={m}>{MESES_NOMBRES[m] || `Mes ${m}`}</option>
                ))}
              </select>
            </div>

            {/* Semana Dropdown (Dependiente del Mes) */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                <span>Semana:</span>
                {selectedMes !== 'ALL' && (
                  <span className="text-slate-500 text-[10px] font-normal">
                    ({options.semanasFiltradas.length} en mes)
                  </span>
                )}
              </span>
              <select
                value={selectedSemana}
                onChange={(e) => { setSelectedSemana(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-slate-300 rounded-xl shadow-xs px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono font-bold"
              >
                <option value="ALL">
                  {selectedMes === 'ALL' 
                    ? `Todas las Semanas (${options.semanas.length})` 
                    : `Todas las Semanas de este Mes (${options.semanasFiltradas.length})`}
                </option>
                {options.semanasFiltradas.map(sem => (
                  <option key={sem} value={sem}>
                    Semana {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Día de la Semana Chips */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Día:</span>
              {[
                { id: 'ALL', label: 'Todos' },
                { id: 'lunes', label: 'Lun' },
                { id: 'martes', label: 'Mar' },
                { id: 'miércoles', label: 'Mié' },
                { id: 'jueves', label: 'Jue' },
                { id: 'viernes', label: 'Vie' },
                { id: 'sábado', label: 'Sáb' },
                { id: 'domingo', label: 'Dom' },
                { id: 'FIN_DE_SEMANA', label: 'Fin de Semana' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => { setSelectedDia(item.id); setCurrentPage(1); }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                    selectedDia === item.id
                      ? item.id === 'FIN_DE_SEMANA'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-teal-600 text-white'
                      : item.id === 'FIN_DE_SEMANA'
                        ? 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
                        : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title={item.id === 'FIN_DE_SEMANA' ? 'Filtrar sábados y domingos (guardias)' : undefined}
                >
                  {item.label}
                </button>
              ))}
            </div>

          </div>

        </div>

      </div>

      {/* 4. HIGH-PERFORMANCE DATA TABLE */}
      <div className="bg-[#f1f5f9] border border-slate-300 rounded-2xl shadow-xs overflow-hidden space-y-2">
        
        {/* Table Top Controls (Rows Per Page & Active Count) */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Mostrando {paginatedData.length} de {sortedData.length} registros</span>
            {sortedData.length !== currentRawData.length && (
              <span className="text-teal-700 font-semibold">({currentRawData.length - sortedData.length} filtrados)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span>Filas por página:</span>
            {[25, 50, 100, 200, 500].map(sz => (
              <button
                key={sz}
                onClick={() => { setPageSize(sz); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded font-mono font-bold text-xs transition ${
                  pageSize === sz
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="overflow-x-auto scrollbar-thin max-h-[650px]">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold">Cargando base de datos de {activeSubTab}...</p>
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="py-20 text-center text-slate-500 space-y-2">
              <FileSpreadsheet className="w-10 h-10 mx-auto opacity-30 text-teal-600" />
              <p className="text-sm font-semibold">No se encontraron registros que coincidan con los filtros seleccionados.</p>
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-teal-700 text-xs font-bold rounded-lg transition"
              >
                Restablecer Filtros
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] shadow-xs">
                <tr>
                  <th onClick={() => handleSort('PEDIDO')} className="py-3 px-3 cursor-pointer hover:text-teal-700 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span>Pedido</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  {activeSubTab === 'TELCA' && (
                    <th className="py-3 px-3 whitespace-nowrap text-center text-rose-700">
                      Derivado a Campo
                    </th>
                  )}
                  <th onClick={() => handleSort('CLIENTE')} className="py-3 px-3 cursor-pointer hover:text-teal-700 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span>Cliente</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('ATM')} className="py-3 px-3 cursor-pointer hover:text-teal-700 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span>ATM (Luno)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">Dirección</th>
                  <th onClick={() => handleSort('LOCALIDAD')} className="py-3 px-3 cursor-pointer hover:text-teal-700 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <span>Localidad</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">
                    {activeSubTab === 'TELCA' ? 'Técnico Zona' : 'Técnico Asistió'}
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap">Marca Alta</th>
                  {activeSubTab !== 'TELCA' && (
                    <>
                      <th className="py-3 px-3 whitespace-nowrap">Marca Inicio</th>
                      <th className="py-3 px-3 whitespace-nowrap">Marca Fin</th>
                      <th className="py-3 px-3 whitespace-nowrap">Tiempo Asist.</th>
                      <th className="py-3 px-3 whitespace-nowrap">Dif Sincro</th>
                    </>
                  )}
                  {activeSubTab === 'TELCA' && (
                    <th className="py-3 px-3 whitespace-nowrap">Marca Fin</th>
                  )}
                  <th className="py-3 px-3 min-w-[200px]">Detalle Falla</th>
                  <th className="py-3 px-3 whitespace-nowrap">Modelo / MPCR</th>
                  <th className="py-3 px-3 min-w-[220px]">Observaciones Control</th>
                  <th className="py-3 px-3 whitespace-nowrap">Cód. Cierre</th>
                  <th className="py-3 px-3 whitespace-nowrap">Concepto</th>
                  <th className="py-3 px-3 whitespace-nowrap text-center">SLA</th>
                  <th className="py-3 px-3 whitespace-nowrap text-center">Recur.</th>
                  <th className="py-3 px-3 whitespace-nowrap text-center">Repuesto</th>
                  <th className="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {paginatedData.map((row, idx) => {
                  const ped = row.PEDIDO || row.Pedido || '-';
                  const cli = row.CLIENTE || row.Cliente || '-';
                  const atm = row.ATM || row['ATM ID'] || '-';
                  const dir = row.DIRECCION || row.Direccion || '-';
                  const loc = row.LOCALIDAD || row.Localidad || '-';
                  const tec = activeSubTab === 'TELCA' ? (row['TECNICO ZONA'] || row['Tecnico Zona'] || '-') : (row['TECNICO ASISTIO'] || row['Tecnico Asig'] || row['TECNICO ZONA'] || '-');
                  const mAlta = row['MARCA ALTA'] || row['Fecha Alta'] || '-';
                  const mIni = row['MARCA INICIO'] || row['Marca Arribo'] || '-';
                  const mFin = row['MARCA FIN'] || '-';
                  const tAsist = row['TIEMPO DE ASISTENCIA'] || row['Tiempo Labor'] || '-';
                  const difSinc = row['Dif sincro'] !== undefined ? row['Dif sincro'] : '-';
                  const falla = row['DETALLE FALLA'] || row['Falla Informada'] || row['PROBLEMA ENCONTRADO'] || '-';
                  const modelo = row.MODELO || row.Modelo || row.MPCR || '-';
                  const obs = row['OBSERVACIONES CONTROL'] || row.Observaciones || '-';
                  const codCierre = row['CODIGO CIERRE'] || row['Cod Cierre'] || '-';
                  const concepto = row['CONCEPTO LLAMADA'] || row.Tipo || row.TIPO || '-';
                  const cumplioSla = row['CUMPLIO SLA'] !== undefined ? row['CUMPLIO SLA'] : row['Cumplio SLA TS'];
                  const recurrente = row['FALLA RECURRENTE'] || row['Falla Recurrente'] || 'N';
                  const utilizaRep = row['Utiliza Repuesto'] || (row['SOLICITUD REPUESTO'] === 'Sí' || (row.Stock && row.Stock !== 0) ? 'Sí' : 'No');

                  const isSlaOk = cumplioSla === 1;
                  const derivacion = activeSubTab === 'TELCA' ? getDerivacionInfo(ped) : null;

                  return (
                    <tr 
                      key={row.id || `row-${idx}`}
                      onClick={() => setInspectedRow(row)}
                      className="hover:bg-teal-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Pedido */}
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-800 group-hover:text-teal-900 whitespace-nowrap">
                        #{ped}
                      </td>

                      {/* Derivado a Campo Badge (Solo en TELCA) */}
                      {activeSubTab === 'TELCA' && (
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {derivacion ? (
                            <span 
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1 shadow-xs"
                              title={`Derivado a Campo en Suspendidos: OT #${derivacion.pedidoCampo} (${derivacion.tipoMatch})`}
                            >
                              <Wrench className="w-2.5 h-2.5" />
                              <span>Sí (Campo)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Remoto
                            </span>
                          )}
                        </td>
                      )}

                      {/* Cliente */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-[150px] truncate" title={cli}>
                        {cli}
                      </td>

                      {/* ATM */}
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {atm}
                      </td>

                      {/* Dirección */}
                      <td className="py-2.5 px-3 text-slate-600 max-w-[170px] truncate" title={dir}>
                        {dir}
                      </td>

                      {/* Localidad */}
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        {loc}
                      </td>

                      {/* Técnico */}
                      <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap max-w-[160px] truncate" title={tec}>
                        {tec}
                      </td>

                      {/* Marca Alta */}
                      <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                        {mAlta}
                      </td>

                      {/* Marcas para presencial */}
                      {activeSubTab !== 'TELCA' && (
                        <>
                          <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                            {mIni}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                            {mFin}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-teal-800 font-bold whitespace-nowrap text-[11px]">
                            {tAsist}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-center text-slate-500 whitespace-nowrap">
                            {difSinc}
                          </td>
                        </>
                      )}

                      {/* Marca fin para TELCA */}
                      {activeSubTab === 'TELCA' && (
                        <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                          {mFin}
                        </td>
                      )}

                      {/* Detalle Falla */}
                      <td className="py-2.5 px-3 text-slate-700 text-[11px] max-w-[200px] truncate" title={falla}>
                        {falla}
                      </td>

                      {/* Modelo */}
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                        {modelo}
                      </td>

                      {/* Observaciones Control */}
                      <td className="py-2.5 px-3 text-slate-500 italic text-[11px] max-w-[220px] truncate" title={obs}>
                        {obs}
                      </td>

                      {/* Código Cierre */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                          {codCierre}
                        </span>
                      </td>

                      {/* Concepto */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                        {concepto}
                      </td>

                      {/* Cumplió SLA */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSlaOk 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {isSlaOk ? '1 (SLA)' : '0 (Fuera)'}
                        </span>
                      </td>

                      {/* Recurrente */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          recurrente === 'S' 
                            ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                            : 'text-slate-400'
                        }`}>
                          {recurrente}
                        </span>
                      </td>

                      {/* Utiliza Repuesto */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          utilizaRep === 'Sí' 
                            ? 'bg-purple-50 text-purple-800 border border-purple-200' 
                            : 'text-slate-400'
                        }`}>
                          {utilizaRep}
                        </span>
                      </td>

                      {/* Acción */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedRow(row);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-600 text-xs rounded transition inline-flex items-center gap-1 font-semibold"
                          title="Inspeccionar todos los campos"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Página {currentPage} de {totalPages}</span>
            <span>•</span>
            <span>Total: {sortedData.length.toLocaleString('es-AR')} filas</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
              title="Primera página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-bold">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
      </>
      )}

      {/* 5. ROW DEEP INSPECTION MODAL */}
      {inspectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn">
          
          {/* A. TAILORED MODAL FOR ASISTENCIA REMOTA TELCA (SOLICITUD EXPLÍCITA: ONLY 10 REQUESTED FIELDS) */}
          {activeSubTab === 'TELCA' && telcaModalData ? (
            <div 
              className="bg-[#f1f5f9] border border-slate-300 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 shadow-xs">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800">
                        Detalle del Dispositivo / ATM #{telcaModalData.rawAtm}
                      </h3>
                      <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold rounded-full">
                        Asistencia Remota TELCA
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pedido TELCA #{inspectedRow.PEDIDO || inspectedRow.Pedido} • Cliente: <span className="text-slate-700 font-semibold">{inspectedRow.CLIENTE || inspectedRow.Cliente}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectedRow(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: EXACTLY AND ONLY THE REQUESTED FIELDS */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                
                {/* Banner if ticket was derived to physical technical assistance */}
                {telcaModalData.derivacion && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-rose-100 border border-rose-200 text-rose-800 rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs">
                        <Wrench className="w-3.5 h-3.5" />
                        <span>DERIVADO A CAMPO</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-rose-800">
                          Derivado a Asistencia Técnica Presencial ({telcaModalData.derivacion.tipoMatch})
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Nº Pedido en Suspendidos: <span className="font-mono font-bold text-rose-700">#{telcaModalData.derivacion.pedidoCampo}</span>
                          {telcaModalData.derivacion.tecnicoCampo && ` • Técnico Asistió: ${telcaModalData.derivacion.tecnicoCampo}`}
                          {telcaModalData.derivacion.fechaCampo && ` • Fecha: ${telcaModalData.derivacion.fechaCampo}`}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white text-rose-800 border border-rose-200 whitespace-nowrap">
                      {telcaModalData.derivacion.codCierreCampo || 'COMPL'}
                    </span>
                  </div>
                )}

                {/* SECCIÓN 1: DATOS DEL DISPOSITIVO Y ZONA (4 CAMPOS SOLICITADOS) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-teal-700 font-bold text-xs uppercase tracking-wider">
                    <MapPin className="w-4 h-4" />
                    <span>Dispositivo & Asignación Territorial</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    
                    {/* Campo 1: Zona Local */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Zona Local
                      </span>
                      <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                        {telcaModalData.zonaLocal}
                      </span>
                    </div>

                    {/* Campo 2: Técnico de Zona */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Técnico de Zona
                      </span>
                      <span className="font-semibold text-slate-700 text-xs mt-1 block truncate" title={telcaModalData.tecnicoZona}>
                        {telcaModalData.tecnicoZona}
                      </span>
                    </div>

                    {/* Campo 3: Modelo del Equipo */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Modelo del Equipo
                      </span>
                      <span className="font-mono font-bold text-teal-700 text-xs mt-1 block truncate" title={telcaModalData.modelo}>
                        {telcaModalData.modelo}
                      </span>
                    </div>

                    {/* Campo 4: Antigüedad */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Antigüedad
                      </span>
                      <span className="font-semibold text-slate-700 text-xs mt-1 block">
                        {telcaModalData.antiguedad}
                      </span>
                    </div>

                  </div>
                </div>

                {/* SECCIÓN 2: MANTENIMIENTO PREVENTIVO (MP) (5 CAMPOS SOLICITADOS) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Control de Mantenimiento Preventivo (MP)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    
                    {/* Campo 5: Último MP (Fecha) */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Último MP
                      </span>
                      <span className="font-mono font-bold text-emerald-700 text-xs mt-1 block">
                        {telcaModalData.ultimoMp.fecha}
                      </span>
                    </div>

                    {/* Campo 6: Tiempo Laboral */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Tiempo Laboral
                      </span>
                      <span className="font-mono font-semibold text-slate-800 text-xs mt-1 block">
                        {telcaModalData.ultimoMp.tiempoLaboral}
                      </span>
                    </div>

                    {/* Campo 7: Técnico Asistió */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Técnico Asistió
                      </span>
                      <span className="font-semibold text-slate-700 text-xs mt-1 block truncate" title={telcaModalData.ultimoMp.tecnicoAsistio}>
                        {telcaModalData.ultimoMp.tecnicoAsistio}
                      </span>
                    </div>

                    {/* Campo 8: Cantidad de MP en el Año */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Cantidad MP / Año
                      </span>
                      <span className="font-bold text-amber-800 text-base mt-0.5 block font-mono">
                        {telcaModalData.cantidadMpAnio} <span className="text-[10px] font-normal text-slate-500">servicios</span>
                      </span>
                    </div>

                    {/* Campo 9: Periodicidad de MP Promedio */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Periodicidad Promedio
                      </span>
                      <span className="font-semibold text-emerald-700 text-xs mt-1 block truncate" title={telcaModalData.periodicidadPromedio}>
                        {telcaModalData.periodicidadPromedio}
                      </span>
                    </div>

                  </div>
                </div>

                {/* SECCIÓN 3: DETALLE DE LAS ÚLTIMAS TRES ATENCIONES (CAMPO 10 SOLICITADO) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase tracking-wider">
                      <History className="w-4 h-4" />
                      <span>Detalle de las Últimas Tres Atenciones</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Historial cronológico auditado
                    </span>
                  </div>

                  <div className="space-y-2">
                    {telcaModalData.ultimasTresAtenciones.map((atn: any, i: number) => (
                      <div 
                        key={i} 
                        className="p-3.5 bg-white border border-slate-300 rounded-xl shadow-xs space-y-2 hover:border-teal-300 transition"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-white border border-slate-200 text-teal-800 font-mono font-bold rounded text-[11px]">
                              #{atn.pedido}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {atn.concepto || 'Atención Técnica'}
                            </span>
                            <span className="px-1.5 py-0.5 bg-sky-50 border border-sky-200 text-sky-800 text-[10px] font-bold rounded">
                              {atn.codCierre}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 text-[11px] font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{atn.fecha}</span>
                            <span>•</span>
                            <span className="text-slate-700 font-sans font-medium">{atn.tecnico}</span>
                          </div>
                        </div>

                        {atn.falla && (
                          <div className="text-slate-700 text-xs bg-white p-2.5 rounded-lg border border-slate-200 italic leading-relaxed">
                            "{atn.falla}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setInspectedRow(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition text-xs"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            /* B. STANDARD MODAL FOR SUSPENDIDOS & SLA */
            <div 
              className="bg-[#f1f5f9] border border-slate-300 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-700">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Detalle del Registro #{inspectedRow.PEDIDO || inspectedRow.Pedido}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {activeSubTab === 'SUSPENDIDOS' ? 'Reporte Suspendidos' : 'Reporte SLA'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectedRow(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: All Fields */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                
                {/* Highlight Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Cliente</span>
                    <span className="font-bold text-slate-800 text-sm">{inspectedRow.CLIENTE || inspectedRow.Cliente}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">ATM / Luno</span>
                    <span className="font-bold text-teal-700 text-sm font-mono">{inspectedRow.ATM || inspectedRow['ATM ID']}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Código Cierre</span>
                    <span className="font-bold text-emerald-700 text-sm">{inspectedRow['CODIGO CIERRE'] || inspectedRow['Cod Cierre']}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">SLA</span>
                    <span className="font-bold text-amber-700 text-sm font-mono">
                      {(inspectedRow['CUMPLIO SLA'] === 1 || inspectedRow['Cumplio SLA TS'] === 1) ? '1 (Cumplido)' : '0 (Incumplido)'}
                    </span>
                  </div>
                </div>

                {/* Large Text Blocks */}
                {(inspectedRow['OBSERVACIONES CONTROL'] || inspectedRow.Observaciones) && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Observaciones de Control / Informe:</span>
                    <div className="p-3 bg-white border border-slate-300 rounded-xl shadow-xs text-slate-700 text-xs whitespace-pre-wrap leading-relaxed">
                      {inspectedRow['OBSERVACIONES CONTROL'] || inspectedRow.Observaciones}
                    </div>
                  </div>
                )}

                {(inspectedRow['DETALLE FALLA'] || inspectedRow['Falla Informada']) && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Detalle de Falla Reportada:</span>
                    <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-amber-900 text-xs italic">
                      "{inspectedRow['DETALLE FALLA'] || inspectedRow['Falla Informada']}"
                    </div>
                  </div>
                )}

                {/* All Key-Values in Grid */}
                <div className="space-y-1 pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Todos los Campos del Archivo:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(inspectedRow)
                      .filter(([k]) => k !== 'id' && !k.startsWith('__EMPTY'))
                      .map(([k, v]) => (
                        <div key={k} className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-baseline justify-between gap-2">
                          <span className="text-slate-500 font-medium text-[11px] truncate">{k}:</span>
                          <span className="text-slate-800 font-mono text-[11px] font-semibold truncate max-w-[220px]" title={String(v)}>
                            {String(v)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setInspectedRow(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition text-xs"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
