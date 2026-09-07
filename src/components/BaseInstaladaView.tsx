import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  RotateCcw, 
  Download, 
  Layers, 
  Cpu, 
  Server, 
  Globe2, 
  UserCheck, 
  MapPin, 
  Store, 
  Briefcase, 
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  Calendar,
  Compass,
  Building
} from 'lucide-react';
import { BaseInstaladaClienteRow } from '../types';
import modelosDiscrepancias from '../data/modelosDiscrepanciasData.json';

interface BaseInstaladaViewProps {
  data: BaseInstaladaClienteRow[];
}

export const BaseInstaladaView: React.FC<BaseInstaladaViewProps> = ({ data }) => {
  // Set of missing models for quick warning badge
  const missingModelsSet = useMemo(() => {
    const set = new Set<string>();
    modelosDiscrepancias.missingModels.forEach(m => {
      set.add(m.modelo.toUpperCase().replace(/\s+/g, ' '));
    });
    return set;
  }, []);
  // 9 Dependent Filters ordered strictly by relevance
  const [filterFabricante, setFilterFabricante] = useState<string>('ALL');
  const [filterModelo, setFilterModelo] = useState<string>('ALL');
  const [filterMpcr, setFilterMpcr] = useState<string>('ALL');
  const [filterRed, setFilterRed] = useState<string>('ALL');
  const [filterTecnico, setFilterTecnico] = useState<string>('ALL');
  const [filterRegion, setFilterRegion] = useState<string>('ALL');
  const [filterPlantaCabecera, setFilterPlantaCabecera] = useState<string>('ALL');
  const [filterNegocio, setFilterNegocio] = useState<string>('ALL');
  const [filterRecaudador, setFilterRecaudador] = useState<string>('ALL');

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(40);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Dependent cascading options calculations
  // 1. Fabricante options (from all data)
  const fabricanteOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach(item => { if (item.fabricante) set.add(item.fabricante); });
    return Array.from(set).sort();
  }, [data]);

  // 2. Modelo options (dependent on Fabricante)
  const dataAfterFabricante = useMemo(() => {
    if (filterFabricante === 'ALL') return data;
    return data.filter(d => d.fabricante === filterFabricante);
  }, [data, filterFabricante]);

  const modeloOptions = useMemo(() => {
    const set = new Set<string>();
    dataAfterFabricante.forEach(item => { if (item.modelo) set.add(item.modelo); });
    return Array.from(set).sort();
  }, [dataAfterFabricante]);

  // 3. MPCR options (dependent on Fabricante + Modelo)
  const dataAfterModelo = useMemo(() => {
    if (filterModelo === 'ALL') return dataAfterFabricante;
    return dataAfterFabricante.filter(d => d.modelo === filterModelo);
  }, [dataAfterFabricante, filterModelo]);

  const mpcrOptions = useMemo(() => {
    const set = new Set<string>();
    dataAfterModelo.forEach(item => { if (item.mpcr) set.add(item.mpcr); });
    return Array.from(set).sort();
  }, [dataAfterModelo]);

  // 4. Red options (dependent on 1..3)
  const dataAfterMpcr = useMemo(() => {
    if (filterMpcr === 'ALL') return dataAfterModelo;
    return dataAfterModelo.filter(d => d.mpcr === filterMpcr);
  }, [dataAfterModelo, filterMpcr]);

  const redOptions = useMemo(() => {
    const set = new Set<string>();
    dataAfterMpcr.forEach(item => { if (item.red) set.add(item.red); });
    return Array.from(set).sort();
  }, [dataAfterMpcr]);

  // 5. Tecnico options (dependent on 1..4)
  const dataAfterRed = useMemo(() => {
    if (filterRed === 'ALL') return dataAfterMpcr;
    return dataAfterMpcr.filter(d => d.red === filterRed);
  }, [dataAfterMpcr, filterRed]);

  const tecnicoOptions = useMemo(() => {
    const set = new Set<string>();
    dataAfterRed.forEach(item => { if (item.tecnicoZona) set.add(item.tecnicoZona); });
    return Array.from(set).sort();
  }, [dataAfterRed]);

  // 6. Region options (dependent on 1..5)
  const dataAfterTecnico = useMemo(() => {
    if (filterTecnico === 'ALL') return dataAfterRed;
    return dataAfterRed.filter(d => d.tecnicoZona === filterTecnico);
  }, [dataAfterRed, filterTecnico]);

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    dataAfterTecnico.forEach(item => { if (item.region) set.add(item.region); });
    return Array.from(set).sort();
  }, [dataAfterTecnico]);

  // 7. Planta Cabecera options (dependent on 1..6)
  const dataAfterRegion = useMemo(() => {
    if (filterRegion === 'ALL') return dataAfterTecnico;
    return dataAfterTecnico.filter(d => d.region === filterRegion);
  }, [dataAfterTecnico, filterRegion]);

  const plantaCabeceraOptions = useMemo(() => {
    const set = new Set<string>();
    dataAfterRegion.forEach(item => { if (item.plantaCabecera) set.add(item.plantaCabecera); });
    return Array.from(set).sort();
  }, [dataAfterRegion]);

  // 8. Negocio options (dependent on 1..7)
  const dataAfterPlantaCabecera = useMemo(() => {
    if (filterPlantaCabecera === 'ALL') return dataAfterRegion;
    return dataAfterRegion.filter(d => d.plantaCabecera === filterPlantaCabecera);
  }, [dataAfterRegion, filterPlantaCabecera]);

  const negocioOptions = useMemo(() => {
    const set = new Set<string>();
    dataAfterPlantaCabecera.forEach(item => { if (item.negocio) set.add(item.negocio); });
    return Array.from(set).sort();
  }, [dataAfterPlantaCabecera]);

  // 9. Recaudador options (dependent on 1..8)
  const dataAfterNegocio = useMemo(() => {
    if (filterNegocio === 'ALL') return dataAfterPlantaCabecera;
    return dataAfterPlantaCabecera.filter(d => d.negocio === filterNegocio);
  }, [dataAfterPlantaCabecera, filterNegocio]);

  const recaudadorOptions = useMemo(() => {
    const set = new Set<string>();
    dataAfterNegocio.forEach(item => { if (item.recaudador) set.add(item.recaudador); });
    return Array.from(set).sort();
  }, [dataAfterNegocio]);

  // Final filtered list with all 9 filters + Search
  const filteredData = useMemo(() => {
    let result = dataAfterNegocio;
    if (filterRecaudador !== 'ALL') {
      result = result.filter(d => d.recaudador === filterRecaudador);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(d => 
        d.cliente.toLowerCase().includes(q) ||
        d.atm.toLowerCase().includes(q) ||
        d.serie.toLowerCase().includes(q) ||
        d.direccion.toLowerCase().includes(q) ||
        d.localidad.toLowerCase().includes(q) ||
        d.provincia.toLowerCase().includes(q) ||
        d.tecnicoZona.toLowerCase().includes(q) ||
        d.mpcr.toLowerCase().includes(q) ||
        d.red.toLowerCase().includes(q)
      );
    }
    return result;
  }, [dataAfterNegocio, filterRecaudador, searchTerm]);

  // Auto-reset dependent filters if selected value is no longer present in valid options
  useEffect(() => {
    if (filterModelo !== 'ALL' && !modeloOptions.includes(filterModelo)) {
      setFilterModelo('ALL');
    }
  }, [modeloOptions, filterModelo]);

  useEffect(() => {
    if (filterMpcr !== 'ALL' && !mpcrOptions.includes(filterMpcr)) {
      setFilterMpcr('ALL');
    }
  }, [mpcrOptions, filterMpcr]);

  useEffect(() => {
    if (filterRed !== 'ALL' && !redOptions.includes(filterRed)) {
      setFilterRed('ALL');
    }
  }, [redOptions, filterRed]);

  useEffect(() => {
    if (filterTecnico !== 'ALL' && !tecnicoOptions.includes(filterTecnico)) {
      setFilterTecnico('ALL');
    }
  }, [tecnicoOptions, filterTecnico]);

  useEffect(() => {
    if (filterRegion !== 'ALL' && !regionOptions.includes(filterRegion)) {
      setFilterRegion('ALL');
    }
  }, [regionOptions, filterRegion]);

  useEffect(() => {
    if (filterPlantaCabecera !== 'ALL' && !plantaCabeceraOptions.includes(filterPlantaCabecera)) {
      setFilterPlantaCabecera('ALL');
    }
  }, [plantaCabeceraOptions, filterPlantaCabecera]);

  useEffect(() => {
    if (filterNegocio !== 'ALL' && !negocioOptions.includes(filterNegocio)) {
      setFilterNegocio('ALL');
    }
  }, [negocioOptions, filterNegocio]);

  useEffect(() => {
    if (filterRecaudador !== 'ALL' && !recaudadorOptions.includes(filterRecaudador)) {
      setFilterRecaudador('ALL');
    }
  }, [recaudadorOptions, filterRecaudador]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterFabricante, 
    filterModelo, 
    filterMpcr, 
    filterRed, 
    filterTecnico, 
    filterRegion, 
    filterPlantaCabecera, 
    filterNegocio, 
    filterRecaudador, 
    searchTerm, 
    pageSize
  ]);

  // Reset all filters function
  const handleResetFilters = () => {
    setFilterFabricante('ALL');
    setFilterModelo('ALL');
    setFilterMpcr('ALL');
    setFilterRed('ALL');
    setFilterTecnico('ALL');
    setFilterRegion('ALL');
    setFilterPlantaCabecera('ALL');
    setFilterNegocio('ALL');
    setFilterRecaudador('ALL');
    setSearchTerm('');
  };

  const hasActiveFilters = 
    filterFabricante !== 'ALL' ||
    filterModelo !== 'ALL' ||
    filterMpcr !== 'ALL' ||
    filterRed !== 'ALL' ||
    filterTecnico !== 'ALL' ||
    filterRegion !== 'ALL' ||
    filterPlantaCabecera !== 'ALL' ||
    filterNegocio !== 'ALL' ||
    filterRecaudador !== 'ALL' ||
    searchTerm.trim() !== '';

  // Pagination calculation
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Metrics for Top KPI cards
  const stats = useMemo(() => {
    const totalEquipos = filteredData.length;
    const clientesSet = new Set<string>();
    let atmCount = 0;
    let ctdCount = 0;

    filteredData.forEach(item => {
      if (item.cliente) clientesSet.add(item.cliente);
      if (item.negocio === 'Cash Today') ctdCount++;
      else atmCount++;
    });

    return {
      totalEquipos,
      totalClientes: clientesSet.size,
      atmCount,
      ctdCount
    };
  }, [filteredData]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'CLIENTE',
      'N° DE ATM',
      'N° DE SERIE',
      'DIRECCIÓN',
      'LOCALIDAD',
      'PROVINCIA',
      'DISTANCIA',
      'MPCR',
      'RED',
      'SLA',
      'TECNICO ZONA',
      'ANTIGUEDAD',
      'FECHA HABILITACION'
    ];

    const rows = filteredData.map(item => [
      `"${(item.cliente || '').replace(/"/g, '""')}"`,
      `"${(item.atm || '').replace(/"/g, '""')}"`,
      `"${(item.serie || '').replace(/"/g, '""')}"`,
      `"${(item.direccion || '').replace(/"/g, '""')}"`,
      `"${(item.localidad || '').replace(/"/g, '""')}"`,
      `"${(item.provincia || '').replace(/"/g, '""')}"`,
      `"${(item.distancia || '').replace(/"/g, '""')}"`,
      `"${(item.mpcr || '').replace(/"/g, '""')}"`,
      `"${(item.red || '').replace(/"/g, '""')}"`,
      `"${(item.sla || '').replace(/"/g, '""')}"`,
      `"${(item.tecnicoZona || '').replace(/"/g, '""')}"`,
      `"${(item.antiguedad || '').replace(/"/g, '""')}"`,
      `"${(item.fechaHabilitacion || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Base_Instalada_Clientes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Banner & KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Total Equipos Activos</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">{stats.totalEquipos.toLocaleString()}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">En base instalada oficial</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/30" />
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Clientes Atendidos</p>
              <h3 className="text-2xl font-bold text-blue-400 mt-1">{stats.totalClientes.toLocaleString()}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Bancos, entidades y redes</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Store className="w-6 h-6" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/30" />
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Base ATM (Bancarios / Orus)</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{stats.atmCount.toLocaleString()}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {stats.totalEquipos > 0 ? Math.round((stats.atmCount / stats.totalEquipos) * 100) : 0}% de la base
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/30" />
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Base Cash Today (CTD)</p>
              <h3 className="text-2xl font-bold text-purple-400 mt-1">{stats.ctdCount.toLocaleString()}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {stats.totalEquipos > 0 ? Math.round((stats.ctdCount / stats.totalEquipos) * 100) : 0}% de la base
              </p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500/30" />
        </div>
      </div>

      {/* 9 Dependent Cascading Filters Section */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                Filtros Dependientes en Cascada
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Orden de Relevancia
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                Las opciones de cada filtro se restringen automáticamente en base a las selecciones previas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                title="Restablecer todos los filtros a Todas"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Restablecer Filtros</span>
              </button>
            )}

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV ({filteredData.length})</span>
            </button>
          </div>
        </div>

        {/* The 9 Filters in exact order */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* 1. FABRICANTE */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">1</span>
              FABRICANTE
            </label>
            <select
              value={filterFabricante}
              onChange={(e) => setFilterFabricante(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todos los Fabricantes ({fabricanteOptions.length})</option>
              {fabricanteOptions.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* 2. MODELO */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">2</span>
              MODELO
            </label>
            <select
              value={filterModelo}
              onChange={(e) => setFilterModelo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todos los Modelos ({modeloOptions.length})</option>
              {modeloOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 3. MPCR */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">3</span>
              MPCR
            </label>
            <select
              value={filterMpcr}
              onChange={(e) => setFilterMpcr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todos los MPCR ({mpcrOptions.length})</option>
              {mpcrOptions.map(mp => (
                <option key={mp} value={mp}>{mp}</option>
              ))}
            </select>
          </div>

          {/* 4. RED */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">4</span>
              RED
            </label>
            <select
              value={filterRed}
              onChange={(e) => setFilterRed(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todas las Redes ({redOptions.length})</option>
              {redOptions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* 5. TECNICO */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">5</span>
              TECNICO
            </label>
            <select
              value={filterTecnico}
              onChange={(e) => setFilterTecnico(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todos los Técnicos ({tecnicoOptions.length})</option>
              {tecnicoOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 6. REGIÓN */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">6</span>
              REGIÓN
            </label>
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todas las Regiones ({regionOptions.length})</option>
              {regionOptions.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>

          {/* 7. PLANTA CABECERA */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">7</span>
              Planta Cabecera
            </label>
            <select
              value={filterPlantaCabecera}
              onChange={(e) => setFilterPlantaCabecera(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todas las Plantas ({plantaCabeceraOptions.length})</option>
              {plantaCabeceraOptions.map(pc => (
                <option key={pc} value={pc}>{pc}</option>
              ))}
            </select>
          </div>

          {/* 8. NEGOCIO */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">8</span>
              NEGOCIO
            </label>
            <select
              value={filterNegocio}
              onChange={(e) => setFilterNegocio(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todos los Negocios ({negocioOptions.length})</option>
              {negocioOptions.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* 9. RECAUDADOR */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">9</span>
              RECAUDADOR
            </label>
            <select
              value={filterRecaudador}
              onChange={(e) => setFilterRecaudador(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todos los Recaudadores ({recaudadorOptions.length})</option>
              {recaudadorOptions.map(rec => (
                <option key={rec} value={rec}>{rec}</option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              BUSCADOR RÁPIDO
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cliente, ATM, Serie, Localidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 placeholder-slate-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table: ONLY the 13 required columns */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        {/* Table Header Controls & Pagination Selector */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">
              Mostrando <span className="text-amber-400 font-bold">{filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> - <span className="text-amber-400 font-bold">{Math.min(currentPage * pageSize, filteredData.length)}</span> de <span className="text-amber-400 font-bold">{filteredData.length.toLocaleString()}</span> equipos
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Mostrar por página:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value={20}>20</option>
                <option value={40}>40</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Primera página"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-amber-400">
                Pág {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Última página"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 13-Column Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">CLIENTE</th>
                <th className="py-3 px-3">N° DE ATM</th>
                <th className="py-3 px-3">N° DE SERIE</th>
                <th className="py-3 px-3">DIRECCIÓN</th>
                <th className="py-3 px-3">LOCALIDAD</th>
                <th className="py-3 px-3">PROVINCIA</th>
                <th className="py-3 px-3 text-center">DISTANCIA</th>
                <th className="py-3 px-3">MPCR</th>
                <th className="py-3 px-3">RED</th>
                <th className="py-3 px-3 text-center">SLA</th>
                <th className="py-3 px-3">TECNICO ZONA</th>
                <th className="py-3 px-3">ANTIGUEDAD</th>
                <th className="py-3 px-3 text-center">FECHA HABILITACION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-medium">No se encontraron equipos que coincidan con los filtros seleccionados.</p>
                      <button
                        onClick={handleResetFilters}
                        className="mt-1 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/30 transition-colors"
                      >
                        Limpiar todos los filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => (
                  <tr 
                    key={`${row.atm}_${row.serie}_${idx}`}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* 1. CLIENTE */}
                    <td className="py-2.5 px-3 font-semibold text-slate-100 whitespace-nowrap">
                      {row.cliente || '-'}
                    </td>

                    {/* 2. N° DE ATM */}
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                      {row.atm || '-'}
                    </td>

                    {/* 3. N° DE SERIE */}
                    <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                      {row.serie || '-'}
                    </td>

                    {/* 4. DIRECCIÓN */}
                    <td className="py-2.5 px-3 text-slate-300 max-w-[220px] truncate" title={row.direccion}>
                      {row.direccion || '-'}
                    </td>

                    {/* 5. LOCALIDAD */}
                    <td className="py-2.5 px-3 text-slate-200 whitespace-nowrap font-medium">
                      {row.localidad || '-'}
                    </td>

                    {/* 6. PROVINCIA */}
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {row.provincia || '-'}
                    </td>

                    {/* 7. DISTANCIA */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 font-mono text-[11px] border border-slate-700">
                        {row.distancia ? `${row.distancia} km` : '0 km'}
                      </span>
                    </td>

                    {/* 8. MPCR */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {missingModelsSet.has((row.modelo || '').toUpperCase().replace(/\s+/g, ' ')) ? (
                        <span 
                          className="px-2 py-0.5 rounded bg-red-950/80 text-red-300 font-semibold text-[11px] border border-red-700/80 inline-flex items-center gap-1"
                          title="Este modelo no figura en la tabla Modelos de MPCR. Requiere alta."
                        >
                          <span>⚠️ Sin MPCR</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-semibold text-[11px] border border-indigo-500/20">
                          {row.mpcr || '-'}
                        </span>
                      )}
                    </td>

                    {/* 9. RED */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        row.red.toLowerCase().includes('link') 
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : row.red.toLowerCase().includes('banelco')
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                          : row.red.toLowerCase().includes('orus')
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {row.red || '-'}
                      </span>
                    </td>

                    {/* 10. SLA */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-slate-300">
                      {row.sla || '-'}
                    </td>

                    {/* 11. TECNICO ZONA */}
                    <td className="py-2.5 px-3 text-slate-200 whitespace-nowrap font-medium">
                      {row.tecnicoZona || '-'}
                    </td>

                    {/* 12. ANTIGUEDAD */}
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800/80 text-amber-300/90 font-medium text-[11px] border border-slate-700">
                        {row.antiguedad || '-'}
                      </span>
                    </td>

                    {/* 13. FECHA HABILITACION */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {row.fechaHabilitacion || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Bar */}
        <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40">
          <div className="text-xs text-slate-400">
            Página <span className="font-bold text-slate-200">{currentPage}</span> de <span className="font-bold text-slate-200">{totalPages}</span> ({filteredData.length.toLocaleString()} resultados)
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Primera página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-amber-400">
              Pág {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
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
