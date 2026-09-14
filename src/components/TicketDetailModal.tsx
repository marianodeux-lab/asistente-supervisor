import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  ExternalLink, 
  AlertTriangle, 
  Package, 
  CheckCircle2, 
  FileText,
  Radio,
  Flame,
  History,
  ArrowRightLeft,
  Tag,
  Wrench,
  Store,
  Building2
} from 'lucide-react';
import { Ticket, TecnicoInfo, EquipoCronico } from '../types';
import { formatTimeClean, formatSlaExpirationDisplay } from '../utils/formatters';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  tecnicos: TecnicoInfo[];
  cronicos: EquipoCronico[];
  onOpenCronicoDetail?: (cronico: EquipoCronico) => void;
  onUpdateTicket?: (updated: Ticket) => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  onClose,
  tecnicos,
  cronicos,
  onOpenCronicoDetail,
  onUpdateTicket
}) => {
  if (!ticket) return null;

  const [nota, setNota] = useState(ticket.notasSupervision || '');
  const [isSaved, setIsSaved] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'INTERVENCIONES' | 'REPUESTOS'>('INTERVENCIONES');

  const tecObj = tecnicos.find(t => t.nombre.toLowerCase() === ticket.tecnico.toLowerCase());
  const cronicoMatch = cronicos.find(c => c.luno === ticket.luno);

  const handleSaveNota = () => {
    if (onUpdateTicket) {
      onUpdateTicket({
        ...ticket,
        notasSupervision: nota
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const slaInfo = formatSlaExpirationDisplay(ticket.fechaVencimiento, ticket.slaPorcentaje, ticket.hsSla);
  const isAIEC = ticket.concepto === 'AIEC' || ticket.esAdicional;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              isAIEC ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
              slaInfo.isExpired ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              ticket.slaPorcentaje >= 85 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              ticket.slaPorcentaje >= 65 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Pedido #{ticket.pedido}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isAIEC 
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' 
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {isAIEC ? 'AIEC (Sin SLA)' : ticket.concepto}
                </span>
                {ticket.esAsignadoCOT && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                    Asignado Flow Android
                  </span>
                )}
                {ticket.esPedidoSuspendidoPrevio && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700 font-semibold">
                    Reanudado (Previamente Suspendido)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Cliente: <strong className="text-slate-200">{ticket.cliente}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* SLA Alert banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            isAIEC ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200' :
            slaInfo.isExpired ? 'bg-red-950/70 border-red-500 text-red-200 shadow-lg shadow-red-950/50' :
            ticket.slaPorcentaje >= 85 ? 'bg-red-950/40 border-red-500/40 text-red-200' :
            ticket.slaPorcentaje >= 65 ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' :
            'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
          }`}>
            <div className="flex items-center gap-3">
              <Flame className={`w-5 h-5 flex-shrink-0 ${slaInfo.isExpired ? 'text-red-400 animate-pulse' : ''}`} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider">
                  {isAIEC ? 'Atención Incluida en Contrato (AIEC)' : slaInfo.isExpired ? '🚨 Alerta de Incumplimiento de SLA' : 'Estado de SLA (Service Call)'}
                </p>
                <p className={`text-sm font-bold ${slaInfo.isExpired ? 'text-red-300' : ''}`}>
                  {isAIEC 
                    ? 'No computa para SLA • Incluido en Agenda de Ruta' 
                    : slaInfo.badgeTitle
                  }
                </p>
                {!isAIEC && <p className="text-xs opacity-90 font-medium">{slaInfo.badgeDesc}</p>}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs block text-slate-300">Última atención</span>
              <span className="text-xs font-bold bg-slate-900/80 px-2 py-1 rounded border border-slate-700 inline-block mt-0.5">
                {ticket.diasUltimaAtencion}
              </span>
            </div>
          </div>

          {/* BANNER: PEDIDO REANUDADO / SUSPENDIDO PREVIAMENTE */}
          {ticket.esPedidoSuspendidoPrevio && (
            <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500 shadow-md flex items-start gap-3 text-amber-200">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-300 text-sm">
                    ⏸️ Pedido Reanudado • Suspendido Previamente
                  </span>
                  {(ticket.suspensionPrevia?.codigoCierre || ticket.suspensionPrevia?.codCierre) && (
                    <span className="px-2 py-0.5 rounded bg-amber-900/80 text-amber-200 font-mono font-bold text-[10px] border border-amber-600">
                      {ticket.suspensionPrevia.codigoCierre || ticket.suspensionPrevia.codCierre}: {ticket.suspensionPrevia.descCierre || ticket.suspensionPrevia.desc}
                    </span>
                  )}
                </div>
                <p className="text-slate-200">
                  Este pedido coordinado en agenda coincide con una orden suspendida anteriormente en el equipo.
                  {ticket.suspensionPrevia?.tecnico && <span> Atendió previamente: <strong className="text-white">{ticket.suspensionPrevia.tecnico}</strong> ({ticket.suspensionPrevia.fecha}).</span>}
                </p>
                {(ticket.suspensionPrevia?.observaciones || ticket.suspensionPrevia?.obs) && (
                  <p className="text-slate-300 italic bg-slate-950/80 p-2 rounded border border-slate-800 text-[11px]">
                    Motivo previo de suspensión: "{ticket.suspensionPrevia.observaciones || ticket.suspensionPrevia.obs}"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Chronic Warning if matched */}
          {cronicoMatch && (
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-purple-300 text-xs">
                <Radio className="w-4 h-4 text-purple-400 animate-pulse flex-shrink-0" />
                <span>
                  <strong>¡Atención! Este equipo ({ticket.luno}) es CRÓNICO:</strong> acumula {cronicoMatch.totalFallas} intervenciones previas.
                </span>
              </div>
              {onOpenCronicoDetail && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenCronicoDetail(cronicoMatch);
                  }}
                  className="text-xs font-bold text-purple-300 hover:text-white underline ml-2 flex-shrink-0"
                >
                  Ver Historial Clínico →
                </button>
              )}
            </div>
          )}

          {/* RELEVAMIENTOS CASH TODAY: DISTINCIÓN DE CLIENTE REAL EN OBSERVACIONES */}
          {(ticket.clienteReal || (ticket.cliente && ticket.cliente.toUpperCase().includes('RELEVAMIENTOS CASH TODAY'))) && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-950 border border-amber-500/60 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-amber-300">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block text-amber-300">
                      Relevamiento de Sitio • Cash Today
                    </span>
                    <span className="text-[11px] text-slate-400">
                      En Flow el cliente figura unificado como <strong className="text-amber-300">RELEVAMIENTOS CASH TODAY</strong>, pero el cliente real a relevar surge de las observaciones:
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-950 text-amber-300 border border-amber-600">
                  Factibilidad Técnica
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cliente Comercial Real:</span>
                  <strong className="text-sm text-white font-bold block mt-0.5 text-amber-200">
                    {ticket.clienteReal || 'Identificado en Observaciones'}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sucursal / Local / Obra:</span>
                  <strong className="text-xs text-slate-200 font-semibold block mt-0.5">
                    {ticket.sucursalRelevamiento || 'Central / Punto de Sitio'}
                  </strong>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-300">
                  <span>Dirección del Relevamiento: <strong className="text-white font-medium">{ticket.direccionReal || ticket.direccion} ({ticket.localidadReal || ticket.localidad})</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Grid Info: Ubicación & Técnico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Ubicación y Sitio */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Ubicación & Sitio
              </h4>
              <p className="text-sm font-semibold text-white">{ticket.direccion || 'Dirección de cliente'}</p>
              <p className="text-xs text-slate-300">{ticket.localidad} - <span className="text-amber-400 font-semibold">{ticket.zona}</span></p>
              <p className="text-xs text-slate-400">Equipo: <strong className="text-slate-200 font-mono">{ticket.luno || '-'}</strong></p>
            </div>

            {/* Técnico Asignado */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  Técnico en Campo
                </h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  ticket.estado === 'SEG Asistencia' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                  ticket.estado === 'SEG Control Final' || ticket.estado === 'SEG Fin Asistencia' ? 'bg-blue-950 text-blue-300 border border-blue-700' :
                  ticket.estado === 'SEG Registrado' ? 'bg-amber-950 text-amber-300 border border-amber-700' :
                  'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {ticket.estado || 'SEG Registrado'}
                </span>
              </div>
              <p className="text-sm font-semibold text-white">{ticket.tecnico}</p>
              <p className="text-xs text-slate-300">{tecObj?.cargo || 'Técnico de Zona'} ({ticket.zona})</p>
              
              <div className="pt-1 space-y-1 text-xs">
                <p className="text-slate-400 flex items-center justify-between">
                  <span>Horario Coordinado:</span>
                  <strong className="text-slate-200 font-mono">
                    {formatTimeClean(ticket.hCoor ? `${ticket.fCoorDate || ''} ${ticket.hCoor}` : ticket.fechaCoordinada || '09:00')}
                  </strong>
                </p>
                <p className="text-slate-400 flex items-center justify-between">
                  <span>Informado al Móvil (Columna H):</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                    ticket.notificadoMovil || ticket.m === 'S'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {ticket.notificadoMovil || ticket.m === 'S' ? '📱 SÍ (M = S)' : 'NO (M = "")'}
                  </span>
                </p>
              </div>

              {tecObj?.cel && (
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href={`https://wa.me/${tecObj.cel.replace(/[^0-9]/g, '')}?text=Hola%20${encodeURIComponent(ticket.tecnico)},%20te%20contacto%20por%20el%20pedido%20${ticket.pedido}%20en%20${encodeURIComponent(ticket.cliente)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-md font-medium transition"
                  >
                    <Phone className="w-3 h-3" /> WhatsApp
                  </a>
                  <span className="text-xs text-slate-400">{tecObj.cel}</span>
                </div>
              )}
            </div>

          </div>

          {/* Detalle del Pedido & Observaciones del COT / Flow */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Detalle del Pedido & Observaciones de Flow
            </h4>
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
              {ticket.detalleFalla || 'Sin observaciones adicionales registradas.'}
            </div>
          </div>

          {/* CROSS-REFERENCE 1: BUZÓN DE MOVIMIENTOS (Repuestos Instalados/Retirados con Módulo + QR) */}
          {ticket.movimientosStock && ticket.movimientosStock.length > 0 && (
            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Repuestos en Buzón de Movimientos (Trazabilidad QR & Stock)
                </h4>
                <span className="text-[11px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  {ticket.movimientosStock.length} movimiento(s)
                </span>
              </div>
              
              <div className="space-y-2">
                {ticket.movimientosStock.map((m, idx) => (
                  <div key={idx} className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">Transacción: {m.fecha} {m.hora}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        m.esStockFijo 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {m.esStockFijo ? 'Stock Fijo Técnico' : 'Stock Central (Retorno Semanal)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Instalado */}
                      <div className="bg-slate-950/80 p-2 rounded border border-emerald-500/30">
                        <span className="text-[10px] text-emerald-400 font-bold block uppercase">Instala en Equipo:</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <strong className="font-mono text-white text-xs">{m.instalaBase || m.idInstala}</strong>
                          {m.instalaQr && m.instalaQr !== 'Sin QR' && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/40 font-mono font-bold" title="QR de Laboratorio">
                              QR #{m.instalaQr}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Retirado */}
                      <div className="bg-slate-950/80 p-2 rounded border border-red-500/30">
                        <span className="text-[10px] text-red-400 font-bold block uppercase">Retira p/ Laboratorio:</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <strong className="font-mono text-slate-300 text-xs">{m.retiraBase || m.idRetira || 'N/A'}</strong>
                          {m.retiraQr && m.retiraQr !== 'Sin QR' && (
                            <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.2 rounded border border-red-500/40 font-mono font-bold" title="QR Retirado">
                              QR #{m.retiraQr}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {m.obs && (
                      <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-1.5 rounded border border-slate-800/80">
                        "{m.obs}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CROSS-REFERENCE 2: HISTORIAL DEL EQUIPO (Intervenciones vs Repuestos Reemplazados Master LP) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveHistoryTab('INTERVENCIONES')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeHistoryTab === 'INTERVENCIONES'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Intervenciones Técnicas ({ticket.historialPrevioLuno?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveHistoryTab('REPUESTOS')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeHistoryTab === 'REPUESTOS'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Repuestos Reemplazados ({ticket.repuestosHistoricos?.length || 0})</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-emerald-400 font-semibold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
                  {ticket.cantidadVisitasHistoricas || 0} Visitas a Campo
                </span>
                {(ticket.cantidadSoporteRemoto || 0) > 0 && (
                  <span className="text-teal-400 font-semibold bg-teal-950/50 px-2 py-0.5 rounded border border-teal-800/50">
                    {ticket.cantidadSoporteRemoto} Soporte Remoto
                  </span>
                )}
              </div>
            </div>

            {/* TAB 1: Intervenciones Técnicas */}
            {activeHistoryTab === 'INTERVENCIONES' && (
              <div className="space-y-2">
                {ticket.historialPrevioLuno && ticket.historialPrevioLuno.length > 0 ? (
                  ticket.historialPrevioLuno.map((h, idx) => (
                    <div key={idx} className={`bg-slate-900/80 border p-2.5 rounded-lg text-xs space-y-1 ${
                      h.esSoporteRemoto ? 'border-teal-500/30' : 'border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-amber-400 font-bold">Pedido #{h.pedido}</span>
                          <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300 font-semibold">{h.concepto}</span>
                          
                          {h.esSoporteRemoto ? (
                            <span className="text-[10px] px-2 py-0.2 rounded font-bold uppercase bg-teal-950 text-teal-300 border border-teal-800">
                              Soporte Remoto (Mesa Monitoreo)
                            </span>
                          ) : h.codCierre ? (
                            <span className="text-[10px] px-2 py-0.2 rounded font-bold uppercase bg-slate-800 text-slate-200 border border-slate-700" title={h.cierreInfo?.desc}>
                              {h.codCierre}: {h.cierreInfo?.desc || ''}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-slate-400 text-[11px] font-mono">{h.fecha}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Intervino: <strong className="text-slate-300">{h.tecnico}</strong></span>
                        <span className="text-slate-500">{h.zona}</span>
                      </div>

                      {h.observaciones && (
                        <p className="text-[11px] text-slate-300 border-l-2 border-slate-700 pl-2 mt-1">
                          "{h.observaciones}"
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">No se registran intervenciones previas en este equipo.</p>
                )}
              </div>
            )}

            {/* TAB 2: Repuestos Reemplazados (Trazabilidad Master LP) */}
            {activeHistoryTab === 'REPUESTOS' && (
              <div className="space-y-2">
                {ticket.repuestosHistoricos && ticket.repuestosHistoricos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400 font-semibold">
                          <th className="py-2 px-2.5">Fecha</th>
                          <th className="py-2 px-2.5">Pedido</th>
                          <th className="py-2 px-2.5">Técnico</th>
                          <th className="py-2 px-2.5">Repuesto Instalado</th>
                          <th className="py-2 px-2.5">Repuesto Retirado</th>
                          <th className="py-2 px-2.5">Origen Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {ticket.repuestosHistoricos.map((rep, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/60 transition">
                            <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                              {rep.fecha}
                              {rep.hora && <span className="text-[10px] text-slate-500 block">{rep.hora}</span>}
                            </td>
                            <td className="py-2.5 px-2.5 text-amber-400 font-bold whitespace-nowrap font-mono text-xs">
                              #{rep.pedido}
                            </td>
                            <td className="py-2.5 px-2.5 text-slate-200 whitespace-nowrap">
                              {rep.tecnico}
                            </td>
                            <td className="py-2.5 px-2.5">
                              <span className="font-mono text-emerald-400 font-bold block text-xs">{rep.instalaBase}</span>
                              <span className="text-[11px] text-slate-300 block font-medium">{rep.instalaDesc || 'Sin descripción'}</span>
                              {rep.instalaQr && rep.instalaQr !== 'Sin QR' && (
                                <span className="text-[10px] text-emerald-400/80 font-mono">QR: {rep.instalaQr}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2.5">
                              <span className="font-mono text-orange-400 font-bold block text-xs">{rep.retiraBase}</span>
                              <span className="text-[11px] text-slate-300 block font-medium">{rep.retiraDesc || 'Sin descripción'}</span>
                              {rep.retiraQr && rep.retiraQr !== 'Sin QR' && (
                                <span className="text-[10px] text-orange-400/80 font-mono">QR: {rep.retiraQr}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                rep.esStockFijo ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}>
                                {rep.origenStock}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No se registran movimientos de repuestos asociados a este equipo en Buzón de Movimientos.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CROSS-REFERENCE 3: AUDITORÍA DE MANTENIMIENTO PREVENTIVO (MP Cerrados) */}
          {(ticket.ultimoMpFecha || ticket.esMpDeficiente || ticket.tiempoAsistenciaMp) && (
            <div className={`p-4 rounded-xl border space-y-3 ${
              ticket.esMpDeficiente 
                ? 'bg-red-950/30 border-red-500/50 text-red-200' 
                : 'bg-slate-950 border-slate-800 text-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  Auditoría de Preventivos (MP Cerrados)
                </h4>
                {ticket.esMpDeficiente ? (
                  <span className="text-[10px] bg-red-950 border border-red-500 text-red-300 px-2 py-0.5 rounded-full font-bold animate-pulse">
                    🚨 Riesgo MP Deficiente (&lt;30 días)
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                    MP Realizado
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Fecha Último MP:</span>
                  <strong className="text-white text-xs font-mono">{ticket.ultimoMpFecha || 'Sin registro'}</strong>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Antigüedad MP:</span>
                  <strong className={`text-xs font-bold ${ticket.esMpDeficiente ? 'text-red-400' : 'text-slate-200'}`}>
                    {ticket.diasDesdeUltimoMp !== null && ticket.diasDesdeUltimoMp !== undefined ? `Hace ${ticket.diasDesdeUltimoMp} días` : 'Desconocida'}
                  </strong>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Tiempo Laboral (T Asis):</span>
                  <strong className={`text-xs font-mono font-bold ${ticket.alertaTiempoMp?.tieneAlerta ? 'text-amber-400' : 'text-white'}`}>
                    {ticket.tiempoAsistenciaMp || 'No registrado'}
                  </strong>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Técnico que cerró MP:</span>
                  <strong className="text-slate-200 text-xs truncate block" title={ticket.tecnicoUltimoMp || '-'}>
                    {ticket.tecnicoUltimoMp || 'No informado'}
                  </strong>
                </div>
              </div>

              {ticket.alertaTiempoMp?.tieneAlerta && (
                <div className="bg-amber-950/60 border border-amber-500/40 p-2.5 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Alerta de Calidad en Mantenimiento Preventivo:</p>
                    <p className="text-[11px] opacity-90">{ticket.alertaTiempoMp.mensaje}</p>
                  </div>
                </div>
              )}

              {ticket.obsUltimoMp && (
                <p className="text-[11px] text-slate-300 italic bg-slate-900/60 p-2 rounded border border-slate-800">
                  Obs de Cierre MP: "{ticket.obsUltimoMp}"
                </p>
              )}

              {ticket.esMpDeficiente && (
                <div className="bg-red-950/60 border border-red-500/40 p-2.5 rounded-lg text-xs text-red-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Alerta de Calidad Operativa:</p>
                    <p className="text-[11px] opacity-90">
                      Este equipo presentó una falla de Service Call (SC) dentro de los 30 días posteriores al cierre del preventivo. 
                      Verifique si el llamado actual se relaciona con partes manipuladas durante el mantenimiento preventivo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Supervisor Notes */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Notas de Supervisión
            </h4>
            <textarea
              rows={2}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Escribe instrucciones o recordatorios sobre este pedido..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveNota}
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition"
              >
                {isSaved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-950" /> : null}
                <span>{isSaved ? '¡Guardado!' : 'Guardar Nota'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
