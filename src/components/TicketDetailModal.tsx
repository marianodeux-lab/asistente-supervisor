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
  Tag
} from 'lucide-react';
import { Ticket, TecnicoInfo, EquipoCronico } from '../types';
import { formatTimeClean } from '../utils/formatters';

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

  const vtoDate = new Date(ticket.fechaVencimiento);
  const formattedVto = isNaN(vtoDate.getTime()) ? ticket.fechaVencimiento : vtoDate.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const isAIEC = ticket.concepto === 'AIEC' || ticket.esAdicional;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              isAIEC ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
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
            ticket.slaPorcentaje >= 85 ? 'bg-red-950/40 border-red-500/40 text-red-200' :
            ticket.slaPorcentaje >= 65 ? 'bg-amber-950/40 border-amber-500/40 text-amber-200' :
            'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
          }`}>
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider">
                  {isAIEC ? 'Atención Incluida en Contrato (AIEC)' : 'Estado de SLA (Service Call)'}
                </p>
                <p className="text-sm font-bold">
                  {isAIEC 
                    ? 'No computa para SLA • Incluido en Agenda de Ruta' 
                    : `${ticket.slaPorcentaje}% Consumido (${ticket.hsSla} hs restantes)`
                  }
                </p>
                {!isAIEC && <p className="text-xs opacity-80">Vence: {formattedVto}</p>}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs block text-slate-300">Última atención</span>
              <span className="text-xs font-bold bg-slate-900/80 px-2 py-1 rounded border border-slate-700 inline-block mt-0.5">
                {ticket.diasUltimaAtencion}
              </span>
            </div>
          </div>

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

          {/* CROSS-REFERENCE 2: HISTORIAL PREVIO DE ESTE EQUIPO (Reporte Suspendidos: Campo vs Remoto) */}
          {ticket.historialPrevioLuno && ticket.historialPrevioLuno.length > 0 && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  Historial de Intervenciones en Equipo {ticket.luno}
                </h4>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-emerald-400 font-semibold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
                    {ticket.cantidadVisitasHistoricas || 0} Visitas a Campo
                  </span>
                  {(ticket.cantidadSoporteRemoto || 0) > 0 && (
                    <span className="text-teal-400 font-semibold bg-teal-950/50 px-2 py-0.5 rounded border border-teal-800/50">
                      {ticket.cantidadSoporteRemoto} Soporte Remoto (Mesa)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {ticket.historialPrevioLuno.map((h, idx) => (
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
                ))}
              </div>
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
