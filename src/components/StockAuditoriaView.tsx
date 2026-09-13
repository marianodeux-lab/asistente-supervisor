import React, { useState, useMemo } from 'react';
import { 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Download, 
  Filter, 
  ShieldAlert, 
  RefreshCw, 
  QrCode, 
  Layers, 
  Truck, 
  RotateCcw,
  Clock,
  User,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { StockAuditoriaState, TecnicoStockAuditoria } from '../types';

interface StockAuditoriaViewProps {
  data: StockAuditoriaState;
  onRefresh?: () => void;
}

export const StockAuditoriaView: React.FC<StockAuditoriaViewProps> = ({
  data,
  onRefresh
}) => {
  const [filterScope, setFilterScope] = useState<'MIS_TECNICOS' | 'TODOS'>('MIS_TECNICOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTecNorm, setSelectedTecNorm] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'DEUDA_RECAMBIOS' | 'RETORNOS_SEMANALES' | 'STOCK_COMPLETO'>('DEUDA_RECAMBIOS');

  // Filter technicians
  const filteredTecs = useMemo(() => {
    return data.tecnicos.filter(t => {
      if (filterScope === 'MIS_TECNICOS' && !t.esMiTecnico) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.nombre.toLowerCase().includes(q) ||
        t.zonaTecnica.toLowerCase().includes(q) ||
        t.zonaLocal.toLowerCase().includes(q) ||
        t.deudaRecambios.some(d => d.pn.toLowerCase().includes(q) || d.idUnico.toLowerCase().includes(q) || d.pedRetiro.includes(q)) ||
        t.retornosSemanales.some(r => r.pn.toLowerCase().includes(q) || r.idUnico.toLowerCase().includes(q) || r.pedidoCot.includes(q))
      );
    });
  }, [data.tecnicos, filterScope, searchQuery]);

  // Selected technician
  const selectedTec = useMemo(() => {
    if (selectedTecNorm) {
      const found = filteredTecs.find(t => t.norm === selectedTecNorm);
      if (found) return found;
    }
    return filteredTecs.length > 0 ? filteredTecs[0] : null;
  }, [filteredTecs, selectedTecNorm]);

  // CSV Export
  const handleExportTecDeuda = (tec: TecnicoStockAuditoria) => {
    const rows = [
      ['Técnico', tec.nombre],
      ['Zona Técnica', tec.zonaTecnica],
      ['Región', tec.region],
      ['Total Repuestos Adeudados', tec.totalAdeudado],
      [''],
      ['--- STOCK DEUDA (RECAMBIOS EN CAMPO) ---'],
      ['PN', 'Id Unico', 'Es GEN', 'Descripcion', 'Pedido Retiro', 'Luno', 'Cliente', 'Fecha'],
      ...tec.deudaRecambios.map(d => [
        d.pn, d.idUnico, d.esGen ? 'SI (-GEN)' : 'NO', `"${d.descripcion}"`, d.pedRetiro, d.codEquipo, `"${d.cliente}"`, d.fecha
      ]),
      [''],
      ['--- RETORNOS SEMANALES OBLIGATORIOS (FUERA DE STOCK FIJO / EXCEDENTES) ---'],
      ['PN', 'Id Unico', 'Motivo', 'Detalle', 'Pedido Cot Solicita', 'Cliente Cot', 'Fecha Mov'],
      ...tec.retornosSemanales.map(r => [
        r.pn, r.idUnico, r.motivo, `"${r.detalleMotivo}"`, r.pedidoCot, `"${r.cliente}"`, r.fechaMov
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Deuda_Repuestos_${tec.nombre.replace(/[^a-zA-Z0-9]/g, '_')}_${data.fechaCorte.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Adeudado General */}
        <div className="bg-gradient-to-br from-red-950/80 via-slate-900 to-slate-950 border border-red-500/50 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-300">Total Adeudado a Devolver</span>
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-white">{data.totalAdeudadoRegion} <span className="text-sm font-semibold text-red-300">piezas</span></p>
            <span className="text-[11px] text-slate-300 mt-1 block">
              Suma de Stock Deuda + Retornos Semanales
            </span>
          </div>
        </div>

        {/* Stock Deuda Recambios */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Stock Deuda (Recambios)</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-white">{data.totalStockDeudaRegion}</p>
              <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                {data.totalGenRegion} con -GEN
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Piezas cambiadas en campo pendientes de lab
            </span>
          </div>
        </div>

        {/* Retornos Semanales */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Retornos Semanales</span>
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-purple-200">{data.totalRetornosSemanalesRegion} <span className="text-sm font-semibold text-purple-400">piezas</span></p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Pedidas para services no usadas o excedentes SF
            </span>
          </div>
        </div>

        {/* Técnicos con Deuda */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Técnicos Involucrados</span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <User className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-white">{data.totalTecnicosConDeuda} <span className="text-sm font-semibold text-slate-400">de {data.tecnicos.filter(t => t.esMiTecnico).length}</span></p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Supervisión Patagonia & Suroeste
            </span>
          </div>
        </div>

      </div>

      {/* Control Bar: Scope, Search and Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterScope('MIS_TECNICOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              filterScope === 'MIS_TECNICOS'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Mis Técnicos (Patagonia & Suroeste)</span>
            <span className="text-[10px] bg-slate-950/30 px-1.5 py-0.2 rounded font-black">
              {data.tecnicos.filter(t => t.esMiTecnico).length}
            </span>
          </button>

          <button
            onClick={() => setFilterScope('TODOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              filterScope === 'TODOS'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Todos los Técnicos (País)</span>
            <span className="text-[10px] bg-slate-950/30 px-1.5 py-0.2 rounded font-black">
              {data.tecnicos.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar técnico, PN, Luno o pedido..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Refrescar auditoría"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>

      {/* Master-Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Technicians Ranking (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[680px]">
          
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Ranking de Deuda por Técnico</h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {filteredTecs.length} técnicos
            </span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-1">
            {filteredTecs.map((t) => {
              const isSelected = selectedTec?.norm === t.norm;
              const isCritical = t.totalAdeudado >= 15;
              const isWarning = t.totalAdeudado >= 5 && t.totalAdeudado < 15;

              return (
                <div
                  key={t.norm}
                  onClick={() => setSelectedTecNorm(t.norm)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-500/15 border border-amber-500/60 shadow-lg shadow-amber-500/10'
                      : 'hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{t.nombre}</span>
                      {t.zonaTecnica && (
                        <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.2 rounded">
                          {t.zonaTecnica}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <span>{t.zonaLocal || t.region}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-semibold">Deuda: {t.deudaRecambiosCount}</span>
                      <span>•</span>
                      <span className="text-purple-300 font-semibold">Retornos: {t.retornosSemanalesCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono flex items-center gap-1 ${
                      t.totalAdeudado === 0
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                        : isCritical
                        ? 'bg-red-950/80 text-red-300 border border-red-500/50 shadow-sm'
                        : isWarning
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      <span>{t.totalAdeudado}</span>
                      <span className="text-[9px] uppercase">pzas</span>
                    </div>

                    <ChevronRight className={`w-4 h-4 transition ${isSelected ? 'text-amber-400 translate-x-0.5' : 'text-slate-600'}`} />
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Column: Detailed Breakdown for Selected Technician (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[680px]">
          
          {selectedTec ? (
            <>
              {/* Header of Selected Technician */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{selectedTec.nombre}</h3>
                    <span className="text-xs bg-amber-500/20 text-amber-400 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                      {selectedTec.zonaTecnica} • {selectedTec.zonaLocal || selectedTec.region}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adeuda devolver un total de <strong className="text-red-400">{selectedTec.totalAdeudado} repuestos</strong> (Recambios: {selectedTec.deudaRecambiosCount} | Retornos Semanales: {selectedTec.retornosSemanalesCount})
                  </p>
                </div>

                <button
                  onClick={() => handleExportTecDeuda(selectedTec)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition self-end sm:self-center"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Exportar Deuda</span>
                </button>
              </div>

              {/* Sub-Tabs: Stock Deuda vs Retornos Semanales vs Todo */}
              <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 text-xs">
                <button
                  onClick={() => setActiveSubTab('DEUDA_RECAMBIOS')}
                  className={`pb-2.5 px-3 font-bold transition border-b-2 flex items-center gap-1.5 ${
                    activeSubTab === 'DEUDA_RECAMBIOS'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Stock Deuda (Recambios)</span>
                  <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                    {selectedTec.deudaRecambiosCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveSubTab('RETORNOS_SEMANALES')}
                  className={`pb-2.5 px-3 font-bold transition border-b-2 flex items-center gap-1.5 ${
                    activeSubTab === 'RETORNOS_SEMANALES'
                      ? 'border-purple-500 text-purple-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Retornos Semanales (Fuera de SF)</span>
                  <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                    {selectedTec.retornosSemanalesCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveSubTab('STOCK_COMPLETO')}
                  className={`pb-2.5 px-3 font-bold transition border-b-2 flex items-center gap-1.5 ${
                    activeSubTab === 'STOCK_COMPLETO'
                      ? 'border-blue-500 text-blue-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Stock Técnico Total</span>
                  <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                    {selectedTec.stockTecnicoTotalCount}
                  </span>
                </button>
              </div>

              {/* Table Body according to active sub-tab */}
              <div className="overflow-y-auto flex-1 p-3">
                
                {/* 1. STOCK DEUDA (RECAMBIOS) */}
                {activeSubTab === 'DEUDA_RECAMBIOS' && (
                  selectedTec.deudaRecambios.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 text-xs">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                      <p className="font-bold text-slate-300">¡Al día en Stock Deuda!</p>
                      <p className="text-[11px] mt-1">Este técnico no adeuda devolver repuestos cambiados en campo.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedTec.deudaRecambios.map((d, i) => (
                        <div key={i} className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5 hover:border-slate-700 transition">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-amber-400 text-xs">{d.pn}</span>
                                {d.esGen && (
                                  <span className="text-[10px] bg-purple-950 border border-purple-600 text-purple-300 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                                    <QrCode className="w-3 h-3" /> Sin QR Lab (-GEN)
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-200 mt-0.5 line-clamp-1">{d.descripcion}</p>
                            </div>

                            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex-shrink-0">
                              {d.idUnico}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                            <span>Ped. Retiro: <strong className="text-white font-mono">#{d.pedRetiro || '-'}</strong></span>
                            <span>•</span>
                            <span>Luno: <strong className="text-white font-mono">{d.codEquipo || '-'}</strong></span>
                            <span>•</span>
                            <span>Cliente: <strong className="text-slate-300">{d.cliente || '-'}</strong></span>
                            <span>•</span>
                            <span>Fecha: <strong>{d.fecha}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* 2. RETORNOS SEMANALES */}
                {activeSubTab === 'RETORNOS_SEMANALES' && (
                  selectedTec.retornosSemanales.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 text-xs">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
                      <p className="font-bold text-slate-300">¡Sin retornos semanales pendientes!</p>
                      <p className="text-[11px] mt-1">Todos los repuestos en su stock técnico corresponden exactamente a su Stock Fijo autorizado.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedTec.retornosSemanales.map((r, i) => (
                        <div key={i} className="p-3 bg-slate-950/80 border border-purple-900/40 rounded-xl space-y-1.5 hover:border-purple-700/60 transition">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-purple-300 text-xs">{r.pn}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                  r.motivo === 'FUERA_DE_STOCK_FIJO'
                                    ? 'bg-red-950/80 border border-red-700/60 text-red-300'
                                    : 'bg-amber-950/80 border border-amber-700/60 text-amber-300'
                                }`}>
                                  {r.motivo === 'FUERA_DE_STOCK_FIJO' ? 'NO ES STOCK FIJO' : 'EXCEDENTE SF'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-200 mt-0.5 line-clamp-1">{r.descripcion}</p>
                              <p className="text-[11px] text-amber-400/90 italic mt-0.5">{r.detalleMotivo}</p>
                            </div>

                            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex-shrink-0">
                              {r.idUnico}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                            {r.pedidoCot && r.pedidoCot !== '0' && (
                              <>
                                <span>Pedido Service: <strong className="text-white font-mono">#{r.pedidoCot}</strong></span>
                                <span>•</span>
                              </>
                            )}
                            {r.cliente && (
                              <>
                                <span>Para Cliente: <strong className="text-slate-300">{r.cliente}</strong></span>
                                <span>•</span>
                              </>
                            )}
                            <span>Asignado: <strong>{r.fechaMov}</strong></span>
                            {r.ubicacion && (
                              <>
                                <span>•</span>
                                <span>Ubic: <strong className="font-mono text-slate-300">{r.ubicacion}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {/* 3. STOCK TECNICO COMPLETO */}
                {activeSubTab === 'STOCK_COMPLETO' && (
                  <div className="space-y-1.5">
                    {selectedTec.stockTecnicoItems.map((st, i) => (
                      <div key={i} className="p-2.5 bg-slate-950/60 border border-slate-800/60 rounded-lg flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">{st.pn}</span>
                            {st.esStockFijo ? (
                              <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded font-semibold">
                                Stock Fijo Autorizado
                              </span>
                            ) : (
                              <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800/60 px-1.5 py-0.2 rounded font-semibold">
                                Retorno Semanal
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{st.descripcion}</p>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 flex-shrink-0">{st.idUnico}</span>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="py-24 text-center text-slate-500 text-xs">
              <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Selecciona un técnico de la lista para ver el desglose de su deuda de repuestos.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
