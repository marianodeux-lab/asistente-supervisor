import React, { useState, useMemo } from 'react';
import { 
  X, 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Store, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  Flame,
  Wrench,
  Sparkles,
  FileText,
  Navigation
} from 'lucide-react';
import { Ticket } from '../types';
import zonasReferencia from '../data/zonasTecnicosReferencia.json';
import { formatTimeClean } from '../utils/formatters';

interface TechnicianDailyAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  tecnicoNombre: string | null;
  activeDateStr: string;
  tomorrowDateStr: string;
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
}

export const TechnicianDailyAgendaModal: React.FC<TechnicianDailyAgendaModalProps> = ({
  isOpen,
  onClose,
  tecnicoNombre,
  activeDateStr,
  tomorrowDateStr,
  tickets,
  onSelectTicket
}) => {
  // Day Filter within Modal: 'HOY', 'MANANA', 'TODOS'
  const [modalDateFilter, setModalDateFilter] = useState<'HOY' | 'MANANA' | 'TODOS'>('HOY');

  // Technician Master Metadata
  const techInfo = useMemo(() => {
    if (!tecnicoNombre) return null;
    const found = zonasReferencia.find(z => z.nombre.toLowerCase() === tecnicoNombre.toLowerCase());
    return found || {
      nombre: tecnicoNombre,
      zonaTecnica: 'IN SUR',
      zonaLocal: 'General',
      region: 'PATAGONIA',
      atm: 0,
      cashToday: 0,
      subTotal: 0
    };
  }, [tecnicoNombre]);

  const isContractor = techInfo?.zonaLocal === 'Contratistas';

  // All tickets assigned to this technician
  const techAllTickets = useMemo(() => {
    if (!tecnicoNombre) return [];
    return tickets.filter(t => t.tecnico && t.tecnico.toLowerCase() === tecnicoNombre.toLowerCase());
  }, [tickets, tecnicoNombre]);

  // Filtered tickets based on selected day
  const filteredTickets = useMemo(() => {
    let list = techAllTickets;
    if (modalDateFilter === 'HOY') {
      list = list.filter(t => t.fCoorDate === activeDateStr || (t.fechaCoordinada && t.fechaCoordinada.includes(activeDateStr)));
    } else if (modalDateFilter === 'MANANA') {
      list = list.filter(t => t.fCoorDate === tomorrowDateStr || (t.fechaCoordinada && t.fechaCoordinada.includes(tomorrowDateStr)));
    }

    // Sort chronologically by coordinated hour / time
    return [...list].sort((a, b) => {
      const timeA = a.hCoor || a.fechaCoordinada || '99:99';
      const timeB = b.hCoor || b.fechaCoordinada || '99:99';
      return timeA.localeCompare(timeB);
    });
  }, [techAllTickets, modalDateFilter, activeDateStr, tomorrowDateStr]);

  // Counts for Day Tabs
  const countHoy = useMemo(() => {
    return techAllTickets.filter(t => t.fCoorDate === activeDateStr || (t.fechaCoordinada && t.fechaCoordinada.includes(activeDateStr))).length;
  }, [techAllTickets, activeDateStr]);

  const countManana = useMemo(() => {
    return techAllTickets.filter(t => t.fCoorDate === tomorrowDateStr || (t.fechaCoordinada && t.fechaCoordinada.includes(tomorrowDateStr))).length;
  }, [techAllTickets, tomorrowDateStr]);

  const countTodos = techAllTickets.length;

  // Day KPIs Breakdown
  const kpis = useMemo(() => {
    const scCount = filteredTickets.filter(t => t.concepto === 'SC' || t.esScVigente).length;
    const mpCount = filteredTickets.filter(t => t.concepto === 'MP' || t.concepto === 'MTM').length;
    const aiecCount = filteredTickets.filter(t => t.concepto === 'AIEC' || t.esAdicional).length;
    const criticalSla = filteredTickets.filter(t => t.slaPorcentaje >= 85 || t.hsSla <= 2).length;

    const firstTime = filteredTickets[0]?.hCoor || filteredTickets[0]?.fechaCoordinada;
    const lastTime = filteredTickets[filteredTickets.length - 1]?.hCoor || filteredTickets[filteredTickets.length - 1]?.fechaCoordinada;

    const localities = Array.from(new Set(filteredTickets.map(t => t.localidad).filter(Boolean)));

    return {
      total: filteredTickets.length,
      scCount,
      mpCount,
      aiecCount,
      criticalSla,
      firstTime: firstTime ? formatTimeClean(firstTime) : '--:--',
      lastTime: lastTime ? formatTimeClean(lastTime) : '--:--',
      localities
    };
  }, [filteredTickets]);

  if (!isOpen || !tecnicoNombre) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div 
        className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-amber-500/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg shadow-inner">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white tracking-wide">
                  {tecnicoNombre}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isContractor 
                    ? 'bg-purple-950/80 text-purple-300 border border-purple-700/60' 
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                }`}>
                  {isContractor ? 'Contratista de Zona' : 'Técnico Flow Patagonia'}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700 font-semibold">
                  {techInfo?.zonaTecnica} • {techInfo?.zonaLocal}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Itinerario cronológico de visitas coordinadas en agenda de campo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DAY SELECTOR TABS & SUMMARY KPI BAR */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Day Selector Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setModalDateFilter('HOY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  modalDateFilter === 'HOY'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Hoy ({activeDateStr})</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  modalDateFilter === 'HOY' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {countHoy}
                </span>
              </button>

              <button
                onClick={() => setModalDateFilter('MANANA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  modalDateFilter === 'MANANA'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Mañana ({tomorrowDateStr})</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  modalDateFilter === 'MANANA' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {countManana}
                </span>
              </button>

              <button
                onClick={() => setModalDateFilter('TODOS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  modalDateFilter === 'TODOS'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>Todos los Pedidos</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  modalDateFilter === 'TODOS' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {countTodos}
                </span>
              </button>
            </div>

            {/* Quick Time Window Span */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Jornada: </span>
                <span className="font-mono font-bold text-white">{kpis.firstTime}</span>
                <span className="text-slate-500">➜</span>
                <span className="font-mono font-bold text-white">{kpis.lastTime}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-semibold">Total Coordinados:</span>
              <span className="text-sm font-black text-white font-mono">{kpis.total}</span>
            </div>
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="text-[11px] text-amber-400 font-semibold">Service Calls (SC):</span>
              <span className="text-sm font-black text-amber-300 font-mono">{kpis.scCount}</span>
            </div>
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="text-[11px] text-purple-400 font-semibold">Preventivos (MP):</span>
              <span className="text-sm font-black text-purple-300 font-mono">{kpis.mpCount}</span>
            </div>
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
              <span className="text-[11px] text-cyan-400 font-semibold">Adicionales (AIEC):</span>
              <span className="text-sm font-black text-cyan-300 font-mono">{kpis.aiecCount}</span>
            </div>
          </div>

          {kpis.localities.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 overflow-x-auto pb-0.5">
              <Navigation className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="font-semibold text-slate-300">Localidades:</span>
              <span className="text-slate-400 truncate">{kpis.localities.join(' • ')}</span>
            </div>
          )}
        </div>

        {/* CHRONOLOGICAL VISITS LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Calendar className="w-10 h-10 mx-auto opacity-30 text-amber-400" />
              <p className="text-sm font-semibold">No se registran visitas coordinadas para este día.</p>
              <p className="text-xs text-slate-500">Puedes consultar la pestaña "Todos los Pedidos" para ver el total asignado.</p>
            </div>
          ) : (
            filteredTickets.map((t, idx) => {
              const hora = t.hCoor || formatTimeClean(t.fechaCoordinada);
              const isFirst = idx === 0;
              const isSc = t.concepto === 'SC' || t.esScVigente;
              const isMp = t.concepto === 'MP' || t.concepto === 'MTM';
              const isAiec = t.concepto === 'AIEC' || t.esAdicional;
              const isCriticalSla = t.slaPorcentaje >= 85 || t.hsSla <= 2;

              return (
                <div 
                  key={t.id || `visit-${idx}`}
                  className={`p-4 rounded-xl border transition-all relative group ${
                    isFirst 
                      ? 'bg-slate-950/80 border-emerald-500/50 shadow-md shadow-emerald-500/5' 
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                  }`}
                >
                  {/* Visita Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{hora} hs</span>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        isAiec ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                        isMp ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                        'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {isAiec ? '📌 AIEC' : isMp ? '🔄 Preventivo' : '🛠️ Service Call'}
                      </span>

                      <span className="font-mono font-bold text-white text-xs">
                        #{t.pedido}
                      </span>

                      {isFirst && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-black rounded-full uppercase">
                          1° Pedido de la Jornada
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Estado:</span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                        {t.estado}
                      </span>
                    </div>
                  </div>

                  {/* Visita Body */}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-400 font-medium">Cliente:</span>
                        <span className="font-bold text-white">{t.cliente}</span>
                        <span className="font-mono text-amber-400 font-semibold">(ATM {t.luno})</span>
                      </div>

                      {(t.clienteReal || t.sucursalRelevamiento) && (
                        <div className="text-[11px] text-amber-300 flex items-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                          <Store className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          <span>Sitio Real: <strong>{t.clienteReal || 'Sucursal'}</strong></span>
                          {t.sucursalRelevamiento && (
                            <span className="text-slate-400">({t.sucursalRelevamiento})</span>
                          )}
                        </div>
                      )}

                      <div className="flex items-start gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                        <span>{t.direccion}, {t.localidad}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {t.detalleFalla ? (
                        <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg text-slate-300 text-[11px] italic">
                          "{t.detalleFalla}"
                        </div>
                      ) : (
                        <p className="text-slate-500 italic text-[11px]">Sin detalle de falla registrado</p>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        {!isAiec && (
                          <div className={`flex items-center gap-1.5 text-xs font-mono font-bold ${
                            isCriticalSla ? 'text-red-400' : 'text-slate-300'
                          }`}>
                            {isCriticalSla && <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />}
                            <span>SLA: {t.slaPorcentaje}% ({t.hsSla}h rest.)</span>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            onClose();
                            onSelectTicket(t);
                          }}
                          className="ml-auto flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
                        >
                          <span>Ver Ficha Ticket</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {t.esMpDeficiente && (
                    <div className="mt-2.5 px-2.5 py-1 bg-rose-950/80 border border-rose-500/60 rounded-lg text-rose-300 text-[11px] font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                      <span>Alerta Operativa: MP preventivo realizado hace {t.diasDesdeUltimoMp} días</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>{filteredTickets.length} pedidos coordinados para {tecnicoNombre}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition"
          >
            Cerrar Agenda
          </button>
        </div>
      </div>
    </div>
  );
};
