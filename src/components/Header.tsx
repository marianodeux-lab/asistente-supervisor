import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar,
  UserCheck, 
  RefreshCw, 
  Radio, 
  Download,
  AlertTriangle,
  Flame,
  KeyRound,
  Users,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { Ticket, EquipoCronico, UserAccount } from '../types';

interface HeaderProps {
  currentUser: UserAccount;
  onOpenAuthModal: (mode?: 'LOGIN' | 'FIRST_LOGIN' | 'FORGOT_PASSWORD') => void;
  onOpenUserManagement: () => void;
  onOpenHallAi?: () => void;
  tickets: Ticket[];
  cronicos: EquipoCronico[];
  onRefresh: () => void;
  onExport: () => void;
  activeTab: string;
}

// Function to calculate ISO Week Number
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const TAB_NAMES: Record<string, string> = {
  sla_agenda: 'Control SLA & Agenda Diaria',
  reincidencias: 'Radar de Reincidencias (60 Días)',
  preventivos: 'Plan de Mantenimiento Preventivo (MP)',
  base_instalada: 'Base Instalada Clientes 2026',
  tablas_ref: 'Stock Fijo & Referencias Operativas',
  call_rate: 'Call Rate & Fabricantes ATM',
  carga_laboral: 'Carga Laboral & Rutas Técnicas',
  repuestos: 'Repuestos & Despachos de Planta',
  importador: 'Repositorio de Reportes Operativos'
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenAuthModal,
  onOpenUserManagement,
  onOpenHallAi,
  tickets,
  cronicos,
  onRefresh,
  onExport,
  activeTab,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [shortDateStr, setShortDateStr] = useState<string>('');
  const [weekNum, setWeekNum] = useState<number>(1);
  const [yearNum, setYearNum] = useState<number>(2026);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
      
      const day = now.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
      setShortDateStr(day.charAt(0).toUpperCase() + day.slice(1));
      setWeekNum(getISOWeek(now));
      setYearNum(now.getFullYear());
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const criticalCount = tickets.filter(t => t.slaPorcentaje >= 85 || t.hsSla <= 2).length;
  const warningCount = tickets.filter(t => t.slaPorcentaje >= 65 && t.slaPorcentaje < 85 && t.hsSla > 2).length;
  const criticalCronicosCount = cronicos.filter(c => c.estadoSalud === 'CRÍTICO').length;

  const currentTabName = TAB_NAMES[activeTab] || 'Tablero Principal';

  return (
    <header className="h-13 bg-[#121318]/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-40 px-3 lg:px-6 flex items-center justify-between shadow-lg flex-shrink-0 select-none">
      
      {/* LEFT: Active Module Breadcrumb & Status */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white tracking-tight truncate">
            {currentTabName}
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="hidden sm:inline">Flow Pro</span> Live
          </span>
        </div>
      </div>

      {/* CENTER: Ultra-Compact Inline KPI Pills */}
      <div className="hidden md:flex items-center gap-2">
        {/* Critical SLA */}
        <div 
          className="flex items-center gap-1.5 bg-red-950/50 border border-red-500/40 px-2.5 py-1 rounded-lg text-xs font-medium text-red-200"
          title="Tickets con SLA mayor al 85% o menos de 2 horas restantes"
        >
          <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span className="hidden xl:inline text-[11px] text-red-300">SLA Crítico:</span>
          <span className="bg-red-600 text-white px-1.5 py-0.2 rounded font-bold text-[11px]">{criticalCount}</span>
        </div>

        {/* Reincidencias 60d */}
        <div 
          className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-500/40 px-2.5 py-1 rounded-lg text-xs font-medium text-purple-200"
          title="Equipos con fallas reincidentes en los últimos 60 días"
        >
          <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span className="hidden xl:inline text-[11px] text-purple-300">Reincidentes (60d):</span>
          <span className="bg-purple-600 text-white px-1.5 py-0.2 rounded font-bold text-[11px]">{criticalCronicosCount}</span>
        </div>

        {/* Warning SLA */}
        <div 
          className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-500/40 px-2.5 py-1 rounded-lg text-xs font-medium text-amber-200"
          title="Tickets en advertencia (SLA entre 65% y 85%)"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden xl:inline text-[11px] text-amber-300">En Advertencia:</span>
          <span className="bg-amber-600/80 text-white px-1.5 py-0.2 rounded font-bold text-[11px]">{warningCount}</span>
        </div>
      </div>

      {/* RIGHT: Operational Time, HAL Trigger, User Profile & Actions */}
      <div className="flex items-center gap-2.5 relative">
        
        {/* Compact Operational Time (Single Line) */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 bg-[#181920] px-2.5 py-1 rounded-lg border border-white/5 font-mono">
          <span className="text-amber-400 font-bold">Sem {weekNum}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300">{shortDateStr}</span>
          <span className="text-slate-600">•</span>
          <span className="text-white font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> {timeStr}
          </span>
        </div>

        {/* HAL IA Assistant Pill Button */}
        {onOpenHallAi && (
          <button
            onClick={onOpenHallAi}
            className="flex items-center gap-1.5 bg-gradient-to-r from-red-950 via-[#1e2029] to-[#16171c] hover:border-red-400 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-sm border border-red-500/40 group"
            title="Abrir Asistente Táctico HAL IA"
          >
            <div className="w-4 h-4 rounded-full overflow-hidden border border-red-500 shadow-sm shadow-red-500/60 flex-shrink-0 bg-black">
              <img src="/hal9000.webp" alt="HAL" className="w-full h-full object-cover group-hover:scale-110 transition" />
            </div>
            <span className="bg-gradient-to-r from-white via-red-100 to-red-400 bg-clip-text text-transparent font-extrabold tracking-wide hidden sm:inline">
              HAL IA
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
          </button>
        )}

        {/* User Profile Selector */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(prev => !prev)}
            className="flex items-center gap-1.5 bg-[#181920] hover:bg-[#1f212a] border border-white/10 hover:border-amber-500/50 rounded-lg p-1 pr-2 transition text-left"
          >
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-xs shadow">
              {currentUser.nombre.charAt(0)}
            </div>
            <span className="text-xs font-bold text-white hidden md:inline leading-none">
              {currentUser.nombre.split(' ')[0]}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Dropdown Menu */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-[#16171c] border border-white/10 rounded-xl shadow-2xl z-50 p-2 space-y-1 animate-fadeIn">
              <div className="p-2.5 bg-[#111216] rounded-lg border border-white/5">
                <p className="text-xs font-bold text-white">{currentUser.nombre}</p>
                <p className="text-[11px] text-slate-400 font-mono">{currentUser.email}</p>
                <span className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentUser.cargo}
                </span>
              </div>

              {/* Open User Management */}
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  onOpenUserManagement();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-[#1e2028] rounded-lg transition text-left font-medium"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Gestionar Usuarios & Accesos</span>
              </button>

              {/* Change password / Activate Marcos */}
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  onOpenAuthModal('FIRST_LOGIN');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-[#1e2028] rounded-lg transition text-left font-medium"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Primer Ingreso / Clave Marcos</span>
              </button>

              {/* Login with other user */}
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  onOpenAuthModal('LOGIN');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition text-left font-bold border-t border-white/5 mt-1 pt-2"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Cambiar de Usuario / Ingresar</span>
              </button>
            </div>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          title="Recalcular métricas y sincronizar"
          className="p-1.5 rounded-lg bg-[#181920] hover:bg-[#1f212a] border border-white/10 text-slate-300 hover:text-white transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Export Report */}
        <button
          onClick={onExport}
          title="Exportar datos actuales"
          className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exportar</span>
        </button>

      </div>
    </header>
  );
};
