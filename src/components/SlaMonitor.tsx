import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Flame, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Download, 
  ArrowUpDown,
  ChevronRight,
  Radio,
  Wrench,
  Pin,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Layers,
  Sparkles,
  Smartphone,
  Calendar,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  Activity,
  Compass,
  History,
  Play,
  RotateCcw,
  Store,
  Building2,
  Table as TableIcon,
  LayoutGrid,
  CalendarDays,
  ExternalLink
} from 'lucide-react';
import { Ticket, TecnicoInfo, ZonaInfo, EquipoCronico, ControlInicioItem } from '../types';
import zonasReferencia from '../data/zonasTecnicosReferencia.json';
import controlInicioRaw from '../data/controlInicioData.json';
import agendaDataRaw from '../data/agendaData.json';
import { formatTimeClean, ZONA_TECNICA_TO_LOCAL, getZonaLabelWithLocal } from '../utils/formatters';
import { TechnicianDailyAgendaModal } from './TechnicianDailyAgendaModal';
import { MapaAgendaDiaria } from './MapaAgendaDiaria';

interface SlaMonitorProps {
  tickets: Ticket[];
  tecnicos: TecnicoInfo[];
  zonas: ZonaInfo[];
  cronicos: EquipoCronico[];
  onSelectTicket: (ticket: Ticket) => void;
  onOpenCronicoDetail: (cronico: EquipoCronico) => void;
}

export const SlaMonitor: React.FC<SlaMonitorProps> = ({
  tickets: propTickets,
  tecnicos,
  zonas,
  cronicos,
  onSelectTicket,
  onOpenCronicoDetail
}) => {
  // Canonical daily agenda dataset: prioritize canonical agendaData.json (40 tickets with 23 assigned COT)
  // Rejects any old historical bulk dump (> 200 items) that may have been cached in browser or cloud
  const tickets = useMemo(() => {
    if (propTickets && propTickets.length > 0 && propTickets.length <= 200) {
      return propTickets;
    }
    return agendaDataRaw as unknown as Ticket[];
  }, [propTickets]);
  // Dynamic Current Dates (Hoy y Día Posterior)
  const { todayStr, tomorrowStr } = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const tmrw = new Date(now);
    tmrw.setDate(tmrw.getDate() + 1);
    const tomorrow = `${pad(tmrw.getDate())}/${pad(tmrw.getMonth() + 1)}/${tmrw.getFullYear()}`;
    return { todayStr: today, tomorrowStr: tomorrow };
  }, []);

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'HOY' | 'MANANA' | 'HOY_Y_MANANA' | 'TODOS'>('HOY_Y_MANANA');
  
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedZonaLocal, setSelectedZonaLocal] = useState<string>('ALL');
  const [selectedZona, setSelectedZona] = useState<string>('ALL');
  const [selectedTecnico, setSelectedTecnico] = useState<string>('ALL');
  const [selectedCliente, setSelectedCliente] = useState<string>('ALL');
  const [selectedEstado, setSelectedEstado] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [specialFilter, setSpecialFilter] = useState<'ALL' | 'SC_PENDIENTES' | 'SC_SIN_ASIGNAR' | 'SC_PENDIENTES_ASIGNADOS' | 'MP_DEFICIENTE' | 'REINCIDENTE' | 'ASIGNADO_COT' | 'MOVIL_S' | 'MP_PENDIENTE' | 'ADICIONAL_PENDIENTE' | 'AIEC'>('ALL');
  const [slaFilter, setSlaFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'OK'>('ALL');
  const [sortBy, setSortBy] = useState<'sla_desc' | 'sla_asc' | 'pedido' | 'cliente' | 'fecha'>('sla_desc');
  const [agendaDisplayMode, setAgendaDisplayMode] = useState<'TABLA' | 'MAPA'>('TABLA');

  // Control Inicio Sector Filter, View Mode & Floating Agenda Modal
  const [showControlInicio, setShowControlInicio] = useState<boolean>(true);
  const [viewModeControlInicio, setViewModeControlInicio] = useState<'TABLE' | 'GRID'>('TABLE');
  const [ciSectorFilter, setCiSectorFilter] = useState<string>('ALL');
  const [selectedTechAgenda, setSelectedTechAgenda] = useState<string | null>(null);
  const controlInicioList = controlInicioRaw as unknown as ControlInicioItem[];

  // Pagination state (20, 40, 100, 200)
  const [pageSize, setPageSize] = useState<number>(40);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Master Technician Reference Map
  const masterTecMap = useMemo(() => {
    const map = new Map<string, typeof zonasReferencia[0]>();
    zonasReferencia.forEach(z => {
      map.set(z.nombre.toLowerCase(), z);
    });
    return map;
  }, []);

  // Regions list: Strictly PATAGONIA and SUROESTE
  const regionsList = useMemo(() => {
    return ['PATAGONIA', 'SUROESTE'];
  }, []);

  // Available Zonas Locales based on Selected Region
  const availableZonasLocales = useMemo(() => {
    const set = new Set<string>();
    zonasReferencia.forEach(z => {
      if (selectedRegion === 'ALL' || z.region === selectedRegion) {
        if (z.zonaLocal) set.add(z.zonaLocal);
      }
    });
    return Array.from(set).sort();
  }, [selectedRegion]);

  // Dependent Zonas list based on Selected Region and Selected Zona Local
  const availableZonas = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => {
      const master = masterTecMap.get(t.tecnico?.toLowerCase());
      const ticketRegion = master?.region || t.region || 'PATAGONIA';
      const ticketZonaLocal = master?.zonaLocal || t.zonaLocal || ZONA_TECNICA_TO_LOCAL[t.zonaTecnica || t.zona] || 'General';
      const ticketZona = t.zonaTecnica || t.zona;

      const matchRegion = selectedRegion === 'ALL' || ticketRegion === selectedRegion || t.region === selectedRegion;
      const matchZonaLocal = selectedZonaLocal === 'ALL' || ticketZonaLocal === selectedZonaLocal;

      if (matchRegion && matchZonaLocal && ticketZona) {
        set.add(ticketZona);
      }
    });

    // Also include master zones matching selected region / local
    zonasReferencia.forEach(z => {
      const matchRegion = selectedRegion === 'ALL' || z.region === selectedRegion;
      const matchZonaLocal = selectedZonaLocal === 'ALL' || z.zonaLocal === selectedZonaLocal;
      if (matchRegion && matchZonaLocal && z.zonaTecnica) {
        set.add(z.zonaTecnica);
      }
    });

    return Array.from(set).sort();
  }, [tickets, selectedRegion, selectedZonaLocal, masterTecMap]);

  // Dependent Tecnicos list strictly based on Selected Region, Zona Local, and Zona Técnica
  const availableTecnicos = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => {
      if (!t.tecnico || t.tecnico.toLowerCase() === 'sin asignar') return;

      const master = masterTecMap.get(t.tecnico.toLowerCase());
      const techRegion = master?.region || t.region || 'PATAGONIA';
      const techZonaLocal = master?.zonaLocal || t.zonaLocal || ZONA_TECNICA_TO_LOCAL[t.zonaTecnica || t.zona] || 'General';
      const techZona = master?.zonaTecnica || t.zonaTecnica || t.zona;

      const matchRegion = selectedRegion === 'ALL' || techRegion === selectedRegion || t.region === selectedRegion;
      const matchZonaLocal = selectedZonaLocal === 'ALL' || techZonaLocal === selectedZonaLocal;
      const matchZona = selectedZona === 'ALL' || techZona === selectedZona || t.zonaTecnica === selectedZona || t.zona === selectedZona;

      if (matchRegion && matchZonaLocal && matchZona) {
        set.add(t.tecnico);
      }
    });
    return Array.from(set).sort();
  }, [tickets, selectedRegion, selectedZonaLocal, selectedZona, masterTecMap]);

  // Filtered Control de Inicio Technicians
  const filteredControlInicio = useMemo(() => {
    if (ciSectorFilter === 'ALL') return controlInicioList;
    return controlInicioList.filter(item => item.zonaLocal === ciSectorFilter);
  }, [controlInicioList, ciSectorFilter]);

  // Handle Region Change: reset dependent filters
  const handleRegionChange = (newRegion: string) => {
    setSelectedRegion(newRegion);
    setSelectedZonaLocal('ALL');
    setSelectedZona('ALL');
    setSelectedTecnico('ALL');
    setCurrentPage(1);
  };

  // Handle Zona Local Change: reset zone and technician
  const handleZonaLocalChange = (newLocal: string) => {
    setSelectedZonaLocal(newLocal);
    setSelectedZona('ALL');
    setSelectedTecnico('ALL');
    setCurrentPage(1);
  };

  // Handle Zona Change: reset technician if not in zona
  const handleZonaChange = (newZona: string) => {
    setSelectedZona(newZona);
    setSelectedTecnico('ALL');
    setCurrentPage(1);
  };

  // Handle Tecnico Change: auto-synchronize Region, Zona Local & Zona Técnica
  const handleTecnicoChange = (newTec: string) => {
    setSelectedTecnico(newTec);
    if (newTec !== 'ALL') {
      setSpecialFilter('ALL');
      const masterInfo = masterTecMap.get(newTec.toLowerCase());
      if (masterInfo) {
        if (masterInfo.region) {
          setSelectedRegion(masterInfo.region);
        }
        if (masterInfo.zonaLocal) {
          setSelectedZonaLocal(masterInfo.zonaLocal);
        }
        if (masterInfo.zonaTecnica) {
          setSelectedZona(masterInfo.zonaTecnica);
        }
      }
    }
    setCurrentPage(1);
  };

  // Dedicated selection from technician card in Control de Inicio
  const handleSelectTecnicoFromCard = (newTec: string) => {
    setSelectedTecnico(newTec);
    setSpecialFilter('ALL');
    setDateFilter('TODOS');
    setSearch('');
    const masterInfo = masterTecMap.get(newTec.toLowerCase());
    if (masterInfo) {
      if (masterInfo.region) setSelectedRegion(masterInfo.region);
      if (masterInfo.zonaLocal) setSelectedZonaLocal(masterInfo.zonaLocal);
      if (masterInfo.zonaTecnica) setSelectedZona(masterInfo.zonaTecnica);
    }
    setCurrentPage(1);
    const el = document.getElementById('agenda-table-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Unique clients
  const clientesList = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => { if (t.cliente) set.add(t.cliente); });
    return Array.from(set).sort();
  }, [tickets]);

  // Unique states
  const estadosList = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => { if (t.estado) set.add(t.estado); });
    return Array.from(set).sort();
  }, [tickets]);

  // Available Years
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => {
      const dStr = String(t.fCoorDate || t.fechaCoordinada || (t as any).fechaFin || (t as any).fecha || '');
      const m = dStr.match(/\b(202[0-9])\b/);
      if (m) set.add(m[1]);
      else {
        const m2 = dStr.match(/\/(2[0-9])\b/);
        if (m2) set.add('20' + m2[1]);
      }
    });
    return Array.from(set).sort().reverse();
  }, [tickets]);

  // Chronic map for quick badge check
  const cronicoMap = useMemo(() => {
    const map = new Map<string, EquipoCronico>();
    cronicos.forEach(c => map.set(c.luno, c));
    return map;
  }, [cronicos]);

  // Fast counts based on dynamic today and tomorrow
  const hoyCount = useMemo(() => {
    return tickets.filter(t => t.fCoorDate === todayStr || (t.fechaCoordinada && t.fechaCoordinada.includes(todayStr))).length;
  }, [tickets, todayStr]);

  const mananaCount = useMemo(() => {
    return tickets.filter(t => t.fCoorDate === tomorrowStr || (t.fechaCoordinada && t.fechaCoordinada.includes(tomorrowStr))).length;
  }, [tickets, tomorrowStr]);

  const hoyYMananaCount = useMemo(() => {
    return tickets.filter(t => 
      t.fCoorDate === todayStr || t.fCoorDate === tomorrowStr ||
      (t.fechaCoordinada && (t.fechaCoordinada.includes(todayStr) || t.fechaCoordinada.includes(tomorrowStr)))
    ).length;
  }, [tickets, todayStr, tomorrowStr]);

  const okCount = useMemo(() => controlInicioList.filter(i => i.estadoMarcaje === 'ASISTENCIA_OK').length, [controlInicioList]);
  const pendCount = useMemo(() => controlInicioList.filter(i => i.estadoMarcaje === 'PENDIENTE_INICIO').length, [controlInicioList]);
  const sinPedidosCount = useMemo(() => controlInicioList.filter(i => i.estadoMarcaje === 'SIN_PEDIDOS').length, [controlInicioList]);

  // Coordinated vs Uncoordinated Breakdown (Total en Agenda)
  const coordinadosCount = useMemo(() => {
    return tickets.filter(t => t.tecnico && t.tecnico.toLowerCase() !== 'sin asignar').length;
  }, [tickets]);

  // Set of addresses of all currently coordinated orders (to match AIEC at same address)
  const coordinatedAddresses = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => {
      if (t.tecnico && t.tecnico.toLowerCase() !== 'sin asignar' && t.direccion) {
        set.add(`${(t.cliente || '').trim().toLowerCase()}|${(t.direccion || '').trim().toLowerCase()}`);
      }
    });
    return set;
  }, [tickets]);

  // SC Sin Coordinar (Service Call del reporte Pendientes con riesgo directo de SLA)
  const scSinCoordinarCount = useMemo(() => {
    return tickets.filter(t => 
      (t.esScVigente || t.concepto === 'SC') && 
      (t.alertaSinAsignar || !t.tecnico || t.tecnico.toLowerCase() === 'sin asignar')
    ).length;
  }, [tickets]);

  // AIEC Sin Coordinar (Sin SLA pero útil para coordinar visitas múltiples en el mismo domicilio)
  const aiecSinCoordinarCount = useMemo(() => {
    return tickets.filter(t => 
      (t.concepto === 'AIEC' || t.esAdicional) && 
      (!t.tecnico || t.tecnico.toLowerCase() === 'sin asignar')
    ).length;
  }, [tickets]);

  // AIEC sin coordinar que comparten domicilio con un pedido ya coordinado hoy
  const aiecMismoDomicilioCount = useMemo(() => {
    return tickets.filter(t => {
      const isAiec = t.concepto === 'AIEC' || t.esAdicional;
      const isSinAsignar = !t.tecnico || t.tecnico.toLowerCase() === 'sin asignar';
      if (!isAiec || !isSinAsignar || !t.direccion) return false;
      const key = `${(t.cliente || '').trim().toLowerCase()}|${(t.direccion || '').trim().toLowerCase()}`;
      return coordinatedAddresses.has(key);
    }).length;
  }, [tickets, coordinatedAddresses]);

  // 1. Pedidos Asignados a la supervisión (Total Asignados en Agenda COT)
  const asignadosEnCotList = useMemo(() => {
    return tickets.filter(t => t.esAsignadoCOT || (t.tecnico && t.tecnico.toLowerCase() !== 'sin asignar'));
  }, [tickets]);

  const totalAsignadosCOT = useMemo(() => {
    return asignadosEnCotList.length;
  }, [asignadosEnCotList]);

  const movilSCount = useMemo(() => {
    return asignadosEnCotList.filter(t => t.notificadoMovil || t.m === 'S').length;
  }, [asignadosEnCotList]);

  // 2. Pedidos de reportes Pendientes Patagonia y Suroeste
  const pendientesPatagoniaSuroeste = useMemo(() => {
    return tickets.filter(t => (t as any).esPendiente || t.origenFlujo === 'SC_PENDIENTE');
  }, [tickets]);

  // De los pendientes, los que fueron asignados en COT
  const pendientesAsignadosEnCot = useMemo(() => {
    return pendientesPatagoniaSuroeste.filter(t => t.esAsignadoCOT || (t.tecnico && t.tecnico.toLowerCase() !== 'sin asignar'));
  }, [pendientesPatagoniaSuroeste]);

  // De los pendientes, los que NO fueron asignados en COT (Riesgo SLA directo)
  const pendientesSinAsignarEnCot = useMemo(() => {
    return pendientesPatagoniaSuroeste.filter(t => !t.esAsignadoCOT && (!t.tecnico || t.tecnico.toLowerCase() === 'sin asignar'));
  }, [pendientesPatagoniaSuroeste]);

  // Total en Agenda = Total tickets unificados
  const totalEnAgenda = useMemo(() => {
    return tickets.length;
  }, [tickets]);

  const scPendientesTotal = pendientesPatagoniaSuroeste.length;
  const scSinAsignar = pendientesSinAsignarEnCot.length;
  const scAsignados = totalAsignadosCOT;

  const mpDeficienteTotal = useMemo(() => {
    return tickets.filter(t => t.esMpDeficiente).length;
  }, [tickets]);

  const totalPendientesRegion = scPendientesTotal;
  const coordinadosMisTecnicos = scAsignados;
  const sinAsignarRegion = scSinAsignar;

  // Filtered & Sorted Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Date Filter (Agenda de Hoy, Mañana, Hoy + Mañana vs Todos)
      if (dateFilter === 'HOY') {
        const isToday = t.fCoorDate === todayStr || (t.fechaCoordinada && t.fechaCoordinada.includes(todayStr));
        if (!isToday) return false;
      } else if (dateFilter === 'MANANA') {
        const isTomorrow = t.fCoorDate === tomorrowStr || (t.fechaCoordinada && t.fechaCoordinada.includes(tomorrowStr));
        if (!isTomorrow) return false;
      } else if (dateFilter === 'HOY_Y_MANANA') {
        const isTodayOrTomorrow = t.fCoorDate === todayStr || t.fCoorDate === tomorrowStr ||
          (t.fechaCoordinada && (t.fechaCoordinada.includes(todayStr) || t.fechaCoordinada.includes(tomorrowStr)));
        if (!isTodayOrTomorrow) return false;
      }

      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const match = 
          t.pedido.toLowerCase().includes(query) ||
          t.cliente.toLowerCase().includes(query) ||
          (t.clienteReal && t.clienteReal.toLowerCase().includes(query)) ||
          (t.sucursalRelevamiento && t.sucursalRelevamiento.toLowerCase().includes(query)) ||
          t.luno.toLowerCase().includes(query) ||
          t.tecnico.toLowerCase().includes(query) ||
          t.localidad.toLowerCase().includes(query) ||
          t.direccion.toLowerCase().includes(query) ||
          (t.detalleFalla && t.detalleFalla.toLowerCase().includes(query));
        if (!match) return false;
      }

      const master = masterTecMap.get(t.tecnico?.toLowerCase());
      const ticketRegion = master?.region || t.region || 'PATAGONIA';
      const ticketZonaLocal = master?.zonaLocal || t.zonaLocal || ZONA_TECNICA_TO_LOCAL[t.zonaTecnica || t.zona] || 'General';
      const ticketZona = master?.zonaTecnica || t.zonaTecnica || t.zona;

      // Strict regional boundary: ONLY PATAGONIA and SUROESTE
      const isAllowedRegion = (ticketRegion === 'PATAGONIA' || ticketRegion === 'SUROESTE' || t.region === 'PATAGONIA' || t.region === 'SUROESTE');
      if (!isAllowedRegion) return false;

      // Year Filter
      if (selectedYear !== 'ALL') {
        const dStr = String(t.fCoorDate || t.fechaCoordinada || (t as any).fechaFin || (t as any).fecha || '');
        const m = dStr.match(/\b(202[0-9])\b/);
        const y = m ? m[1] : (dStr.match(/\/(2[0-9])\b/) ? '20' + dStr.match(/\/(2[0-9])\b/)![1] : '2026');
        if (y !== selectedYear) return false;
      }

      // Region Filter
      if (selectedRegion !== 'ALL') {
        if (ticketRegion !== selectedRegion && t.region !== selectedRegion) return false;
      }

      // Zona Local Filter
      if (selectedZonaLocal !== 'ALL') {
        if (ticketZonaLocal !== selectedZonaLocal) return false;
      }

      // Zona Filter (Cleaned to avoid string suffix mismatches like "(Oeste)")
      if (selectedZona !== 'ALL') {
        const cleanSelectedZona = selectedZona.replace(/\s*\([^)]*\)/g, '').trim();
        const tZona = (t.zonaTecnica || t.zona || '').trim();
        const match = tZona === selectedZona || tZona === cleanSelectedZona || ticketZona === selectedZona || ticketZona === cleanSelectedZona;
        if (!match) {
          const isMyTech = selectedTecnico !== 'ALL' && t.tecnico && t.tecnico.toLowerCase() === selectedTecnico.toLowerCase();
          if (!isMyTech) return false;
        }
      }

      // Tecnico Filter: includes tickets assigned to the technician AND pending SCs in the technician's zone
      if (selectedTecnico !== 'ALL') {
        const isAssignedToThisTech = t.tecnico && t.tecnico.toLowerCase() === selectedTecnico.toLowerCase();
        
        const master = masterTecMap.get(selectedTecnico.toLowerCase());
        const techZonaTecnica = (master?.zonaTecnica || '').trim();
        const techZonaLocal = (master?.zonaLocal || '').trim();
        
        const isPendingScInZone = (t.esScVigente || t.concepto === 'SC') && 
          (t.alertaSinAsignar || !t.tecnico || t.tecnico.toLowerCase() === 'sin asignar') &&
          (
            (techZonaTecnica && (t.zonaTecnica === techZonaTecnica || t.zona === techZonaTecnica)) ||
            (techZonaLocal && (t.zonaLocal === techZonaLocal || ZONA_TECNICA_TO_LOCAL[t.zonaTecnica || t.zona] === techZonaLocal))
          );

        if (!isAssignedToThisTech && !isPendingScInZone) {
          return false;
        }
      }

      // Cliente Filter
      if (selectedCliente !== 'ALL' && t.cliente !== selectedCliente) return false;

      // Estado Filter
      if (selectedEstado !== 'ALL' && t.estado !== selectedEstado) return false;

      // Special Filter
      if (specialFilter === 'SC_PENDIENTES') {
        const isPend = (t as any).esPendiente || t.origenFlujo === 'SC_PENDIENTE';
        if (!isPend) return false;
      }
      if (specialFilter === 'SC_SIN_ASIGNAR') {
        const isSinAsignar = !t.esAsignadoCOT && (!t.tecnico || t.tecnico.toLowerCase() === 'sin asignar');
        if (!isSinAsignar) return false;
      }
      if (specialFilter === 'SC_PENDIENTES_ASIGNADOS') {
        const isAsignadoCot = ((t as any).esPendiente || t.origenFlujo === 'SC_PENDIENTE') && (t.esAsignadoCOT || (t.tecnico && t.tecnico.toLowerCase() !== 'sin asignar'));
        if (!isAsignadoCot) return false;
      }
      if (specialFilter === 'ASIGNADO_COT') {
        const isAsig = t.esAsignadoCOT || (t.tecnico && t.tecnico.toLowerCase() !== 'sin asignar');
        if (!isAsig) return false;
      }
      if (specialFilter === 'MP_DEFICIENTE' && !t.esMpDeficiente) return false;
      if (specialFilter === 'MOVIL_S' && !t.notificadoMovil && t.m !== 'S') return false;
      if (specialFilter === 'MP_PENDIENTE' && !t.alertaMpPendiente) return false;
      if (specialFilter === 'ADICIONAL_PENDIENTE' && !t.alertaAdicionalPendiente) return false;
      if (specialFilter === 'REINCIDENTE' && (!t.reincidenciaCount || t.reincidenciaCount <= 0) && !cronicoMap.has(t.luno)) return false;
      if (specialFilter === 'AIEC' && t.concepto !== 'AIEC' && !t.esAdicional) return false;

      // SLA Filter
      if (slaFilter === 'CRITICAL' && (t.slaPorcentaje < 85 && t.hsSla > 2)) return false;
      if (slaFilter === 'WARNING' && (t.slaPorcentaje < 65 || t.slaPorcentaje >= 85)) return false;
      if (slaFilter === 'OK' && t.slaPorcentaje >= 65) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'sla_desc') return b.slaPorcentaje - a.slaPorcentaje;
      if (sortBy === 'sla_asc') return a.slaPorcentaje - b.slaPorcentaje;
      if (sortBy === 'pedido') return a.pedido.localeCompare(b.pedido);
      if (sortBy === 'cliente') return a.cliente.localeCompare(b.cliente);
      return 0;
    });
  }, [tickets, search, dateFilter, selectedYear, selectedRegion, selectedZonaLocal, selectedZona, selectedTecnico, selectedCliente, selectedEstado, specialFilter, slaFilter, sortBy, cronicoMap, masterTecMap]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFilter, selectedYear, selectedRegion, selectedZonaLocal, selectedZona, selectedTecnico, selectedCliente, selectedEstado, specialFilter, slaFilter, sortBy, pageSize]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Pedido", "Cliente", "Equipo", "Región", "Zona Local", "Zona Técnica", "Localidad", "Técnico", "Detalle Falla", "Estado", "Móvil (M)", "SLA%", "Hs Restantes", "Fecha Coordinada", "Alerta MP", "Alerta AIEC"];
    const rows = filteredTickets.map(t => [
      t.pedido,
      `"${t.cliente}"`,
      t.luno,
      t.region || 'Patagonia',
      ZONA_TECNICA_TO_LOCAL[t.zonaTecnica || t.zona] || 'General',
      t.zonaTecnica || t.zona,
      `"${t.localidad}"`,
      `"${t.tecnico}"`,
      `"${(t.detalleFalla || '').replace(/"/g, '""')}"`,
      t.estado,
      t.notificadoMovil || t.m === 'S' ? 'S' : 'N',
      t.slaPorcentaje,
      t.hsSla,
      formatTimeClean(t.fechaCoordinada),
      t.alertaMpSinAsignar ? 'MP PENDIENTE SIN ASIGNAR' : (t.alertaMpPendiente ? 'MP PENDIENTE' : 'NO'),
      t.alertaAdicionalPendiente ? 'ADICIONAL AIEC' : 'NO'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `control_sla_agenda_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Fast SLA Filter Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        
        {/* CARD 1: TOTAL EN AGENDA */}
        <button
          onClick={() => { setSpecialFilter('ALL'); setSlaFilter('ALL'); }}
          className={`p-4 rounded-xl text-left border transition-all ${
            specialFilter === 'ALL' && slaFilter === 'ALL'
              ? 'bg-white border-teal-600 ring-2 ring-teal-500/10 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total en Agenda</span>
            <Clock className="w-4 h-4 text-teal-600" />
          </div>
          
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-black text-slate-900">{totalEnAgenda}</p>
            <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
              {`${totalAsignadosCOT} asignados COT`}
            </span>
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] space-y-1">
            {/* Pendientes Asignados en COT */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setSpecialFilter('SC_PENDIENTES_ASIGNADOS');
                setSlaFilter('ALL');
              }}
              className={`flex items-center justify-between px-1.5 py-0.5 rounded cursor-pointer transition ${
                specialFilter === 'SC_PENDIENTES_ASIGNADOS' ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-200' : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-100'
              }`}
              title="Pedidos de los reportes pendientes que ya figuran asignados en la agenda de campo"
            >
              <span className="flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                Pend. Asignados COT:
              </span>
              <strong className="text-emerald-800 font-mono font-bold">{pendientesAsignadosEnCot.length}</strong>
            </div>

            {/* Sin Asignar en Patagonia / Suroeste */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setSpecialFilter('SC_SIN_ASIGNAR');
                setSlaFilter('ALL');
              }}
              className={`flex items-center justify-between px-1.5 py-0.5 rounded cursor-pointer transition ${
                specialFilter === 'SC_SIN_ASIGNAR' ? 'bg-rose-100 text-rose-900 font-bold border border-rose-200' : 'text-rose-800 bg-rose-50 hover:bg-rose-100/70 border border-rose-100'
              }`}
              title="Filtrar pedidos de los reportes pendientes que no fueron asignados en COT (Riesgo SLA directo)"
            >
              <span className="flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Sin Asignar (Pat/Sur):
              </span>
              <strong className="text-rose-800 font-mono font-bold">{pendientesSinAsignarEnCot.length}</strong>
            </div>
          </div>
        </button>

        {/* CARD 2: ASIGNADOS FLOW COT */}
        <button
          onClick={() => { setSpecialFilter('ASIGNADO_COT'); setSlaFilter('ALL'); }}
          className={`p-4 rounded-xl text-left border transition-all ${
            specialFilter === 'ASIGNADO_COT'
              ? 'bg-white border-teal-600 ring-2 ring-teal-500/10 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Asignados COT</span>
            <UserCheck className="w-4 h-4 text-teal-600" />
          </div>
          
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-black text-slate-900">{totalAsignadosCOT}</p>
            <span className="text-[10px] text-slate-500 font-medium">agenda de campo</span>
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] space-y-0.5 text-slate-600">
            <div className="flex items-center justify-between">
              <span>Informados al móvil:</span>
              <span className="text-[10px] text-teal-800 font-mono font-bold">M = 'S' ({movilSCount})</span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">20 Técnicos de Supervisión</p>
          </div>
        </button>

        {/* CARD 3: SLA CRÍTICO / >85% */}
        <button
          onClick={() => { setSlaFilter('CRITICAL'); setSpecialFilter('ALL'); }}
          className={`p-4 rounded-xl text-left border transition-all ${
            slaFilter === 'CRITICAL'
              ? 'bg-white border-rose-400 ring-2 ring-rose-400/10 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">SLA Crítico / &gt;85%</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-1">
            {tickets.filter(t => t.slaPorcentaje >= 85 || t.hsSla <= 2).length}
          </p>
          <span className="text-[10px] text-slate-500 block mt-1">Riesgo inminente de penalización</span>
        </button>

        {/* CARD 4: RIESGO MP DEFICIENTE (< 30 DÍAS) */}
        <button
          onClick={() => { setSpecialFilter('MP_DEFICIENTE'); setSlaFilter('ALL'); }}
          className={`p-4 rounded-xl text-left border transition-all ${
            specialFilter === 'MP_DEFICIENTE'
              ? 'bg-white border-amber-400 ring-2 ring-amber-400/10 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">MP Deficiente</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-800 mt-1">
            {mpDeficienteTotal}
          </p>
          <div className="mt-1 text-[10px] text-slate-500 leading-tight">
            <span>Falla &lt; 30 días post-preventivo</span>
            <span className="block text-slate-400 mt-0.5">Cruza c/ MP Cerrados</span>
          </div>
        </button>

        {/* CARD 5: EN TÉRMINO <65% */}
        <button
          onClick={() => { setSlaFilter('OK'); setSpecialFilter('ALL'); }}
          className={`p-4 rounded-xl text-left border transition-all ${
            slaFilter === 'OK'
              ? 'bg-white border-teal-600 ring-2 ring-teal-500/10 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-800 uppercase tracking-wider">En Término &lt;65%</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-teal-800 mt-1">
            {tickets.filter(t => t.slaPorcentaje < 65).length}
          </p>
          <span className="text-[10px] text-slate-500 block mt-1">Operación en rango óptimo</span>
        </button>

      </div>

      {/* CONTROL DE INICIO DE JORNADA (MARCAJE DE ASISTENCIA 07:00 - 10:00 HS) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* Header with Title & Summary Badges */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 border border-teal-200 rounded-xl text-teal-700">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 tracking-wide">
                    Control de Inicio de Jornada &bull; Marcaje de Asistencia
                  </h3>
                  <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold rounded-full">
                    1° Pedido 07:00 a 10:00 hs
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Verificación de puntualidad de primer horario en estado <strong className="text-teal-700 font-mono">SEG Asistencia</strong> (homónimo a marcar tarjeta de asistencia).
                </p>
              </div>
            </div>
          </div>

          {/* Metric KPI Chips & Collapse Toggle */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{okCount} Presentes en Horario</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold shadow-xs">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{pendCount} Pendientes de Inicio</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-medium">
              <UserX className="w-3.5 h-3.5 text-slate-400" />
              <span>{sinPedidosCount} Sin Servicios Hoy</span>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 ml-1">
              <button
                onClick={() => setViewModeControlInicio('TABLE')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  viewModeControlInicio === 'TABLE'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista Tabla de Técnicos y Contratistas"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tabla</span>
              </button>
              <button
                onClick={() => setViewModeControlInicio('GRID')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  viewModeControlInicio === 'GRID'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista Cuadrícula de Tarjetas"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cuadrícula</span>
              </button>
            </div>

            <button
              onClick={() => setShowControlInicio(prev => !prev)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              <span>{showControlInicio ? 'Ocultar Sección' : 'Ver 20 Técnicos'}</span>
              {showControlInicio ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Sector Filter Bar (Zona Local) */}
        {showControlInicio && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 pb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Compass className="w-3 h-3 text-teal-600" /> Sector / Zona Local:
            </span>
            {['ALL', 'Atlántica', 'La Pampa', 'Oeste', 'Centro', 'Sur', 'Suroeste', 'Contratistas'].map(sec => {
              const count = sec === 'ALL' 
                ? controlInicioList.length 
                : controlInicioList.filter(i => i.zonaLocal === sec).length;
              const isSelected = ciSectorFilter === sec;
              
              return (
                <button
                  key={sec}
                  onClick={() => setCiSectorFilter(sec)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <span>{sec === 'ALL' ? 'Todos los Sectores' : sec}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-teal-900 text-teal-100' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* VISTA 1: TABLA COMPLETA DE TÉCNICOS Y CONTRATISTAS (PREDETERMINADA) */}
        {showControlInicio && viewModeControlInicio === 'TABLE' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white animate-fadeIn">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Técnico / Contratista</th>
                    <th className="py-3 px-3">Marcaje (07-10 hs)</th>
                    <th className="py-3 px-3">1° Horario</th>
                    <th className="py-3 px-3">1° Pedido & Concepto</th>
                    <th className="py-3 px-3">Cliente & Luno (ATM)</th>
                    <th className="py-3 px-3">Dirección & Localidad</th>
                    <th className="py-3 px-3 min-w-[180px]">Detalle Falla / Motivo</th>
                    <th className="py-3 px-3">Estado & SLA</th>
                    <th className="py-3 px-3 text-center">Agenda Hoy</th>
                    <th className="py-3 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredControlInicio.map((item, idx) => {
                    const normTec = item.tecnico.toLowerCase().trim();

                    // All tickets assigned to this technician
                    const techAllTickets = tickets.filter(t => {
                      const tec = (t.tecnico || '').toLowerCase().trim();
                      const tecZ = (t.tecnicoZona || '').toLowerCase().trim();
                      return tec === normTec || tecZ === normTec || tec.includes(normTec) || normTec.includes(tec);
                    }).sort((a, b) => {
                      const timeA = a.hCoor || a.fechaCoordinada || '99:99';
                      const timeB = b.hCoor || b.fechaCoordinada || '99:99';
                      return timeA.localeCompare(timeB);
                    });

                    const techTodayTickets = techAllTickets.filter(t => 
                      t.fCoorDate === todayStr || (t.fechaCoordinada && t.fechaCoordinada.includes(todayStr))
                    );

                    const techTomorrowTickets = techAllTickets.filter(t => 
                      t.fCoorDate === tomorrowStr || (t.fechaCoordinada && t.fechaCoordinada.includes(tomorrowStr))
                    );

                    // Match first ticket: priority today > tomorrow > next in agenda > item.primerPedido
                    const firstOrder = techTodayTickets[0] || techTomorrowTickets[0] || techAllTickets[0];
                    const hasOrders = techAllTickets.length > 0;
                    const hasTodayOrder = techTodayTickets.length > 0;

                    // Operational details
                    const horaCoord = firstOrder ? (firstOrder.hCoor || formatTimeClean(firstOrder.fechaCoordinada)) : (item.primerPedido ? formatTimeClean(item.primerPedido.horaCoordinada) : null);
                    const pedidoNum = firstOrder ? firstOrder.pedido : (item.primerPedido ? item.primerPedido.pedido : null);
                    const concepto = firstOrder ? (firstOrder.concepto || (firstOrder.esAdicional ? 'AIEC' : 'SC')) : (item.primerPedido ? item.primerPedido.concepto : 'SC');
                    const clienteName = firstOrder ? firstOrder.cliente : (item.primerPedido ? item.primerPedido.cliente : '-');
                    const clienteReal = firstOrder?.clienteReal || firstOrder?.sucursalRelevamiento || item.primerPedido?.clienteReal;
                    const lunoAtm = firstOrder ? firstOrder.luno : (item.primerPedido ? item.primerPedido.luno : '-');
                    const direccion = firstOrder ? firstOrder.direccion : (item.primerPedido ? item.primerPedido.direccion : '-');
                    const localidad = firstOrder ? firstOrder.localidad : (item.primerPedido ? item.primerPedido.localidad : '-');
                    const detalleFalla = firstOrder?.detalleFalla || '-';
                    const estado = firstOrder ? firstOrder.estado : (item.primerPedido ? item.primerPedido.estado : 'Sin Pedidos');
                    const slaPorcentaje = firstOrder ? firstOrder.slaPorcentaje : 0;
                    const hsSla = firstOrder ? firstOrder.hsSla : 0;

                    const isAiec = concepto === 'AIEC' || firstOrder?.esAdicional;
                    const isMp = concepto === 'MP' || concepto === 'MTM';
                    const isContractor = item.zonaLocal === 'Contratistas';

                    const isOk = item.estadoMarcaje === 'ASISTENCIA_OK' || (hasTodayOrder && (estado.toUpperCase().includes('ASISTENCIA') || estado.toUpperCase().includes('CONTROL FINAL')));
                    const isSin = !hasOrders;
                    const isPend = hasOrders && !isOk;

                    return (
                      <tr 
                        key={`ci-row-${item.tecnico}-${idx}`}
                        className="hover:bg-teal-50/30 transition-colors group cursor-pointer text-slate-800"
                        onClick={() => setSelectedTechAgenda(item.tecnico)}
                      >
                        {/* 1. Técnico / Contratista */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-xs group-hover:border-teal-400 transition">
                              {item.tecnico.slice(0, 1)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-teal-700 transition flex items-center gap-1.5">
                                <span>{item.tecnico}</span>
                                {isContractor && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                                    Contratista
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <span className="text-teal-700 font-mono font-semibold">{item.zonaTecnica}</span>
                                <span>•</span>
                                <span>{item.zonaLocal}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Marcaje Asistencia */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                            isOk
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isPend
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {isOk && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                            {isPend && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                            {isOk ? 'OK 07-10hs' : isPend ? (hasTodayOrder ? 'Pend. Hoy' : techTomorrowTickets.length > 0 ? 'Prog. Mañana' : 'En Agenda') : 'Sin Servicios'}
                          </span>
                        </td>

                        {/* 3. 1° Horario */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {horaCoord ? (
                            <div className="flex items-center gap-1 text-slate-700 font-mono font-bold bg-slate-50 px-2 py-1 rounded border border-slate-200 w-fit">
                              <Clock className="w-3 h-3 text-teal-600" />
                              <span>{horaCoord} hs</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">--:--</span>
                          )}
                        </td>

                        {/* 4. 1° Pedido & Concepto */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {pedidoNum ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                  isAiec ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                                  isMp ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                                  'bg-teal-50 text-teal-800 border border-teal-200'
                                }`}>
                                  {concepto}
                                </span>
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  #{pedidoNum}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>

                        {/* 5. Cliente & Luno (ATM) */}
                        <td className="py-2.5 px-3 max-w-[170px]">
                          {firstOrder || item.primerPedido ? (
                            <div className="space-y-0.5 truncate">
                              <p className="font-semibold text-slate-900 truncate" title={clienteName}>
                                {clienteName}
                              </p>
                              <p className="text-[10px] text-teal-700 font-mono">
                                ATM {lunoAtm}
                              </p>
                              {clienteReal && (
                                <p className="text-[10px] text-slate-600 truncate" title={`Sitio: ${clienteReal}`}>
                                  📍 {clienteReal}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Sin asignar</span>
                          )}
                        </td>

                        {/* 6. Dirección & Localidad */}
                        <td className="py-2.5 px-3 max-w-[180px]">
                          {firstOrder || item.primerPedido ? (
                            <div className="space-y-0.5 truncate text-slate-600">
                              <p className="font-medium truncate flex items-center gap-1 text-slate-800" title={localidad}>
                                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span>{localidad}</span>
                              </p>
                              <p className="text-[10px] text-slate-500 truncate" title={direccion}>
                                {direccion}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </td>

                        {/* 7. Detalle Falla / Motivo */}
                        <td className="py-2.5 px-3 max-w-[200px]">
                          {detalleFalla && detalleFalla !== '-' ? (
                            <div className="bg-slate-50 border border-slate-200 px-2 py-1 rounded text-slate-700 text-[11px] italic truncate" title={detalleFalla}>
                              "{detalleFalla}"
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sin detalle registrado</span>
                          )}
                        </td>

                        {/* 8. Estado & SLA */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {firstOrder || item.primerPedido ? (
                            <div className="space-y-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-700 block w-fit">
                                {estado}
                              </span>
                              {!isAiec && slaPorcentaje > 0 && (
                                <span className={`text-[10px] font-mono font-bold block ${
                                  slaPorcentaje >= 85 ? 'text-rose-700' : 'text-slate-600'
                                }`}>
                                  SLA: {slaPorcentaje}% ({hsSla}h rest.)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* 9. Agenda Hoy */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-lg text-xs font-mono font-bold ${
                            techTodayTickets.length > 0 
                              ? 'bg-teal-50 border border-teal-200 text-teal-800'
                              : techTomorrowTickets.length > 0
                              ? 'bg-sky-50 border border-sky-200 text-sky-800'
                              : techAllTickets.length > 0
                              ? 'bg-slate-100 border border-slate-200 text-slate-700'
                              : 'bg-slate-50 border border-slate-200 text-slate-400'
                          }`}>
                            {techTodayTickets.length > 0 
                              ? `${techTodayTickets.length} hoy (${techAllTickets.length} tot.)`
                              : techTomorrowTickets.length > 0
                              ? `${techTomorrowTickets.length} mañ. (${techAllTickets.length} tot.)`
                              : techAllTickets.length > 0
                              ? `${techAllTickets.length} en agenda`
                              : '0 pedidos'}
                          </span>
                        </td>

                        {/* 10. Acción */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTechAgenda(item.tecnico);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-teal-700 hover:text-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 shadow-xs"
                            title="Abrir agenda flotante del día"
                          >
                            <span>Ver Agenda</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VISTA 2: CUADRÍCULA DE TARJETAS (OPCIONAL) */}
        {showControlInicio && viewModeControlInicio === 'GRID' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1 animate-fadeIn">
            {filteredControlInicio.map((item, idx) => {
              const isOk = item.estadoMarcaje === 'ASISTENCIA_OK';
              const isPend = item.estadoMarcaje === 'PENDIENTE_INICIO';
              const isSin = item.estadoMarcaje === 'SIN_PEDIDOS';

              // Find matching full ticket from dataset for rich operational details
              const matchingTicket = tickets.find(t => 
                t.tecnico && t.tecnico.toLowerCase() === item.tecnico.toLowerCase() &&
                (t.luno === item.primerPedido?.luno || (t.hCoor && item.primerPedido?.horaCoordinada && t.hCoor.startsWith(item.primerPedido.horaCoordinada)))
              ) || tickets.find(t => t.tecnico && t.tecnico.toLowerCase() === item.tecnico.toLowerCase());

              const concept = matchingTicket?.concepto || (matchingTicket?.esAdicional ? 'AIEC' : 'SC');
              const isAiec = concept === 'AIEC' || matchingTicket?.esAdicional;
              const isMp = concept === 'MP' || concept === 'MTM';

              return (
                <div
                  key={`${item.tecnico}-${idx}`}
                  onClick={() => setSelectedTechAgenda(item.tecnico)}
                  className={`p-3.5 rounded-xl border bg-white transition-all cursor-pointer group relative overflow-visible shadow-xs ${
                    isOk
                      ? 'border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/20'
                      : isPend
                      ? 'border-amber-300 hover:border-amber-500 hover:bg-amber-50/20'
                      : 'border-slate-200 hover:border-slate-300 opacity-80'
                  }`}
                  title={`Clic para ver agenda completa de ${item.tecnico}`}
                >
                  {/* Top: Tech Name + Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition truncate max-w-[150px]">
                        {item.tecnico}
                      </h4>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <span className="text-teal-700 font-mono font-semibold">{item.zonaTecnica}</span>
                        <span>•</span>
                        <span className="text-slate-600">{item.zonaLocal}</span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 flex-shrink-0 ${
                      isOk
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : isPend
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {isOk && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                      {isPend && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                      {isOk ? 'OK 07-10hs' : isPend ? 'Pendiente' : 'Sin Agenda'}
                    </span>
                  </div>

                  {/* Body: First Scheduled Ticket Details */}
                  {item.primerPedido ? (
                    <div className="space-y-1 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold flex items-center gap-1 text-teal-800">
                            <Clock className="w-3 h-3 text-teal-600" />
                            1° Coord: {formatTimeClean(item.primerPedido.horaCoordinada)}
                          </span>
                          <span className={`px-1 py-0.2 rounded font-bold text-[9px] uppercase ${
                            isAiec ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                            isMp ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                            'bg-teal-50 text-teal-800 border border-teal-200'
                          }`}>
                            {concept}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.primerPedido.estado}
                        </span>
                      </div>

                      <p className="font-medium text-slate-900 truncate" title={`${item.primerPedido.cliente} - LUNO: ${item.primerPedido.luno}`}>
                        {item.primerPedido.cliente} <span className="text-slate-500 font-mono">({item.primerPedido.luno})</span>
                      </p>

                      {(item.primerPedido.clienteReal || matchingTicket?.clienteReal) && (
                        <p className="text-[10px] text-teal-800 font-bold truncate flex items-center gap-1" title={`Sitio Real: ${item.primerPedido.clienteReal || matchingTicket?.clienteReal}`}>
                          <Store className="w-2.5 h-2.5 text-teal-600 flex-shrink-0" />
                          <span>Sitio: {item.primerPedido.clienteReal || matchingTicket?.clienteReal}</span>
                        </p>
                      )}
                      
                      <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                        {item.primerPedido.localidad} - {item.primerPedido.direccion}
                      </p>
                    </div>
                  ) : (
                    <div className="py-2 text-center text-[11px] text-slate-400 italic bg-slate-50 rounded-lg border border-slate-200">
                      Sin primer servicio registrado hoy
                    </div>
                  )}

                  {/* Hover indicator */}
                  <div className="mt-2 text-[10px] text-slate-500 group-hover:text-teal-700 flex items-center justify-end gap-0.5 transition">
                    <span>Ver agenda del día</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-4 shadow-xs">
        
        {/* Date Selector Switcher Bar & Quick Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          
          {/* Date Selector Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-teal-600" /> Agenda:
            </span>
            <div className="flex flex-wrap items-center bg-slate-100 border border-slate-200 rounded-xl p-1 gap-1">
              <button
                onClick={() => { setDateFilter('HOY_Y_MANANA'); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  dateFilter === 'HOY_Y_MANANA'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title={`Ver pedidos coordinados para hoy (${todayStr}) y mañana (${tomorrowStr})`}
              >
                <span>📅 Hoy + Mañana</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  dateFilter === 'HOY_Y_MANANA' ? 'bg-teal-900 text-teal-100' : 'bg-slate-200 text-slate-600'
                }`}>
                  {hoyYMananaCount}
                </span>
              </button>

              <button
                onClick={() => { setDateFilter('HOY'); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  dateFilter === 'HOY'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title={`Ver pedidos coordinados únicamente para hoy (${todayStr})`}
              >
                <span>🕒 Hoy ({todayStr})</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  dateFilter === 'HOY' ? 'bg-teal-900 text-teal-100' : 'bg-slate-200 text-slate-600'
                }`}>
                  {hoyCount}
                </span>
              </button>

              <button
                onClick={() => { setDateFilter('MANANA'); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  dateFilter === 'MANANA'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title={`Ver pedidos coordinados para el día siguiente (${tomorrowStr})`}
              >
                <span>☀️ Mañana ({tomorrowStr})</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  dateFilter === 'MANANA' ? 'bg-teal-900 text-teal-100' : 'bg-slate-200 text-slate-600'
                }`}>
                  {mananaCount}
                </span>
              </button>

              <button
                onClick={() => { setDateFilter('TODOS'); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  dateFilter === 'TODOS'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title="Ver todos los pedidos sin filtro de fecha"
              >
                <span>📋 Todos</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  dateFilter === 'TODOS' ? 'bg-teal-900 text-teal-100' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tickets.length}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Mobile S Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSpecialFilter(prev => prev === 'MOVIL_S' ? 'ALL' : 'MOVIL_S')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                specialFilter === 'MOVIL_S'
                  ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-teal-400'
              }`}
              title="Filtrar pedidos donde Columna H ('M') = 'S' (Informado a móvil del técnico)"
            >
              <Smartphone className={`w-3.5 h-3.5 ${specialFilter === 'MOVIL_S' ? 'text-white' : 'text-teal-600'}`} />
              <span>📱 Informados al Móvil (M = S)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                specialFilter === 'MOVIL_S' ? 'bg-teal-900 text-teal-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {movilSCount}
              </span>
            </button>
          </div>

        </div>

        {/* Search & Sort & Export */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por N° Pedido, Cliente, ID de Equipo, Técnico, Detalle de Falla o Ciudad..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-teal-600" /> Ordenar:
            </span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 py-2 px-2.5 focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="sla_desc">Mayor % SLA (Más Urgentes)</option>
              <option value="sla_asc">Menor % SLA</option>
              <option value="pedido">N° de Pedido</option>
              <option value="cliente">Cliente (A-Z)</option>
            </select>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setAgendaDisplayMode('TABLA')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  agendaDisplayMode === 'TABLA'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista Tabla de Pedidos"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tabla</span>
              </button>
              <button
                onClick={() => setAgendaDisplayMode('MAPA')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  agendaDisplayMode === 'MAPA'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Vista Mapa Geográfico & Recorridos"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Mapa & Rutas</span>
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 transition"
              title="Descargar lista filtrada en formato CSV"
            >
              <Download className="w-3.5 h-3.5 text-teal-600" />
              <span>CSV</span>
            </button>
          </div>

        </div>

        {/* Strictly Cascading / Dependent Dropdown Filters */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 ${availableYears.length > 1 ? 'lg:grid-cols-7' : 'lg:grid-cols-6'} gap-2.5 pt-3 border-t border-slate-100`}>
          
          {/* 0. Año */}
          {availableYears.length > 1 && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Año
              </label>
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 py-1.5 px-2 focus:outline-none focus:border-teal-500 font-medium"
              >
                <option value="ALL">Todos ({availableYears.length})</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>Año {yr}</option>
                ))}
              </select>
            </div>
          )}

          {/* 1. Región */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              1. Región Operativa
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 py-1.5 px-2 focus:outline-none focus:border-teal-500 font-medium"
            >
              <option value="ALL">Todas las Regiones</option>
              {regionsList.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* 2. Zona Local (Sector) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              2. Zona Local
            </label>
            <select
              value={selectedZonaLocal}
              onChange={(e) => handleZonaLocalChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 py-1.5 px-2 focus:outline-none focus:border-teal-500 font-medium"
            >
              <option value="ALL">Todas ({availableZonasLocales.length})</option>
              {availableZonasLocales.map(zl => (
                <option key={zl} value={zl}>{zl}</option>
              ))}
            </select>
          </div>

          {/* 3. Zona Técnica (Dependiente de Región & Zona Local con Formato ZT + Local) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              3. Zona Técnica
            </label>
            <select
              value={selectedZona}
              onChange={(e) => handleZonaChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 py-1.5 px-2 focus:outline-none focus:border-teal-500 font-medium"
            >
              <option value="ALL">Todas ({availableZonas.length})</option>
              {availableZonas.map(z => (
                <option key={z} value={z}>{getZonaLabelWithLocal(z)}</option>
              ))}
            </select>
          </div>

          {/* 4. Técnico Asignado (STRICTLY Dependent on Región + Zona Local + Zona Técnica) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              4. Técnico ({availableTecnicos.length})
            </label>
            <select
              value={selectedTecnico}
              onChange={(e) => handleTecnicoChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 py-1.5 px-2 focus:outline-none focus:border-teal-500 font-medium"
            >
              <option value="ALL">Todos los Técnicos ({availableTecnicos.length})</option>
              {availableTecnicos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 5. Filtro de Alertas / Llamadas Especiales */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              5. Filtro Especial
            </label>
            <select
              value={specialFilter}
              onChange={(e: any) => setSpecialFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 py-1.5 px-2 focus:outline-none focus:border-teal-500 font-semibold"
            >
              <option value="ALL">Sin Filtro Especial</option>
              <option value="SC_PENDIENTES">🚨 SC Pendientes Región ({scPendientesTotal})</option>
              <option value="SC_SIN_ASIGNAR">⚠️ SC Sin Asignar / Riesgo SLA ({scSinAsignar})</option>
              <option value="MP_DEFICIENTE">🚨 Riesgo MP Deficiente &lt;30d ({mpDeficienteTotal})</option>
              <option value="ASIGNADO_COT">📅 Asignados Flow COT ({totalAsignadosCOT})</option>
              <option value="REINCIDENTE">🔁 Reincidentes (R &gt; 0)</option>
              <option value="MOVIL_S">📱 Informado Móvil (M=S)</option>
              <option value="MP_PENDIENTE">⚠️ Con MP Pendiente</option>
              <option value="ADICIONAL_PENDIENTE">📌 Con Adicional AIEC</option>
              <option value="AIEC">AIEC (Sin SLA)</option>
            </select>
          </div>

          {/* 6. Cliente */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">6. Cliente</label>
            <select
              value={selectedCliente}
              onChange={(e) => { setSelectedCliente(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 py-1.5 px-2 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">Todos ({clientesList.length})</option>
              {clientesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Agenda Content: Map View vs Table View */}
      {agendaDisplayMode === 'MAPA' ? (
        <MapaAgendaDiaria
          tickets={filteredTickets}
          zonas={zonas}
          onSelectTicket={onSelectTicket}
          selectedTechName={selectedTecnico}
          onSelectTech={(tech) => setSelectedTecnico(tech)}
        />
      ) : (
        <div id="agenda-table-section" className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        
        {/* Table Header with Pagination size selector */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-900">Pedidos en Agenda Diaria</h3>
            <span className="text-xs bg-slate-200/80 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold">
              {filteredTickets.length} pedidos encontrados
            </span>
          </div>

          {/* Page size selector */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Mostrar por página:</span>
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg overflow-hidden p-0.5">
              {[20, 40, 100, 200].map(sz => (
                <button
                  key={sz}
                  onClick={() => setPageSize(sz)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                    pageSize === sz
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider font-bold text-[10px] border-b border-slate-200">
                <th className="py-3 px-4">Días última atención & R</th>
                <th className="py-3 px-4">Pedido / Equipo & MP</th>
                <th className="py-3 px-4">Cliente & Ubicación</th>
                <th className="py-3 px-4">Técnico & Coordinación</th>
                <th className="py-3 px-4">Detalle Falla & Alertas</th>
                <th className="py-3 px-4">Estado / Móvil & Horario</th>
                <th className="py-3 px-4">Stock / Repuesto</th>
                <th className="py-3 px-4 text-right">Semáforo SLA</th>
                <th className="py-3 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">No se encontraron pedidos con los filtros actuales</p>
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((t) => {
                  const cronico = cronicoMap.get(t.luno);
                  const isCritical = t.slaPorcentaje >= 85 || t.hsSla <= 2;
                  const isWarning = t.slaPorcentaje >= 65 && t.slaPorcentaje < 85;
                  const isAIEC = t.concepto === 'AIEC' || t.esAdicional;
                  const isMovil = t.notificadoMovil || t.m === 'S';
                  const localZone = ZONA_TECNICA_TO_LOCAL[t.zonaTecnica || t.zona] || t.zonaLocal || '';
                  const isSinAsignar = !t.tecnico || t.tecnico.toLowerCase() === 'sin asignar';
                  const sharesAddressWithCoordinated = isAIEC && t.direccion && coordinatedAddresses.has(`${(t.cliente || '').trim().toLowerCase()}|${(t.direccion || '').trim().toLowerCase()}`);

                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTicket(t)}
                      className="hover:bg-teal-50/30 transition cursor-pointer group text-slate-800"
                    >
                      {/* 1. Días última atención & R */}
                      <td className="py-3 px-4 font-medium whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-slate-800 block">
                            {t.diasDesdeUltimaAtencion || t.diasUltimaAtencion || '1 día'}
                          </span>
                          {((t.reincidenciaCount && t.reincidenciaCount > 0) || cronico) && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px]"
                              title={`Reincidencias registradas en equipo (R = ${t.reincidenciaCount || (cronico ? cronico.totalFallas : 1)})`}
                            >
                              <RotateCcw className="w-2.5 h-2.5 text-purple-600" />
                              R: {t.reincidenciaCount || (cronico ? cronico.totalFallas : 1)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Pedido / Equipo & MP */}
                      <td className="py-3 px-4 font-medium">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-teal-700 font-bold group-hover:underline">
                            #{t.pedido}
                          </span>
                          {t.esPedidoSuspendidoPrevio && (
                            <span 
                              className="px-1.5 py-0.2 rounded bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px]"
                              title={`Pedido reanudado: suspendido previamente por ${t.suspensionPrevia?.codigoCierre || t.suspensionPrevia?.codCierre || 'cierre'}: ${t.suspensionPrevia?.descCierre || t.suspensionPrevia?.desc || ''}`}
                            >
                              ⏸️ Reanudado ({t.suspensionPrevia?.codigoCierre || t.suspensionPrevia?.codCierre || 'PPR'})
                            </span>
                          )}
                          {isAIEC && (
                            <span className="px-1.5 py-0.2 rounded bg-sky-50 border border-sky-200 text-sky-800 font-bold text-[10px]">
                              AIEC
                            </span>
                          )}
                          {cronico && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenCronicoDetail(cronico);
                              }}
                              title={`¡Equipo Crónico! ${cronico.totalFallas} fallas repetidas en SLA (60 días)`}
                              className="px-1.5 py-0.2 rounded bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] flex items-center gap-1 hover:bg-purple-100"
                            >
                              <Radio className="w-2.5 h-2.5 text-purple-600" />
                              CRÓNICO
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                          <span>Eq: <strong className="text-slate-800">{t.luno || '-'}</strong></span>
                        </div>
                        {/* MP Cerrados Detection: Alerta de MP Deficiente (<30d) vs MP OK (>30d) */}
                        {t.esMpDeficiente ? (
                          <div 
                            className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold shadow-xs"
                            title={`¡Alerta de Calidad! Este equipo tuvo un Mantenimiento Preventivo cerrado hace solo ${t.diasDesdeUltimoMp ?? '<30'} días (${t.ultimoMpFecha || ''}${t.tecnicoUltimoMp ? ` por ${t.tecnicoUltimoMp}` : ''}). Falla prematura post-MP.`}
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-600 flex-shrink-0" />
                            <span>🚨 MP Deficiente ({t.diasDesdeUltimoMp ?? '<30'}d)</span>
                          </div>
                        ) : t.ultimoMpFecha ? (
                          <div 
                            className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-medium"
                            title={`Último MP cerrado el ${t.ultimoMpFecha}${t.diasDesdeUltimoMp ? ` (hace ${t.diasDesdeUltimoMp} días)` : ''}${t.tecnicoUltimoMp ? ` por ${t.tecnicoUltimoMp}` : ''}`}
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />
                            <span>MP {t.ultimoMpFecha}</span>
                          </div>
                        ) : null}

                        {t.tiempoAsistenciaMp && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-[10px] font-mono ${t.alertaTiempoMp?.tieneAlerta ? 'text-amber-700 font-bold' : 'text-slate-500'}`}>
                              T Asis: {t.tiempoAsistenciaMp}
                            </span>
                            {t.alertaTiempoMp?.tieneAlerta && (
                              <span className="text-[10px] text-amber-600" title={t.alertaTiempoMp.mensaje}>⚠️</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 3. Cliente & Ubicación */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{t.cliente}</span>
                        {t.clienteReal && (
                          <div 
                            className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-semibold"
                            title={`Relevamiento Cash Today: El cliente comercial y sucursal a relevar es ${t.clienteReal}${t.sucursalRelevamiento ? ` (${t.sucursalRelevamiento})` : ''}`}
                          >
                            <Store className="w-3 h-3 text-teal-600 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">Sitio Real: {t.clienteReal}</span>
                            {t.sucursalRelevamiento && <span className="text-teal-700 font-normal">({t.sucursalRelevamiento})</span>}
                          </div>
                        )}
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 truncate max-w-[200px]" title={`${t.localidad} - ${t.direccion}`}>
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          {t.localidad} {t.direccion ? `(${t.direccion})` : ''}
                        </span>
                      </td>

                      {/* 4. Técnico & Coordinación */}
                      <td className="py-3 px-4">
                        {isSinAsignar ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[11px] shadow-xs">
                              <AlertTriangle className="w-3 h-3 text-rose-600 flex-shrink-0" />
                              🚨 SIN COORDINAR / Riesgo SLA
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Reporte: <strong className="text-teal-700">{t.origenReporte || 'Pendientes'}</strong> • Zona {t.zonaTecnica || t.zona}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900">{t.tecnico}</span>
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-bold">
                                ✓ Coordinado
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-teal-700 font-medium flex-wrap mt-0.5">
                              <span>{t.zonaTecnica || t.zona}</span>
                              {localZone && (
                                <span className="text-[10px] text-slate-600 bg-slate-100 px-1 rounded border border-slate-200">
                                  {localZone}
                                </span>
                              )}
                              {t.region && (
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded border border-slate-200">
                                  {t.region}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 5. Detalle Falla & Alertas */}
                      <td className="py-3 px-4 max-w-[280px]">
                        <p className="text-xs text-slate-700 font-medium truncate" title={t.detalleFalla}>
                          {t.detalleFalla || '-'}
                        </p>

                        {/* CALLOUT: AIEC comparte mismo domicilio con pedido coordinado */}
                        {sharesAddressWithCoordinated && (
                          <div 
                            className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold shadow-xs"
                            title="Existe otro pedido coordinado en este mismo domicilio. Se recomienda aprovechar la visita del técnico para realizar el AIEC sin incurrir en traslados adicionales."
                          >
                            <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            <span>📍 Mismo dom. coordinado (Aprovechar visita)</span>
                          </div>
                        )}

                        {/* CALLOUT: MP PENDIENTE SIN ASIGNAR */}
                        {t.alertaMpSinAsignar && (
                          <div 
                            className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold shadow-xs"
                            title={`Mantenimiento Preventivo pendiente en este equipo (Pedido MP #${t.mpPendienteDetalle?.pedido || '-'}). No fue asignado en la agenda.`}
                          >
                            <Wrench className="w-3 h-3 text-amber-600 flex-shrink-0" />
                            <span>⚠️ MP Pendiente sin asignar</span>
                          </div>
                        )}

                        {/* CALLOUT: ADICIONAL AIEC PENDIENTE EN ESTE EQUIPO */}
                        {t.alertaAdicionalPendiente && (
                          <div 
                            className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 text-[10px] font-bold shadow-xs ml-1"
                            title={`Este equipo tiene un llamado Adicional AIEC registrado (Pedido #${t.adicionalDetalle?.pedido || '-'}: ${t.adicionalDetalle?.detalleFalla || ''}).`}
                          >
                            <Pin className="w-3 h-3 text-sky-600 flex-shrink-0" />
                            <span>📌 Adicional AIEC en equipo</span>
                          </div>
                        )}
                      </td>

                      {/* 6. Estado / Móvil & Horario (Without seconds) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            isAIEC ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                            t.estado === 'SEG Asistencia' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            t.estado === 'SEG Control Final' || t.estado === 'SEG Fin Asistencia' ? 'bg-teal-50 text-teal-800 border border-teal-200' :
                            t.estado === 'SEG Espera' || t.estado === 'SEG Espera Llegada' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                            t.estado === 'SEG Registrado' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {t.estado}
                          </span>

                          {/* Móvil S badge */}
                          {isMovil && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold"
                              title="Pedido informado al móvil correspondiente del técnico (Columna H = 'S')"
                            >
                              <Smartphone className="w-2.5 h-2.5 text-teal-600" />
                              <span>Móvil S</span>
                            </span>
                          )}
                        </div>

                        {/* Coordination Time strictly formatted without seconds */}
                        <span className="text-[11px] text-slate-500 block mt-1 font-mono">
                          🕒 {formatTimeClean(t.hCoor ? `${t.fCoorDate || ''} ${t.hCoor}` : t.fechaCoordinada || '09:00')}
                        </span>
                      </td>

                      {/* 7. Stock / Repuesto */}
                      <td className="py-3 px-4">
                        <span className="text-slate-700 font-medium block truncate max-w-[130px]" title={t.repuestos}>
                          {t.repuestos}
                        </span>
                        {t.stock && t.stock !== '-' && t.stock !== '0' && (
                          <span className="text-[10px] text-teal-700 font-mono font-bold">
                            Stock #{t.stock}
                          </span>
                        )}
                      </td>

                      {/* 8. Semáforo SLA */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-block text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={`font-black text-xs ${
                              isAIEC ? 'text-sky-700 font-bold' :
                              isCritical ? 'text-rose-700 font-extrabold' :
                              isWarning ? 'text-amber-700 font-bold' :
                              'text-teal-700 font-bold'
                            }`}>
                              {isAIEC ? 'Sin SLA' : `${t.slaPorcentaje}%`}
                            </span>
                            {!isAIEC && (
                              <span className={`text-[10px] font-mono ${t.slaPorcentaje >= 100 || t.hsSla <= 0 ? 'text-rose-700 font-bold' : 'text-slate-500'}`}>
                                {t.slaPorcentaje >= 100 || t.hsSla <= 0 ? '(Vencido)' : `(${t.hsSla}h rest.)`}
                              </span>
                            )}
                          </div>
                          {!isAIEC && (
                            <div className="w-24 h-1.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden mt-1 ml-auto">
                              <div
                                className={`h-full rounded-full ${
                                  isCritical ? 'bg-rose-500' :
                                  isWarning ? 'bg-amber-500' :
                                  'bg-teal-600'
                                }`}
                                style={{ width: `${Math.min(t.slaPorcentaje, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 9. Action */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket(t);
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-teal-700 hover:text-white text-slate-600 transition shadow-xs"
                          title="Ver detalle de pedido e historial"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          
          <div>
            Mostrando <strong className="text-slate-900 font-mono">{filteredTickets.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> a <strong className="text-slate-900 font-mono">{Math.min(currentPage * pageSize, filteredTickets.length)}</strong> de <strong className="text-teal-800 font-mono font-bold">{filteredTickets.length}</strong> pedidos
          </div>

          {/* Page Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition shadow-xs"
              title="Primera página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition shadow-xs"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono font-semibold shadow-xs">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition shadow-xs"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition shadow-xs"
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
      )}

      {/* Floating Modal: Agenda Diaria del Técnico */}
      <TechnicianDailyAgendaModal
        isOpen={!!selectedTechAgenda}
        onClose={() => setSelectedTechAgenda(null)}
        tecnicoNombre={selectedTechAgenda}
        activeDateStr={todayStr}
        tomorrowDateStr={tomorrowStr}
        tickets={tickets}
        onSelectTicket={onSelectTicket}
      />

    </div>
  );
};
