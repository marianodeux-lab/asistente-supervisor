import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Truck, 
  Search, 
  Download, 
  ExternalLink,
  Layers,
  Cpu,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { DespachoItem, RepuestosState } from '../types';

interface DespachosRepuestosViewProps {
  despachos: DespachoItem[];
  repuestos: RepuestosState;
}

export const DespachosRepuestosView: React.FC<DespachosRepuestosViewProps> = ({
  despachos,
  repuestos
}) => {
  const [searchDespachos, setSearchDespachos] = useState('');
  const [searchPartes, setSearchPartes] = useState('');

  // Pagination for Despachos
  const [pageSizeDespachos, setPageSizeDespachos] = useState<number>(20);
  const [currentPageDespachos, setCurrentPageDespachos] = useState<number>(1);

  // Pagination for Partes
  const [pageSizePartes, setPageSizePartes] = useState<number>(20);
  const [currentPagePartes, setCurrentPagePartes] = useState<number>(1);

  const filteredDespachos = useMemo(() => {
    return despachos.filter(d => {
      if (!searchDespachos.trim()) return true;
      const q = searchDespachos.toLowerCase();
      return (
        d.pedidoStock.toLowerCase().includes(q) ||
        d.reclamo.toLowerCase().includes(q) ||
        d.destino.toLowerCase().includes(q) ||
        d.tecnico.toLowerCase().includes(q) ||
        d.guia.toLowerCase().includes(q) ||
        d.transporte.toLowerCase().includes(q)
      );
    });
  }, [despachos, searchDespachos]);

  const totalPagesDespachos = Math.ceil(filteredDespachos.length / pageSizeDespachos) || 1;
  const paginatedDespachos = useMemo(() => {
    const start = (currentPageDespachos - 1) * pageSizeDespachos;
    return filteredDespachos.slice(start, start + pageSizeDespachos);
  }, [filteredDespachos, currentPageDespachos, pageSizeDespachos]);

  const filteredPartes = useMemo(() => {
    return repuestos.masUtilizados.filter(p => {
      if (!searchPartes.trim()) return true;
      const q = searchPartes.toLowerCase();
      return (
        p.pn.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q) ||
        p.fabricante.toLowerCase().includes(q) ||
        p.tipo.toLowerCase().includes(q)
      );
    });
  }, [repuestos.masUtilizados, searchPartes]);

  const totalPagesPartes = Math.ceil(filteredPartes.length / pageSizePartes) || 1;
  const paginatedPartes = useMemo(() => {
    const start = (currentPagePartes - 1) * pageSizePartes;
    return filteredPartes.slice(start, start + pageSizePartes);
  }, [filteredPartes, currentPagePartes, pageSizePartes]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Guías de Envío Activas</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-white mt-1">{despachos.length}</p>
          <span className="text-[11px] text-slate-400">Envíos registrados por Jet-Paq</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Repuestos Críticos en Tránsito</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-black text-blue-300 mt-1">
            {despachos.filter(d => d.reclamo !== '-').length}
          </p>
          <span className="text-[11px] text-slate-400">Asociados a reclamos específicos</span>
        </div>

        <div className="bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-500/40 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Piezas más Rotadas</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-black text-purple-300 mt-1">{repuestos.masUtilizados.length} PNs</p>
          <span className="text-[11px] text-purple-300/80">Control de stock móvil</span>
        </div>

      </div>

      {/* Grid: Despachos Activos vs Repuestos Más Usados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Despachos Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          
          <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Envíos de Repuestos (Guías)</h3>
            </div>
            
            <div className="relative w-40 sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchDespachos}
                onChange={(e) => { setSearchDespachos(e.target.value); setCurrentPageDespachos(1); }}
                placeholder="Guía, técnico, destino..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-950 z-10">
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-2.5 px-3">Pedido Stock</th>
                  <th className="py-2.5 px-3">Destino / Técnico</th>
                  <th className="py-2.5 px-3">Guía / Transporte</th>
                  <th className="py-2.5 px-3 text-right">Reclamo Asoc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedDespachos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No se encontraron despachos activos.
                    </td>
                  </tr>
                ) : (
                  paginatedDespachos.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-800/50 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                        #{d.pedidoStock}
                        <span className="text-[10px] text-slate-400 block font-normal">{d.fechaAlta?.split('T')[0]}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-white block">{d.destino}</span>
                        <span className="text-[11px] text-slate-300">{d.tecnico}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-emerald-400 block font-semibold">{d.guia}</span>
                        <span className="text-[10px] text-slate-400">{d.transporte}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {d.reclamo && d.reclamo !== '-' && d.reclamo !== '0' ? (
                          <span className="bg-amber-950 border border-amber-800 text-amber-300 font-mono text-[11px] px-1.5 py-0.5 rounded font-bold">
                            #{d.reclamo}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Despachos Pagination */}
          <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Filas:</span>
              <select
                value={pageSizeDespachos}
                onChange={(e) => { setPageSizeDespachos(Number(e.target.value)); setCurrentPageDespachos(1); }}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-200 text-xs focus:outline-none"
              >
                <option value={20}>20</option>
                <option value={40}>40</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span className="text-slate-500">
                {filteredDespachos.length} envíos
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPageDespachos(1)}
                disabled={currentPageDespachos === 1}
                className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPageDespachos(p => Math.max(1, p - 1))}
                disabled={currentPageDespachos === 1}
                className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-xs font-mono text-slate-200">
                {currentPageDespachos}/{totalPagesDespachos}
              </span>
              <button
                onClick={() => setCurrentPageDespachos(p => Math.min(totalPagesDespachos, p + 1))}
                disabled={currentPageDespachos === totalPagesDespachos}
                className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPageDespachos(totalPagesDespachos)}
                disabled={currentPageDespachos === totalPagesDespachos}
                className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Repuestos Más Usados */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          
          <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Partes y Repuestos más Utilizados</h3>
            </div>

            <div className="relative w-40 sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchPartes}
                onChange={(e) => { setSearchPartes(e.target.value); setCurrentPagePartes(1); }}
                placeholder="PN o descripción..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {paginatedPartes.length === 0 ? (
              <p className="text-center py-8 text-slate-500 text-xs">No se encontraron partes coincidentes.</p>
            ) : (
              paginatedPartes.map((p) => (
                <div key={p.pn} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                        {p.pn}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                        {p.fabricante}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white mt-1 leading-snug">{p.descripcion}</p>
                    <span className="text-[10px] text-slate-400">{p.tipo}</span>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Consumidas</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">{p.cantidad}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Partes Pagination */}
          <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Filas:</span>
              <select
                value={pageSizePartes}
                onChange={(e) => { setPageSizePartes(Number(e.target.value)); setCurrentPagePartes(1); }}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-200 text-xs focus:outline-none"
              >
                <option value={20}>20</option>
                <option value={40}>40</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span className="text-slate-500">
                {filteredPartes.length} PNs
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPagePartes(1)}
                disabled={currentPagePartes === 1}
                className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPagePartes(p => Math.max(1, p - 1))}
                disabled={currentPagePartes === 1}
                className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-xs font-mono text-slate-200">
                {currentPagePartes}/{totalPagesPartes}
              </span>
              <button
                onClick={() => setCurrentPagePartes(p => Math.min(totalPagesPartes, p + 1))}
                disabled={currentPagePartes === totalPagesPartes}
                className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPagePartes(totalPagesPartes)}
                disabled={currentPagePartes === totalPagesPartes}
                className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
