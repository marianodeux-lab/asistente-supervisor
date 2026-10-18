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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#f1f5f9] border border-slate-300 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-200/80 px-6 py-4 border-b border-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800">Historial Clínico: Equipo {cronico.luno}</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isCritico 
                    ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {dynamicSalud} ({visitasCampo.length} {visitasCampo.length === 1 ? 'VISITA A CAMPO' : 'VISITAS A CAMPO'})
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Cliente: <strong className="text-slate-800">{cronico.cliente}</strong> • Modelo: <strong className="text-slate-800">{cronico.modelo}</strong> • Zona: <strong className="text-teal-700">{cronico.zonaLocal ? `${cronico.zonaLocal} (${cronico.zona})` : cronico.zona}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-600 hover:text-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Supervisor Recommended Action */}
          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-purple-800 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Diagnóstico y Acción Preventiva Sugerida para el Supervisor
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {isCritico
                ? `Reincidencia severa (${visitasCampo.length} visitas presenciales a campo de técnicos en el período). Requiere auditoría en sitio, revisión de calibración y recambio de módulo crítico.`
                : `Reincidencia moderada (${visitasCampo.length} visitas presenciales de técnicos en el período). Se sugiere seguimiento preventivo y chequeo de piezas de desgaste en próxima visita.`}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 pt-1">
              <span><strong>Visitas a Campo (30 días):</strong> <span className="text-emerald-700 font-bold">{visitasCampo.length}</span></span>
              {!isAtm && soporteRemoto.length > 0 && (
                <>
                  <span>•</span>
                  <span><strong>Soporte Remoto Mesa (Cash Today):</strong> <span className="text-teal-700 font-bold">{soporteRemoto.length} llamadas</span></span>
                </>
              )}
              <span>•</span>
              <span className="flex items-center gap-1 text-sky-700">
                <Wrench className="w-3 h-3 text-sky-600" />
                <strong>Último Preventivo MTM:</strong> {formatExcelDate(cronico.ultimoMtmFecha) || 'Sin registro reciente'}
              </span>
            </div>
          </div>

          {/* Technicians who attended */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600" />
              Técnicos que Realizaron Visita Presencial
            </h4>
            <div className="flex flex-wrap gap-2">
              {validTecnicos.length > 0 ? (
                validTecnicos.map(tec => (
                  <span key={tec} className="text-xs bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md font-medium flex items-center gap-1 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {tec}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">
                  Registrado en guardias rotativas de zona
                </span>
              )}
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
            <button
              onClick={() => setActiveTab('VISITAS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'VISITAS'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200'
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
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white text-teal-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>🎧 Mesa Remota ({soporteRemoto.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('REPUESTOS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'REPUESTOS'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Repuestos Reemplazados ({cronico.repuestosHistoricos?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('MP')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'MP'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Auditoría MP {cronico.alertaTiempoMp?.tieneAlerta && '⚠️'}</span>
            </button>
          </div>

          {/* TAB 1: Visitas de Campo Presenciales */}
          {activeTab === 'VISITAS' && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 shadow-xs">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                Intervenciones Presenciales de Técnicos en Campo ({visitasCampo.length})
              </h4>
              
              <div className="space-y-2.5">
                {visitasCampo.length > 0 ? (
                  visitasCampo.map((f, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {f.codCierre || f.origen || 'CAMPO'}
                          </span>
                          <span className="font-mono text-teal-800 font-bold">Pedido #{f.pedido}</span>
                          {f.tecnico && f.tecnico !== 'Técnico' && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-700 font-semibold">{f.tecnico}</span>
                            </>
                          )}
                        </div>
                        <span className="text-slate-500 text-[11px] font-medium font-mono">
                          {formatExcelDate(f.fecha)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-normal pl-1 border-l-2 border-teal-500 mt-1">
                        "{f.falla}"
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-3 text-center">Sin visitas de campo registradas en este período.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 1.5: Soporte Remoto TELCA (Dato Informativo Adicional Cash Today) */}
          {activeTab === 'REMOTO' && !isAtm && (
            <div className="bg-slate-50 border border-teal-200 p-4 rounded-xl space-y-3 shadow-xs">
              <div className="bg-teal-50 border border-teal-200 p-3 rounded-lg text-xs text-teal-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>🎧 Dato Adicional: Asistencias Remotas de Mesa (TELCA / TELFA)</span>
                </p>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  Estos cierres remotos corresponden a asistencia técnica telefónica/remota y aplican exclusivamente a terminales <strong>Cash Today</strong>. No computan como visitas presenciales de técnicos ni incrementan la criticidad de campo.
                </p>
              </div>

              <div className="space-y-2.5">
                {soporteRemoto.map((f, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          {f.codCierre || 'SOPORTE REMOTO'}
                        </span>
                        <span className="font-mono text-teal-800 font-bold">Pedido #{f.pedido}</span>
                        <span className="text-slate-500 text-[10px] font-mono">Mesa Remota</span>
                      </div>
                      <span className="text-slate-500 text-[11px] font-medium font-mono">
                        {formatExcelDate(f.fecha)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-normal pl-1 border-l-2 border-teal-400 mt-1">
                      "{f.falla}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Replaced parts from Master LP */}
          {activeTab === 'REPUESTOS' && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 shadow-xs">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-teal-600" />
                Historial de Repuestos Reemplazados (Trazabilidad Máquina)
              </h4>

              {cronico.repuestosHistoricos && cronico.repuestosHistoricos.length > 0 ? (
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
                      {cronico.repuestosHistoricos.map((rep, idx) => (
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
                  No se registran reemplazos de repuestos asociados a este cajero en Buzón de Movimientos.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Auditoría MP */}
          {activeTab === 'MP' && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4 shadow-xs">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-teal-600" />
                Auditoría de Mantenimiento Preventivo (MP Cerrados)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Último MTM Cerrado:</span>
                  <strong className="text-slate-800 text-xs font-mono">{formatExcelDate(cronico.ultimoMtmFecha) || 'Sin registro'}</strong>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Tiempo Laboral (T Asis):</span>
                  <strong className={`text-xs font-mono font-bold ${cronico.alertaTiempoMp?.tieneAlerta ? 'text-amber-700' : 'text-slate-800'}`}>
                    {cronico.tiempoAsistenciaMp || 'No registrado'}
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Estado Calidad MP:</span>
                  <strong className={`text-xs font-bold ${cronico.alertaTiempoMp?.tieneAlerta ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {cronico.alertaTiempoMp?.tieneAlerta ? 'Alerta de Tiempo Insuficiente' : 'Cumple Estándar'}
                  </strong>
                </div>
              </div>

              {cronico.alertaTiempoMp?.tieneAlerta && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
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
