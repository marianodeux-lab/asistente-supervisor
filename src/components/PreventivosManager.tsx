import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Calendar, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Download, 
  MapPin, 
  Clock, 
  Sliders, 
  AlertTriangle, 
  Zap, 
  Radio, 
  ChevronRight, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  X, 
  Send, 
  ShieldAlert, 
  Layers, 
  Info,
  Building,
  UserCheck
} from 'lucide-react';
import { PreventivosState, ZonaInfo, CtdDemoradoItem } from '../types';

interface PreventivosManagerProps {
  preventivos: PreventivosState;
  zonas: ZonaInfo[];
  ctdDemorados?: CtdDemoradoItem[];
}

// Working days calculator (Monday to Friday, optionally Saturday)
export function calcularDiasHabiles(fechaInicioStr: string, fechaFinStr: string, incluirSabados: boolean = false): number {
  const inicio = new Date(fechaInicioStr + 'T00:00:00');
  const fin = new Date(fechaFinStr + 'T00:00:00');
  
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin < inicio) return 0;
  
  let count = 0;
  let cur = new Date(inicio);
  
  while (cur <= fin) {
    const dayOfWeek = cur.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      count++;
    } else if (dayOfWeek === 6 && incluirSabados) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  
  return count;
}

export const PreventivosManager: React.FC<PreventivosManagerProps> = ({
  preventivos,
  zonas,
  ctdDemorados = []
}) => {
  // Navigation sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'matriz_preventivos' | 'radar_ctd_demorados'>('matriz_preventivos');

  // Dynamic Deadlines Settings (ATM Semestral vs CTD Trimestral)
  const fechaOperativaHoy = '2026-09-07';
  const [deadlineAtm, setDeadlineAtm] = useState<string>('2026-09-30'); // Default fin de ciclo actual
  const [deadlineCtd, setDeadlineCtd] = useState<string>('2026-09-30'); // Default fin de Q3
  const [incluirSabados, setIncluirSabados] = useState<boolean>(false); // False by default per supervisor rule

  // Filters for Pending MP
  const [search, setSearch] = useState('');
  const [selectedZona, setSelectedZona] = useState<string>('ALL');
  const [selectedNegocio, setSelectedNegocio] = useState<string>('ALL');
  const [pageSizeMp, setPageSizeMp] = useState<number>(40);
  const [currentPageMp, setCurrentPageMp] = useState<number>(1);

  // Filters for CTD Demorados Radar
  const [searchCtd, setSearchCtd] = useState('');
  const [selectedZonaCtd, setSelectedZonaCtd] = useState<string>('ALL');
  const [criticidadCtd, setCriticidadCtd] = useState<'ALL' | 'CRÍTICO' | 'ADVERTENCIA'>('ALL');
  const [pageSizeCtd, setPageSizeCtd] = useState<number>(40);
  const [currentPageCtd, setCurrentPageCtd] = useState<number>(1);

  // Modal for Forcing MP on CTD
  const [selectedForzarCtd, setSelectedForzarCtd] = useState<CtdDemoradoItem | null>(null);
  const [notaForzar, setNotaForzar] = useState<string>('');
  const [prioridadForzar, setPrioridadForzar] = useState<'ALTA' | 'URGENTE_24H' | 'RUTEO_SEMANAL'>('ALTA');
  const [forzadosList, setForzadosList] = useState<Set<string>>(new Set());
  const [notifSuccess, setNotifSuccess] = useState<string | null>(null);

  // Dynamic Working Days Calculations
  const diasHabilesAtm = useMemo(() => {
    return calcularDiasHabiles(fechaOperativaHoy, deadlineAtm, incluirSabados);
  }, [fechaOperativaHoy, deadlineAtm, incluirSabados]);

  const diasHabilesCtd = useMemo(() => {
    return calcularDiasHabiles(fechaOperativaHoy, deadlineCtd, incluirSabados);
  }, [fechaOperativaHoy, deadlineCtd, incluirSabados]);

  // Breakdown of Pendings: ATM vs CTD
  const totalPendientesAtm = useMemo(() => {
    return preventivos.pendientesDetalle.filter(p => p.negocio === 'ATM').length;
  }, [preventivos.pendientesDetalle]);

  const totalPendientesCtd = useMemo(() => {
    return preventivos.pendientesDetalle.filter(p => p.negocio !== 'ATM').length;
  }, [preventivos.pendientesDetalle]);

  // Dynamic Required Paces
  const ritmoDiarioAtm = useMemo(() => {
    if (diasHabilesAtm <= 0) return 0;
    return parseFloat((totalPendientesAtm / diasHabilesAtm).toFixed(1));
  }, [totalPendientesAtm, diasHabilesAtm]);

  const ritmoDiarioCtd = useMemo(() => {
    if (diasHabilesCtd <= 0) return 0;
    return parseFloat((totalPendientesCtd / diasHabilesCtd).toFixed(1));
  }, [totalPendientesCtd, diasHabilesCtd]);

  const ritmoDiarioGlobal = useMemo(() => {
    return parseFloat((ritmoDiarioAtm + ritmoDiarioCtd).toFixed(1));
  }, [ritmoDiarioAtm, ritmoDiarioCtd]);

  // Filter pending MP list
  const filteredPendientes = useMemo(() => {
    return preventivos.pendientesDetalle.filter(p => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const match = 
          p.pedido.toLowerCase().includes(query) ||
          p.cliente.toLowerCase().includes(query) ||
          p.luno.toLowerCase().includes(query) ||
          p.localidad.toLowerCase().includes(query) ||
          p.tecnico.toLowerCase().includes(query);
        if (!match) return false;
      }
      if (selectedZona !== 'ALL' && p.zona !== selectedZona) return false;
      if (selectedNegocio !== 'ALL' && p.negocio !== selectedNegocio) return false;
      return true;
    });
  }, [preventivos.pendientesDetalle, search, selectedZona, selectedNegocio]);

  // Paginated MP Pendientes
  const totalPagesMp = Math.ceil(filteredPendientes.length / pageSizeMp) || 1;
  const paginatedPendientes = useMemo(() => {
    const start = (currentPageMp - 1) * pageSizeMp;
    return filteredPendientes.slice(start, start + pageSizeMp);
  }, [filteredPendientes, currentPageMp, pageSizeMp]);

  // Filter CTD Demorados List
  const filteredCtdDemorados = useMemo(() => {
    return ctdDemorados.filter(c => {
      if (searchCtd.trim()) {
        const q = searchCtd.toLowerCase();
        const match = 
          c.luno.toLowerCase().includes(q) ||
          c.cliente.toLowerCase().includes(q) ||
          c.localidad.toLowerCase().includes(q) ||
          c.tecnico.toLowerCase().includes(q) ||
          c.modelo.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedZonaCtd !== 'ALL' && c.zona !== selectedZonaCtd) return false;
      if (criticidadCtd !== 'ALL' && c.criticidad !== criticidadCtd) return false;
      return true;
    });
  }, [ctdDemorados, searchCtd, selectedZonaCtd, criticidadCtd]);

  // Paginated CTD Demorados
  const totalPagesCtd = Math.ceil(filteredCtdDemorados.length / pageSizeCtd) || 1;
  const paginatedCtdDemorados = useMemo(() => {
    const start = (currentPageCtd - 1) * pageSizeCtd;
    return filteredCtdDemorados.slice(start, start + pageSizeCtd);
  }, [filteredCtdDemorados, currentPageCtd, pageSizeCtd]);

  const totalCtdCriticos = useMemo(() => {
    return ctdDemorados.filter(c => c.criticidad === 'CRÍTICO').length;
  }, [ctdDemorados]);

  const totalCtdAdvertencia = useMemo(() => {
    return ctdDemorados.filter(c => c.criticidad === 'ADVERTENCIA').length;
  }, [ctdDemorados]);

  const cumplimientoGlobal = Math.round((preventivos.totalRealizados / (preventivos.totalRealizados + preventivos.totalPendientes)) * 100);

  // Export CSV for Pending MP
  const handleExportCSV = () => {
    const headers = ["Pedido", "Cliente", "Equipo", "Zona", "Localidad", "Direccion", "Tecnico", "Modelo", "Negocio", "Fabricante"];
    const rows = filteredPendientes.map(p => [
      p.pedido,
      `"${p.cliente}"`,
      p.luno,
      p.zona,
      `"${p.localidad}"`,
      `"${p.direccion}"`,
      `"${p.tecnico}"`,
      `"${p.modelo}"`,
      p.negocio,
      p.fabricante
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mp_pendientes_patagonia_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV for CTD Demorados Radar
  const handleExportCtdCSV = () => {
    const headers = ["Equipo", "Cliente", "Localidad", "Direccion", "Zona", "Tecnico", "Modelo CTD", "Ultimo MP", "Dias Sin MP", "Meses Sin MP", "Criticidad", "Motivo"];
    const rows = filteredCtdDemorados.map(c => [
      c.luno,
      `"${c.cliente}"`,
      `"${c.localidad}"`,
      `"${c.direccion}"`,
      c.zona,
      `"${c.tecnico}"`,
      `"${c.modelo}"`,
      c.ultimoMtmFecha,
      c.diasSinMtm,
      c.mesesSinMtm,
      c.criticidad,
      `"${c.motivo}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `radar_ctd_demorados_mas_5_meses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Confirm Forcing MP
  const handleConfirmForzarMp = () => {
    if (!selectedForzarCtd) return;
    setForzadosList(prev => new Set(prev).add(selectedForzarCtd.luno));
    setNotifSuccess(`¡Orden de Preventivo Forzada generada con éxito para el Equipo ${selectedForzarCtd.luno} (${selectedForzarCtd.cliente})! Se envió la instrucción prioritaria al ruteo de ${selectedForzarCtd.tecnico}.`);
    setSelectedForzarCtd(null);
    setNotaForzar('');
    setTimeout(() => setNotifSuccess(null), 6000);
  };

  return (
    <div className="space-y-6">
      
      {/* Sub-Tabs Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('matriz_preventivos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'matriz_preventivos'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Control de Preventivos & Ritmo Diario</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-950/40 text-[11px] font-mono">
              {preventivos.totalPendientes}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('radar_ctd_demorados')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
              activeSubTab === 'radar_ctd_demorados'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                : 'bg-slate-900 text-red-400 hover:bg-red-950/40 hover:text-red-300 border border-red-500/30'
            }`}
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Radar Crítico CTD (&gt;5 Meses sin MP)</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full bg-red-950 text-red-200 border border-red-500 text-[11px] font-mono font-bold">
              {ctdDemorados.length} en riesgo
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Fecha base de cálculo: <strong>7 de Septiembre 2026</strong></span>
        </div>
      </div>

      {/* Success Notification Alert */}
      {notifSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold leading-relaxed">{notifSuccess}</span>
          </div>
          <button
            onClick={() => setNotifSuccess(null)}
            className="p-1 rounded-lg hover:bg-emerald-900/60 text-emerald-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUB-TAB 1: MATRIZ DE PREVENTIVOS & RITMO DIARIO */}
      {activeSubTab === 'matriz_preventivos' && (
        <div className="space-y-6">

          {/* DYNAMIC DEADLINES & WORKING DAYS SETTINGS PANEL */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 shadow-2xl space-y-4">
            
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Panel de Seteos Dinámicos: Fechas Límite & Ritmo Hábil de Preventivos
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configura la fecha límite para el ciclo de <strong>ATM (Semestral)</strong> y <strong>Cash Today (Trimestral)</strong> para recalcular los días hábiles y el ritmo diario necesario.
                  </p>
                </div>
              </div>

              {/* Saturday Toggle */}
              <label className="flex items-center gap-2.5 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer text-xs flex-shrink-0">
                <input
                  type="checkbox"
                  checked={incluirSabados}
                  onChange={(e) => setIncluirSabados(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-slate-900 focus:ring-amber-500"
                />
                <span className="text-slate-300 font-medium">
                  Incluir Sábados de guardia en el cálculo
                </span>
              </label>
            </div>

            {/* Saturday Operating Rule Notice */}
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-start gap-2 text-xs text-blue-200">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Regla de Supervisión:</strong> Los técnicos trabajan de <strong>Lunes a Viernes</strong>. Las zonas <em>Atlántica, Centro, La Pampa y Suroeste</em> disponen de guardias los sábados para emergencias de SLA, pero por política se evita coordinar rutinas de MP los fines de semana salvo contingencia.
              </span>
            </div>

            {/* Two Column Dynamic Date Pickers (ATM vs CTD) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              
              {/* ATM Setting */}
              <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/30 space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                      Fecha Límite ATM (Ciclo Semestral)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                    {diasHabilesAtm} días hábiles
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={deadlineAtm}
                    onChange={(e) => setDeadlineAtm(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 py-1.5 px-3 focus:outline-none focus:border-blue-500 w-full font-mono cursor-pointer"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-slate-400">Presets:</span>
                  <button
                    onClick={() => setDeadlineAtm('2026-09-30')}
                    className={`px-2 py-0.5 rounded border transition ${deadlineAtm === '2026-09-30' ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'}`}
                  >
                    30/09 (Fin Q3)
                  </button>
                  <button
                    onClick={() => setDeadlineAtm('2026-10-31')}
                    className={`px-2 py-0.5 rounded border transition ${deadlineAtm === '2026-10-31' ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'}`}
                  >
                    31/10 (Mes Prox)
                  </button>
                  <button
                    onClick={() => setDeadlineAtm('2026-12-31')}
                    className={`px-2 py-0.5 rounded border transition ${deadlineAtm === '2026-12-31' ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'}`}
                  >
                    31/12 (Fin Semestre)
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 pt-0.5">
                  Pendientes ATM: <strong className="text-white font-mono">{totalPendientesAtm}</strong> • Ritmo necesario: <strong className="text-blue-400 font-mono">{ritmoDiarioAtm} / día</strong>
                </p>
              </div>

              {/* Cash Today (CTD) Setting */}
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      Fecha Límite Cash Today (Ciclo Trimestral)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    {diasHabilesCtd} días hábiles
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={deadlineCtd}
                    onChange={(e) => setDeadlineCtd(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 py-1.5 px-3 focus:outline-none focus:border-emerald-500 w-full font-mono cursor-pointer"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-slate-400">Presets:</span>
                  <button
                    onClick={() => setDeadlineCtd('2026-09-30')}
                    className={`px-2 py-0.5 rounded border transition ${deadlineCtd === '2026-09-30' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'}`}
                  >
                    30/09 (Fin Trimestre)
                  </button>
                  <button
                    onClick={() => setDeadlineCtd('2026-10-31')}
                    className={`px-2 py-0.5 rounded border transition ${deadlineCtd === '2026-10-31' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'}`}
                  >
                    31/10 (Extension +1m)
                  </button>
                  <button
                    onClick={() => setDeadlineCtd('2026-11-30')}
                    className={`px-2 py-0.5 rounded border transition ${deadlineCtd === '2026-11-30' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'}`}
                  >
                    30/11 (Cierre Ciclo)
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 pt-0.5">
                  Pendientes CTD: <strong className="text-white font-mono">{totalPendientesCtd}</strong> • Ritmo necesario: <strong className="text-emerald-400 font-mono">{ritmoDiarioCtd} / día</strong>
                </p>
              </div>

            </div>

          </div>

          {/* Dynamic Top Goals & Calculations Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Pendientes */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">MP Pendientes Totales</span>
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-3xl font-black text-white mt-1">{preventivos.totalPendientes}</p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                <span className="text-blue-400 font-semibold">{totalPendientesAtm} ATM</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{totalPendientesCtd} CTD</span>
              </div>
            </div>

            {/* Total Realizados */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">MP Completados</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-black text-emerald-300 mt-1">{preventivos.totalRealizados}</p>
              <span className="text-[11px] text-emerald-400/80">Avance global {cumplimientoGlobal}%</span>
            </div>

            {/* Días Hábiles Restantes */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Ventana Hábil</span>
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-3xl font-black text-blue-300 mt-1">
                {Math.min(diasHabilesAtm, diasHabilesCtd)} <span className="text-base font-normal text-slate-400">días</span>
              </p>
              <span className="text-[11px] text-slate-400">
                {incluirSabados ? 'Lu a Sá incluido' : 'Lunes a Viernes estricto'}
              </span>
            </div>

            {/* Ritmo Diario Requerido Global */}
            <div className="bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/50 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Ritmo Global Requerido</span>
                <Target className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              <p className="text-3xl font-black text-amber-300 mt-1">{ritmoDiarioGlobal} <span className="text-sm font-normal text-amber-200">/ día</span></p>
              <span className="text-[11px] text-amber-300/80">
                ({ritmoDiarioAtm} ATM + {ritmoDiarioCtd} CTD diarios)
              </span>
            </div>

          </div>

          {/* Zonal Progress Grid with Dynamic Daily Pace */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Matriz de Cumplimiento de Preventivos por Zona</h3>
              </div>
              <span className="text-xs text-slate-400">Progreso vs Meta Zonal (Ritmo hábil recalculado)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {preventivos.porZona.map((z) => {
                const isBehind = z.cumplimiento < 60;
                // Recalculate daily pace based on dynamic working days
                const maxDias = Math.max(1, Math.min(diasHabilesAtm, diasHabilesCtd));
                const ritmoZonalDinámico = (z.pendientes / maxDias).toFixed(1);

                return (
                  <div
                    key={z.zona}
                    className="bg-slate-950 p-4 rounded-xl border border-slate-800/90 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">Zona {z.zona}</h4>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isBehind ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {z.cumplimiento}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isBehind ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(z.cumplimiento, 100)}%` }}
                      />
                    </div>

                    {/* Metrics detail */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-slate-400 block">Realizados:</span>
                        <strong className="text-emerald-400">{z.realizados}</strong> / {z.meta}
                      </div>
                      <div>
                        <span className="text-slate-400 block">Pendientes:</span>
                        <strong className="text-amber-400">{z.pendientes}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Base ATM / CTD:</span>
                        <span className="text-slate-200">{z.baseAtm} ATM / {z.baseCtd} CTD</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Ritmo Calculado:</span>
                        <strong className="text-blue-400">{ritmoZonalDinámico} / día</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending MP Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            
            {/* Table Header & Controls */}
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <h3 className="text-sm font-bold text-white">Detalle de Preventivos Pendientes</h3>
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-semibold">
                  {filteredPendientes.length} pendientes
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPageMp(1); }}
                  placeholder="Buscar por Pedido, Equipo, Localidad..."
                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 py-1.5 px-2.5 focus:outline-none focus:border-amber-500 w-full sm:w-48"
                />

                <select
                  value={selectedZona}
                  onChange={(e) => { setSelectedZona(e.target.value); setCurrentPageMp(1); }}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Todas las Zonas</option>
                  {zonas.map(z => (
                    <option key={z.id} value={z.id}>{z.nombre}</option>
                  ))}
                </select>

                <select
                  value={selectedNegocio}
                  onChange={(e) => { setSelectedNegocio(e.target.value); setCurrentPageMp(1); }}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Todos los Negocios (ATM + Cash Today)</option>
                  <option value="ATM">ATM (Bancarios & Red Orus)</option>
                  <option value="CASH TODAY">Cash Today (CTD - Retail)</option>
                </select>

                {/* Page size selector */}
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden p-0.5">
                  {[20, 40, 100, 200].map(sz => (
                    <button
                      key={sz}
                      onClick={() => { setPageSizeMp(sz); setCurrentPageMp(1); }}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded transition ${
                        pageSizeMp === sz
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition"
                  title="Descargar lista de preventivos pendientes"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>CSV</span>
                </button>

              </div>

            </div>

            {/* Table list */}
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-950 z-10">
                  <tr className="text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800/80">
                    <th className="py-2.5 px-4">Pedido / Equipo</th>
                    <th className="py-2.5 px-4">Cliente</th>
                    <th className="py-2.5 px-4">Localidad / Dirección</th>
                    <th className="py-2.5 px-4">Técnico & Zona</th>
                    <th className="py-2.5 px-4">Modelo / Fabricante</th>
                    <th className="py-2.5 px-4">Negocio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedPendientes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No se encontraron preventivos pendientes con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    paginatedPendientes.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50 transition">
                        <td className="py-2.5 px-4 font-mono font-bold text-amber-400">
                          #{p.pedido}
                          <span className="text-[11px] text-slate-400 block">Equipo: {p.luno}</span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-white">{p.cliente}</td>
                        <td className="py-2.5 px-4 text-slate-300">
                          <span className="block font-medium">{p.localidad}</span>
                          <span className="text-[11px] text-slate-400 truncate max-w-xs block">{p.direccion}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-slate-200 font-medium block">{p.tecnico}</span>
                          <span className="text-[11px] text-amber-400">Zona {p.zona}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-300">
                          <span className="block font-medium">{p.modelo}</span>
                          <span className="text-[11px] text-slate-400">{p.fabricante}</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.negocio === 'ATM' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {p.negocio}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-400">
                Mostrando <strong className="text-white font-mono">{filteredPendientes.length === 0 ? 0 : (currentPageMp - 1) * pageSizeMp + 1}</strong> a <strong className="text-white font-mono">{Math.min(currentPageMp * pageSizeMp, filteredPendientes.length)}</strong> de <strong className="text-amber-400 font-mono">{filteredPendientes.length}</strong> preventivos
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPageMp(1)}
                  disabled={currentPageMp === 1}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPageMp(prev => Math.max(prev - 1, 1))}
                  disabled={currentPageMp === 1}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono font-semibold">
                  Página {currentPageMp} de {totalPagesMp}
                </span>
                <button
                  onClick={() => setCurrentPageMp(prev => Math.min(prev + 1, totalPagesMp))}
                  disabled={currentPageMp === totalPagesMp}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPageMp(totalPagesMp)}
                  disabled={currentPageMp === totalPagesMp}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUB-TAB 2: RADAR CRÍTICO CTD (>5 MESES SIN MP - FORZAR VISITA) */}
      {activeSubTab === 'radar_ctd_demorados' && (
        <div className="space-y-6">

          {/* Explanatory Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/70 via-slate-900 to-slate-950 border border-red-500/40 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 mt-0.5">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Radar de Cobertura Crítica Cash Today (Equipos con &gt;5 Meses sin MP)
                  <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-2.5 py-0.5 rounded-full border border-red-500/30">
                    Alerta de Cobertura
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
                  En <strong>Cash Today (CTD)</strong> los preventivos se abren cada 3 meses priorizando equipos de alto volumen transaccional. Aquellos equipos que han superado los <strong>5 meses (150+ días)</strong> sin visita preventiva quedan bajo este radar prioritario para <strong>forzar la asignación de un MP</strong> antes de que sufran fallas operativas o atascos de efectivo.
                </p>
              </div>
            </div>

            <button
              onClick={handleExportCtdCSV}
              className="flex items-center gap-1.5 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/50 px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0"
            >
              <Download className="w-4 h-4 text-red-400" />
              <span>Exportar Radar CTD</span>
            </button>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-gradient-to-br from-red-950/60 to-slate-900 border border-red-500/40 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-300">Equipos CTD Críticos (&gt;6m)</span>
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-3xl font-black text-white mt-1">{totalCtdCriticos}</p>
              <span className="text-[11px] text-red-300/80">Más de 180 días sin MP</span>
            </div>

            <div className="bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/40 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">En Advertencia (5 a 6m)</span>
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-3xl font-black text-white mt-1">{totalCtdAdvertencia}</p>
              <span className="text-[11px] text-amber-300/80">150 a 180 días sin visita</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Total en Radar CTD</span>
                <Layers className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-black text-purple-300 mt-1">{ctdDemorados.length}</p>
              <span className="text-[11px] text-slate-400">Equipos con cobertura vencida</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">MP Forzados en Sesión</span>
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-3xl font-black text-emerald-300 mt-1">{forzadosList.size}</p>
              <span className="text-[11px] text-emerald-400/80">Órdenes prioritarias enviadas</span>
            </div>

          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchCtd}
                onChange={(e) => setSearchCtd(e.target.value)}
                placeholder="Buscar por Equipo, Cliente, Modelo o Técnico..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              
              <select
                value={selectedZonaCtd}
                onChange={(e) => { setSelectedZonaCtd(e.target.value); setCurrentPageCtd(1); }}
                className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-3 focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="ALL">Todas las Zonas</option>
                {zonas.map(z => (
                  <option key={z.id} value={z.id}>{z.nombre}</option>
                ))}
              </select>

              <select
                value={criticidadCtd}
                onChange={(e: any) => { setCriticidadCtd(e.target.value); setCurrentPageCtd(1); }}
                className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-3 focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="ALL">Todos los Niveles</option>
                <option value="CRÍTICO">Solo Críticos (&gt;6 meses)</option>
                <option value="ADVERTENCIA">Solo Advertencia (5 a 6 meses)</option>
              </select>

              {/* Page size selector */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden p-0.5">
                {[20, 40, 100, 200].map(sz => (
                  <button
                    key={sz}
                    onClick={() => { setPageSizeCtd(sz); setCurrentPageCtd(1); }}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded transition ${
                      pageSizeCtd === sz
                        ? 'bg-red-600 text-white shadow'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>

            </div>

          </div>

          {/* Overdue CTD Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                Listado de Equipos Cash Today con Demora Severa de MP
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {filteredCtdDemorados.length} equipos en radar
              </span>
            </div>

            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-950 z-10">
                  <tr className="text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800/80">
                    <th className="py-3 px-4">Equipo / Modelo</th>
                    <th className="py-3 px-4">Cliente / Ubicación</th>
                    <th className="py-3 px-4">Técnico & Zona</th>
                    <th className="py-3 px-4 text-center">Último MP</th>
                    <th className="py-3 px-4 text-center">Tiempo sin MP</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Acción de Supervisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedCtdDemorados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No se encontraron equipos CTD demorados con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    paginatedCtdDemorados.map((c) => {
                      const isForzado = forzadosList.has(c.luno);
                      const isCritico = c.criticidad === 'CRÍTICO';

                      return (
                        <tr
                          key={c.luno}
                          className={`hover:bg-slate-800/50 transition ${isCritico ? 'bg-red-950/10' : ''}`}
                        >
                          {/* Equipo / Modelo */}
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-amber-400 block text-sm">
                              Equipo {c.luno}
                            </span>
                            <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-medium inline-block mt-0.5">
                              {c.modelo}
                            </span>
                          </td>

                          {/* Cliente / Ubicación */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block">{c.cliente}</span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              {c.localidad} {c.direccion ? `• ${c.direccion}` : ''}
                            </span>
                          </td>

                          {/* Técnico & Zona */}
                          <td className="py-3 px-4">
                            <span className="text-slate-200 font-medium block">{c.tecnico}</span>
                            <span className="text-[11px] text-amber-400/90 font-semibold">
                              Zona {c.zona}
                            </span>
                          </td>

                          {/* Último MP */}
                          <td className="py-3 px-4 text-center font-mono text-slate-300">
                            {c.ultimoMtmFecha || 'Sin registro'}
                          </td>

                          {/* Días / Meses sin MP */}
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs inline-block ${
                              isCritico 
                                ? 'bg-red-950 text-red-300 border border-red-600' 
                                : 'bg-amber-950 text-amber-300 border border-amber-600'
                            }`}>
                              {c.mesesSinMtm} meses ({c.diasSinMtm} días)
                            </span>
                          </td>

                          {/* Estado */}
                          <td className="py-3 px-4 text-center">
                            {isForzado ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500 flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> FORZADO
                              </span>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isCritico 
                                  ? 'bg-red-600 text-white shadow-sm' 
                                  : 'bg-amber-600 text-white'
                              }`}>
                                {c.criticidad}
                              </span>
                            )}
                          </td>

                          {/* Acción */}
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => setSelectedForzarCtd(c)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto ${
                                isForzado 
                                  ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white' 
                                  : 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-md'
                              }`}
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>{isForzado ? 'Re-programar MP' : 'Forzar Visita MP'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* CTD Pagination Footer */}
            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-400">
                Mostrando <strong className="text-white font-mono">{filteredCtdDemorados.length === 0 ? 0 : (currentPageCtd - 1) * pageSizeCtd + 1}</strong> a <strong className="text-white font-mono">{Math.min(currentPageCtd * pageSizeCtd, filteredCtdDemorados.length)}</strong> de <strong className="text-red-400 font-mono">{filteredCtdDemorados.length}</strong> equipos en radar
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPageCtd(1)}
                  disabled={currentPageCtd === 1}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPageCtd(prev => Math.max(prev - 1, 1))}
                  disabled={currentPageCtd === 1}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono font-semibold">
                  Página {currentPageCtd} de {totalPagesCtd}
                </span>
                <button
                  onClick={() => setCurrentPageCtd(prev => Math.min(prev + 1, totalPagesCtd))}
                  disabled={currentPageCtd === totalPagesCtd}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPageCtd(totalPagesCtd)}
                  disabled={currentPageCtd === totalPagesCtd}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* MODAL: FORZAR VISITA DE PREVENTIVO CTD */}
      {selectedForzarCtd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 space-y-4 p-6">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-white">
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Forzar Orden de Mantenimiento Preventivo (CTD)</h3>
                  <p className="text-xs text-slate-400">Equipo {selectedForzarCtd.luno} • {selectedForzarCtd.cliente}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedForzarCtd(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Card */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block">Cliente:</span>
                  <strong className="text-white text-sm">{selectedForzarCtd.cliente}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Modelo CTD:</span>
                  <strong className="text-amber-400 font-mono">{selectedForzarCtd.modelo}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Técnico Asignado:</span>
                  <strong className="text-slate-200">{selectedForzarCtd.tecnico} ({selectedForzarCtd.zona})</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Demora Acumulada:</span>
                  <strong className="text-red-400 font-mono text-sm">{selectedForzarCtd.mesesSinMtm} meses ({selectedForzarCtd.diasSinMtm} días)</strong>
                </div>
              </div>
              <div className="pt-1 border-t border-slate-800">
                <span className="text-slate-400">Ubicación: </span>
                <span className="text-slate-300">{selectedForzarCtd.localidad} - {selectedForzarCtd.direccion || 'Domicilio comercial'}</span>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Nivel de Prioridad en Ruteo:
                </label>
                <select
                  value={prioridadForzar}
                  onChange={(e: any) => setPrioridadForzar(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALTA">Alta Prioridad (Incorporar en ruta de los próximos 3 días)</option>
                  <option value="URGENTE_24H">Urgente (Visita prioritaria en 24 a 48 hs)</option>
                  <option value="RUTEO_SEMANAL">Ruteo Semanal Normal</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Instrucciones o Notas de Supervisión para el Técnico:
                </label>
                <textarea
                  rows={3}
                  value={notaForzar}
                  onChange={(e) => setNotaForzar(e.target.value)}
                  placeholder="Ej: Equipo con más de 5 meses sin rutina. Coordinar antes con encargado de sucursal, realizar limpieza profunda de cabezal y test de depósitos..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedForzarCtd(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmForzarMp}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirmar & Forzar Orden de Preventivo</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
