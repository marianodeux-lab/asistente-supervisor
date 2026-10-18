import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Download, 
  RotateCcw, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Layers, 
  Package, 
  Truck, 
  UserCheck, 
  UserX, 
  Building2, 
  MapPin, 
  ExternalLink, 
  FileSpreadsheet, 
  HelpCircle, 
  Cpu, 
  ChevronRight,
  TrendingDown,
  Info,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Activity,
  Award,
  Zap,
  ArrowUpDown
} from 'lucide-react';
import type { 
  SlaCausalidadAuditItem, 
  SlaCausalidadesResumen, 
  SlaCausalidadCategoria,
  CotConsistencia 
} from '../types';
import causalidadesDatasetRaw from '../data/analisisSlaCausalidadesData.json';

const causalidadesDataset = causalidadesDatasetRaw as {
  metadata: { generadoEl: string; fuente: string };
  resumen: SlaCausalidadesResumen;
  items: SlaCausalidadAuditItem[];
};

export const SlaCausalidadesView: React.FC = () => {
  const { resumen, items } = causalidadesDataset;

  // Selected item for deep modal audit
  const [selectedAuditItem, setSelectedAuditItem] = useState<SlaCausalidadAuditItem | null>(null);

  // Filters state
  const [search, setSearch] = useState<string>('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('ALL');
  const [selectedTecnico, setSelectedTecnico] = useState<string>('ALL');
  const [selectedEntidad, setSelectedEntidad] = useState<string>('ALL');
  const [selectedZonaLocal, setSelectedZonaLocal] = useState<string>('ALL');
  const [onlyCotInconsistencies, setOnlyCotInconsistencies] = useState<boolean>(false);
  const [onlyCulpoTecnico, setOnlyCulpoTecnico] = useState<boolean>(false);
  const [onlyWithParts, setOnlyWithParts] = useState<boolean>(false);

  // View SubTab: 'AUDITORIA_TABLE' | 'PN_CRITICOS' | 'COMPARATIVA_COT' | 'TECNICOS_EXPOSICION'
  const [activeSubView, setActiveSubView] = useState<'AUDITORIA_TABLE' | 'PN_CRITICOS' | 'COMPARATIVA_COT' | 'TECNICOS_EXPOSICION'>('AUDITORIA_TABLE');

  // Pagination & Sorting State
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<keyof SlaCausalidadAuditItem>('horasExcedidas');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Filter lists
  const filterOptions = useMemo(() => {
    const tecs = new Set<string>();
    const ents = new Set<string>();
    const zonas = new Set<string>();

    items.forEach(i => {
      if (i.tecnicoAsig) tecs.add(i.tecnicoAsig);
      if (i.entidad) ents.add(i.entidad);
      if (i.zonaLocal) zonas.add(i.zonaLocal);
    });

    return {
      tecnicos: Array.from(tecs).sort(),
      entidades: Array.from(ents).sort(),
      zonas: Array.from(zonas).sort()
    };
  }, [items]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return items.filter(item => {
      // Free search
      if (search) {
        const q = search.toLowerCase().trim();
        const matchPed = item.pedido.toLowerCase().includes(q);
        const matchCli = item.cliente.toLowerCase().includes(q);
        const matchTec = (item.tecnicoAsig || '').toLowerCase().includes(q);
        const matchPn = (item.pnInstalado || '').toLowerCase().includes(q);
        const matchDesc = (item.descInstalado || '').toLowerCase().includes(q);
        const matchLuno = (item.luno || '').toLowerCase().includes(q);
        const matchLoc = (item.localidad || '').toLowerCase().includes(q);
        if (!matchPed && !matchCli && !matchTec && !matchPn && !matchDesc && !matchLuno && !matchLoc) {
          return false;
        }
      }

      // Categoria filter
      if (selectedCategoria !== 'ALL' && item.categoria !== selectedCategoria) {
        return false;
      }

      // Tecnico filter
      if (selectedTecnico !== 'ALL' && item.tecnicoAsig !== selectedTecnico) {
        return false;
      }

      // Entidad filter
      if (selectedEntidad !== 'ALL' && item.entidad !== selectedEntidad) {
        return false;
      }

      // Zona Local filter
      if (selectedZonaLocal !== 'ALL' && item.zonaLocal !== selectedZonaLocal) {
        return false;
      }

      // Quick boolean switches
      if (onlyCotInconsistencies && !item.esInconsistenciaCot) {
        return false;
      }

      if (onlyCulpoTecnico && item.consistenciaCot !== 'INCONSISTENTE_CULPO_AL_TECNICO') {
        return false;
      }

      if (onlyWithParts && !item.tieneRepuestoBuzon) {
        return false;
      }

      return true;
    });
  }, [items, search, selectedCategoria, selectedTecnico, selectedEntidad, selectedZonaLocal, onlyCotInconsistencies, onlyCulpoTecnico, onlyWithParts]);

  // Sorted dataset
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      const strA = String(valA || '');
      const strB = String(valB || '');
      return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortField, sortAsc]);

  // Paginated dataset
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

  // Sorting handler
  const handleSort = (field: keyof SlaCausalidadAuditItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Helper for Category Badges (Pastel Tints)
  const getCategoriaBadge = (cat: SlaCausalidadCategoria, codigo: string) => {
    switch (cat) {
      case 'CAT_A_STOCK_CENTRAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-50 border border-sky-200 text-sky-800">
            <Package className="w-3.5 h-3.5 text-sky-600" />
            Cat A • Stock Central
          </span>
        );
      case 'CAT_B_REPOSICION_SF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-800">
            <Truck className="w-3.5 h-3.5 text-amber-600" />
            Cat B • Reposición SF Demorada
          </span>
        );
      case 'CAT_C_DESVIO_OPERATIVO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 border border-rose-200 text-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Cat C • Desvío Operativo
          </span>
        );
      case 'CAT_D_COT_INCORRECTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 border border-purple-200 text-purple-800">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
            Cat D • Error COT
          </span>
        );
      case 'CAT_E_CLIENTE_TERCEROS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            Cat E • Cliente / Terceros
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 border border-slate-200 text-slate-600">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            Cat F • Sin Repuesto en Buzón
          </span>
        );
    }
  };

  // Helper for COT Consistency Badges (Pastel Tints)
  const getCotConsistenciaBadge = (consistencia: CotConsistencia, esInconsistente: boolean) => {
    if (consistencia === 'INCONSISTENTE_CULPO_AL_TECNICO') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <UserX className="w-3 h-3 text-rose-500" />
          COT Culpó al Técnico Falsamente
        </span>
      );
    }
    if (consistencia === 'INCONSISTENTE_REPUESTO_FICTICIO') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          COT Declaró Repuesto Sin Uso
        </span>
      );
    }
    if (consistencia === 'DISCREPANCIA_OPERATIVA') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Info className="w-3 h-3 text-purple-500" />
          Discrepancia SF
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <CheckCircle2 className="w-3 h-3 text-teal-600" />
        Consistente / Sin Discrepancia
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      
      {/* ─── 1. HERO HEADER ─── */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-teal-800 text-xs font-bold tracking-wide">
              <ShieldAlert className="w-3.5 h-3.5 text-teal-600" />
              <span>AUDITORÍA SENIOR DE SLA • CAUSA RAÍZ PATAGONIA Y SUROESTE</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              Análisis Causal de Pedidos Fuera de SLA
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Determinación de causa raíz mediante cruce de evidencia objetiva (<span className="text-teal-700 font-semibold">Reporte SLA</span> $\times$ <span className="text-sky-700 font-semibold">Buzón de Movimientos</span> $\times$ <span className="text-purple-700 font-semibold">Stock Fijo</span> $\times$ <span className="text-emerald-700 font-semibold">Solicitudes Pendientes</span>). Validación y refutación de motivos declarados por el COT.
            </p>
          </div>

          {/* Quick SubTabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start lg:self-center">
            <button
              onClick={() => setActiveSubView('AUDITORIA_TABLE')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeSubView === 'AUDITORIA_TABLE'
                  ? 'bg-white text-teal-900 border border-teal-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              <span>Auditoría ({filteredData.length})</span>
            </button>
            <button
              onClick={() => setActiveSubView('COMPARATIVA_COT')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeSubView === 'COMPARATIVA_COT'
                  ? 'bg-white text-purple-900 border border-purple-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              <span>Inconsistencias COT ({resumen.responsabilidad.cotInconsistenciasCount})</span>
            </button>
            <button
              onClick={() => setActiveSubView('PN_CRITICOS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeSubView === 'PN_CRITICOS'
                  ? 'bg-white text-amber-900 border border-amber-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Cpu className="w-4 h-4 text-amber-600" />
              <span>PNs Críticos ({resumen.topPnsCriticos.length})</span>
            </button>
            <button
              onClick={() => setActiveSubView('TECNICOS_EXPOSICION')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeSubView === 'TECNICOS_EXPOSICION'
                  ? 'bg-white text-sky-900 border border-sky-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <UserCheck className="w-4 h-4 text-sky-600" />
              <span>Exposición Técnicos</span>
            </button>
          </div>
        </div>

        {/* ─── 2. EXECUTIVE KPI STAT CARDS ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-6 border-t border-slate-200 mt-6">
          
          {/* Total Vencidos */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Vencidos Auditados</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </span>
            <div className="text-xl font-black text-slate-800 font-mono">{resumen.totalVencidos}</div>
            <div className="text-[10px] text-slate-500">Patagonia + Suroeste</div>
          </div>

          {/* Horas SLA Perdidas */}
          <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
              <span>Horas SLA Perdidas</span>
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            </span>
            <div className="text-xl font-black text-rose-700 font-mono">
              {resumen.totalHorasSlaPerdidas.toLocaleString('es-AR')} hs
            </div>
            <div className="text-[10px] text-rose-600/80">Promedio: {resumen.promedioHorasPorVencido} hs/pedido</div>
          </div>

          {/* Imputable Logística Central */}
          <div className="bg-sky-50/50 border border-sky-200/80 rounded-2xl p-3.5 space-y-1 relative overflow-hidden group hover:border-sky-300 transition">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 flex items-center justify-between">
              <span>Logística Central (A+B)</span>
              <Package className="w-3.5 h-3.5 text-sky-600" />
            </span>
            <div className="text-xl font-black text-sky-800 font-mono">
              {resumen.responsabilidad.logisticaCentralCount} ({resumen.responsabilidad.logisticaCentralPct}%)
            </div>
            <div className="text-[10px] text-sky-600/90 font-medium">
              {resumen.responsabilidad.logisticaCentralHoras.toLocaleString('es-AR')} hs perdidas
            </div>
          </div>

          {/* Inconsistencias COT */}
          <div className="bg-purple-50/50 border border-purple-200/80 rounded-2xl p-3.5 space-y-1 relative overflow-hidden group hover:border-purple-300 transition">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center justify-between">
              <span>Inconsistencias COT</span>
              <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
            </span>
            <div className="text-xl font-black text-purple-800 font-mono">
              {resumen.responsabilidad.cotInconsistenciasCount} ({resumen.responsabilidad.cotInconsistenciasPct}%)
            </div>
            <div className="text-[10px] text-purple-600/90 font-medium">
              {resumen.responsabilidad.cotCulpoTecnicoInjustamente} culparon al técnico
            </div>
          </div>

          {/* Desvío Técnico (Cat C) */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Desvío en Campo (Cat C)</span>
              <UserX className="w-3.5 h-3.5 text-slate-400" />
            </span>
            <div className="text-xl font-black text-slate-800 font-mono">
              {resumen.responsabilidad.desvioTecnicoCount} ({resumen.responsabilidad.desvioTecnicoPct}%)
            </div>
            <div className="text-[10px] text-slate-500">
              {resumen.responsabilidad.desvioTecnicoHoras.toLocaleString('es-AR')} hs perdidas
            </div>
          </div>

          {/* Con Repuesto en Buzón */}
          <div className="bg-teal-50/50 border border-teal-200/80 rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 flex items-center justify-between">
              <span>Con Repuesto Instalado</span>
              <Cpu className="w-3.5 h-3.5 text-teal-600" />
            </span>
            <div className="text-xl font-black text-teal-800 font-mono">
              {resumen.pedidosConRepuestoEnBuzon} ({resumen.porcentajeConRepuesto}%)
            </div>
            <div className="text-[10px] text-teal-600/90">Verificados en Buzón</div>
          </div>

        </div>

      </div>

      {/* ─── 3. SUB-VIEW: PN CRÍTICOS DESTRUCTORES DE SLA ─── */}
      {activeSubView === 'PN_CRITICOS' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-500" />
                <span>Ranking de PNs Críticos Causantes de Vencimientos</span>
              </h3>
              <p className="text-xs text-slate-500">
                Repuestos que generaron la mayor cantidad de pedidos fuera de SLA y horas perdidas en Patagonia.
              </p>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200">
              Top 15 Partes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {resumen.topPnsCriticos.map((pnItem, idx) => (
              <div 
                key={pnItem.pn}
                onClick={() => {
                  setSearch(pnItem.pn);
                  setActiveSubView('AUDITORIA_TABLE');
                }}
                className="bg-slate-50 border border-slate-200/90 hover:border-teal-300 hover:bg-white rounded-2xl p-4 transition cursor-pointer space-y-3 group shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-teal-700 group-hover:text-teal-800">
                        PN {pnItem.pn}
                      </span>
                      {pnItem.esSf ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Stock Fijo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                          Stock Central
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-700 font-medium line-clamp-2" title={pnItem.desc}>
                      {pnItem.desc || 'Sin descripción en Master LP'}
                    </div>
                  </div>
                  <span className="text-sm font-black text-slate-400 group-hover:text-teal-600 font-mono">
                    #{idx + 1}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Pedidos Fuera SLA</span>
                    <span className="font-mono font-black text-slate-800">{pnItem.pedidosCount} tickets</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Horas Perdidas</span>
                    <span className="font-mono font-black text-rose-600">{pnItem.horasPerdidas} hs</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                  <span>Afectó a {pnItem.tecnicosAfectados.length} técnico(s)</span>
                  <span className="text-teal-700 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Ver pedidos <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 4. SUB-VIEW: INCONSISTENCIAS Y REFUTACIÓN AL COT ─── */}
      {activeSubView === 'COMPARATIVA_COT' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-600" />
                <span>Auditoría de Inconsistencias de Carga del COT</span>
              </h3>
              <p className="text-xs text-slate-500">
                Casos donde la operadora del COT cargó un motivo arbitrario que queda desmentido por la trazabilidad de partes y solicitudes de Flow.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-800 rounded-full text-xs font-bold">
                {resumen.responsabilidad.cotCulpoTecnicoInjustamente} Veces Culpó al Técnico Falsamente
              </span>
              <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold">
                {resumen.responsabilidad.cotInventoRepuesto} "Repuestos" Sin Solicitud
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resumen.inconsistenciasCotList.slice(0, 8).map(inc => (
              <div 
                key={inc.pedido} 
                onClick={() => {
                  const it = items.find(i => i.pedido === inc.pedido);
                  if (it) setSelectedAuditItem(it);
                }}
                className="bg-slate-50 border border-purple-200/70 hover:border-purple-300 hover:bg-white rounded-2xl p-4 transition cursor-pointer space-y-2.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-teal-800 text-xs">
                    Pedido {inc.pedido}
                  </span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    +{inc.tiempoExcedido} excedido
                  </span>
                </div>

                <div className="text-xs text-slate-800 font-semibold">
                  {inc.cliente} • {inc.tecnico}
                </div>

                <div className="bg-white rounded-xl p-3 text-xs space-y-1.5 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="font-bold text-purple-700">Declaración COT:</span>
                    <span>"{inc.motivoCot}"</span>
                  </div>
                  <div className="text-slate-700">
                    <span className="font-bold text-teal-700">Evidencia Real: </span>
                    {inc.causaReal}
                  </div>
                </div>

                <div className="text-[11px] text-purple-700 font-semibold flex items-center justify-between">
                  <span>{inc.detalleConsistencia}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => {
                setOnlyCotInconsistencies(true);
                setActiveSubView('AUDITORIA_TABLE');
              }}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Ver las {resumen.responsabilidad.cotInconsistenciasCount} Inconsistencias en la Tabla Principal
            </button>
          </div>
        </div>
      )}

      {/* ─── 5. SUB-VIEW: EXPOSICIÓN DE TÉCNICOS A FALTANTES ─── */}
      {activeSubView === 'TECNICOS_EXPOSICION' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sky-600" />
                <span>Exposición de Técnicos por Falta de Abastecimiento</span>
              </h3>
              <p className="text-xs text-slate-500">
                Demostración de cuántos vencimientos sufrieron por demoras de Central (Cat A/B) vs desvíos de campo (Cat C).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Técnico</th>
                  <th className="py-3 px-3">Zona</th>
                  <th className="py-3 px-3 text-center">Vencidos Totales</th>
                  <th className="py-3 px-3 text-center">Horas Perdidas</th>
                  <th className="py-3 px-3 text-center text-sky-700">Por Logística Central (Cat A+B)</th>
                  <th className="py-3 px-3 text-center text-rose-700">Por Desvío Campo (Cat C)</th>
                  <th className="py-3 px-3 text-right">% Imputable a Central</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {resumen.topTecnicosAfectados.map(tec => {
                  const pctCentral = tec.vencidosCount > 0 ? Math.round((tec.porCatA_B / tec.vencidosCount) * 100) : 0;
                  return (
                    <tr 
                      key={tec.tecnico}
                      onClick={() => {
                        setSelectedTecnico(tec.tecnico);
                        setActiveSubView('AUDITORIA_TABLE');
                      }}
                      className="hover:bg-teal-50/40 transition cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                        {tec.tecnico}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{tec.zona}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">{tec.vencidosCount}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-rose-600 font-bold">{tec.horasPerdidas} hs</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-sky-700">
                        {tec.porCatA_B} ({pctCentral}%)
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600">{tec.porCatC}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-teal-500 h-full rounded-full" 
                              style={{ width: `${pctCentral}%` }} 
                            />
                          </div>
                          <span className="font-mono font-bold text-teal-800 text-xs">{pctCentral}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 6. AUDITORÍA FORENSE DATA TABLE & CONTROLS ─── */}
      {activeSubView === 'AUDITORIA_TABLE' && (
        <div className="space-y-4">
          
          {/* Slicers Panel */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs space-y-4">
            
            {/* Top row: Search + Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              
              {/* Free search */}
              <div className="relative">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                  Búsqueda (Pedido / Luno / PN / Técnico / Cliente)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="Ej: 101173806, Allende, SV-217422..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white"
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

              {/* Categoría Slicer */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                  Categoría Causal
                </label>
                <select
                  value={selectedCategoria}
                  onChange={(e) => { setSelectedCategoria(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white font-bold"
                >
                  <option value="ALL">Todas las Categorías</option>
                  <option value="CAT_A_STOCK_CENTRAL">Cat A • Stock Central ({resumen.porCategoria.catA_stockCentral.count})</option>
                  <option value="CAT_B_REPOSICION_SF">Cat B • Reposición SF Demorada ({resumen.porCategoria.catB_reposicionSf.count})</option>
                  <option value="CAT_C_DESVIO_OPERATIVO">Cat C • Desvío Operativo ({resumen.porCategoria.catC_desvioOperativo.count})</option>
                  <option value="CAT_D_COT_INCORRECTO">Cat D • Error COT</option>
                  <option value="CAT_E_CLIENTE_TERCEROS">Cat E • Cliente / Terceros ({resumen.porCategoria.catE_clienteTerceros.count})</option>
                  <option value="CAT_F_SIN_REPUESTO_INFO">Cat F • Sin Repuesto en Buzón ({resumen.porCategoria.catF_sinRepuestoInfo.count})</option>
                </select>
              </div>

              {/* Técnico Slicer */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                  <span>Técnico Asignado</span>
                  <span className="text-teal-700 font-semibold">({filterOptions.tecnicos.length})</span>
                </label>
                <select
                  value={selectedTecnico}
                  onChange={(e) => { setSelectedTecnico(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                >
                  <option value="ALL">Todos los Técnicos</option>
                  {filterOptions.tecnicos.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Entidad / Cliente Slicer */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                  <span>Entidad / Cliente</span>
                  <span className="text-teal-700 font-semibold">({filterOptions.entidades.length})</span>
                </label>
                <select
                  value={selectedEntidad}
                  onChange={(e) => { setSelectedEntidad(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                >
                  <option value="ALL">Todas las Entidades</option>
                  {filterOptions.entidades.map(ent => (
                    <option key={ent} value={ent}>{ent}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Quick Action Filter Chips */}
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Filtros Rápidos:</span>
              
              <button
                onClick={() => { setOnlyCulpoTecnico(!onlyCulpoTecnico); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  onlyCulpoTecnico
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <UserX className="w-3.5 h-3.5 text-rose-600" />
                <span>COT Culpó al Técnico ({resumen.responsabilidad.cotCulpoTecnicoInjustamente})</span>
              </button>

              <button
                onClick={() => { setOnlyCotInconsistencies(!onlyCotInconsistencies); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  onlyCotInconsistencies
                    ? 'bg-purple-100 text-purple-800 border border-purple-300 shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                <span>Todas las Inconsistencias COT ({resumen.responsabilidad.cotInconsistenciasCount})</span>
              </button>

              <button
                onClick={() => { setOnlyWithParts(!onlyWithParts); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  onlyWithParts
                    ? 'bg-teal-100 text-teal-800 border border-teal-300 shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-teal-600" />
                <span>Solo Con Repuesto en Buzón ({resumen.pedidosConRepuestoEnBuzon})</span>
              </button>

              {(search || selectedCategoria !== 'ALL' || selectedTecnico !== 'ALL' || selectedEntidad !== 'ALL' || onlyCulpoTecnico || onlyCotInconsistencies || onlyWithParts) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedCategoria('ALL');
                    setSelectedTecnico('ALL');
                    setSelectedEntidad('ALL');
                    setOnlyCulpoTecnico(false);
                    setOnlyCotInconsistencies(false);
                    setOnlyWithParts(false);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 rounded-xl text-xs font-bold text-teal-700 hover:text-teal-900 hover:bg-slate-100 transition flex items-center gap-1 ml-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpiar Filtros</span>
                </button>
              )}
            </div>

          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden space-y-2">
            
            {/* Top controls: Rows per page & counter */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Mostrando {paginatedData.length} de {sortedData.length} pedidos fuera de SLA</span>
                {sortedData.length !== items.length && (
                  <span className="text-teal-700 font-semibold">({items.length - sortedData.length} filtrados)</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span>Filas:</span>
                {[25, 50, 100, 200].map(sz => (
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

            {/* Scrollable table */}
            <div className="overflow-x-auto scrollbar-thin max-h-[700px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/95 sticky top-0 z-10 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th onClick={() => handleSort('pedido')} className="py-3 px-3 cursor-pointer hover:text-teal-700 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span>Pedido</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('cliente')} className="py-3 px-3 cursor-pointer hover:text-teal-700 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span>Entidad / Cliente</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3 whitespace-nowrap">Localidad / Zona</th>
                    <th onClick={() => handleSort('tecnicoAsig')} className="py-3 px-3 cursor-pointer hover:text-teal-700 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span>Técnico Asig.</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th onClick={() => handleSort('horasExcedidas')} className="py-3 px-3 cursor-pointer hover:text-teal-700 whitespace-nowrap text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <span>Tiempo Excedido</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3 whitespace-nowrap">Motivo COT</th>
                    <th className="py-3 px-3 whitespace-nowrap">Repuesto Instalado (Buzón)</th>
                    <th className="py-3 px-3 whitespace-nowrap">Tipo Stock</th>
                    <th onClick={() => handleSort('categoriaCodigo')} className="py-3 px-3 cursor-pointer hover:text-teal-700 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span>Causa Raíz Diagnosticada</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3 whitespace-nowrap text-center">Validación COT</th>
                    <th className="py-3 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {paginatedData.map((item) => (
                    <tr 
                      key={item.id}
                      onClick={() => setSelectedAuditItem(item)}
                      className="hover:bg-teal-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Pedido */}
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-800 group-hover:text-teal-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{item.pedido}</span>
                          {item.stockFlow > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-sky-50 text-sky-800 border border-sky-200" title={`Flow Stock N° ${item.stockFlow}`}>
                              Flow #{item.stockFlow}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Entidad / Cliente */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{item.cliente}</div>
                        <div className="text-[10px] text-slate-500 font-mono">ATM {item.luno} • {item.equipo || 'Diebold/Wincor'}</div>
                      </td>

                      {/* Localidad / Zona */}
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        <div>{item.localidad || '-'}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{item.zonaLocal} ({item.zona})</div>
                      </td>

                      {/* Técnico Asignado */}
                      <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap font-medium">
                        {item.tecnicoAsig || item.tecnicoZona || '-'}
                      </td>

                      {/* Tiempo Excedido */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <Clock className="w-3 h-3 text-rose-500" />
                          +{item.tiempoSlaExcedidoStr}
                        </span>
                      </td>

                      {/* Motivo COT */}
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        <div className="font-medium">{item.motivoCot}</div>
                        {item.motivoCotDetalle && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px]" title={item.motivoCotDetalle}>
                            {item.motivoCotDetalle}
                          </div>
                        )}
                      </td>

                      {/* Repuesto Instalado (Buzón) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.tieneRepuestoBuzon ? (
                          <div>
                            <div className="font-mono font-bold text-teal-800 text-[11px]">{item.pnInstalado}</div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[160px]" title={item.descInstalado}>
                              {item.descInstalado || 'S/D'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Sin parte en buzón</span>
                        )}
                      </td>

                      {/* Tipo Stock */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.tieneRepuestoBuzon ? (
                          item.esStockFijo ? (
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Stock Fijo
                              </span>
                              {item.tieneSolicitudPendienteSf && (
                                <div className="text-[9px] text-amber-700 font-semibold">
                                  Sol. abierta #{item.solicitudPendienteDetalle?.nroSolicitud}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                              Stock Central
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>

                      {/* Causa Raíz Diagnosticada */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getCategoriaBadge(item.categoria, item.categoriaCodigo)}
                      </td>

                      {/* Validación COT */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {getCotConsistenciaBadge(item.consistenciaCot, item.esInconsistenciaCot)}
                      </td>

                      {/* Acción */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAuditItem(item);
                          }}
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-700 border border-teal-200 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto"
                        >
                          <span>Auditar</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Página <span className="text-slate-800 font-bold">{currentPage}</span> de <span className="text-slate-800 font-bold">{totalPages}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Primera
                </button>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Última
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ─── 7. MODAL DE AUDITORÍA FORENSE DETALLADA (12 PASOS & FORMATO COPILOT) ─── */}
      {selectedAuditItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-8 space-y-0">
            
            {/* Modal Header */}
            <div className="bg-slate-50 p-6 border-b border-slate-200 flex items-start justify-between relative">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    AUDITORÍA FORENSE DE PEDIDO
                  </span>
                  <span className="font-mono text-sm font-black text-slate-900">
                    #{selectedAuditItem.pedido}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  {selectedAuditItem.cliente} • ATM {selectedAuditItem.luno}
                </h2>
                <div className="text-xs text-slate-500 flex items-center gap-3">
                  <span>{selectedAuditItem.localidad} ({selectedAuditItem.zonaLocal})</span>
                  <span>•</span>
                  <span>Técnico: <strong className="text-slate-800">{selectedAuditItem.tecnicoAsig || selectedAuditItem.tecnicoZona}</strong></span>
                  <span>•</span>
                  <span className="text-rose-700 font-bold font-mono">Tiempo Excedido: +{selectedAuditItem.tiempoSlaExcedidoStr}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedAuditItem(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Structured Output requested in prompt */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-thin">
              
              {/* 1. Resumen Ejecutivo & Clasificación */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-teal-600" />
                    <span>Resumen Ejecutivo de la Auditoría</span>
                  </span>
                  <div>{getCategoriaBadge(selectedAuditItem.categoria, selectedAuditItem.categoriaCodigo)}</div>
                </div>

                <div className="text-sm text-slate-700 leading-relaxed font-medium">
                  {selectedAuditItem.causaRaizEstimada}
                </div>
              </div>

              {/* 2. Cuadrícula: Motivo COT vs Causa Real */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Lo declarado por COT */}
                <div className="bg-purple-50/40 border border-purple-200/80 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block">
                    Motivo Informado por COT
                  </span>
                  <div className="text-base font-black text-slate-900">
                    "{selectedAuditItem.motivoCot}"
                  </div>
                  {selectedAuditItem.motivoCotDetalle && (
                    <div className="text-xs text-slate-600 italic">
                      "{selectedAuditItem.motivoCotDetalle}"
                    </div>
                  )}
                  <div className="pt-2">
                    {getCotConsistenciaBadge(selectedAuditItem.consistenciaCot, selectedAuditItem.esInconsistenciaCot)}
                  </div>
                  <p className="text-xs text-slate-700 pt-1 leading-normal">
                    {selectedAuditItem.detalleConsistencia}
                  </p>
                </div>

                {/* Evidencia de Repuesto */}
                <div className="bg-sky-50/40 border border-sky-200/80 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-bold text-sky-800 uppercase tracking-wider block">
                    Evidencia de Repuestos (Buzón & Stock)
                  </span>
                  {selectedAuditItem.tieneRepuestoBuzon ? (
                    <div className="space-y-1">
                      <div className="text-sm font-mono font-bold text-teal-800">
                        PN {selectedAuditItem.pnInstalado}
                      </div>
                      <div className="text-xs text-slate-700 font-medium">
                        {selectedAuditItem.descInstalado || 'S/D'}
                      </div>
                      <div className="pt-1 flex items-center gap-2">
                        {selectedAuditItem.esStockFijo ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Pertenece a Stock Fijo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                            No Pertenece a Stock Fijo (Central)
                          </span>
                        )}
                        {selectedAuditItem.stockFlow > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-800 border border-indigo-200">
                            Flow #{selectedAuditItem.stockFlow}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">
                      Sin instalación de repuesto registrada en Buzón de Movimientos.
                      {selectedAuditItem.stockFlow > 0 && (
                        <div className="text-sky-800 font-semibold pt-1 not-italic">
                          Existe solicitud Flow Stock N° {selectedAuditItem.stockFlow}.
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* 3. Evidencia Observable Paso a Paso */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                  Evidencia Observable Cruzada
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {selectedAuditItem.evidenciaObservable.map((ev, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold mt-0.5">•</span>
                      <span>{ev}</span>
                    </li>
                  ))}
                  {selectedAuditItem.solicitudPendienteDetalle && (
                    <li className="flex items-start gap-2 text-amber-800">
                      <span className="text-amber-600 font-bold mt-0.5">•</span>
                      <span>
                        Solicitud pendiente N° {selectedAuditItem.solicitudPendienteDetalle.nroSolicitud} de fecha {selectedAuditItem.solicitudPendienteDetalle.fechaSolicitudStr}. {selectedAuditItem.solicitudPendienteDetalle.cantStkCentral ? `Stock en Casa Central disponible: ${selectedAuditItem.solicitudPendienteDetalle.cantStkCentral} unidad(es) no despachadas.` : 'Desabastecimiento general en Central.'}
                      </span>
                    </li>
                  )}
                </ul>
              </div>

              {/* 4. Riesgos Operativos & Acciones Recomendadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-rose-50/40 border border-rose-200 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                    Riesgos Operativos Detectados
                  </span>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {selectedAuditItem.riesgosOperativos.map((r, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-teal-50/40 border border-teal-200 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block">
                    Acciones Recomendadas
                  </span>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {selectedAuditItem.accionesRecomendadas.map((a, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-teal-600 font-bold">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono">Auditoría completada con datos de Flow Pro & Metro</span>
              <button
                onClick={() => setSelectedAuditItem(null)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition shadow-xs"
              >
                Cerrar Auditoría
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
