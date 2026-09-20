import React, { useState } from 'react';
import { 
  X, 
  Radio, 
  Clock, 
  Wrench, 
  User, 
  Sparkles,
  Layers,
  Calendar,
  AlertTriangle,
  Package
} from 'lucide-react';
import { EquipoCronico } from '../types';
import { formatExcelDate, isAtmEquipment } from '../utils/formatters';

interface ChronicDetailModalProps {
  cronico: EquipoCronico | null;
  onClose: () => void;
}

export const ChronicDetailModal: React.FC<ChronicDetailModalProps> = ({
  cronico,
  onClose
}) => {
  if (!cronico) return null;

  const isAtm = isAtmEquipment(cronico.modelo, cronico.tipoSeg);

  // All events - prioritize 30-day period events
  const allEvents = (cronico as any).fallasEnPeriodo || cronico.todasFallas || cronico.ultimasFallas || [];
  
  // Separate into physical field visits vs remote assistance (TELCA / TELFA)
  const visitasCampo = allEvents.filter(f => f.esVisitaCampo || (f.codCierre && !['TELCA', 'TELCA2', 'TELCA3', 'TELFA', 'MONITOREO'].includes(f.codCierre.toUpperCase().trim())));
  const soporteRemoto = allEvents.filter(f => f.esRemotoTelca || (f.codCierre && ['TELCA', 'TELCA2', 'TELCA3', 'TELFA', 'MONITOREO'].includes(f.codCierre.toUpperCase().trim())));

  const [activeTab, setActiveTab] = useState<'VISITAS' | 'REMOTO' | 'REPUESTOS' | 'MP'>('VISITAS');

  const validTecnicos = (cronico.tecnicosInvolucrados || []).filter(
    t => t && t !== 'Técnico' && t !== 'SIN ASIGNAR' && t !== '-'
  );

  const dynamicSalud = (cronico as any).dynamicSalud || cronico.estadoSalud;
  const isCritico = dynamicSalud === 'CRÍTICO' || visitasCampo.length >= 3;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Historial Clínico: Equipo {cronico.luno}</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isCritico 
                    ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse' 
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {dynamicSalud} ({visitasCampo.length} {visitasCampo.length === 1 ? 'VISITA A CAMPO' : 'VISITAS A CAMPO'})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cliente: <strong className="text-slate-200">{cronico.cliente}</strong> • Modelo: <strong className="text-slate-200">{cronico.modelo}</strong> • Zona: <strong className="text-amber-400">{cronico.zonaLocal ? `${cronico.zonaLocal} (${cronico.zona})` : cronico.zona}</strong>
              </p>
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

          {/* Supervisor Recommended Action */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-500/40 space-y-2 shadow-lg">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Diagnóstico y Acción Preventiva Sugerida para el Supervisor
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {isCritico
                ? `Reincidencia severa (${visitasCampo.length} visitas presenciales a campo de técnicos en el período). Requiere auditoría en sitio, revisión de calibración y recambio de módulo crítico.`
                : `Reincidencia moderada (${visitasCampo.length} visitas presenciales de técnicos en el período). Se sugiere seguimiento preventivo y chequeo de piezas de desgaste en próxima visita.`}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
              <span><strong>Visitas a Campo (30 días):</strong> <span className="text-emerald-400 font-bold">{visitasCampo.length}</span></span>
              {!isAtm && soporteRemoto.length > 0 && (
                <>
                  <span>•</span>
                  <span><strong>Soporte Remoto Mesa (Cash Today):</strong> <span className="text-teal-300 font-bold">{soporteRemoto.length} llamadas</span></span>
                </>
              )}
              <span>•</span>
              <span className="flex items-center gap-1 text-blue-300">
                <Wrench className="w-3 h-3 text-blue-400" />
                <strong>Último Preventivo MTM:</strong> {formatExcelDate(cronico.ultimoMtmFecha) || 'Sin registro reciente'}
              </span>
            </div>
          </div>

          {/* Technicians who attended */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              Técnicos que Realizaron Visita Presencial
            </h4>
            <div className="flex flex-wrap gap-2">
              {validTecnicos.length > 0 ? (
                validTecnicos.map(tec => (
                  <span key={tec} className="text-xs bg-slate-900 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {tec}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Registrado en guardias rotativas de zona
                </span>
              )}
            </div>
          </div>

          {/* Tabs Navigation: Visitas de Campo vs Soporte Remoto (Solo Cash Today) vs Repuestos vs Auditoría MP */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 flex-wrap">
            <button
              onClick={() => setActiveTab('VISITAS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'VISITAS'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Visitas a Campo ({visitasCampo.length})</span>
            </button>

            {/* Remote Support Tab ONLY for Cash Today */}
            {!isAtm && soporteRemoto.length > 0 && (
              <button
                onClick={() => setActiveTab('REMOTO')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'REMOTO'
                    ? 'bg-teal-500 text-slate-950 shadow'
                    : 'bg-slate-950 text-teal-400/80 hover:text-teal-300 hover:bg-slate-800'
                }`}
              >
                <span>🎧 Mesa Remota ({soporteRemoto.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('REPUESTOS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'REPUESTOS'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Repuestos Reemplazados ({cronico.repuestosHistoricos?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('MP')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'MP'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Auditoría MP {cronico.alertaTiempoMp?.tieneAlerta && '⚠️'}</span>
            </button>
          </div>

          {/* TAB 1: Visitas de Campo Presenciales */}
          {activeTab === 'VISITAS' && (
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3 shadow-lg">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Intervenciones Presenciales de Técnicos en Campo ({visitasCampo.length})
              </h4>
              
              <div className="space-y-2.5">
                {visitasCampo.length > 0 ? (
                  visitasCampo.map((f, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {f.codCierre || f.origen || 'CAMPO'}
                          </span>
                          <span className="font-mono text-amber-400 font-bold">Pedido #{f.pedido}</span>
                          {f.tecnico && f.tecnico !== 'Técnico' && (
                            <>
                              <span className="text-slate-500">•</span>
                              <span className="text-slate-300 font-semibold">{f.tecnico}</span>
                            </>
                          )}
                        </div>
                        <span className="text-slate-400 text-[11px] font-medium font-mono">
                          {formatExcelDate(f.fecha)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 font-normal pl-1 border-l-2 border-emerald-500/50 mt-1">
                        "{f.falla}"
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">Sin visitas de campo registradas en este período.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 1.5: Soporte Remoto TELCA (Dato Informativo Adicional Cash Today) */}
          {activeTab === 'REMOTO' && !isAtm && (
            <div className="bg-slate-900/90 border border-teal-500/30 p-4 rounded-xl space-y-3 shadow-lg">
              <div className="bg-teal-950/40 border border-teal-500/40 p-3 rounded-lg text-xs text-teal-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>🎧 Dato Adicional: Asistencias Remotas de Mesa (TELCA / TELFA)</span>
                </p>
                <p className="text-[11px] text-teal-300/90 leading-relaxed">
                  Estos cierres remotos corresponden a asistencia técnica telefónica/remota y aplican exclusivamente a terminales <strong>Cash Today</strong>. No computan como visitas presenciales de técnicos ni incrementan la criticidad de campo.
                </p>
              </div>

              <div className="space-y-2.5">
                {soporteRemoto.map((f, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800">
                          {f.codCierre || 'SOPORTE REMOTO'}
                        </span>
                        <span className="font-mono text-teal-400 font-bold">Pedido #{f.pedido}</span>
                        <span className="text-slate-400 text-[10px] font-mono">Mesa Remota</span>
                      </div>
                      <span className="text-slate-400 text-[11px] font-medium font-mono">
                        {formatExcelDate(f.fecha)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-normal pl-1 border-l-2 border-teal-500/50 mt-1">
                      "{f.falla}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Replaced parts from Master LP */}
          {activeTab === 'REPUESTOS' && (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 shadow-lg">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-400" />
                Historial de Repuestos Reemplazados (Trazabilidad Máquina)
              </h4>

              {cronico.repuestosHistoricos && cronico.repuestosHistoricos.length > 0 ? (
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
                      {cronico.repuestosHistoricos.map((rep, idx) => (
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
                  No se registran reemplazos de repuestos asociados a este cajero en Buzón de Movimientos.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Auditoría MP */}
          {activeTab === 'MP' && (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-4 shadow-lg">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                Auditoría de Mantenimiento Preventivo (MP Cerrados)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Último MTM Cerrado:</span>
                  <strong className="text-white text-xs font-mono">{formatExcelDate(cronico.ultimoMtmFecha) || 'Sin registro'}</strong>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Tiempo Laboral (T Asis):</span>
                  <strong className={`text-xs font-mono font-bold ${cronico.alertaTiempoMp?.tieneAlerta ? 'text-amber-400' : 'text-white'}`}>
                    {cronico.tiempoAsistenciaMp || 'No registrado'}
                  </strong>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Estado Calidad MP:</span>
                  <strong className={`text-xs font-bold ${cronico.alertaTiempoMp?.tieneAlerta ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {cronico.alertaTiempoMp?.tieneAlerta ? 'Alerta de Tiempo Insuficiente' : 'Cumple Estándar'}
                  </strong>
                </div>
              </div>

              {cronico.alertaTiempoMp?.tieneAlerta && (
                <div className="bg-amber-950/60 border border-amber-500/40 p-3 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Alerta de Calidad en Preventivo:</p>
                    <p className="text-[11px] opacity-90 mt-0.5">{cronico.alertaTiempoMp.mensaje}</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
