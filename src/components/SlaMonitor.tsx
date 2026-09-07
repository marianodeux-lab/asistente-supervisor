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
  Compass
} from 'lucide-react';
import { Ticket, TecnicoInfo, ZonaInfo, EquipoCronico, ControlInicioItem } from '../types';
import zonasReferencia from '../data/zonasTecnicosReferencia.json';
import controlInicioRaw from '../data/controlInicioData.json';
import { formatTimeClean, ZONA_TECNICA_TO_LOCAL, getZonaLabelWithLocal } from '../utils/formatters';

interface SlaMonitorProps {
  tickets: Ticket[];
  tecnicos: TecnicoInfo[];
  zonas: ZonaInfo[];
  cronicos: EquipoCronico[];
  onSelectTicket: (ticket: Ticket) => void;
  onOpenCronicoDetail: (cronico: EquipoCronico) => void;
}

export const SlaMonitor: React.FC<SlaMonitorProps> = ({
  tickets,
  tecnicos,
  zonas,
  cronicos,
  onSelectTicket,
  onOpenCronicoDetail
}) => {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'HOY' | 'TODOS'>('HOY');
  
  // Cascading Filter States
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedZonaLocal, setSelectedZonaLocal] = useState<string>('ALL');
  const [selectedZona, setSelectedZona] = useState<string>('ALL');
  const [selectedTecnico, setSelectedTecnico] = useState<string>('ALL');
  const [selectedCliente, setSelectedCliente] = useState<string>('ALL');
  const [selectedEstado, setSelectedEstado] = useState<string>('ALL');
  const [specialFilter, setSpecialFilter] = useState<'ALL' | 'MP_PENDIENTE' | 'ADICIONAL_PENDIENTE' | 'REINCIDENTE' | 'AIEC' | 'ASIGNADO_COT' | 'MOVIL_S'>('ALL');
  const [slaFilter, setSlaFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'OK'>('ALL');
  const [sortBy, setSortBy] = useState<'sla_desc' | 'sla_asc' | 'pedido' | 'cliente' | 'fecha'>('sla_desc');

  // Control Inicio Sector Filter & Toggle
  const [showControlInicio, setShowControlInicio] = useState<boolean>(true);
  const [ciSectorFilter, setCiSectorFilter] = useState<string>('ALL');
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

  // Regions list
  const regionsList = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => {
      if (t.region) set.add(t.region);
    });
    ['PATAGONIA', 'SUROESTE', 'AMBA', 'LITORAL'].forEach(r => set.add(r));
    return Array.from(set).filter(Boolean).sort();
  }, [tickets]);

  // Available Zonas Locales based on Selected Region
  const availableZonasLocales = useMemo(() => {
    const set = new Set<string>();
    zonasReferencia.forEach(z => {
      if (selectedRegion === 'ALL' || z.region === selectedRegion) {
        if (z.zonaLocal) set.add(z.zonaLocal);
      }
    });
    if (selectedRegion === 'AMBA' || selectedRegion === 'ALL') set.add('AMBA');
    if (selectedRegion === 'LITORAL' || selectedRegion === 'ALL') set.add('Litoral');
    return Array.from(set).sort();
  }, [selectedRegion]);

  // Dependent Zonas list based on Selected Region and Selected Zona Local
  const availableZonas = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach(t => {
      const master = masterTecMap.get(t.tecnico?.toLowerCase());
      const ticketRegion = master?.region || t.region || 'PATAGONIA';
      const ticketZonaLocal = master?.zonaLocal || t.zonaLocal || ZONA_TECNICA_TO_LOCAL[t.zonaTecnica || t.zona] || (ticketRegion === 'AMBA' ? 'AMBA' : ticketRegion === 'LITORAL' ? 'Litoral' : 'General');
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
      const techZonaLocal = master?.zonaLocal || t.zonaLocal || ZONA_TECNICA_TO_LOCAL[t.zonaTecnica || t.zona] || (techRegion === 'AMBA' ? 'AMBA' : techRegion === 'LITORAL' ? 'Litoral' : 'General');
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
      const masterInfo = masterTecMap.get(newTec.toLowerCase());
      if (masterInfo) {
        if (masterInfo.region && selectedRegion === 'ALL') {
          setSelectedRegion(masterInfo.region);
        }
        if (masterInfo.zonaLocal && selectedZonaLocal === 'ALL') {
          setSelectedZonaLocal(masterInfo.zonaLocal);
        }
        if (masterInfo.zonaTecnica && selectedZona === 'ALL') {
          setSelectedZona(masterInfo.zonaTecnica);
        }
      }
    }
    setCurrentPage(1);
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

  // Chronic map for quick badge check
  const cronicoMap = useMemo(() => {
    const map = new Map<string, EquipoCronico>();
    cronicos.forEach(c => map.set(c.luno, c));
    return map;
  }, [cronicos]);

  // Fast counts
  const hoyCount = useMemo(() => {
    return tickets.filter(t => t.fCoorDate === '07/09/2026' || (t.fechaCoordinada && t.fechaCoordinada.includes('07/09/2026'))).length;
  }, [tickets]);

  const movilSCount = useMemo(() => {
    return tickets.filter(t => t.notificadoMovil || t.m === 'S').length;
  }, [tickets]);

  const okCount = useMemo(() => controlInicioList.filter(i => i.estadoMarcaje === 'ASISTENCIA_OK').length, [controlInicioList]);
  const pendCount = useMemo(() => controlInicioList.filter(i => i.estadoMarcaje === 'PENDIENTE_INICIO').length, [controlInicioList]);
  const sinPedidosCount = useMemo(() => controlInicioList.filter(i => i.estadoMarcaje === 'SIN_PEDIDOS').length, [controlInicioList]);

  // Exact metrics for TOTAL EN AGENDA (Pendientes Patagonia + Suroeste vs Coordinados Mis Técnicos)
  const totalPendientesRegion = useMemo(() => {
    const patSuroesteOrders = tickets.filter(t => 
      t.region === 'PATAGONIA' || 
      t.region === 'SUROESTE' || 
      t.origenReporte === 'Patagonia' || 
      t.origenReporte === 'Suroeste' ||
      masterTecMap.has(t.tecnico?.toLowerCase())
    );
    return patSuroesteOrders.length > 0 ? patSuroesteOrders.length : tickets.length;
  }, [tickets, masterTecMap]);

  const coordinadosMisTecnicos = useMemo(() => {
    return tickets.filter(t => {
      const isMyTech = masterTecMap.has(t.tecnico?.toLowerCase());
      const isAssigned = t.tecnico && t.tecnico.toLowerCase() !== 'sin asignar';
      return isMyTech && isAssigned;
    }).length;
  }, [tickets, masterTecMap]);

  const sinAsignarRegion = useMemo(() => {
    return tickets.filter(t => {
      const isPatSuroeste = t.region === 'PATAGONIA' || t.region === 'SUROESTE' || t.origenReporte === 'Patagonia' || t.origenReporte === 'Suroeste';
      return isPatSuroeste && (!t.tecnico || t.tecnico.toLowerCase() === 'sin asignar');
    }).length;
  }, [tickets]);

  // Filtered & Sorted Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Date Filter (Agenda de Hoy vs Todos)
      if (dateFilter === 'HOY') {
        const isToday = t.fCoorDate === '07/09/2026' || (t.fechaCoordinada && t.fechaCoordinada.includes('07/09/2026'));
        if (!isToday) return false;
      }

      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const match = 
          t.pedido.toLowerCase().includes(query) ||
          t.cliente.toLowerCase().includes(query) ||
          t.luno.toLowerCase().includes(query) ||
          t.tecnico.toLowerCase().includes(query) ||
          t.localidad.toLowerCase().includes(query) ||
          t.direccion.toLowerCase().includes(query) ||
          (t.detalleFalla && t.detalleFalla.toLowerCase().includes(query));
        if (!match) return false;
      }

      const master = masterTecMap.get(t.tecnico?.toLowerCase());
      const ticketRegion = master?.region || t.region || 'PATAGONIA';
      const ticketZonaLocal = master?.zonaLocal || t.zonaLocal || ZONA_TECNICA_TO_LOCAL[t.zonaTecnica || t.zona] || (ticketRegion === 'AMBA' ? 'AMBA' : ticketRegion === 'LITORAL' ? 'Litoral' : 'General');
      const ticketZona = master?.zonaTecnica || t.zonaTecnica || t.zona;

      // Region Filter
      if (selectedRegion !== 'ALL') {
        if (ticketRegion !== selectedRegion && t.region !== selectedRegion) return false;
      }

      // Zona Local Filter
      if (selectedZonaLocal !== 'ALL') {
        if (ticketZonaLocal !== selectedZonaLocal) return false;
      }

      // Zona Filter
      if (selectedZona !== 'ALL') {
        if (ticketZona !== selectedZona && t.zonaTecnica !== selectedZona && t.zona !== selectedZona) return false;
      }

      // Tecnico Filter
      if (selectedTecnico !== 'ALL' && t.tecnico !== selectedTecnico) return false;

      // Cliente Filter
      if (selectedCliente !== 'ALL' && t.cliente !== selectedCliente) return false;

      // Estado Filter
      if (selectedEstado !== 'ALL' && t.estado !== selectedEstado) return false;

      // Special Filter
      if (specialFilter === 'MOVIL_S' && !t.notificadoMovil && t.m !== 'S') return false;
      if (specialFilter === 'MP_PENDIENTE' && !t.alertaMpPendiente) return false;
      if (specialFilter === 'ADICIONAL_PENDIENTE' && !t.alertaAdicionalPendiente) return false;
      if (specialFilter === 'REINCIDENTE' && !cronicoMap.has(t.luno)) return false;
      if (specialFilter === 'AIEC' && t.concepto !== 'AIEC' && !t.esAdicional) return false;
      if (specialFilter === 'ASIGNADO_COT' && !t.esAsignadoCOT) return false;

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
  }, [tickets, search, dateFilter, selectedRegion, selectedZonaLocal, selectedZona, selectedTecnico, selectedCliente, selectedEstado, specialFilter, slaFilter, sortBy, cronicoMap, masterTecMap]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFilter, selectedRegion, selectedZonaLocal, selectedZona, selectedTecnico, selectedCliente, selectedEstado, specialFilter, slaFilter, sortBy, pageSize]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <button
          onClick={() => { setSlaFilter('ALL'); setSpecialFilter('ALL'); }}
          className={`p-4 rounded-xl text-left border transition-all ${
            slaFilter === 'ALL' && specialFilter === 'ALL'
              ? 'bg-slate-800 border-amber-500/80 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Total en Agenda</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-black text-white">{totalPendientesRegion}</p>
            <span className="text-[11px] text-slate-400 font-semibold">pedidos en región</span>
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] space-y-0.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Coordinados a mis técnicos:
              </span>
              <strong className="text-emerald-400 font-mono font-bold">{coordinadosMisTecnicos}</strong>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Sin asignar / En espera:
              </span>
              <strong className="text-amber-300 font-mono font-bold">{sinAsignarRegion}</strong>
            </div>
          </div>
        </button>

        <button
          onClick={() => { setSlaFilter('CRITICAL'); setSpecialFilter('ALL'); }}
          className={`p-4 rounded-xl text-left border transition-all ${
            slaFilter === 'CRITICAL'
              ? 'bg-red-950/70 border-red-500 shadow-lg shadow-red-500/20'
              : 'bg-slate-900/80 border-slate-800 hover:bg-red-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">SLA Crítico / &gt;85%</span>
            <Flame className="w-4 h-4 text-red-400 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-red-300 mt-1">
            {tickets.filter(t => t.slaPorcentaje >= 85 || t.hsSla <= 2).length}
          </p>
          <span className="text-[11px] text-red-300/80">Riesgo inminente de penalización</span>
        </button>

        <button
          onClick={() => { setSlaFilter('WARNING'); setSpecialFilter('ALL'); }}
          className={`p-4 rounded-xl text-left border transition-all ${
            slaFilter === 'WARNING'
              ? 'bg-amber-950/70 border-amber-500 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900/80 border-slate-800 hover:bg-amber-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Advertencia 65-85%</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-300 mt-1">
            {tickets.filter(t => t.slaPorcentaje >= 65 && t.slaPorcentaje < 85 && t.hsSla > 2).length}
          </p>
          <span className="text-[11px] text-amber-300/80">Atención preventiva recomendada</span>
        </button>

        <button
          onClick={() => { setSlaFilter('OK'); setSpecialFilter('ALL'); }}
          className={`p-4 rounded-xl text-left border transition-all ${
            slaFilter === 'OK'
              ? 'bg-emerald-950/70 border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900/80 border-slate-800 hover:bg-emerald-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">En Término &lt;65%</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300 mt-1">
            {tickets.filter(t => t.slaPorcentaje < 65).length}
          </p>
          <span className="text-[11px] text-emerald-300/80">Operación en rango óptimo</span>
        </button>

      </div>

      {/* CONTROL DE INICIO DE JORNADA (MARCAJE DE ASISTENCIA 07:00 - 10:00 HS) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
        
        {/* Header with Title & Summary Badges */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 shadow-inner">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-white tracking-wide">
                    Control de Inicio de Jornada &bull; Marcaje de Asistencia
                  </h3>
                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold rounded-full">
                    1° Pedido 07:00 a 10:00 hs
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Verificación de puntualidad de primer horario en estado <strong className="text-emerald-400 font-mono">SEG Asistencia</strong> (homónimo a marcar tarjeta de asistencia).
                </p>
              </div>
            </div>
          </div>

          {/* Metric KPI Chips & Collapse Toggle */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/70 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs font-bold shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{okCount} Presentes en Horario</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/70 border border-amber-500/60 rounded-xl text-amber-300 text-xs font-bold shadow-sm">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{pendCount} Pendientes de Inicio</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs font-medium">
              <UserX className="w-3.5 h-3.5 text-slate-500" />
              <span>{sinPedidosCount} Sin Servicios Hoy</span>
            </div>

            <button
              onClick={() => setShowControlInicio(prev => !prev)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition ml-1"
            >
              <span>{showControlInicio ? 'Ocultar Cuadrícula' : 'Ver 20 Técnicos'}</span>
              {showControlInicio ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Sector Filter Bar (Zona Local) */}
        {showControlInicio && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 pb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Compass className="w-3 h-3 text-amber-400" /> Sector / Zona Local:
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  <span>{sec === 'ALL' ? 'Todos los Sectores' : sec}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isSelected ? 'bg-slate-950 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 20 Technicians Cards Grid */}
        {showControlInicio && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1 animate-fadeIn">
            {filteredControlInicio.map((item, idx) => {
              const isOk = item.estadoMarcaje === 'ASISTENCIA_OK';
              const isPend = item.estadoMarcaje === 'PENDIENTE_INICIO';
              const isSin = item.estadoMarcaje === 'SIN_PEDIDOS';

              return (
                <div
                  key={`${item.tecnico}-${idx}`}
                  onClick={() => handleTecnicoChange(item.tecnico)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer group relative overflow-hidden ${
                    isOk
                      ? 'bg-slate-950/70 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-950/20'
                      : isPend
                      ? 'bg-slate-950/70 border-amber-500/50 hover:border-amber-400 hover:bg-amber-950/20 ring-1 ring-amber-500/20'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40 opacity-75'
                  }`}
                  title={`Clic para filtrar agenda de ${item.tecnico}`}
                >
                  {/* Top: Tech Name + Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition truncate max-w-[150px]">
                        {item.tecnico}
                      </h4>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <span className="text-amber-400 font-mono font-semibold">{item.zonaTecnica}</span>
                        <span>•</span>
                        <span className="text-slate-300">{item.zonaLocal}</span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 flex-shrink-0 ${
                      isOk
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : isPend
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {isOk && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                      {isPend && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      {isOk ? 'OK 07-10hs' : isPend ? 'Pendiente' : 'Sin Agenda'}
                    </span>
                  </div>

                  {/* Body: First Scheduled Ticket Details (Hours formatted cleanly without seconds) */}
                  {item.primerPedido ? (
                    <div className="space-y-1 text-[11px] bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-bold flex items-center gap-1 text-amber-300">
                          <Clock className="w-3 h-3 text-amber-400" />
                          1° Coord: {formatTimeClean(item.primerPedido.horaCoordinada)}
                        </span>
                        <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          item.primerPedido.estado === 'SEG Asistencia'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : item.primerPedido.estado === 'SEG Control Final'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {item.primerPedido.estado}
                        </span>
                      </div>

                      <p className="font-medium text-slate-200 truncate" title={`${item.primerPedido.cliente} - LUNO: ${item.primerPedido.luno}`}>
                        {item.primerPedido.cliente} <span className="text-slate-400 font-mono">({item.primerPedido.luno})</span>
                      </p>
                      
                      <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                        {item.primerPedido.localidad} - {item.primerPedido.direccion}
                      </p>
                    </div>
                  ) : (
                    <div className="py-2 text-center text-[11px] text-slate-500 italic bg-slate-900/40 rounded-lg border border-slate-850">
                      Sin primer servicio registrado hoy
                    </div>
                  )}

                  {/* Hover indicator */}
                  <div className="mt-2 text-[10px] text-slate-500 group-hover:text-amber-400 flex items-center justify-end gap-0.5 transition">
                    <span>Filtrar agenda</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-4 shadow-lg">
        
        {/* Date Selector Switcher Bar & Quick Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          
          {/* Date Selector Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Agenda:
            </span>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => setDateFilter('HOY')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  dateFilter === 'HOY'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>📅 Agenda de Hoy (07/09/2026)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  dateFilter === 'HOY' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {hoyCount}
                </span>
              </button>

              <button
                onClick={() => setDateFilter('TODOS')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  dateFilter === 'TODOS'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>📋 Todos los Pedidos</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  dateFilter === 'TODOS' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                specialFilter === 'MOVIL_S'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-white'
              }`}
              title="Filtrar pedidos donde Columna H ('M') = 'S' (Informado a móvil del técnico)"
            >
              <Smartphone className={`w-3.5 h-3.5 ${specialFilter === 'MOVIL_S' ? 'text-slate-950' : 'text-emerald-400'}`} />
              <span>📱 Informados al Móvil (M = S)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                specialFilter === 'MOVIL_S' ? 'bg-slate-950 text-emerald-300' : 'bg-slate-800 text-emerald-400'
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
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" /> Ordenar:
            </span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-2 px-2.5 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="sla_desc">Mayor % SLA (Más Urgentes)</option>
              <option value="sla_asc">Menor % SLA</option>
              <option value="pedido">N° de Pedido</option>
              <option value="cliente">Cliente (A-Z)</option>
            </select>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-700 transition"
              title="Descargar lista filtrada en formato CSV"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>CSV</span>
            </button>
          </div>

        </div>

        {/* Strictly Cascading / Dependent Dropdown Filters (6 Columns) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-slate-800/80">
          
          {/* 1. Región */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              1. Región Operativa
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => handleRegionChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-2 focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="ALL">Todas las Regiones</option>
              {regionsList.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* 2. Zona Local (Sector) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              2. Zona Local
            </label>
            <select
              value={selectedZonaLocal}
              onChange={(e) => handleZonaLocalChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-2 focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="ALL">Todas ({availableZonasLocales.length})</option>
              {availableZonasLocales.map(zl => (
                <option key={zl} value={zl}>{zl}</option>
              ))}
            </select>
          </div>

          {/* 3. Zona Técnica (Dependiente de Región & Zona Local con Formato ZT + Local) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              3. Zona Técnica
            </label>
            <select
              value={selectedZona}
              onChange={(e) => handleZonaChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-2 focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="ALL">Todas ({availableZonas.length})</option>
              {availableZonas.map(z => (
                <option key={z} value={z}>{getZonaLabelWithLocal(z)}</option>
              ))}
            </select>
          </div>

          {/* 4. Técnico Asignado (STRICTLY Dependent on Región + Zona Local + Zona Técnica) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
              4. Técnico ({availableTecnicos.length})
            </label>
            <select
              value={selectedTecnico}
              onChange={(e) => handleTecnicoChange(e.target.value)}
              className="w-full bg-slate-950 border border-amber-500/40 rounded-lg text-xs text-slate-100 py-1.5 px-2 focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="ALL">Todos los Técnicos ({availableTecnicos.length})</option>
              {availableTecnicos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 5. Filtro de Alertas / Llamadas Especiales */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
              5. Filtro Especial
            </label>
            <select
              value={specialFilter}
              onChange={(e: any) => setSpecialFilter(e.target.value)}
              className="w-full bg-slate-950 border border-amber-500/40 rounded-lg text-xs text-amber-300 py-1.5 px-2 focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="ALL">Sin Filtro Especial</option>
              <option value="MOVIL_S">📱 Informado Móvil (M=S)</option>
              <option value="MP_PENDIENTE">⚠️ Con MP Pendiente</option>
              <option value="ADICIONAL_PENDIENTE">📌 Con Adicional AIEC</option>
              <option value="REINCIDENTE">🚨 Solo Reincidentes</option>
              <option value="AIEC">AIEC (Sin SLA)</option>
              <option value="ASIGNADO_COT">Asignados Flow COT</option>
            </select>
          </div>

          {/* 6. Cliente */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">6. Cliente</label>
            <select
              value={selectedCliente}
              onChange={(e) => { setSelectedCliente(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-2 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todos ({clientesList.length})</option>
              {clientesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Tickets Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        
        {/* Table Header with Pagination size selector */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-white">Pedidos en Agenda Diaria</h3>
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-semibold">
              {filteredTickets.length} pedidos encontrados
            </span>
          </div>

          {/* Page size selector */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Mostrar por página:</span>
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden p-0.5">
              {[20, 40, 100, 200].map(sz => (
                <button
                  key={sz}
                  onClick={() => setPageSize(sz)}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition ${
                    pageSize === sz
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
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
              <tr className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800/80">
                <th className="py-3 px-4">Pedido / Equipo</th>
                <th className="py-3 px-4">Cliente & Ubicación</th>
                <th className="py-3 px-4">Técnico & Zona Técnica</th>
                <th className="py-3 px-4">Detalle Falla / Síntoma & Alertas</th>
                <th className="py-3 px-4">Estado / Móvil & Horario</th>
                <th className="py-3 px-4">Stock / Repuesto</th>
                <th className="py-3 px-4 text-right">Semáforo SLA</th>
                <th className="py-3 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
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

                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTicket(t)}
                      className="hover:bg-slate-800/60 transition cursor-pointer group"
                    >
                      {/* Pedido / Equipo */}
                      <td className="py-3 px-4 font-medium">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-amber-400 font-bold group-hover:underline">
                            #{t.pedido}
                          </span>
                          {isAIEC && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-[10px]">
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
                              className="px-1.5 py-0.2 rounded bg-purple-950 border border-purple-500 text-purple-300 font-bold text-[10px] flex items-center gap-1 hover:bg-purple-900"
                            >
                              <Radio className="w-2.5 h-2.5 animate-pulse text-purple-400" />
                              REINCIDENTE
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block font-mono mt-0.5">
                          Equipo: <strong className="text-slate-200">{t.luno || '-'}</strong>
                        </span>
                      </td>

                      {/* Cliente & Ubicación */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{t.cliente}</span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 truncate max-w-[200px]" title={`${t.localidad} - ${t.direccion}`}>
                          <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          {t.localidad} {t.direccion ? `(${t.direccion})` : ''}
                        </span>
                      </td>

                      {/* Técnico & Zona Técnica (Linked to Zona Local) */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-200 block">{t.tecnico}</span>
                        <div className="flex items-center gap-1 text-[11px] text-amber-400/90 font-medium flex-wrap">
                          <span>{t.zonaTecnica || t.zona}</span>
                          {localZone && (
                            <span className="text-[10px] text-slate-300 bg-slate-950 px-1 rounded border border-slate-800">
                              {localZone}
                            </span>
                          )}
                          {t.region && (
                            <span className="text-[10px] text-slate-400 bg-slate-950 px-1 rounded border border-slate-800">
                              {t.region}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Detalle Falla / Síntoma & LLAMADAS / CALLOUTS */}
                      <td className="py-3 px-4 max-w-[280px]">
                        <p className="text-xs text-slate-200 font-medium truncate" title={t.detalleFalla}>
                          {t.detalleFalla || '-'}
                        </p>

                        {/* CALLOUT: MP PENDIENTE SIN ASIGNAR */}
                        {t.alertaMpSinAsignar && (
                          <div 
                            className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold shadow-sm"
                            title={`Mantenimiento Preventivo pendiente en este equipo (Pedido MP #${t.mpPendienteDetalle?.pedido || '-'}). No fue asignado en la agenda.`}
                          >
                            <Wrench className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            <span>⚠️ MP Pendiente sin asignar</span>
                          </div>
                        )}

                        {/* CALLOUT: ADICIONAL AIEC PENDIENTE EN ESTE EQUIPO */}
                        {t.alertaAdicionalPendiente && (
                          <div 
                            className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold shadow-sm ml-1"
                            title={`Este equipo tiene un llamado Adicional AIEC registrado (Pedido #${t.adicionalDetalle?.pedido || '-'}: ${t.adicionalDetalle?.detalleFalla || ''}).`}
                          >
                            <Pin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                            <span>📌 Adicional AIEC en equipo</span>
                          </div>
                        )}
                      </td>

                      {/* Estado / Móvil & Horario (Without seconds) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            isAIEC ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                            t.estado === 'SEG Asistencia' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                            t.estado === 'SEG Control Final' || t.estado === 'SEG Fin Asistencia' ? 'bg-blue-950 text-blue-300 border border-blue-700' :
                            t.estado === 'SEG Espera' || t.estado === 'SEG Espera Llegada' ? 'bg-purple-950 text-purple-300 border border-purple-700' :
                            t.estado === 'SEG Registrado' ? 'bg-amber-950 text-amber-300 border border-amber-700' :
                            'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {t.estado}
                          </span>

                          {/* Móvil S badge */}
                          {isMovil && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 text-[10px] font-bold"
                              title="Pedido informado al móvil correspondiente del técnico (Columna H = 'S')"
                            >
                              <Smartphone className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Móvil S</span>
                            </span>
                          )}
                        </div>

                        {/* Coordination Time strictly formatted without seconds */}
                        <span className="text-[11px] text-slate-400 block mt-1 font-mono">
                          🕒 {formatTimeClean(t.hCoor ? `${t.fCoorDate || ''} ${t.hCoor}` : t.fechaCoordinada || '09:00')}
                        </span>
                      </td>

                      {/* Stock / Repuesto */}
                      <td className="py-3 px-4">
                        <span className="text-slate-300 font-medium block truncate max-w-[130px]" title={t.repuestos}>
                          {t.repuestos}
                        </span>
                        {t.stock && t.stock !== '-' && t.stock !== '0' && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            Stock #{t.stock}
                          </span>
                        )}
                      </td>

                      {/* Semáforo SLA */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-block text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={`font-black text-xs ${
                              isAIEC ? 'text-cyan-400 font-bold' :
                              isCritical ? 'text-red-400 font-extrabold' :
                              isWarning ? 'text-amber-400' :
                              'text-emerald-400'
                            }`}>
                              {isAIEC ? 'Sin SLA' : `${t.slaPorcentaje}%`}
                            </span>
                            {!isAIEC && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({t.hsSla}h rest.)
                              </span>
                            )}
                          </div>
                          {!isAIEC && (
                            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1 ml-auto">
                              <div
                                className={`h-full rounded-full ${
                                  isCritical ? 'bg-red-500' :
                                  isWarning ? 'bg-amber-500' :
                                  'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(t.slaPorcentaje, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket(t);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-400 transition"
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
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          
          <div className="text-slate-400">
            Mostrando <strong className="text-white font-mono">{filteredTickets.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> a <strong className="text-white font-mono">{Math.min(currentPage * pageSize, filteredTickets.length)}</strong> de <strong className="text-amber-400 font-mono">{filteredTickets.length}</strong> pedidos
          </div>

          {/* Page Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              title="Primera página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono font-semibold">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
