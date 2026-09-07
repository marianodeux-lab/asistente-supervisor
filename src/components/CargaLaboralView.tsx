import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Clock, 
  MapPin, 
  Search, 
  TrendingUp, 
  Download, 
  ShieldCheck,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { CargaLaboralState, ZonaInfo } from '../types';

interface CargaLaboralViewProps {
  data: CargaLaboralState;
  zonas: ZonaInfo[];
}

export const CargaLaboralView: React.FC<CargaLaboralViewProps> = ({ data, zonas }) => {
  const [search, setSearch] = useState('');
  const [selectedZona, setSelectedZona] = useState<string>('ALL');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const { kpisGenerales, porTecnico } = data;

  const filtered = useMemo(() => {
    return porTecnico.filter(t => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const match = 
          t.tecnico.toLowerCase().includes(query) ||
          t.ciudad.toLowerCase().includes(query) ||
          t.zona.toLowerCase().includes(query);
        if (!match) return false;
      }
      if (selectedZona !== 'ALL' && t.zona !== selectedZona) return false;
      return true;
    });
  }, [porTecnico, search, selectedZona]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Tecnico", "Zona", "Ciudad", "Pedidos Atendidos", "KM Recorridos", "Horas Labor", "Horas Viaje", "SLA Efectivo %", "Ratio Eficiencia"];
    const rows = filtered.map(t => [
      `"${t.tecnico}"`,
      t.zona,
      `"${t.ciudad}"`,
      t.pedidosAtendidos,
      t.kmTotal,
      t.horasLabor,
      t.horasViaje,
      t.slaEfectivo,
      t.ratioEficiencia
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `carga_laboral_patagonia_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total KM Recorridos</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-white mt-1">
            {kpisGenerales.totalKmRecorridosMes.toLocaleString()} km
          </p>
          <span className="text-[11px] text-slate-400">Flota técnica en Patagonia</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Horas de Labor en Sitio</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-300 mt-1">
            {kpisGenerales.horasLaborTotales.toLocaleString()} hs
          </p>
          <span className="text-[11px] text-emerald-300/80">Tiempo efectivo de reparación</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Horas de Traslado / Viaje</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-black text-blue-300 mt-1">
            {kpisGenerales.horasViajeTotales.toLocaleString()} hs
          </p>
          <span className="text-[11px] text-slate-400">Rutas patagónicas</span>
        </div>

        <div className="bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-500/40 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Promedio Diario</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-black text-purple-300 mt-1">
            {kpisGenerales.promedioAsistenciasPorTecnicoDia} visitas
          </p>
          <span className="text-[11px] text-purple-300/80">Por técnico / día</span>
        </div>

      </div>

      {/* Chart: Horas Labor vs Viaje por Técnico */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Horas de Trabajo (Labor vs Traslado)</h3>
          </div>
          <span className="text-xs text-slate-400">Distribución horaria mensual</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filtered.slice(0, 12)} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
              <XAxis dataKey="tecnico" stroke="#94a3b8" fontSize={10} angle={-25} textAnchor="end" />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="horasLabor" name="Horas en Cliente (Labor)" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="horasViaje" name="Horas en Ruta (Viaje)" fill="#3b82f6" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Technician Detailed Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <h3 className="text-sm font-bold text-white">Carga Laboral y Rendimiento Individual</h3>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">
              {filtered.length} técnicos
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="relative w-full sm:w-48">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Buscar técnico o ciudad..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={selectedZona}
              onChange={(e) => { setSelectedZona(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-2 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todas las Zonas</option>
              {zonas.map(z => (
                <option key={z.id} value={z.id}>{z.nombre}</option>
              ))}
            </select>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition"
              title="Descargar tabla en CSV"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <th className="py-3 px-4">Técnico & Zona</th>
                <th className="py-3 px-4">Base / Ciudad</th>
                <th className="py-3 px-4 text-center">Visitas Atendidas</th>
                <th className="py-3 px-4 text-center">KM Recorridos</th>
                <th className="py-3 px-4 text-center">Labor / Viaje</th>
                <th className="py-3 px-4 text-center">Ratio Eficiencia</th>
                <th className="py-3 px-4 text-right">SLA Efectivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No se encontraron técnicos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginated.map((t) => (
                  <tr key={t.tecnico} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-bold text-white">
                      {t.tecnico}
                      <span className="text-[11px] text-amber-400 font-normal block">Zona {t.zona}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {t.ciudad}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-100">{t.pedidosAtendidos}</td>
                    <td className="py-3 px-4 text-center text-amber-400 font-mono font-semibold">{t.kmTotal} km</td>
                    <td className="py-3 px-4 text-center text-slate-300">
                      <span className="text-emerald-400 font-semibold">{t.horasLabor}h</span> / <span className="text-blue-400">{t.horasViaje}h</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-slate-200 border border-slate-700">
                        {t.ratioEficiencia}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-400">{t.slaEfectivo}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Técnicos por página:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-200 text-xs focus:outline-none"
            >
              <option value={20}>20</option>
              <option value={40}>40</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
            <span className="text-slate-500">
              Mostrando {filtered.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filtered.length)} de {filtered.length} técnicos
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-xs font-mono text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
