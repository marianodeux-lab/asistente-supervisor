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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              isAIEC ? 'bg-teal-50 text-teal-700 border border-teal-200' :
              slaInfo.isExpired ? 'bg-rose-50 text-rose-700 border border-rose-200' :
              ticket.slaPorcentaje >= 85 ? 'bg-rose-50 text-rose-700 border border-rose-200' :
              ticket.slaPorcentaje >= 65 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800">Pedido #{ticket.pedido}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isAIEC 
                    ? 'bg-teal-50 text-teal-800 border border-teal-200' 
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {isAIEC ? 'AIEC (Sin SLA)' : ticket.concepto}
                </span>
                {ticket.esAsignadoCOT && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 font-semibold">
                    Asignado Flow Android
                  </span>
                )}
                {ticket.esPedidoSuspendidoPrevio && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                    Reanudado (Previamente Suspendido)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Cliente: <strong className="text-slate-800">{ticket.cliente}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* SLA Alert banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            isAIEC ? 'bg-teal-50/70 border-teal-200 text-teal-900' :
            slaInfo.isExpired ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-xs' :
            ticket.slaPorcentaje >= 85 ? 'bg-rose-50/70 border-rose-200 text-rose-900' :
            ticket.slaPorcentaje >= 65 ? 'bg-amber-50/70 border-amber-200 text-amber-900' :
            'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-center gap-3">
              <Flame className={`w-5 h-5 flex-shrink-0 ${slaInfo.isExpired ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  {isAIEC ? 'Atención Incluida en Contrato (AIEC)' : slaInfo.isExpired ? '🚨 Alerta de Incumplimiento de SLA' : 'Estado de SLA (Service Call)'}
                </p>
                <p className={`text-sm font-bold ${slaInfo.isExpired ? 'text-rose-800' : 'text-slate-900'}`}>
                  {isAIEC 
                    ? 'No computa para SLA • Incluido en Agenda de Ruta' 
                    : slaInfo.badgeTitle
                  }
                </p>
                {!isAIEC && <p className="text-xs opacity-90 font-medium text-slate-600">{slaInfo.badgeDesc}</p>}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs block text-slate-500">Última atención</span>
              <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200 text-slate-800 inline-block mt-0.5 shadow-xs">
                {ticket.diasUltimaAtencion}
              </span>
            </div>
          </div>

          {/* BANNER: PEDIDO REANUDADO / SUSPENDIDO PREVIAMENTE */}
          {ticket.esPedidoSuspendidoPrevio && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 shadow-xs flex items-start gap-3 text-amber-900">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-900 text-sm">
                    ⏸️ Pedido Reanudado • Suspendido Previamente
                  </span>
                  {(ticket.suspensionPrevia?.codigoCierre || ticket.suspensionPrevia?.codCierre) && (
                    <span className="px-2 py-0.5 rounded bg-white text-amber-800 font-mono font-bold text-[10px] border border-amber-200">
                      {ticket.suspensionPrevia.codigoCierre || ticket.suspensionPrevia.codCierre}: {ticket.suspensionPrevia.descCierre || ticket.suspensionPrevia.desc}
                    </span>
                  )}
                </div>
                <p className="text-slate-700">
                  Este pedido coordinado en agenda coincide con una orden suspendida anteriormente en el equipo.
                  {ticket.suspensionPrevia?.tecnico && <span> Atendió previamente: <strong className="text-slate-900">{ticket.suspensionPrevia.tecnico}</strong> ({ticket.suspensionPrevia.fecha}).</span>}
                </p>
                {(ticket.suspensionPrevia?.observaciones || ticket.suspensionPrevia?.obs) && (
                  <p className="text-slate-600 italic bg-white p-2 rounded border border-slate-200 text-[11px]">
                    Motivo previo de suspensión: "{ticket.suspensionPrevia.observaciones || ticket.suspensionPrevia.obs}"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Chronic Warning if matched */}
          {cronicoMatch && (
            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-purple-900 text-xs">
                <Radio className="w-4 h-4 text-purple-600 animate-pulse flex-shrink-0" />
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
                  className="text-xs font-bold text-purple-700 hover:text-purple-900 underline ml-2 flex-shrink-0"
                >
                  Ver Historial Clínico →
                </button>
              )}
            </div>
          )}

          {/* RELEVAMIENTOS CASH TODAY: DISTINCIÓN DE CLIENTE REAL EN OBSERVACIONES */}
          {(ticket.clienteReal || (ticket.cliente && ticket.cliente.toUpperCase().includes('RELEVAMIENTOS CASH TODAY'))) && (
            <div className="p-4 rounded-xl bg-slate-50 border border-amber-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-amber-900">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block text-amber-800">
                      Relevamiento de Sitio • Cash Today
                    </span>
                    <span className="text-[11px] text-slate-500">
                      En Flow el cliente figura unificado como <strong className="text-amber-800">RELEVAMIENTOS CASH TODAY</strong>, pero el cliente real a relevar surge de las observaciones:
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                  Factibilidad Técnica
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Cliente Comercial Real:</span>
                  <strong className="text-sm text-slate-800 font-bold block mt-0.5">
                    {ticket.clienteReal || 'Identificado en Observaciones'}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Sucursal / Local / Obra:</span>
                  <strong className="text-xs text-slate-700 font-semibold block mt-0.5">
                    {ticket.sucursalRelevamiento || 'Central / Punto de Sitio'}
                  </strong>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between text-slate-600">
                  <span>Dirección del Relevamiento: <strong className="text-slate-800 font-medium">{ticket.direccionReal || ticket.direccion} ({ticket.localidadReal || ticket.localidad})</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Grid Info: Ubicación & Técnico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Ubicación y Sitio */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                Ubicación & Sitio
              </h4>
              <p className="text-sm font-semibold text-slate-800">{ticket.direccion || 'Dirección de cliente'}</p>
              <p className="text-xs text-slate-600">{ticket.localidad} - <span className="text-teal-700 font-semibold">{ticket.zona}</span></p>
              <p className="text-xs text-slate-500">Equipo: <strong className="text-slate-800 font-mono">{ticket.luno || '-'}</strong></p>
            </div>

            {/* Técnico Asignado */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  Técnico en Campo
                </h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  ticket.estado === 'SEG Asistencia' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                  ticket.estado === 'SEG Control Final' || ticket.estado === 'SEG Fin Asistencia' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                  ticket.estado === 'SEG Registrado' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                  'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {ticket.estado || 'SEG Registrado'}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800">{ticket.tecnico}</p>
              <p className="text-xs text-slate-600">{tecObj?.cargo || 'Técnico de Zona'} ({ticket.zona})</p>
              
              <div className="pt-1 space-y-1 text-xs">
                <p className="text-slate-500 flex items-center justify-between">
                  <span>Horario Coordinado:</span>
                  <strong className="text-slate-800 font-mono">
                    {formatTimeClean(ticket.hCoor ? `${ticket.fCoorDate || ''} ${ticket.hCoor}` : ticket.fechaCoordinada || '09:00')}
                  </strong>
                </p>
                <p className="text-slate-500 flex items-center justify-between">
                  <span>Informado al Móvil (Columna H):</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                    ticket.notificadoMovil || ticket.m === 'S'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
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
                    className="inline-flex items-center gap-1 text-xs bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 rounded-md font-medium transition shadow-xs"
                  >
                    <Phone className="w-3 h-3" /> WhatsApp
                  </a>
                  <span className="text-xs text-slate-500">{tecObj.cel}</span>
                </div>
              )}
            </div>

          </div>

          {/* Detalle del Pedido & Observaciones del COT / Flow */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              Detalle del Pedido & Observaciones de Flow
            </h4>
            <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
              {ticket.detalleFalla || 'Sin observaciones adicionales registradas.'}
            </div>
          </div>

          {/* CROSS-REFERENCE 1: BUZÓN DE MOVIMIENTOS (Repuestos Instalados/Retirados con Módulo + QR) */}
          {ticket.movimientosStock && ticket.movimientosStock.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-teal-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-teal-600" />
                  Repuestos en Buzón de Movimientos (Trazabilidad QR & Stock)
                </h4>
                <span className="text-[11px] bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">
                  {ticket.movimientosStock.length} movimiento(s)
                </span>
              </div>
              
              <div className="space-y-2">
                {ticket.movimientosStock.map((m, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono">Transacción: {m.fecha} {m.hora}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        m.esStockFijo 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {m.esStockFijo ? 'Stock Fijo Técnico' : 'Stock Central (Retorno Semanal)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Instalado */}
                      <div className="bg-slate-50 p-2 rounded border border-teal-200">
                        <span className="text-[10px] text-teal-700 font-bold block uppercase">Instala en Equipo:</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <strong className="font-mono text-slate-800 text-xs">{m.instalaBase || m.idInstala}</strong>
                          {m.instalaQr && m.instalaQr !== 'Sin QR' && (
                            <span className="text-[10px] bg-teal-50 text-teal-800 px-1.5 py-0.2 rounded border border-teal-200 font-mono font-bold" title="QR de Laboratorio">
                              QR #{m.instalaQr}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Retirado */}
                      <div className="bg-slate-50 p-2 rounded border border-rose-200">
                        <span className="text-[10px] text-rose-700 font-bold block uppercase">Retira p/ Laboratorio:</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <strong className="font-mono text-slate-700 text-xs">{m.retiraBase || m.idRetira || 'N/A'}</strong>
                          {m.retiraQr && m.retiraQr !== 'Sin QR' && (
                            <span className="text-[10px] bg-rose-50 text-rose-800 px-1.5 py-0.2 rounded border border-rose-200 font-mono font-bold" title="QR Retirado">
                              QR #{m.retiraQr}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {m.obs && (
                      <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-200">
                        "{m.obs}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CROSS-REFERENCE 2: HISTORIAL DEL EQUIPO (Intervenciones vs Repuestos Reemplazados Master LP) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveHistoryTab('INTERVENCIONES')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeHistoryTab === 'INTERVENCIONES'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Intervenciones Técnicas ({ticket.historialPrevioLuno?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveHistoryTab('REPUESTOS')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeHistoryTab === 'REPUESTOS'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Repuestos Reemplazados ({ticket.repuestosHistoricos?.length || 0})</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {ticket.cantidadVisitasHistoricas || 0} Visitas a Campo
                </span>
                {(ticket.cantidadSoporteRemoto || 0) > 0 && (
                  <span className="text-teal-800 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
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
                    <div key={idx} className={`bg-white border p-2.5 rounded-lg text-xs space-y-1 ${
                      h.esSoporteRemoto ? 'border-teal-200' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-teal-800 font-bold">Pedido #{h.pedido}</span>
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-700 font-semibold">{h.concepto}</span>
                          
                          {h.esSoporteRemoto ? (
                            <span className="text-[10px] px-2 py-0.2 rounded font-bold uppercase bg-teal-50 text-teal-800 border border-teal-200">
                              Soporte Remoto (Mesa Monitoreo)
                            </span>
                          ) : h.codCierre ? (
                            <span className="text-[10px] px-2 py-0.2 rounded font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200" title={h.cierreInfo?.desc}>
                              {h.codCierre}: {h.cierreInfo?.desc || ''}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-slate-500 text-[11px] font-mono">{h.fecha}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Intervino: <strong className="text-slate-700">{h.tecnico}</strong></span>
                        <span className="text-slate-500">{h.zona}</span>
                      </div>

                      {h.observaciones && (
                        <p className="text-[11px] text-slate-700 border-l-2 border-teal-400 pl-2 mt-1">
                          "{h.observaciones}"
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-3 text-center">No se registran intervenciones previas en este equipo.</p>
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
                        <tr className="border-b border-slate-200 bg-slate-100/70 text-[10px] uppercase text-slate-600 font-semibold">
                          <th className="py-2 px-2.5">Fecha</th>
                          <th className="py-2 px-2.5">Pedido</th>
                          <th className="py-2 px-2.5">Técnico</th>
                          <th className="py-2 px-2.5">Repuesto Instalado</th>
                          <th className="py-2 px-2.5">Repuesto Retirado</th>
                          <th className="py-2 px-2.5">Origen Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ticket.repuestosHistoricos.map((rep, idx) => (
                          <tr key={idx} className="hover:bg-teal-50/40 transition">
                            <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                              {rep.fecha}
                              {rep.hora && <span className="text-[10px] text-slate-400 block">{rep.hora}</span>}
                            </td>
                            <td className="py-2.5 px-2.5 text-teal-800 font-bold whitespace-nowrap font-mono text-xs">
                              #{rep.pedido}
                            </td>
                            <td className="py-2.5 px-2.5 text-slate-700 whitespace-nowrap">
                              {rep.tecnico}
                            </td>
                            <td className="py-2.5 px-2.5">
                              <span className="font-mono text-emerald-700 font-bold block text-xs">{rep.instalaBase}</span>
                              <span className="text-[11px] text-slate-600 block font-medium">{rep.instalaDesc || 'Sin descripción'}</span>
                              {rep.instalaQr && rep.instalaQr !== 'Sin QR' && (
                                <span className="text-[10px] text-emerald-700 font-mono">QR: {rep.instalaQr}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2.5">
                              <span className="font-mono text-amber-700 font-bold block text-xs">{rep.retiraBase}</span>
                              <span className="text-[11px] text-slate-600 block font-medium">{rep.retiraDesc || 'Sin descripción'}</span>
                              {rep.retiraQr && rep.retiraQr !== 'Sin QR' && (
                                <span className="text-[10px] text-amber-700 font-mono">QR: {rep.retiraQr}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                rep.esStockFijo ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
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
                  <div className="py-6 text-center text-slate-500 text-xs">
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
                ? 'bg-rose-50 border-rose-200 text-rose-900' 
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-teal-800">
                  <Wrench className="w-3.5 h-3.5 text-teal-600" />
                  Auditoría de Preventivos (MP Cerrados)
                </h4>
                {ticket.esMpDeficiente ? (
                  <span className="text-[10px] bg-rose-100 border border-rose-300 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                    🚨 Riesgo MP Deficiente (&lt;30 días)
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                    MP Realizado
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Fecha Último MP:</span>
                  <strong className="text-slate-800 text-xs font-mono">{ticket.ultimoMpFecha || 'Sin registro'}</strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Antigüedad MP:</span>
                  <strong className={`text-xs font-bold ${ticket.esMpDeficiente ? 'text-rose-700' : 'text-slate-800'}`}>
                    {ticket.diasDesdeUltimoMp !== null && ticket.diasDesdeUltimoMp !== undefined ? `Hace ${ticket.diasDesdeUltimoMp} días` : 'Desconocida'}
                  </strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Tiempo Laboral (T Asis):</span>
                  <strong className={`text-xs font-mono font-bold ${ticket.alertaTiempoMp?.tieneAlerta ? 'text-amber-700' : 'text-slate-800'}`}>
                    {ticket.tiempoAsistenciaMp || 'No registrado'}
                  </strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Técnico que cerró MP:</span>
                  <strong className="text-slate-800 text-xs truncate block" title={ticket.tecnicoUltimoMp || '-'}>
                    {ticket.tecnicoUltimoMp || 'No informado'}
                  </strong>
                </div>
              </div>

              {ticket.alertaTiempoMp?.tieneAlerta && (
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Alerta de Calidad en Mantenimiento Preventivo:</p>
                    <p className="text-[11px] opacity-90">{ticket.alertaTiempoMp.mensaje}</p>
                  </div>
                </div>
              )}

              {ticket.obsUltimoMp && (
                <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-200">
                  Obs de Cierre MP: "{ticket.obsUltimoMp}"
                </p>
              )}

              {ticket.esMpDeficiente && (
                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-xs text-rose-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
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
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              Notas de Supervisión
            </h4>
            <textarea
              rows={2}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Escribe instrucciones o recordatorios sobre este pedido..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveNota}
                className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
              >
                {isSaved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" /> : null}
                <span>{isSaved ? '¡Guardado!' : 'Guardar Nota'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
