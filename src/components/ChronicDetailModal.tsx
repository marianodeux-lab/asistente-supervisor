import React from 'react';
import { 
  X, 
  Radio, 
  Clock, 
  Wrench, 
  User, 
  Sparkles,
  Layers,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { EquipoCronico } from '../types';
import { formatExcelDate } from '../utils/formatters';

interface ChronicDetailModalProps {
  cronico: EquipoCronico | null;
  onClose: () => void;
}

export const ChronicDetailModal: React.FC<ChronicDetailModalProps> = ({
  cronico,
  onClose
}) => {
  if (!cronico) return null;

  const validTecnicos = (cronico.tecnicosInvolucrados || []).filter(
    t => t && t !== 'Técnico' && t !== 'SIN ASIGNAR' && t !== '-'
  );

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
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  cronico.estadoSalud === 'CRÍTICO' 
                    ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse' 
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {cronico.estadoSalud} ({cronico.totalFallas} FALLAS SLA)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cliente: <strong className="text-slate-200">{cronico.cliente}</strong> • Modelo: <strong className="text-slate-200">{cronico.modelo}</strong> • Zona: <strong className="text-amber-400">{cronico.zona}</strong>
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
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-500/40 space-y-1.5 shadow-lg">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Diagnóstico y Acción Preventiva Sugerida para el Supervisor
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {cronico.recomendacion}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
              <span><strong>Fallas SLA (60 días):</strong> {cronico.totalFallas}</span>
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
              Técnicos que Intervinieron este Equipo
            </h4>
            <div className="flex flex-wrap gap-2">
              {validTecnicos.length > 0 ? (
                validTecnicos.map(tec => (
                  <span key={tec} className="text-xs bg-slate-900 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-md font-medium">
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

          {/* Timeline of failures */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3 shadow-lg">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Llamadas Service Call Registradas en SLA (Últimos 60 Días)
            </h4>
            
            <div className="space-y-2.5">
              {cronico.ultimasFallas.map((f, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-950 text-orange-300 border border-orange-800">
                        {f.origen}
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
                  <p className="text-xs text-slate-200 font-normal pl-1 border-l-2 border-amber-500/50 mt-1">
                    "{f.falla}"
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
