import React, { useState, useMemo } from 'react';
import { 
  Radio, 
  Search, 
  Flame, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  Layers, 
  ChevronRight, 
  ChevronLeft, 
  ChevronsLeft, 
  ChevronsRight, 
  Download, 
  Sparkles, 
  Calendar, 
  TrendingUp, 
  Clock,
  Headphones,
  UserCheck,
  Filter
} from 'lucide-react';
import { EquipoCronico, ZonaInfo } from '../types';
import { formatExcelDate, isAtmEquipment } from '../utils/formatters';

interface RecurrenceRadarProps {
  cronicos: EquipoCronico[];
  zonas: ZonaInfo[];
  onSelectCronico: (cronico: EquipoCronico) => void;
}

export const RecurrenceRadar: React.FC<RecurrenceRadarProps> = ({
  cronicos,
  zonas,
  onSelectCronico
}) => {
  const [search, setSearch] = useState('');
  const [selectedZona, setSelectedZona] = useState<string>('ALL');
  const [criticidadFilter, setCriticidadFilter] = useState<'ALL' | 'CRITICO' | 'ADVERTENCIA'>('ALL');
  const [pageSize, setPageSize] = useState<number>(40);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Date-to-Date Range States (Default to last 60 days of dataset: 2026-07-08 to 2026-09-07)
  const [fechaDesde, setFechaDesde] = useState<string>('2026-07-08');
  const [fechaHasta, setFechaHasta] = useState<string>('2026-09-07');
  const [periodPreset, setPeriodPreset] = useState<'30D' | '60D' | '90D' | 'ALL' | 'CUSTOM'>('60D');
  const [tipoAtencion, setTipoAtencion] = useState<'TODAS' | 'SOLO_CAMPO' | 'SOLO_TELCA2'>('TODAS');

  const handleApplyPreset = (preset: '30D' | '60D' | '90D' | 'ALL') => {
    setPeriodPreset(preset);
    if (preset === '30D') {
      setFechaDesde('2026-08-08');
      setFechaHasta('2026-09-07');
    } else if (preset === '60D') {
      setFechaDesde('2026-07-08');
      setFechaHasta('2026-09-07');
    } else if (preset === '90D') {
      setFechaDesde('2026-06-08');
      setFechaHasta('2026-09-07');
    } else if (preset === 'ALL') {
      setFechaDesde('2025-01-01');
      setFechaHasta('2026-12-31');
    }
    setCurrentPage(1);
  };

  // Dynamically reprocess every equipment according to the selected date range & attention type
  const processedCronicos = useMemo(() => {
    return cronicos.map(c => {
      const allEvents = c.todasFallas && c.todasFallas.length > 0 ? c.todasFallas : c.ultimasFallas || [];
      
      const eventsInPeriod = allEvents.filter(f => {
        if (f.rawDateIso) {
          if (fechaDesde && f.rawDateIso < fechaDesde) return false;
          if (fechaHasta && f.rawDateIso > fechaHasta) return false;
        }
        if (tipoAtencion === 'SOLO_CAMPO' && !f.esVisitaCampo) return false;
        if (tipoAtencion === 'SOLO_TELCA2' && !f.esRemotoTelca) return false;
        return true;
      });

      const cantFallas = eventsInPeriod.length;
      const visitasCampo = eventsInPeriod.filter(f => f.esVisitaCampo).length;
      const remotoTelca = eventsInPeriod.filter(f => f.esRemotoTelca).length;

      let dynamicSalud: 'CRÍTICO' | 'ADVERTENCIA' | 'NORMAL' = 'NORMAL';
      if (cantFallas >= 4 || visitasCampo >= 3) {
        dynamicSalud = 'CRÍTICO';
      } else if (cantFallas >= 2) {
        dynamicSalud = 'ADVERTENCIA';
      }

      return {
        ...c,
        totalFallasPeriodo: cantFallas,
        visitasCampoPeriodo: visitasCampo,
        remotoTelcaPeriodo: remotoTelca,
        dynamicSalud,
        fallasEnPeriodo: eventsInPeriod
      };
    }).filter(c => c.totalFallasPeriodo > 0);
  }, [cronicos, fechaDesde, fechaHasta, tipoAtencion]);

  // Filtered List based on Search, Zona, and Criticidad
  const filtered = useMemo(() => {
    return processedCronicos.filter(c => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const match = 
          c.luno.toLowerCase().includes(query) ||
          c.cliente.toLowerCase().includes(query) ||
          c.modelo.toLowerCase().includes(query) ||
          c.zona.toLowerCase().includes(query) ||
          (c.zonaLocal && c.zonaLocal.toLowerCase().includes(query)) ||
          (c.localidad && c.localidad.toLowerCase().includes(query));
        if (!match) return false;
      }
      if (selectedZona !== 'ALL') {
        const matchZona = c.zonaLocal === selectedZona || c.zona === selectedZona;
        if (!matchZona) return false;
      }
      if (criticidadFilter === 'CRITICO' && c.dynamicSalud !== 'CRÍTICO') return false;
      if (criticidadFilter === 'ADVERTENCIA' && c.dynamicSalud !== 'ADVERTENCIA') return false;
      return true;
    }).sort((a, b) => b.totalFallasPeriodo - a.totalFallasPeriodo);
  }, [processedCronicos, search, selectedZona, criticidadFilter]);

  // Dynamic Summary Metrics based STRICTLY on the selected period AND selected Zona
  const zonaProcessed = useMemo(() => {
    if (selectedZona === 'ALL') return processedCronicos;
    return processedCronicos.filter(c => c.zonaLocal === selectedZona || c.zona === selectedZona);
  }, [processedCronicos, selectedZona]);

  const totalCriticos = useMemo(() => zonaProcessed.filter(c => c.dynamicSalud === 'CRÍTICO').length, [zonaProcessed]);
  const totalAdvertencia = useMemo(() => zonaProcessed.filter(c => c.dynamicSalud === 'ADVERTENCIA').length, [zonaProcessed]);
  const totalVisitasCampo = useMemo(() => zonaProcessed.reduce((acc, curr) => acc + curr.visitasCampoPeriodo, 0), [zonaProcessed]);
  const totalSoporteRemoto = useMemo(() => zonaProcessed.reduce((acc, curr) => acc + curr.remotoTelcaPeriodo, 0), [zonaProcessed]);
  const totalFallasSla = useMemo(() => zonaProcessed.reduce((acc, curr) => acc + curr.totalFallasPeriodo, 0), [zonaProcessed]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Export CSV with period details
  const handleExportCSV = () => {
    const headers = ["ID Equipo", "Cliente", "Modelo", "Zona", "Localidad", "Fallas en Periodo", "Visitas a Campo", "Soporte Remoto (TELCA2)", "Ultimo MTM", "Estado Salud", "Recomendacion"];
    const rows = filtered.map(c => [
      c.luno,
      `"${c.cliente}"`,
      `"${c.modelo}"`,
      c.zona,
      `"${c.localidad || ''}"`,
      c.totalFallasPeriodo,
      c.visitasCampoPeriodo,
      c.remotoTelcaPeriodo,
      `"${formatExcelDate(c.ultimoMtmFecha) || 'Sin MTM reciente'}"`,
      c.dynamicSalud,
      `"${c.recomendacion}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reincidencias_sla_${fechaDesde}_al_${fechaHasta}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* SLA Period Explanatory & Date-to-Date Selector Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-950 border border-purple-500/40 shadow-xl space-y-4">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 mt-0.5">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white">
                  Radar de Reincidencias SLA • Análisis Fecha a Fecha
                </h3>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/40">
                  Período: {fechaDesde} al {fechaHasta}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed max-w-3xl">
                Distingue entre <strong>Visitas de Técnicos en Campo</strong> (intervenciones presenciales) y <strong>Soporte Remoto TELCA2</strong> (atenciones de mesa de monitoreo). Las tarjetas recalculan automáticamente para el rango seleccionado.
              </p>
            </div>
          </div>
        </div>

        {/* Date Filter & Preset Controls */}
        <div className="pt-2 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-3">
          
          {/* Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Rango Rápido:
            </span>
            <button
              onClick={() => handleApplyPreset('30D')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                periodPreset === '30D'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Últimos 30 días
            </button>
            <button
              onClick={() => handleApplyPreset('60D')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                periodPreset === '60D'
                  ? 'bg-purple-500 text-white shadow'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Últimos 60 días (SLA)
            </button>
            <button
              onClick={() => handleApplyPreset('90D')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                periodPreset === '90D'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Últimos 90 días
            </button>
            <button
              onClick={() => handleApplyPreset('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                periodPreset === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Todo el Historial
            </button>
          </div>

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Desde:</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  setPeriodPreset('CUSTOM');
                  setCurrentPage(1);
                }}
                className="bg-transparent text-slate-200 text-xs focus:outline-none font-mono"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Hasta:</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => {
                  setFechaHasta(e.target.value);
                  setPeriodPreset('CUSTOM');
                  setCurrentPage(1);
                }}
                className="bg-transparent text-slate-200 text-xs focus:outline-none font-mono"
              />
            </div>
          </div>

        </div>

      </div>

      {/* Top Header & Dynamic KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        
        {/* Total Críticos */}
        <div className="bg-gradient-to-br from-red-950/60 to-slate-900 border border-red-500/40 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-300">Críticos (4+ en período)</span>
            <p className="text-2xl font-black text-white mt-1">{totalCriticos}</p>
            <p className="text-[10px] text-red-300/80 mt-0.5">Equipos con reincidencia severa</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 border border-red-500/30">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* En Advertencia */}
        <div className="bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/40 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Advertencia (2-3 en período)</span>
            <p className="text-2xl font-black text-white mt-1">{totalAdvertencia}</p>
            <p className="text-[10px] text-amber-300/80 mt-0.5">Atención preventiva recomendada</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* VISITAS A CAMPO (TÉCNICOS PRESENCIALES) */}
        <div className="bg-gradient-to-br from-emerald-950/70 to-slate-900 border border-emerald-500/40 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">🛠️ Visitas a Campo</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">{totalVisitasCampo}</p>
            <p className="text-[10px] text-emerald-300/80 mt-0.5">Técnicos presenciales (No-TELCA2)</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* SOPORTE REMOTO TELCA2 */}
        <div className="bg-gradient-to-br from-teal-950/70 to-slate-900 border border-teal-500/40 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300">🎧 Soporte TELCA2</span>
            <p className="text-2xl font-black text-teal-300 mt-1">{totalSoporteRemoto}</p>
            <p className="text-[10px] text-teal-300/80 mt-0.5">Mesa remota / Indicador de visita</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 border border-teal-500/30">
            <Headphones className="w-5 h-5" />
          </div>
        </div>

        {/* Total Intervenciones SLA */}
        <div className="bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-500/40 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">Total Fallas SLA</span>
            <p className="text-2xl font-black text-white mt-1">{totalFallasSla}</p>
            <p className="text-[10px] text-purple-300/80 mt-0.5">Eventos en período seteado</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar por ID Equipo, Cliente, Localidad..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Attention Type, Zona and Criticidad Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          
          {/* Tipo de Atención: Todas vs Solo Campo vs Solo TELCA2 */}
          <select
            value={tipoAtencion}
            onChange={(e: any) => { setTipoAtencion(e.target.value); setCurrentPage(1); }}
            className="bg-slate-950 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 py-1.5 px-3 focus:outline-none focus:border-emerald-500 cursor-pointer font-semibold"
          >
            <option value="TODAS">Todas las Atenciones ({totalFallasSla})</option>
            <option value="SOLO_CAMPO">🛠️ Solo Visitas de Campo ({totalVisitasCampo})</option>
            <option value="SOLO_TELCA2">🎧 Solo Soporte Remoto TELCA2 ({totalSoporteRemoto})</option>
          </select>

          <select
            value={selectedZona}
            onChange={(e) => { setSelectedZona(e.target.value); setCurrentPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-3 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Todas las Zonas</option>
            {zonas.map(z => (
              <option key={z.id} value={z.id}>{z.nombre}</option>
            ))}
          </select>

          <select
            value={criticidadFilter}
            onChange={(e: any) => { setCriticidadFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-3 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Todos los Niveles</option>
            <option value="CRITICO">Solo Críticos ({totalCriticos})</option>
            <option value="ADVERTENCIA">Solo Advertencia ({totalAdvertencia})</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition"
            title="Descargar ranking de reincidentes en CSV"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>CSV</span>
          </button>

        </div>

      </div>

      {/* Chronic Units Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginated.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
            <p className="text-sm font-medium">No se encontraron equipos con fallas en el período {fechaDesde} al {fechaHasta}</p>
            <p className="text-xs text-slate-500 mt-1">Prueba ampliando el rango de fechas con los botones rápidos.</p>
          </div>
        ) : (
          paginated.map((c) => {
            const isCritico = c.dynamicSalud === 'CRÍTICO';

            return (
              <div
                key={c.luno}
                onClick={() => onSelectCronico(c)}
                className={`p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                  isCritico 
                    ? 'bg-slate-900/90 border-red-500/40 hover:border-red-400 hover:bg-slate-900 shadow-lg shadow-red-950/20' 
                    : 'bg-slate-900/80 border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80'
                }`}
              >
                <div>
                  {/* Top bar with ID Equipo & Dynamic Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-base font-black text-amber-400 group-hover:underline">
                      Equipo {c.luno}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 ${
                      isCritico ? 'bg-red-600 text-white shadow-sm' : 'bg-amber-600 text-white'
                    }`}>
                      <Radio className="w-2.5 h-2.5 animate-pulse" />
                      {c.dynamicSalud} ({c.totalFallasPeriodo} en período)
                    </span>
                  </div>

                  {/* Client & Model */}
                  <h4 className="text-sm font-bold text-white truncate">{c.cliente}</h4>
                  <p className="text-xs text-slate-400 mb-2">
                    {c.modelo} • <strong className="text-slate-300">{c.localidad} ({c.zonaLocal || c.zona})</strong>
                  </p>

                  {/* FIELD VISITS vs TELCA2 BREAKDOWN BOX */}
                  {(() => {
                    const isAtm = isAtmEquipment(c.modelo, (c as any).tipo || (c as any).tipoSeg);
                    if (isAtm) {
                      return (
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-emerald-500/30 text-xs mb-3 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" /> Visitas Técnicas Presenciales:
                            </span>
                            <span className="text-[10px] text-slate-400">Atención in situ (Cajero ATM sin asistencia remota)</span>
                          </div>
                          <p className="text-lg font-black text-white font-mono">
                            {c.visitasCampoPeriodo}
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-slate-950 p-2 rounded-lg border border-emerald-500/30 text-xs">
                          <span className="text-[10px] text-emerald-400 font-bold block uppercase flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Visitas a Campo:
                          </span>
                          <p className="text-sm font-black text-white font-mono mt-0.5">
                            {c.visitasCampoPeriodo}
                          </p>
                          <span className="text-[10px] text-slate-400">Técnicos in situ</span>
                        </div>

                        <div className="bg-slate-950 p-2 rounded-lg border border-teal-500/30 text-xs">
                          <span className="text-[10px] text-teal-400 font-bold block uppercase flex items-center gap-1">
                            <Headphones className="w-3 h-3" /> Soporte TELCA2:
                          </span>
                          <p className="text-sm font-black text-white font-mono mt-0.5">
                            {c.remotoTelcaPeriodo}
                          </p>
                          <span className="text-[10px] text-slate-400">Atención remota</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* MTM Tracking */}
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 mb-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-blue-400" /> Último MTM:
                    </span>
                    <span className="font-semibold text-slate-200">
                      {formatExcelDate(c.ultimoMtmFecha) || 'Sin MTM reciente'}
                    </span>
                  </div>

                  {/* Supervisor Recommendation Snippet */}
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-300 bg-purple-950/30 border border-purple-800/40 p-2 rounded-lg mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="line-clamp-2 leading-relaxed">
                      {(() => {
                        const isAtm = isAtmEquipment(c.modelo, (c as any).tipo || (c as any).tipoSeg);
                        if (isAtm) {
                          return isCritico
                            ? `Reincidencia severa (${c.visitasCampoPeriodo} visitas a campo en el período). Requiere auditoría y reemplazo de módulo crítico.`
                            : `Reincidente moderado (${c.visitasCampoPeriodo} visitas de campo). Revisar calibración y estado en próxima visita.`;
                        }
                        return isCritico
                          ? `Reincidencia severa (${c.visitasCampoPeriodo} visitas a campo${c.remotoTelcaPeriodo > 0 ? `, ${c.remotoTelcaPeriodo} atenciones TELCA2 en el período` : ''}). Requiere auditoría y reemplazo de módulo crítico.`
                          : `Reincidente moderado (${c.visitasCampoPeriodo} visitas de campo${c.remotoTelcaPeriodo > 0 ? `, ${c.remotoTelcaPeriodo} atenciones TELCA2` : ''}). Revisar calibración y estado en próxima visita.`;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>{c.fallasEnPeriodo.length} eventos en período</span>
                  <span className="text-amber-400 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                    Ver Historial <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Pagination Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shadow-xl">
        <div className="flex items-center gap-2">
          <span>Equipos por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
          >
            <option value={20}>20</option>
            <option value={40}>40</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <span className="text-slate-500">
            Mostrando {filtered.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filtered.length)} de {filtered.length} equipos reincidentes
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
            title="Primera página"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 py-0.5 text-xs text-slate-200 font-mono">
            Pág. {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
            title="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1 rounded bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
            title="Última página"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
