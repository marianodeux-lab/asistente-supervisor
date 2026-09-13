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
  Building2
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
  
  // Cascading Filter States
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedZonaLocal, setSelectedZonaLocal] = useState<string>('ALL');
  const [selectedZona, setSelectedZona] = useState<string>('ALL');
  const [selectedTecnico, setSelectedTecnico] = useState<string>('ALL');
  const [selectedCliente, setSelectedCliente] = useState<string>('ALL');
  const [selectedEstado, setSelectedEstado] = useState<string>('ALL');
  const [specialFilter, setSpecialFilter] = useState<'ALL' | 'SC_PENDIENTES' | 'SC_SIN_ASIGNAR' | 'MP_DEFICIENTE' | 'REINCIDENTE' | 'ASIGNADO_COT' | 'MOVIL_S' | 'MP_PENDIENTE' | 'ADICIONAL_PENDIENTE' | 'AIEC'>('ALL');
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

  const movilSCount = useMemo(() => {
    return tickets.filter(t => t.notificadoMovil || t.m === 'S').length;
  }, [tickets]);

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

  // Exact metrics for SC Pendientes, Asignados COT, and MP Deficiente (< 30 días)
  const scPendientesTotal = useMemo(() => {
    return tickets.filter(t => t.esScVigente).length;
  }, [tickets]);

  const scSinAsignar = scSinCoordinarCount;
  const scAsignados = coordinadosCount;

  const totalAsignadosCOT = useMemo(() => {
    return tickets.filter(t => t.esAsignadoCOT).length;
  }, [tickets]);

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
      if (specialFilter === 'SC_PENDIENTES' && !t.esScVigente) return false;
      if (specialFilter === 'SC_SIN_ASIGNAR' && (!t.esScVigente || !t.alertaSinAsignar)) return false;
      if (specialFilter === 'MP_DEFICIENTE' && !t.esMpDeficiente) return false;
      if (specialFilter === 'MOVIL_S' && !t.notificadoMovil && t.m !== 'S') return false;
      if (specialFilter === 'MP_PENDIENTE' && !t.alertaMpPendiente) return false;
      if (specialFilter === 'ADICIONAL_PENDIENTE' && !t.alertaAdicionalPendiente) return false;
      if (specialFilter === 'REINCIDENTE' && (!t.reincidenciaCount || t.reincidenciaCount <= 0) && !cronicoMap.has(t.luno)) return false;
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        
        {/* CARD 1: TOTAL EN AGENDA (COORDINADOS + SIN COORDINAR SC & AIEC) */}
        <button
          onClick={() => { setSpecialFilter('ALL'); setSlaFilter('ALL'); }}
          className={`p-4 rounded-xl text-left border transition-all ${
            specialFilter === 'ALL' && slaFilter === 'ALL'
              ? 'bg-slate-800 border-amber-500/80 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Total en Agenda</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-black text-white">{coordinadosCount}</p>
            <span className="text-[10px] text-emerald-400 font-bold">coordinados</span>
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] space-y-1">
            {/* SC Sin Coordinar (Riesgo SLA) */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setSpecialFilter('SC_SIN_ASIGNAR');
                setSlaFilter('ALL');
              }}
              className={`flex items-center justify-between px-1.5 py-0.5 rounded cursor-pointer transition ${
                specialFilter === 'SC_SIN_ASIGNAR' ? 'bg-red-500/20 text-red-300 font-bold' : 'text-red-400/90 hover:bg-red-950/40'
              }`}
              title="Filtrar pedidos SC del reporte Pendientes sin coordinar (Riesgo de pagar SLA)"
            >
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                SC Sin Coordinar (Riesgo SLA):
              </span>
              <strong className="text-red-400 font-mono font-black">{scSinCoordinarCount}</strong>
            </div>

            {/* AIEC Sin Coordinar */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setSpecialFilter('AIEC');
                setSlaFilter('ALL');
              }}
              className={`flex items-center justify-between px-1.5 py-0.5 rounded cursor-pointer transition ${
                specialFilter === 'AIEC' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-cyan-400/90 hover:bg-cyan-950/40'
              }`}
              title="Filtrar pedidos AIEC sin coordinar (Sin SLA pero oportuno para aprovechar visita si coincide domicilio)"
            >
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                AIEC Sin Coordinar:
              </span>
              <div className="flex items-center gap-1">
                <strong className="text-cyan-300 font-mono font-bold">{aiecSinCoordinarCount}</strong>
                {aiecMismoDomicilioCount > 0 && (
                  <span className="text-[9px] bg-cyan-950 border border-cyan-700 text-cyan-200 px-1 rounded font-bold" title={`${aiecMismoDomicilioCount} equipo(s) AIEC comparten domicilio con un pedido ya coordinado hoy`}>
                    📍 {aiecMismoDomicilioCount} en mismo dom.
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>

        {/* CARD 2: ASIGNADOS FLOW COT */}
        <button
          onClick={() => { setSpecialFilter('ASIGNADO_COT'); setSlaFilter('ALL'); }}
          className={`p-4 rounded-xl text-left border transition-all ${
            specialFilter === 'ASIGNADO_COT'
              ? 'bg-blue-950/70 border-blue-500 shadow-lg shadow-blue-500/20'
              : 'bg-slate-900/80 border-slate-800 hover:bg-blue-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Asignados COT</span>
            <UserCheck className="w-4 h-4 text-blue-400" />
          </div>
          
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-black text-blue-300">{totalAsignadosCOT}</p>
            <span className="text-[10px] text-slate-400 font-semibold">agenda de campo</span>
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] space-y-0.5 text-slate-300">
            <div className="flex items-center justify-between">
              <span>Distribuidos por COT:</span>
              <span className="text-[10px] text-blue-300 font-mono font-bold">100% Flow</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">Adicionales, MP y SC asignados</p>
          </div>
        </button>

        {/* CARD 3: SLA CRÍTICO / >85% */}
        <button
          onClick={() => { setSlaFilter('CRITICAL'); setSpecialFilter('ALL'); }}
          className={`p-4 rounded-xl text-left border transition-all ${
            slaFilter === 'CRITICAL'
              ? 'bg-red-950/70 border-red-500 shadow-lg shadow-red-500/20'
              : 'bg-slate-900/80 border-slate-800 hover:bg-red-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">SLA Crítico / &gt;85%</span>
            <Flame className="w-4 h-4 text-red-400 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-red-300 mt-1">
            {tickets.filter(t => t.slaPorcentaje >= 85 || t.hsSla <= 2).length}
          </p>
          <span className="text-[10px] text-red-300/80 block mt-1">Riesgo inminente de penalización</span>
        </button>

        {/* CARD 4: RIESGO MP DEFICIENTE (< 30 DÍAS) */}
        <button
          onClick={() => { setSpecialFilter('MP_DEFICIENTE'); setSlaFilter('ALL'); }}
          className={`p-4 rounded-xl text-left border transition-all ${
            specialFilter === 'MP_DEFICIENTE'
              ? 'bg-rose-950/80 border-rose-500 shadow-lg shadow-rose-500/20'
              : 'bg-slate-900/80 border-slate-800 hover:bg-rose-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">🚨 MP Deficiente</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-300 mt-1">
            {mpDeficienteTotal}
          </p>
          <div className="mt-1 text-[10px] text-rose-300/80 leading-tight">
            <span>Falla &lt; 30 días post-preventivo</span>
            <span className="block text-slate-400 mt-0.5">Cruza c/ MP Cerrados</span>
          </div>
        </button>

        {/* CARD 5: EN TÉRMINO <65% */}
        <button
          onClick={() => { setSlaFilter('OK'); setSpecialFilter('ALL'); }}
          className={`p-4 rounded-xl text-left border transition-all ${
            slaFilter === 'OK'
              ? 'bg-emerald-950/70 border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900/80 border-slate-800 hover:bg-emerald-950/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">En Término &lt;65%</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300 mt-1">
            {tickets.filter(t => t.slaPorcentaje < 65).length}
          </p>
          <span className="text-[10px] text-emerald-300/80 block mt-1">Operación en rango óptimo</span>
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
                  onClick={() => handleSelectTecnicoFromCard(item.tecnico)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer group relative overflow-visible ${
                    isOk
                      ? 'bg-slate-950/70 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-950/20'
                      : isPend
                      ? 'bg-slate-950/70 border-amber-500/50 hover:border-amber-400 hover:bg-amber-950/20 ring-1 ring-amber-500/20'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40 opacity-75'
                  }`}
                  title={`Clic para filtrar agenda de ${item.tecnico}`}
                >
                  {/* RICH FLOATING TOOLTIP ON HOVER (Shows exact concept SC, MP, AIEC & details) */}
                  {item.primerPedido && (
                    <div className="absolute left-0 right-0 bottom-[102%] hidden group-hover:block z-50 p-3.5 bg-slate-950 border border-amber-500/70 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 pointer-events-none transition-all duration-200">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            isAiec ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                            isMp ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                            'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {isAiec ? '📌 AIEC (En Contrato)' : isMp ? '🔄 Preventivo (MP)' : '🛠️ Service Call (SC)'}
                          </span>
                          {matchingTicket?.pedido && (
                            <span className="font-mono font-bold text-amber-400">#{matchingTicket.pedido}</span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          🕒 {formatTimeClean(item.primerPedido.horaCoordinada)} hs
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="font-bold text-white text-xs">
                          {item.primerPedido.cliente} <span className="font-mono text-slate-400 font-normal">(ATM {item.primerPedido.luno})</span>
                        </p>
                        {(item.primerPedido.clienteReal || matchingTicket?.clienteReal) && (
                          <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-500/50">
                            <Store className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            <span>Sitio Real: {item.primerPedido.clienteReal || matchingTicket?.clienteReal}</span>
                            {(item.primerPedido.sucursalRelevamiento || matchingTicket?.sucursalRelevamiento) && (
                              <span className="text-amber-200/90 font-normal">
                                ({item.primerPedido.sucursalRelevamiento || matchingTicket?.sucursalRelevamiento})
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-[11px] text-slate-300 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          {item.primerPedido.localidad} - {item.primerPedido.direccion}
                        </p>
                        {matchingTicket?.detalleFalla && (
                          <p className="text-[11px] text-slate-400 italic bg-slate-900/90 p-1.5 rounded border border-slate-800 line-clamp-2">
                            "{matchingTicket.detalleFalla}"
                          </p>
                        )}
                      </div>

                      <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Estado: <strong className="text-emerald-400">{item.primerPedido.estado}</strong></span>
                        {matchingTicket && !isAiec && (
                          <span className="text-amber-300 font-mono font-bold">
                            SLA: {matchingTicket.slaPorcentaje}% ({matchingTicket.hsSla}h rest.)
                          </span>
                        )}
                      </div>

                      {matchingTicket?.esMpDeficiente && (
                        <div className="px-2 py-1 rounded bg-rose-950/90 border border-rose-500/80 text-rose-300 text-[10px] font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400 flex-shrink-0" />
                          <span>🚨 Alerta: MP realizado hace {matchingTicket.diasDesdeUltimoMp} días</span>
                        </div>
                      )}
                    </div>
                  )}

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

                  {/* Body: First Scheduled Ticket Details (Hours formatted cleanly without seconds + Concept Badge) */}
                  {item.primerPedido ? (
                    <div className="space-y-1 text-[11px] bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                      <div className="flex items-center justify-between text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold flex items-center gap-1 text-amber-300">
                            <Clock className="w-3 h-3 text-amber-400" />
                            1° Coord: {formatTimeClean(item.primerPedido.horaCoordinada)}
                          </span>
                          <span className={`px-1 py-0.2 rounded font-bold text-[9px] uppercase ${
                            isAiec ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                            isMp ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                            'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {concept}
                          </span>
                        </div>
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

                      {(item.primerPedido.clienteReal || matchingTicket?.clienteReal) && (
                        <p className="text-[10px] text-amber-300 font-bold truncate flex items-center gap-1" title={`Sitio Real: ${item.primerPedido.clienteReal || matchingTicket?.clienteReal}`}>
                          <Store className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                          <span>Sitio: {item.primerPedido.clienteReal || matchingTicket?.clienteReal}</span>
                        </p>
                      )}
                      
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
            <div className="flex flex-wrap items-center bg-slate-950 border border-slate-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => { setDateFilter('HOY_Y_MANANA'); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  dateFilter === 'HOY_Y_MANANA'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title={`Ver pedidos coordinados para hoy (${todayStr}) y mañana (${tomorrowStr})`}
              >
                <span>📅 Hoy + Mañana</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  dateFilter === 'HOY_Y_MANANA' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {hoyYMananaCount}
                </span>
              </button>

              <button
                onClick={() => { setDateFilter('HOY'); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  dateFilter === 'HOY'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title={`Ver pedidos coordinados únicamente para hoy (${todayStr})`}
              >
                <span>🕒 Hoy ({todayStr})</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  dateFilter === 'HOY' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {hoyCount}
                </span>
              </button>

              <button
                onClick={() => { setDateFilter('MANANA'); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  dateFilter === 'MANANA'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title={`Ver pedidos coordinados para el día siguiente (${tomorrowStr})`}
              >
                <span>☀️ Mañana ({tomorrowStr})</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  dateFilter === 'MANANA' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {mananaCount}
                </span>
              </button>

              <button
                onClick={() => { setDateFilter('TODOS'); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  dateFilter === 'TODOS'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title="Ver todos los pedidos sin filtro de fecha"
              >
                <span>📋 Todos</span>
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
      <div id="agenda-table-section" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        
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
            <tbody className="divide-y divide-slate-800/60">
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
                      className="hover:bg-slate-800/60 transition cursor-pointer group"
                    >
                      {/* 1. Días última atención & R */}
                      <td className="py-3 px-4 font-medium whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-slate-200 block">
                            {t.diasDesdeUltimaAtencion || t.diasUltimaAtencion || '1 día'}
                          </span>
                          {((t.reincidenciaCount && t.reincidenciaCount > 0) || cronico) && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/60 text-purple-300 font-bold text-[10px] shadow-sm"
                              title={`Reincidencias registradas en equipo (R = ${t.reincidenciaCount || (cronico ? cronico.totalFallas : 1)})`}
                            >
                              <RotateCcw className="w-2.5 h-2.5 text-purple-400" />
                              R: {t.reincidenciaCount || (cronico ? cronico.totalFallas : 1)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Pedido / Equipo & MP */}
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
                              CRÓNICO
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>Eq: <strong className="text-slate-200">{t.luno || '-'}</strong></span>
                        </div>
                        {/* MP Cerrados Detection: Alerta de MP Deficiente (<30d) vs MP OK (>30d) */}
                        {t.esMpDeficiente ? (
                          <div 
                            className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-950/90 border border-red-500/80 text-red-300 text-[10px] font-bold shadow-sm"
                            title={`¡Alerta de Calidad! Este equipo tuvo un Mantenimiento Preventivo cerrado hace solo ${t.diasDesdeUltimoMp ?? '<30'} días (${t.ultimoMpFecha || ''}${t.tecnicoUltimoMp ? ` por ${t.tecnicoUltimoMp}` : ''}). Falla prematura post-MP.`}
                          >
                            <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 animate-bounce" />
                            <span>🚨 MP Deficiente ({t.diasDesdeUltimoMp ?? '<30'}d)</span>
                          </div>
                        ) : t.ultimoMpFecha ? (
                          <div 
                            className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 text-[10px] font-medium"
                            title={`Último MP cerrado el ${t.ultimoMpFecha}${t.diasDesdeUltimoMp ? ` (hace ${t.diasDesdeUltimoMp} días)` : ''}${t.tecnicoUltimoMp ? ` por ${t.tecnicoUltimoMp}` : ''}`}
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                            <span>MP {t.ultimoMpFecha}</span>
                          </div>
                        ) : null}
                      </td>

                      {/* 3. Cliente & Ubicación */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{t.cliente}</span>
                        {t.clienteReal && (
                          <div 
                            className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold"
                            title={`Relevamiento Cash Today: El cliente comercial y sucursal a relevar es ${t.clienteReal}${t.sucursalRelevamiento ? ` (${t.sucursalRelevamiento})` : ''}`}
                          >
                            <Store className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">Sitio Real: {t.clienteReal}</span>
                            {t.sucursalRelevamiento && <span className="text-amber-200/90 font-normal">({t.sucursalRelevamiento})</span>}
                          </div>
                        )}
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 truncate max-w-[200px]" title={`${t.localidad} - ${t.direccion}`}>
                          <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          {t.localidad} {t.direccion ? `(${t.direccion})` : ''}
                        </span>
                      </td>

                      {/* 4. Técnico & Coordinación */}
                      <td className="py-3 px-4">
                        {isSinAsignar ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950 border border-red-500 text-red-300 font-bold text-[11px] shadow-sm animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                              🚨 SIN COORDINAR / Riesgo SLA
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Reporte: <strong className="text-amber-400">{t.origenReporte || 'Pendientes'}</strong> • Zona {t.zonaTecnica || t.zona}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-100">{t.tecnico}</span>
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 text-[9px] font-bold">
                                ✓ Coordinado
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-amber-400/90 font-medium flex-wrap mt-0.5">
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
                          </div>
                        )}
                      </td>

                      {/* 5. Detalle Falla & Alertas */}
                      <td className="py-3 px-4 max-w-[280px]">
                        <p className="text-xs text-slate-200 font-medium truncate" title={t.detalleFalla}>
                          {t.detalleFalla || '-'}
                        </p>

                        {/* CALLOUT: AIEC comparte mismo domicilio con pedido coordinado */}
                        {sharesAddressWithCoordinated && (
                          <div 
                            className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold shadow-sm"
                            title="Existe otro pedido coordinado en este mismo domicilio. Se recomienda aprovechar la visita del técnico para realizar el AIEC sin incurrir en traslados adicionales."
                          >
                            <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            <span>📍 Mismo dom. coordinado (Aprovechar visita)</span>
                          </div>
                        )}

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

                      {/* 6. Estado / Móvil & Horario (Without seconds) */}
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

                      {/* 7. Stock / Repuesto */}
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

                      {/* 8. Semáforo SLA */}
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

                      {/* 9. Action */}
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
