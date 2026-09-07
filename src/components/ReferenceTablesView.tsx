import React, { useState, useMemo } from 'react';
import { 
  Database, 
  Search, 
  Package, 
  Tag, 
  MapPin, 
  Download, 
  AlertTriangle,
  Filter,
  TrendingUp,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Layers,
  Building,
  CheckCircle2,
  Sliders, 
  ChevronRight, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  AlertOctagon,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line 
} from 'recharts';
import { StockFijoItem, ModeloMpcrItem, CallRateBenchmark, ZonaTecnicoRef, BaseInstaladaAbmState, BaseInstaladaEquipo } from '../types';
import baseInstaladaData from '../data/baseInstaladaAbmData.json';
import modelosDiscrepancias from '../data/modelosDiscrepanciasData.json';

interface ReferenceTablesViewProps {
  stockFijo: StockFijoItem[];
  modelosMpcr: ModeloMpcrItem[];
  benchmarks: CallRateBenchmark[];
  zonasTecnicos: ZonaTecnicoRef[];
}

export const ReferenceTablesView: React.FC<ReferenceTablesViewProps> = ({
  stockFijo,
  modelosMpcr,
  benchmarks,
  zonasTecnicos
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'stock_fijo' | 'modelos_mpcr' | 'zonas_tecnicos' | 'base_instalada'>('stock_fijo');

  // Search & Filters for Stock Fijo
  const [sfSearch, setSfSearch] = useState('');
  const [sfTecnico, setSfTecnico] = useState('ALL');
  const [sfPageSize, setSfPageSize] = useState<number>(40);
  const [sfCurrentPage, setSfCurrentPage] = useState<number>(1);

  // Search & Filters for Modelos MPCR
  const [mpcrSubView, setMpcrSubView] = useState<'catalogo' | 'faltantes' | 'conciliacion'>('faltantes');
  const [mpcrSearch, setMpcrSearch] = useState('');
  const [mpcrFabricante, setMpcrFabricante] = useState('ALL');
  const [mpcrNegocio, setMpcrNegocio] = useState('ALL');
  const [mpcrPageSize, setMpcrPageSize] = useState<number>(40);
  const [mpcrCurrentPage, setMpcrCurrentPage] = useState<number>(1);
  const [faltantesSearch, setFaltantesSearch] = useState('');

  // Search & Filters for Zonas
  const [zonaSearch, setZonaSearch] = useState('');
  const [zonaRegion, setZonaRegion] = useState('ALL');
  const [zonasPageSize, setZonasPageSize] = useState<number>(40);
  const [zonasCurrentPage, setZonasCurrentPage] = useState<number>(1);

  // Search & Filters for Base Instalada ABM
  const abmData = baseInstaladaData as unknown as BaseInstaladaAbmState;
  const [selectedPeriodoIdx, setSelectedPeriodoIdx] = useState<number>(abmData.historialAbm.length - 1);
  const [abmTipoDetalle, setAbmTipoDetalle] = useState<'altas' | 'bajas' | 'modificaciones' | 'base_completa'>('altas');
  const [baseSearch, setBaseSearch] = useState('');
  const [baseNegocio, setBaseNegocio] = useState('ALL');
  const [baseZona, setBaseZona] = useState('ALL');
  const [baseTecnico, setBaseTecnico] = useState('ALL');
  const [basePageSize, setBasePageSize] = useState<number>(40);
  const [baseCurrentPage, setBaseCurrentPage] = useState<number>(1);
  const [abmPageSize, setAbmPageSize] = useState<number>(40);
  const [abmCurrentPage, setAbmCurrentPage] = useState<number>(1);

  // Unique Technicians in Stock Fijo
  const sfTecnicosList = useMemo(() => {
    const set = new Set<string>();
    stockFijo.forEach(s => { if (s.tecnico) set.add(s.tecnico); });
    return Array.from(set).sort();
  }, [stockFijo]);

  // Unique Fabricantes in Modelos MPCR
  const fabricantesList = useMemo(() => {
    const set = new Set<string>();
    modelosMpcr.forEach(m => { if (m.fabricante) set.add(m.fabricante); });
    return Array.from(set).sort();
  }, [modelosMpcr]);

  // Unique Technicians in Base Instalada
  const baseTecnicosList = useMemo(() => {
    const set = new Set<string>();
    abmData.baseActualAgosto.equipos.forEach(e => { if (e.tecnico) set.add(e.tecnico); });
    return Array.from(set).sort();
  }, [abmData]);

  // Unique Zones in Base Instalada
  const baseZonasList = useMemo(() => {
    const set = new Set<string>();
    abmData.baseActualAgosto.equipos.forEach(e => { if (e.zona) set.add(e.zona); });
    return Array.from(set).sort();
  }, [abmData]);

  // Filtered Stock Fijo (ONLY PN, Tecnico, Cantidad)
  const filteredSf = useMemo(() => {
    return stockFijo.filter(s => {
      if (sfSearch.trim()) {
        const q = sfSearch.toLowerCase();
        if (!s.pn.toLowerCase().includes(q) && !s.tecnico.toLowerCase().includes(q)) return false;
      }
      if (sfTecnico !== 'ALL' && s.tecnico !== sfTecnico) return false;
      return true;
    });
  }, [stockFijo, sfSearch, sfTecnico]);

  // Filtered Modelos MPCR
  const filteredMpcr = useMemo(() => {
    return modelosMpcr.filter(m => {
      if (mpcrSearch.trim()) {
        const q = mpcrSearch.toLowerCase();
        const match = 
          m.modeloBase.toLowerCase().includes(q) ||
          m.mpcr.toLowerCase().includes(q) ||
          m.fabricante.toLowerCase().includes(q) ||
          m.modelos.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (mpcrFabricante !== 'ALL' && m.fabricante !== mpcrFabricante) return false;
      if (mpcrNegocio !== 'ALL' && m.negocio !== mpcrNegocio) return false;
      return true;
    });
  }, [modelosMpcr, mpcrSearch, mpcrFabricante, mpcrNegocio]);

  // Filtered Zonas Técnicos
  const filteredZonas = useMemo(() => {
    return zonasTecnicos.filter(z => {
      const tecNombre = z.tecnico || z.nombre || '';
      const tecZona = z.codigoZona || z.zonaTecnica || '';
      if (zonaSearch.trim()) {
        const q = zonaSearch.toLowerCase();
        const match = 
          tecNombre.toLowerCase().includes(q) ||
          tecZona.toLowerCase().includes(q) ||
          (z.zonaLocal && z.zonaLocal.toLowerCase().includes(q)) ||
          (z.domicilio && z.domicilio.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (zonaRegion !== 'ALL' && z.region !== zonaRegion) return false;
      return true;
    });
  }, [zonasTecnicos, zonaSearch, zonaRegion]);

  // Filtered Base Instalada Actual
  const filteredBaseActual = useMemo(() => {
    return abmData.baseActualAgosto.equipos.filter(e => {
      if (baseSearch.trim()) {
        const q = baseSearch.toLowerCase();
        const match = 
          e.id.toLowerCase().includes(q) ||
          e.serie.toLowerCase().includes(q) ||
          e.cliente.toLowerCase().includes(q) ||
          e.modelo.toLowerCase().includes(q) ||
          e.localidad.toLowerCase().includes(q) ||
          e.direccion.toLowerCase().includes(q) ||
          e.tecnico.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (baseNegocio !== 'ALL' && e.negocio !== baseNegocio) return false;
      if (baseZona !== 'ALL' && e.zona !== baseZona) return false;
      if (baseTecnico !== 'ALL' && e.tecnico !== baseTecnico) return false;
      return true;
    });
  }, [abmData, baseSearch, baseNegocio, baseZona, baseTecnico]);

  // Active ABM Period item
  const currentAbmPeriod = abmData.historialAbm[selectedPeriodoIdx] || abmData.historialAbm[abmData.historialAbm.length - 1];

  // Export functions
  const handleExportSf = () => {
    const headers = ["Numero de Parte", "Tecnico", "Cantidad"];
    const rows = filteredSf.map(s => [s.pn, `"${s.tecnico}"`, s.cantMinima]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stock_fijo_asignado_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMpcr = () => {
    const headers = ["Fabricante", "Modelo Base", "MODELOS", "MPCR Normalizado", "Negocio", "Marca Desc", "Modelo Desc"];
    const rows = filteredMpcr.map(m => [`"${m.fabricante}"`, `"${m.modeloBase}"`, `"${m.modelos}"`, `"${m.mpcr}"`, m.negocio, `"${m.marcaDesc || ''}"`, `"${m.modeloDesc || ''}"`]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `modelos_mpcr_normalizados_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportZonas = () => {
    const headers = ["Tecnico", "Codigo Zona", "Region", "Base ATM", "Base Cash Today", "Zona Local", "Total Equipos"];
    const rows = filteredZonas.map(z => [
      `"${z.tecnico || z.nombre || ''}"`,
      z.codigoZona || z.zonaTecnica || '',
      z.region,
      z.baseAtm ?? z.atm ?? 0,
      z.baseCtd ?? z.cashToday ?? 0,
      z.zonaLocal,
      z.subTotal
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zonas_tecnicos_base_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportBaseActual = () => {
    const headers = ["ID Equipo", "Serie", "Cliente", "Modelo", "Marca", "Negocio", "Zona", "Tecnico", "Localidad", "Direccion", "Provincia", "Red"];
    const rows = filteredBaseActual.map(e => [
      e.id,
      `"${e.serie}"`,
      `"${e.cliente}"`,
      `"${e.modelo}"`,
      `"${e.marca}"`,
      e.negocio,
      e.zona,
      `"${e.tecnico}"`,
      `"${e.localidad}"`,
      `"${e.direccion}"`,
      `"${e.provincia || ''}"`,
      `"${e.red || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `base_instalada_supervisada_agosto_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination calculations for Stock Fijo
  const sfTotalPages = Math.ceil(filteredSf.length / sfPageSize) || 1;
  const sfPaginated = useMemo(() => {
    const start = (sfCurrentPage - 1) * sfPageSize;
    return filteredSf.slice(start, start + sfPageSize);
  }, [filteredSf, sfCurrentPage, sfPageSize]);

  // Pagination calculations for Modelos MPCR
  const mpcrTotalPages = Math.ceil(filteredMpcr.length / mpcrPageSize) || 1;
  const mpcrPaginated = useMemo(() => {
    const start = (mpcrCurrentPage - 1) * mpcrPageSize;
    return filteredMpcr.slice(start, start + mpcrPageSize);
  }, [filteredMpcr, mpcrCurrentPage, mpcrPageSize]);

  // Pagination calculations for Zonas
  const zonasTotalPages = Math.ceil(filteredZonas.length / zonasPageSize) || 1;
  const zonasPaginated = useMemo(() => {
    const start = (zonasCurrentPage - 1) * zonasPageSize;
    return filteredZonas.slice(start, start + zonasPageSize);
  }, [filteredZonas, zonasCurrentPage, zonasPageSize]);

  // Pagination calculations for Base Instalada & ABM
  const baseTotalPages = Math.ceil(filteredBaseActual.length / basePageSize) || 1;
  const basePaginated = useMemo(() => {
    const start = (baseCurrentPage - 1) * basePageSize;
    return filteredBaseActual.slice(start, start + basePageSize);
  }, [filteredBaseActual, baseCurrentPage, basePageSize]);

  const altasTotalPages = Math.ceil((currentAbmPeriod?.altasDetalle?.length || 0) / abmPageSize) || 1;
  const altasPaginated = useMemo(() => {
    const start = (abmCurrentPage - 1) * abmPageSize;
    return (currentAbmPeriod?.altasDetalle || []).slice(start, start + abmPageSize);
  }, [currentAbmPeriod, abmCurrentPage, abmPageSize]);

  const bajasTotalPages = Math.ceil((currentAbmPeriod?.bajasDetalle?.length || 0) / abmPageSize) || 1;
  const bajasPaginated = useMemo(() => {
    const start = (abmCurrentPage - 1) * abmPageSize;
    return (currentAbmPeriod?.bajasDetalle || []).slice(start, start + abmPageSize);
  }, [currentAbmPeriod, abmCurrentPage, abmPageSize]);

  const modifTotalPages = Math.ceil((currentAbmPeriod?.modificacionesDetalle?.length || 0) / abmPageSize) || 1;
  const modifPaginated = useMemo(() => {
    const start = (abmCurrentPage - 1) * abmPageSize;
    return (currentAbmPeriod?.modificacionesDetalle || []).slice(start, start + abmPageSize);
  }, [currentAbmPeriod, abmCurrentPage, abmPageSize]);

  return (
    <div className="space-y-6">
      
      {/* Top Selector of Reference Tables */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-2.5 rounded-xl border border-slate-800 shadow-xl">
        
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={() => setActiveSubTab('stock_fijo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'stock_fijo'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Stock Fijo Asignado (SF)</span>
            <span className="text-[10px] bg-slate-950/80 px-1.5 py-0.2 rounded-full font-mono text-amber-300">
              {stockFijo.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('modelos_mpcr')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'modelos_mpcr'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Modelos Normalizados (MPCR)</span>
            <span className="text-[10px] bg-slate-950/80 px-1.5 py-0.2 rounded-full font-mono text-amber-300">
              {modelosMpcr.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('zonas_tecnicos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'zonas_tecnicos'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Zonas & Base Técnicos a Cargo</span>
            <span className="text-[10px] bg-slate-950/80 px-1.5 py-0.2 rounded-full font-mono text-amber-300">
              {zonasTecnicos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('base_instalada')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'base_instalada'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-emerald-400 hover:text-white hover:bg-emerald-950/50 border border-emerald-500/30'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Base Instalada 2026 & Control ABM</span>
            <span className="text-[10px] bg-emerald-950 text-emerald-200 border border-emerald-500 px-1.5 py-0.2 rounded-full font-mono font-bold">
              {abmData.baseActualAgosto.totalSupervisado} activos
            </span>
          </button>

        </div>

        <span className="text-xs text-slate-400 hidden lg:inline font-mono">
          Fuente de Verdad: 20 Técnicos a Cargo
        </span>
      </div>

      {/* SUB-TAB 1: STOCK FIJO ASIGNADO (SF) */}
      {activeSubTab === 'stock_fijo' && (
        <div className="space-y-4">
          
          {/* Rules Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border border-amber-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  Regla de Supervisión: Stock Fijo (SF) vs Devolución Semanal
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed max-w-3xl">
                  Los repuestos en <strong>Stock Fijo</strong> están asignados para resolver <em>Service Calls (SC)</em> inmediatamente en primera visita y proteger el SLA. 
                  <span className="text-amber-300 font-semibold block mt-0.5">
                    Todos los repuestos solicitados que NO pertenezcan al Stock Fijo asignado deben ser devueltos semanalmente sin excepción.
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={handleExportSf}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Exportar SF</span>
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sfSearch}
                onChange={(e) => { setSfSearch(e.target.value); setSfCurrentPage(1); }}
                placeholder="Buscar por Número de Parte (PN) o Técnico..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-amber-400" /> Técnico:
              </span>
              <select
                value={sfTecnico}
                onChange={(e) => { setSfTecnico(e.target.value); setSfCurrentPage(1); }}
                className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-3 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">Todos los Técnicos ({sfTecnicosList.length})</option>
                {sfTecnicosList.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cleaned Table (ONLY PN, Tecnico, Cantidad) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Stock Fijo Asignado por Técnico</h3>
              <span className="text-xs text-slate-400 font-mono">
                Total: {filteredSf.length} piezas asignadas
              </span>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-950 z-10">
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 px-4">Número de Parte (PN)</th>
                    <th className="py-2.5 px-4">Técnico / Base Stock</th>
                    <th className="py-2.5 px-4 text-right">Cantidad Asignada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sfPaginated.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500">
                        No se encontraron registros de Stock Fijo con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    sfPaginated.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50 transition">
                        <td className="py-2.5 px-4 font-mono font-bold text-amber-400">{s.pn}</td>
                        <td className="py-2.5 px-4 font-semibold text-white">{s.tecnico}</td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="bg-slate-800 px-3 py-1 rounded font-mono font-bold text-xs text-emerald-400 border border-slate-700">
                            {s.cantMinima}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Registros por página:</span>
                <select
                  value={sfPageSize}
                  onChange={(e) => {
                    setSfPageSize(Number(e.target.value));
                    setSfCurrentPage(1);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value={20}>20</option>
                  <option value={40}>40</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span className="text-slate-500">
                  Mostrando {filteredSf.length > 0 ? (sfCurrentPage - 1) * sfPageSize + 1 : 0} - {Math.min(sfCurrentPage * sfPageSize, filteredSf.length)} de {filteredSf.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSfCurrentPage(1)}
                  disabled={sfCurrentPage === 1}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
                  title="Primera página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSfCurrentPage(p => Math.max(1, p - 1))}
                  disabled={sfCurrentPage === 1}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 py-0.5 text-xs text-slate-200 font-mono">
                  Pág. {sfCurrentPage} / {sfTotalPages}
                </span>
                <button
                  onClick={() => setSfCurrentPage(p => Math.min(sfTotalPages, p + 1))}
                  disabled={sfCurrentPage === sfTotalPages}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSfCurrentPage(sfTotalPages)}
                  disabled={sfCurrentPage === sfTotalPages}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUB-TAB 2: MODELOS NORMALIZADOS (MPCR) */}
      {activeSubTab === 'modelos_mpcr' && (
        <div className="space-y-4">
          
          {/* AUDIT ALERT BANNER - 10 MISSING MODELS DETECTED */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/60 border border-red-500/50 shadow-2xl space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      Auditoría de Modelos: Discrepancias Base Instalada vs Modelos MPCR
                    </h4>
                    <span className="px-2.5 py-0.5 bg-red-500/30 text-red-300 border border-red-500/60 text-xs font-black rounded-full">
                      {modelosDiscrepancias.missingCount} Modelos Faltantes (670 Equipos)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Se detectaron <strong className="text-red-400">{modelosDiscrepancias.missingCount} modelos de equipos</strong> que operan en la Base Instalada 2026 pero <strong className="text-amber-300 underline">NO figuran en la tabla Modelos de MPCR</strong>. Deben agregarse con su Negocio correspondiente (ATM o Cash Today) para asegurar la homologación y cálculo de Call Rate.
                  </p>
                </div>
              </div>

              {/* Subview Switcher Buttons */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 gap-1 flex-shrink-0">
                <button
                  onClick={() => setMpcrSubView('faltantes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    mpcrSubView === 'faltantes'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Modelos Faltantes ({modelosDiscrepancias.missingCount})</span>
                </button>

                <button
                  onClick={() => setMpcrSubView('catalogo')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    mpcrSubView === 'catalogo'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Catálogo MPCR ({modelosMpcr.length})</span>
                </button>

                <button
                  onClick={() => setMpcrSubView('conciliacion')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    mpcrSubView === 'conciliacion'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Matriz Base ({modelosDiscrepancias.totalBaseModels})</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW 1: MODELOS FALTANTES DETALLADOS */}
          {mpcrSubView === 'faltantes' && (
            <div className="space-y-3 animate-fadeIn">
              
              {/* Header Bar */}
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={faltantesSearch}
                    onChange={(e) => setFaltantesSearch(e.target.value)}
                    placeholder="Filtrar modelos faltantes..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <button
                  onClick={() => {
                    const headers = ["Modelo en Base", "Equipos en 2026", "Fabricante/Marca", "Negocio en Base", "Negocio Sugerido MPCR", "Clientes", "Meses"];
                    const rows = modelosDiscrepancias.missingModels.map(m => [
                      `"${m.modelo}"`,
                      m.count,
                      `"${m.marcas.join(', ')}"`,
                      `"${m.negociosInBase.join(', ')}"`,
                      `"${m.sugerenciaNegocio}"`,
                      `"${m.clientes.join('; ')}"`,
                      `"${m.sources.join(', ')}"`
                    ]);
                    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `modelos_faltantes_mpcr_${new Date().toISOString().slice(0, 10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center gap-1.5 bg-red-900/80 hover:bg-red-800 text-red-100 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-700 transition"
                >
                  <Download className="w-3.5 h-3.5 text-red-300" />
                  <span>Exportar {modelosDiscrepancias.missingCount} Modelos Faltantes (CSV)</span>
                </button>
              </div>

              {/* Table of 10 Missing Models */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                    <h3 className="text-sm font-bold text-white">
                      Detalle de Modelos Faltantes para dar de Alta en Tabla Modelos
                    </h3>
                  </div>
                  <span className="text-xs text-red-400 font-mono font-bold">
                    10 modelos • 670 equipos afectados
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Modelo en Base Instalada</th>
                        <th className="py-3 px-4 text-center">Equipos en Base</th>
                        <th className="py-3 px-4">Marca / Fabricante</th>
                        <th className="py-3 px-4">Negocio en Base</th>
                        <th className="py-3 px-4">Sugerencia de Negocio MPCR</th>
                        <th className="py-3 px-4">Clientes Principales</th>
                        <th className="py-3 px-4">Meses Presentes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {modelosDiscrepancias.missingModels
                        .filter(m => !faltantesSearch || m.modelo.toLowerCase().includes(faltantesSearch.toLowerCase()) || m.marcas.some(brand => brand.toLowerCase().includes(faltantesSearch.toLowerCase())))
                        .map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/60 transition">
                            <td className="py-3 px-4 text-slate-500 font-mono font-bold">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <span className="font-mono font-black text-amber-300 text-sm block">
                                {m.modelo}
                              </span>
                              <span className="text-[10px] text-red-400 font-semibold">
                                ⚠️ No registrado en Modelos MPCR
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 font-mono font-black text-white text-xs">
                                {m.count}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-200">
                                {m.marcas.join(', ') || 'Sin Marca'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {m.negociosInBase.join(', ') || 'No especificado'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                m.marcas.some(b => b.toLowerCase().includes('smart') || b.toLowerCase().includes('cima') || b.toLowerCase().includes('snbc')) || m.modelo.toLowerCase().includes('kisan') || m.modelo.toLowerCase().includes('inlane') || m.modelo.toLowerCase().includes('cti')
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                                  : 'bg-blue-950 text-blue-300 border border-blue-600'
                              }`}>
                                {m.marcas.some(b => b.toLowerCase().includes('smart') || b.toLowerCase().includes('cima') || b.toLowerCase().includes('snbc')) || m.modelo.toLowerCase().includes('kisan') || m.modelo.toLowerCase().includes('inlane') || m.modelo.toLowerCase().includes('cti')
                                  ? 'Cash Today (CTD)'
                                  : 'ATM (Bancario/Orus)'}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-[220px]">
                              <p className="truncate text-slate-300 text-[11px]" title={m.clientes.join(', ')}>
                                {m.clientes.slice(0, 2).join(', ')}{m.clientes.length > 2 ? ` (+${m.clientes.length - 2} más)` : ''}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[10px]">
                              {m.sources.length === 8 ? (
                                <span className="text-emerald-400 font-semibold">Todos los meses (Ene-Ago)</span>
                              ) : (
                                m.sources.join(', ')
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* VIEW 2: CATÁLOGO MAESTRO MODELOS MPCR */}
          {mpcrSubView === 'catalogo' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Filters */}
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={mpcrSearch}
                    onChange={(e) => { setMpcrSearch(e.target.value); setMpcrCurrentPage(1); }}
                    placeholder="Buscar por Modelo Base o MPCR..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <select
                    value={mpcrFabricante}
                    onChange={(e) => { setMpcrFabricante(e.target.value); setMpcrCurrentPage(1); }}
                    className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-3 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="ALL">Todos los Fabricantes</option>
                    {fabricantesList.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>

                  <select
                    value={mpcrNegocio}
                    onChange={(e) => { setMpcrNegocio(e.target.value); setMpcrCurrentPage(1); }}
                    className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-3 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="ALL">Todos los Negocios (ATM + Cash Today)</option>
                    <option value="ATM">ATM (Bancarios & Extrabancarios / Red Orus)</option>
                    <option value="Cash Today">Cash Today (CTD - Retail / Comercios)</option>
                  </select>

                  <button
                    onClick={handleExportMpcr}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Catálogo Maestro Modelos MPCR</h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Total: {filteredMpcr.length} modelos
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-950 z-10">
                      <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                        <th className="py-2.5 px-4">Fabricante</th>
                        <th className="py-2.5 px-4">Modelo Base</th>
                        <th className="py-2.5 px-4">Familia / Modelo</th>
                        <th className="py-2.5 px-4">MPCR Normalizado</th>
                        <th className="py-2.5 px-4">Negocio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {mpcrPaginated.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            No se encontraron modelos con los filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        mpcrPaginated.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/50 transition">
                            <td className="py-2.5 px-4 font-bold text-white">{m.fabricante}</td>
                            <td className="py-2.5 px-4 font-mono font-semibold text-amber-400">{m.modeloBase}</td>
                            <td className="py-2.5 px-4 text-slate-300">{m.modelos}</td>
                            <td className="py-2.5 px-4">
                              <span className="bg-purple-950 text-purple-300 px-2 py-0.5 rounded font-mono font-bold border border-purple-800">
                                {m.mpcr}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                m.negocio === 'ATM' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`} title={m.negocio === 'ATM' ? 'Bancario / Extrabancario (Red Orus)' : 'Cash Today (Retail)'}>
                                {m.negocio === 'ATM' ? 'ATM (Bancario/Orus)' : 'Cash Today (CTD)'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>Registros por página:</span>
                    <select
                      value={mpcrPageSize}
                      onChange={(e) => {
                        setMpcrPageSize(Number(e.target.value));
                        setMpcrCurrentPage(1);
                      }}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value={20}>20</option>
                      <option value={40}>40</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                    <span className="text-slate-500">
                      Mostrando {filteredMpcr.length > 0 ? (mpcrCurrentPage - 1) * mpcrPageSize + 1 : 0} - {Math.min(mpcrCurrentPage * mpcrPageSize, filteredMpcr.length)} de {filteredMpcr.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setMpcrCurrentPage(1)}
                      disabled={mpcrCurrentPage === 1}
                      className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
                      title="Primera página"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setMpcrCurrentPage(p => Math.max(1, p - 1))}
                      disabled={mpcrCurrentPage === 1}
                      className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
                      title="Página anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 py-0.5 text-xs text-slate-200 font-mono">
                      Pág. {mpcrCurrentPage} / {mpcrTotalPages}
                    </span>
                    <button
                      onClick={() => setMpcrCurrentPage(p => Math.min(mpcrTotalPages, p + 1))}
                      disabled={mpcrCurrentPage === mpcrTotalPages}
                      className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
                      title="Página siguiente"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setMpcrCurrentPage(mpcrTotalPages)}
                      disabled={mpcrCurrentPage === mpcrTotalPages}
                      className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
                      title="Última página"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* VIEW 3: MATRIZ DE CONCILIACIÓN BASE INSTALADA (135 MODELOS) */}
          {mpcrSubView === 'conciliacion' && (
            <div className="space-y-3 animate-fadeIn">
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    Matriz Completa de Conciliación (Base Instalada vs MPCR)
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-emerald-950 border border-emerald-700 text-emerald-300 px-2 py-0.5 rounded font-bold">
                      {modelosDiscrepancias.matchedCount} Conciliados
                    </span>
                    <span className="text-xs bg-red-950 border border-red-700 text-red-300 px-2 py-0.5 rounded font-bold">
                      {modelosDiscrepancias.missingCount} Discrepancias
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Modelo en Base</th>
                        <th className="py-2.5 px-4 text-center">Equipos 2026</th>
                        <th className="py-2.5 px-4">Marca Base</th>
                        <th className="py-2.5 px-4">Negocio Base</th>
                        <th className="py-2.5 px-4">Estado en MPCR</th>
                        <th className="py-2.5 px-4">Código MPCR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {modelosDiscrepancias.allBaseModelsWithStatus
                        .sort((a, b) => (a.estaEnMpcr === b.estaEnMpcr ? b.count - a.count : a.estaEnMpcr ? 1 : -1))
                        .map((m, idx) => (
                          <tr key={idx} className={`hover:bg-slate-800/50 transition ${!m.estaEnMpcr ? 'bg-red-950/20' : ''}`}>
                            <td className="py-2.5 px-4 font-mono font-bold text-white">
                              {m.modelo}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-semibold text-slate-300">
                              {m.count}
                            </td>
                            <td className="py-2.5 px-4 text-slate-300">{m.marca || '-'}</td>
                            <td className="py-2.5 px-4 text-slate-300">{m.negocio || '-'}</td>
                            <td className="py-2.5 px-4">
                              {m.estaEnMpcr ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Conciliado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                                  <AlertTriangle className="w-3 h-3 text-red-400" /> Falta en MPCR
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-amber-400 font-semibold">
                              {m.mpcrMatch}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* SUB-TAB 3: ZONAS & BASE TÉCNICOS */}
      {activeSubTab === 'zonas_tecnicos' && (
        <div className="space-y-4">
          
          {/* Suroeste Focus Notice */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 border border-blue-500/40 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Fuente de Verdad: 20 Técnicos a Cargo (Patagonia & Suroeste)
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Planilla oficial de técnicos asignados que define los filtros maestros de la app: <strong>Patagonia</strong> completa + <strong>Suroeste</strong> focalizado a <strong className="text-amber-400">IN BAR</strong> (Florencia Torres), <strong className="text-amber-400">IN CIP</strong> (Pablo Ibáñez) y <strong className="text-amber-400">IN NQN</strong> (Leonardo Lázaro).
                </p>
              </div>
            </div>

            <button
              onClick={handleExportZonas}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Exportar Base</span>
            </button>
          </div>

          {/* Search */}
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={zonaSearch}
                onChange={(e) => { setZonaSearch(e.target.value); setZonasCurrentPage(1); }}
                placeholder="Buscar por técnico o código de zona..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={zonaRegion}
              onChange={(e) => { setZonaRegion(e.target.value); setZonasCurrentPage(1); }}
              className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-3 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">Todas las Regiones</option>
              <option value="PATAGONIA">PATAGONIA</option>
              <option value="SUROESTE">SUROESTE (IN BAR / IN CIP / IN NQN)</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Técnicos y Zonas Asignadas</h3>
              <span className="text-xs text-slate-400 font-mono">
                Total: {filteredZonas.length} zonas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5 px-4">Técnico Asignado</th>
                    <th className="py-2.5 px-4">Código Zona</th>
                    <th className="py-2.5 px-4">Subzona Local</th>
                    <th className="py-2.5 px-4 text-center">Base ATM (Bancario / Orus)</th>
                    <th className="py-2.5 px-4 text-center">Base Cash Today (CTD)</th>
                    <th className="py-2.5 px-4 text-right">Total Equipos a Cargo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {zonasPaginated.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No se encontraron zonas con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    zonasPaginated.map((z, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50 transition">
                        <td className="py-2.5 px-4 font-bold text-white">{z.tecnico || z.nombre}</td>
                        <td className="py-2.5 px-4">
                          <span className="font-mono text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                            {z.codigoZona || z.zonaTecnica}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 font-medium">{z.zonaLocal} ({z.region})</td>
                        <td className="py-2.5 px-4 text-center font-mono text-blue-400 font-bold">{z.baseAtm ?? z.atm ?? 0}</td>
                        <td className="py-2.5 px-4 text-center font-mono text-emerald-400 font-bold">{z.baseCtd ?? z.cashToday ?? 0}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-white">{z.subTotal}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Registros por página:</span>
                <select
                  value={zonasPageSize}
                  onChange={(e) => {
                    setZonasPageSize(Number(e.target.value));
                    setZonasCurrentPage(1);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value={20}>20</option>
                  <option value={40}>40</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span className="text-slate-500">
                  Mostrando {filteredZonas.length > 0 ? (zonasCurrentPage - 1) * zonasPageSize + 1 : 0} - {Math.min(zonasCurrentPage * zonasPageSize, filteredZonas.length)} de {filteredZonas.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setZonasCurrentPage(1)}
                  disabled={zonasCurrentPage === 1}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
                  title="Primera página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZonasCurrentPage(p => Math.max(1, p - 1))}
                  disabled={zonasCurrentPage === 1}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 py-0.5 text-xs text-slate-200 font-mono">
                  Pág. {zonasCurrentPage} / {zonasTotalPages}
                </span>
                <button
                  onClick={() => setZonasCurrentPage(p => Math.min(zonasTotalPages, p + 1))}
                  disabled={zonasCurrentPage === zonasTotalPages}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZonasCurrentPage(zonasTotalPages)}
                  disabled={zonasCurrentPage === zonasTotalPages}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUB-TAB 4: BASE INSTALADA 2026 & CONTROL DE ABM */}
      {activeSubTab === 'base_instalada' && (
        <div className="space-y-6">

          {/* Master Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Control de Base Instalada & Registro Mensual de ABM (2026)
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    Corte Agosto 2026
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
                  Seguimiento de altas, bajas y reasignaciones mes a mes de los <strong>{abmData.baseActualAgosto.totalSupervisado} equipos supervisados</strong>. Permite auditar qué equipos ingresaron o salieron de la base en cada período mensual compartido por la compañía.
                </p>
              </div>
            </div>

            <button
              onClick={handleExportBaseActual}
              className="flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/50 px-3.5 py-2 rounded-xl text-xs font-bold transition flex-shrink-0"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar Base Agosto CSV</span>
            </button>
          </div>

          {/* KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Base Activa Actual</span>
                <Building className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-3xl font-black text-white mt-1">{abmData.baseActualAgosto.totalSupervisado}</p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                <span className="text-blue-400 font-semibold">{abmData.baseActualAgosto.atm} ATM</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{abmData.baseActualAgosto.ctd} CTD</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Altas Acumuladas 2026</span>
                <PlusCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-3xl font-black text-emerald-300 mt-1">
                +{abmData.historialAbm.reduce((acc, a) => acc + a.altasCount, 0)}
              </p>
              <span className="text-[11px] text-emerald-400/80">Equipos nuevos incorporados</span>
            </div>

            <div className="bg-gradient-to-br from-red-950/60 to-slate-900 border border-red-500/40 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-300">Bajas Acumuladas 2026</span>
                <MinusCircle className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-3xl font-black text-red-300 mt-1">
                -{abmData.historialAbm.reduce((acc, a) => acc + a.bajasCount, 0)}
              </p>
              <span className="text-[11px] text-red-300/80">Equipos retirados / desinstalados</span>
            </div>

            <div className="bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-500/40 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Variación Neta Anual</span>
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-black text-blue-300 mt-1">
                +{abmData.baseActualAgosto.totalSupervisado - abmData.resumenMensual[0].total}
              </p>
              <span className="text-[11px] text-blue-300/80">
                (De {abmData.resumenMensual[0].total} en Enero a {abmData.baseActualAgosto.totalSupervisado} en Agosto)
              </span>
            </div>

          </div>

          {/* Monthly Evolution Chart & Table */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Evolución Mensual de la Base Instalada (Enero - Agosto 2026)</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Crecimiento neto sostenido
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={abmData.resumenMensual} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} domain={[1150, 1300]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="atm" name="Equipos ATM" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="ctd" name="Equipos Cash Today" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>

          {/* ABM PERIOD AUDITOR & DETAILED INSPECTOR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            
            {/* Period Selector Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  Auditor de Movimientos ABM por Período
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecciona el salto mensual para ver el detalle nominal de altas, bajas y reasignaciones.
                </p>
              </div>

              {/* Select Period Dropdown */}
              <select
                value={selectedPeriodoIdx}
                onChange={(e) => setSelectedPeriodoIdx(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {abmData.historialAbm.map((abm, idx) => (
                  <option key={abm.periodo} value={idx}>
                    Período: {abm.periodo} ({abm.altasCount > 0 ? `+${abm.altasCount} altas` : ''} {abm.bajasCount > 0 ? `-${abm.bajasCount} bajas` : ''})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Period Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              
              <button
                onClick={() => setAbmTipoDetalle('altas')}
                className={`p-3.5 rounded-xl border text-left transition ${
                  abmTipoDetalle === 'altas'
                    ? 'bg-emerald-950/80 border-emerald-500 shadow-md shadow-emerald-950/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                  <span>Altas del Período</span>
                  <PlusCircle className="w-4 h-4" />
                </div>
                <p className="text-2xl font-black text-emerald-300 mt-1">+{currentAbmPeriod.altasCount}</p>
                <span className="text-[10px] text-slate-400">Ver equipos incorporados →</span>
              </button>

              <button
                onClick={() => setAbmTipoDetalle('bajas')}
                className={`p-3.5 rounded-xl border text-left transition ${
                  abmTipoDetalle === 'bajas'
                    ? 'bg-red-950/80 border-red-500 shadow-md shadow-red-950/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-red-400 font-bold">
                  <span>Bajas del Período</span>
                  <MinusCircle className="w-4 h-4" />
                </div>
                <p className="text-2xl font-black text-red-300 mt-1">-{currentAbmPeriod.bajasCount}</p>
                <span className="text-[10px] text-slate-400">Ver equipos retirados →</span>
              </button>

              <button
                onClick={() => setAbmTipoDetalle('modificaciones')}
                className={`p-3.5 rounded-xl border text-left transition ${
                  abmTipoDetalle === 'modificaciones'
                    ? 'bg-amber-950/80 border-amber-500 shadow-md shadow-amber-950/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
                  <span>Modificaciones</span>
                  <RefreshCw className="w-4 h-4" />
                </div>
                <p className="text-2xl font-black text-amber-300 mt-1">{currentAbmPeriod.modificacionesCount}</p>
                <span className="text-[10px] text-slate-400">Reasignaciones técnico/zona →</span>
              </button>

              <button
                onClick={() => setAbmTipoDetalle('base_completa')}
                className={`p-3.5 rounded-xl border text-left transition ${
                  abmTipoDetalle === 'base_completa'
                    ? 'bg-blue-950/80 border-blue-500 shadow-md shadow-blue-950/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-blue-400 font-bold">
                  <span>Base Nominal Total</span>
                  <Database className="w-4 h-4" />
                </div>
                <p className="text-2xl font-black text-blue-300 mt-1">{currentAbmPeriod.totalActual}</p>
                <span className="text-[10px] text-slate-400">Ver base completa activa →</span>
              </button>

            </div>

            {/* ABM Table Detail */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              
              <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  {abmTipoDetalle === 'altas' && <span className="text-emerald-400 font-bold">Detalle de Altas: {currentAbmPeriod.periodo} ({currentAbmPeriod.altasCount} equipos)</span>}
                  {abmTipoDetalle === 'bajas' && <span className="text-red-400 font-bold">Detalle de Bajas: {currentAbmPeriod.periodo} ({currentAbmPeriod.bajasCount} equipos)</span>}
                  {abmTipoDetalle === 'modificaciones' && <span className="text-amber-400 font-bold">Detalle de Reasignaciones: {currentAbmPeriod.periodo} ({currentAbmPeriod.modificacionesCount} cambios)</span>}
                  {abmTipoDetalle === 'base_completa' && <span className="text-blue-400 font-bold">Base Instalada Activa al cierre de {currentAbmPeriod.mesActual} ({filteredBaseActual.length} equipos)</span>}
                </h4>

                {abmTipoDetalle === 'base_completa' && (
                  <span className="text-[11px] text-slate-400">
                    Filtros activos: {baseNegocio} • {baseZona}
                  </span>
                )}
              </div>

              {/* Table for Altas */}
              {abmTipoDetalle === 'altas' && (
                <div>
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Equipo / Serie</th>
                          <th className="py-2.5 px-4">Cliente</th>
                          <th className="py-2.5 px-4">Modelo</th>
                          <th className="py-2.5 px-4">Negocio</th>
                          <th className="py-2.5 px-4">Técnico & Zona</th>
                          <th className="py-2.5 px-4">Localidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {altasPaginated.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No se registraron altas en este período mensual.
                            </td>
                          </tr>
                        ) : (
                          altasPaginated.map((a, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/50 transition">
                              <td className="py-2.5 px-4 font-mono font-bold text-emerald-400">
                                #{a.id}
                                <span className="text-[10px] text-slate-400 block font-normal">{a.serie}</span>
                              </td>
                              <td className="py-2.5 px-4 font-bold text-white">{a.cliente}</td>
                              <td className="py-2.5 px-4 text-slate-300 font-medium">{a.modelo}</td>
                              <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${a.negocio === 'ATM' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
                                  {a.negocio}
                                </span>
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="text-slate-200 block font-semibold">{a.tecnico}</span>
                                <span className="text-[11px] text-amber-400">{a.zona}</span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-300">{a.localidad}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Altas Pagination */}
                  <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>Registros:</span>
                      <select
                        value={abmPageSize}
                        onChange={(e) => { setAbmPageSize(Number(e.target.value)); setAbmCurrentPage(1); }}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-slate-200 text-xs focus:outline-none"
                      >
                        <option value={20}>20</option>
                        <option value={40}>40</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                      </select>
                      <span className="text-slate-500">
                        Total: {currentAbmPeriod.altasDetalle.length} altas
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAbmCurrentPage(1)}
                        disabled={abmCurrentPage === 1}
                        className="p-1 rounded bg-slate-950 border border-slate-800 disabled:opacity-30"
                      >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setAbmCurrentPage(p => Math.max(1, p - 1))}
                        disabled={abmCurrentPage === 1}
                        className="p-1 rounded bg-slate-950 border border-slate-800 disabled:opacity-30"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 text-xs font-mono text-slate-200">
                        {abmCurrentPage} / {altasTotalPages}
                      </span>
                      <button
                        onClick={() => setAbmCurrentPage(p => Math.min(altasTotalPages, p + 1))}
                        disabled={abmCurrentPage === altasTotalPages}
                        className="p-1 rounded bg-slate-950 border border-slate-800 disabled:opacity-30"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setAbmCurrentPage(altasTotalPages)}
                        disabled={abmCurrentPage === altasTotalPages}
                        className="p-1 rounded bg-slate-950 border border-slate-800 disabled:opacity-30"
                      >
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Table for Bajas */}
              {abmTipoDetalle === 'bajas' && (
                <div>
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Equipo / Serie</th>
                          <th className="py-2.5 px-4">Cliente</th>
                          <th className="py-2.5 px-4">Modelo</th>
                          <th className="py-2.5 px-4">Negocio</th>
                          <th className="py-2.5 px-4">Último Técnico & Zona</th>
                          <th className="py-2.5 px-4">Localidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {bajasPaginated.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              No se registraron bajas en este período mensual.
                            </td>
                          </tr>
                        ) : (
                          bajasPaginated.map((b, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/50 transition bg-red-950/10">
                              <td className="py-2.5 px-4 font-mono font-bold text-red-400">
                                #{b.id}
                                <span className="text-[10px] text-slate-400 block font-normal">{b.serie}</span>
                              </td>
                              <td className="py-2.5 px-4 font-bold text-white">{b.cliente}</td>
                              <td className="py-2.5 px-4 text-slate-300 font-medium">{b.modelo}</td>
                              <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.negocio === 'ATM' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
                                  {b.negocio}
                                </span>
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="text-slate-200 block font-semibold">{b.tecnico}</span>
                                <span className="text-[11px] text-amber-400">{b.zona}</span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-300">{b.localidad}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Bajas Pagination */}
                  <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>Registros:</span>
                      <select
                        value={abmPageSize}
                        onChange={(e) => { setAbmPageSize(Number(e.target.value)); setAbmCurrentPage(1); }}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-slate-200 text-xs focus:outline-none"
                      >
                        <option value={20}>20</option>
                        <option value={40}>40</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                      </select>
                      <span className="text-slate-500">
                        Total: {currentAbmPeriod.bajasDetalle.length} bajas
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAbmCurrentPage(1)}
                        disabled={abmCurrentPage === 1}
                        className="p-1 rounded bg-slate-950 border border-slate-800 disabled:opacity-30"
                      >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setAbmCurrentPage(p => Math.max(1, p - 1))}
                        disabled={abmCurrentPage === 1}
                        className="p-1 rounded bg-slate-950 border border-slate-800 disabled:opacity-30"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 text-xs font-mono text-slate-200">
                        {abmCurrentPage} / {bajasTotalPages}
                      </span>
                      <button
                        onClick={() => setAbmCurrentPage(p => Math.min(bajasTotalPages, p + 1))}
                        disabled={abmCurrentPage === bajasTotalPages}
                        className="p-1 rounded bg-slate-950 border border-slate-800 disabled:opacity-30"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setAbmCurrentPage(bajasTotalPages)}
                        disabled={abmCurrentPage === bajasTotalPages}
                        className="p-1 rounded bg-slate-950 border border-slate-800 disabled:opacity-30"
                      >
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Table for Modificaciones / Reasignaciones */}
              {abmTipoDetalle === 'modificaciones' && (
                <div>
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Equipo</th>
                          <th className="py-2.5 px-4">Cliente</th>
                          <th className="py-2.5 px-4">Cambios Registrados</th>
                          <th className="py-2.5 px-4">Técnico Actual</th>
                          <th className="py-2.5 px-4">Zona</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {modifPaginated.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">
                              No se registraron reasignaciones en este período mensual.
                            </td>
                          </tr>
                        ) : (
                          modifPaginated.map((m, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/50 transition">
                              <td className="py-2.5 px-4 font-mono font-bold text-amber-400">
                                #{m.equipo.id}
                              </td>
                              <td className="py-2.5 px-4 font-bold text-white">{m.equipo.cliente}</td>
                              <td className="py-2.5 px-4">
                                <div className="space-y-1">
                                  {m.changes.map((c, cIdx) => (
                                    <div key={cIdx} className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px]">
                                      <span className="text-amber-400 font-semibold">{c.campo}: </span>
                                      <span className="text-red-400 line-through mr-1">{c.antes}</span>
                                      <span className="text-emerald-400">→ {c.despues}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-slate-200 font-semibold">{m.equipo.tecnico}</td>
                              <td className="py-2.5 px-4 text-amber-400 font-mono">{m.equipo.zona}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Modificaciones Pagination */}
                  <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>Registros:</span>
                      <select
                        value={abmPageSize}
                        onChange={(e) => { setAbmPageSize(Number(e.target.value)); setAbmCurrentPage(1); }}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-slate-200 text-xs focus:outline-none"
                      >
                        <option value={20}>20</option>
                        <option value={40}>40</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                      </select>
                      <span className="text-slate-500">
                        Total: {currentAbmPeriod.modificacionesDetalle.length} cambios
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAbmCurrentPage(1)}
                        disabled={abmCurrentPage === 1}
                        className="p-1 rounded bg-slate-950 border border-slate-800 disabled:opacity-30"
                      >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setAbmCurrentPage(p => Math.max(1, p - 1))}
                        disabled={abmCurrentPage === 1}
                        className="p-1 rounded bg-slate-950 border border-slate-800 disabled:opacity-30"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 text-xs font-mono text-slate-200">
                        {abmCurrentPage} / {modifTotalPages}
                      </span>
                      <button
                        onClick={() => setAbmCurrentPage(p => Math.min(modifTotalPages, p + 1))}
                        disabled={abmCurrentPage === modifTotalPages}
                        className="p-1 rounded bg-slate-950 border border-slate-800 disabled:opacity-30"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setAbmCurrentPage(modifTotalPages)}
                        disabled={abmCurrentPage === modifTotalPages}
                        className="p-1 rounded bg-slate-950 border border-slate-800 disabled:opacity-30"
                      >
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Table for Base Completa Activa */}
              {abmTipoDetalle === 'base_completa' && (
                <div className="space-y-3 p-4">
                  {/* Filters Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={baseSearch}
                      onChange={(e) => { setBaseSearch(e.target.value); setBaseCurrentPage(1); }}
                      placeholder="Buscar por Equipo, Cliente, Técnico, Ciudad..."
                      className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 py-1.5 px-3 focus:outline-none focus:border-emerald-500 w-full sm:w-64"
                    />

                    <select
                      value={baseNegocio}
                      onChange={(e) => { setBaseNegocio(e.target.value); setBaseCurrentPage(1); }}
                      className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="ALL">Todos los Negocios (ATM + CTD)</option>
                      <option value="ATM">Solo ATM</option>
                      <option value="CTD">Solo Cash Today (CTD)</option>
                    </select>

                    <select
                      value={baseZona}
                      onChange={(e) => { setBaseZona(e.target.value); setBaseCurrentPage(1); }}
                      className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="ALL">Todas las Zonas ({baseZonasList.length})</option>
                      {baseZonasList.map(z => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>

                    <select
                      value={baseTecnico}
                      onChange={(e) => { setBaseTecnico(e.target.value); setBaseCurrentPage(1); }}
                      className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="ALL">Todos los Técnicos ({baseTecnicosList.length})</option>
                      {baseTecnicosList.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Equipo / Serie</th>
                          <th className="py-2.5 px-4">Cliente</th>
                          <th className="py-2.5 px-4">Modelo</th>
                          <th className="py-2.5 px-4">Negocio</th>
                          <th className="py-2.5 px-4">Técnico & Zona</th>
                          <th className="py-2.5 px-4">Localidad / Dirección</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {basePaginated.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500">
                              No se encontraron equipos con los filtros aplicados.
                            </td>
                          </tr>
                        ) : (
                          basePaginated.map((e, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/50 transition">
                              <td className="py-2.5 px-4 font-mono font-bold text-amber-400">
                                #{e.id}
                                <span className="text-[10px] text-slate-400 block font-normal">{e.serie}</span>
                              </td>
                              <td className="py-2.5 px-4 font-bold text-white">{e.cliente}</td>
                              <td className="py-2.5 px-4 text-slate-300">{e.modelo}</td>
                              <td className="py-2.5 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${e.negocio === 'ATM' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
                                  {e.negocio}
                                </span>
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="text-slate-200 block font-semibold">{e.tecnico}</span>
                                <span className="text-[11px] text-amber-400">{e.zona}</span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-300">
                                <span className="font-medium block">{e.localidad}</span>
                                <span className="text-[11px] text-slate-400 truncate max-w-xs block">{e.direccion}</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Base Completa Pagination */}
                  <div className="px-2 py-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>Registros:</span>
                      <select
                        value={basePageSize}
                        onChange={(e) => { setBasePageSize(Number(e.target.value)); setBaseCurrentPage(1); }}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-200 text-xs focus:outline-none"
                      >
                        <option value={20}>20</option>
                        <option value={40}>40</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                      </select>
                      <span className="text-slate-500">
                        Mostrando {filteredBaseActual.length > 0 ? (baseCurrentPage - 1) * basePageSize + 1 : 0} - {Math.min(baseCurrentPage * basePageSize, filteredBaseActual.length)} de {filteredBaseActual.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setBaseCurrentPage(1)}
                        disabled={baseCurrentPage === 1}
                        className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setBaseCurrentPage(p => Math.max(1, p - 1))}
                        disabled={baseCurrentPage === 1}
                        className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 text-xs font-mono text-slate-200">
                        {baseCurrentPage} / {baseTotalPages}
                      </span>
                      <button
                        onClick={() => setBaseCurrentPage(p => Math.min(baseTotalPages, p + 1))}
                        disabled={baseCurrentPage === baseTotalPages}
                        className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setBaseCurrentPage(baseTotalPages)}
                        disabled={baseCurrentPage === baseTotalPages}
                        className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

