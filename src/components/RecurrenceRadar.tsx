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
  Clock
} from 'lucide-react';
import { EquipoCronico, ZonaInfo } from '../types';

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

  // Filtered List
  const filtered = useMemo(() => {
    return cronicos.filter(c => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const match = 
          c.luno.toLowerCase().includes(query) ||
          c.cliente.toLowerCase().includes(query) ||
          c.modelo.toLowerCase().includes(query) ||
          c.zona.toLowerCase().includes(query);
        if (!match) return false;
      }
      if (selectedZona !== 'ALL' && c.zona !== selectedZona) return false;
      if (criticidadFilter === 'CRITICO' && c.estadoSalud !== 'CRÍTICO') return false;
      if (criticidadFilter === 'ADVERTENCIA' && c.estadoSalud !== 'ADVERTENCIA') return false;
      return true;
    });
  }, [cronicos, search, selectedZona, criticidadFilter]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const totalCriticos = cronicos.filter(c => c.estadoSalud === 'CRÍTICO').length;
  const totalAdvertencia = cronicos.filter(c => c.estadoSalud === 'ADVERTENCIA').length;
  const totalFallasSla = cronicos.reduce((acc, curr) => acc + curr.totalFallas, 0);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["ID Equipo", "Cliente", "Modelo", "Zona", "Fallas SLA (60d)", "Ultimo MTM", "Estado Salud", "Recomendacion"];
    const rows = filtered.map(c => [
      c.luno,
      `"${c.cliente}"`,
      `"${c.modelo}"`,
      c.zona,
      c.totalFallas,
      `"${c.ultimoMtmFecha || 'Sin MTM reciente'}"`,
      c.estadoSalud,
      `"${c.recomendacion}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reincidencias_sla_60d_patagonia_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* SLA 60 Days Rule Explanatory Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-950 border border-purple-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 mt-0.5">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Radar de Reincidencias Estricto (Fuente: Reporte SLA - Últimos 60 Días)
              <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                Regla SLA 60d
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
              El carácter de <strong>Equipo Reincidente</strong> se evalúa por la repetición de Service Calls en el <strong>Reporte SLA</strong> en los últimos 60 días. Los preventivos (MTM) se cruzan para analizar el tiempo transcurrido desde la última rutina preventiva hasta la nueva falla.
            </p>
          </div>
        </div>
      </div>

      {/* Top Header & KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total Críticos */}
        <div className="bg-gradient-to-br from-red-950/60 to-slate-900 border border-red-500/40 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-300">Equipos Críticos (4+ fallas)</span>
            <p className="text-3xl font-black text-white mt-1">{totalCriticos}</p>
            <p className="text-xs text-red-300/80 mt-1">Repeticiones severas en SLA</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 border border-red-500/30">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* En Advertencia */}
        <div className="bg-gradient-to-br from-amber-950/60 to-slate-900 border border-amber-500/40 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Equipos en Advertencia (2-3 fallas)</span>
            <p className="text-3xl font-black text-white mt-1">{totalAdvertencia}</p>
            <p className="text-xs text-amber-300/80 mt-1">Atención preventiva recomendada</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Total Intervenciones SLA */}
        <div className="bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-500/40 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Fallas SLA Acumuladas</span>
            <p className="text-3xl font-black text-white mt-1">{totalFallasSla}</p>
            <p className="text-xs text-purple-300/80 mt-1">Llamadas Service Call en 60 días</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar por ID de Equipo, Cliente, Modelo..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Zona and Criticidad Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          
          <select
            value={selectedZona}
            onChange={(e) => { setSelectedZona(e.target.value); setCurrentPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Todas las Zonas</option>
            {zonas.map(z => (
              <option key={z.id} value={z.id}>{z.nombre}</option>
            ))}
          </select>

          <select
            value={criticidadFilter}
            onChange={(e: any) => { setCriticidadFilter(e.target.value); setCurrentPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Todos los Niveles</option>
            <option value="CRITICO">Solo Críticos (4+ fallas SLA)</option>
            <option value="ADVERTENCIA">Solo Advertencia (2-3 fallas SLA)</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-700 transition"
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
            <p className="text-sm font-medium">No se encontraron equipos reincidentes con los filtros aplicados</p>
          </div>
        ) : (
          paginated.map((c) => {
            const isCritico = c.estadoSalud === 'CRÍTICO';

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
                  {/* Top bar with ID Equipo & Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-base font-black text-amber-400 group-hover:underline">
                      Equipo {c.luno}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 ${
                      isCritico ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                    }`}>
                      <Radio className="w-2.5 h-2.5 animate-pulse" />
                      {c.estadoSalud} ({c.totalFallas} fallas SLA)
                    </span>
                  </div>

                  {/* Client & Model */}
                  <h4 className="text-sm font-bold text-white truncate">{c.cliente}</h4>
                  <p className="text-xs text-slate-400 mb-2">{c.modelo} • <strong className="text-slate-300">{c.localidad} ({c.zona})</strong></p>

                  {/* MTM Tracking */}
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 mb-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-blue-400" /> Último MTM:
                    </span>
                    <span className="font-semibold text-slate-200">
                      {c.ultimoMtmFecha || 'Sin MTM reciente'}
                    </span>
                  </div>

                  {/* Supervisor Recommendation Snippet */}
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-300 bg-purple-950/30 border border-purple-800/40 p-2 rounded-lg mb-3">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="line-clamp-2 leading-relaxed">{c.recomendacion}</p>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>{c.ultimasFallas.length} eventos SLA registrados</span>
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
            Mostrando {filtered.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filtered.length)} de {filtered.length} equipos
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
