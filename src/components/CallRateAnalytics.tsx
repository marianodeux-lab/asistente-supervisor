import React from 'react';
import { 
  BarChart3, 
  Cpu, 
  Building2, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  Flame
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Cell 
} from 'recharts';
import { CallRateState } from '../types';

interface CallRateAnalyticsProps {
  data: CallRateState;
}

export const CallRateAnalytics: React.FC<CallRateAnalyticsProps> = ({ data }) => {
  const { resumenPorPlanta, porFabricante } = data;

  return (
    <div className="space-y-6">
      
      {/* Top Banner KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Base Total Instalada</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-black text-white mt-1">
            {resumenPorPlanta.reduce((acc, p) => acc + p.totalBase, 0)}
          </p>
          <span className="text-[11px] text-slate-400">Equipos en la Región Patagonia</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Service Calls Mes</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-amber-300 mt-1">
            {resumenPorPlanta.reduce((acc, p) => acc + p.serviceCalls, 0)}
          </p>
          <span className="text-[11px] text-amber-300/80">Correctivos en campo</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Asistencias TELCA</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-black text-purple-300 mt-1">
            {resumenPorPlanta.reduce((acc, p) => acc + p.telca, 0)}
          </p>
          <span className="text-[11px] text-purple-300/80">Soporte remoto / telefónico</span>
        </div>

        <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Call Rate Promedio</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-300 mt-1">0.238</p>
          <span className="text-[11px] text-emerald-300/80">Fallas / equipo / mes</span>
        </div>

      </div>

      {/* Chart: Call Rate & SLA por Planta Cabecera */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Planta Cabecera Table & Metrics */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Desglose por Planta Cabecera</h3>
            </div>
            <span className="text-xs text-slate-400">Base vs Call Rate</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-2 px-2">Planta</th>
                  <th className="py-2 px-2 text-center">Base Total</th>
                  <th className="py-2 px-2 text-center">SC</th>
                  <th className="py-2 px-2 text-center">Call Rate</th>
                  <th className="py-2 px-2 text-right">SLA %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {resumenPorPlanta.map((p) => (
                  <tr key={p.planta} className="hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-2 font-bold text-white">{p.planta}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300">{p.totalBase} ({p.baseAtm} ATM / {p.baseCtd} CTD)</td>
                    <td className="py-2.5 px-2 text-center text-amber-400 font-semibold">{p.serviceCalls}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-blue-400">{p.callRate.toFixed(3)}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-emerald-400">{p.slaCumplimiento}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart: Rendimiento por Fabricante */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Call Rate y Fallas por Fabricante</h3>
            </div>
            <span className="text-xs text-slate-400">Comparativa técnica</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porFabricante} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="fabricante" stroke="#94a3b8" fontSize={11} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="base" name="Base Instalada" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fallas" name="Service Calls" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cards for Fabricantes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
            {porFabricante.map((f) => (
              <div key={f.fabricante} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                <span className="font-bold text-white block truncate">{f.fabricante}</span>
                <span className="text-[10px] text-slate-400 block">{f.tipo}</span>
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span className="text-slate-400">CR:</span>
                  <strong className="text-amber-400 font-mono">{f.callRate.toFixed(3)}</strong>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};
