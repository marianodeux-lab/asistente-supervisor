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
  Shield,
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

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenAuthModal,
  onOpenUserManagement,
  tickets,
  cronicos,
  onRefresh,
  onExport,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [weekNum, setWeekNum] = useState<number>(1);
  const [yearNum, setYearNum] = useState<number>(2026);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const formattedDate = now.toLocaleDateString('es-AR', options);
      // Capitalize first letter
      setDateStr(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1));
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

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3 shadow-xl">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Logo, Brand & Operational Time Baseline */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-600 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl tracking-wider flex-shrink-0">
            STP
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Asistente Supervisor
                <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  Patagonia & Suroeste
                </span>
              </h1>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Flow Pro Live
              </span>
            </div>

            {/* Operational Baseline: Week, Date, Time */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
              <span className="flex items-center gap-1.5 font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60 font-mono">
                <Calendar className="w-3.5 h-3.5" /> Semana {weekNum} / {yearNum}
              </span>
              <span className="text-slate-200 font-medium">
                {dateStr}
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-slate-300 font-mono font-semibold">
                <Clock className="w-3 h-3 text-amber-400" /> {timeStr} (ARG)
              </span>
            </div>
          </div>
        </div>

        {/* Quick KPI Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Critical SLA */}
          <div className="flex items-center gap-2 bg-red-950/50 border border-red-500/40 px-3 py-1.5 rounded-lg text-xs font-medium text-red-200 glow-critical">
            <Flame className="w-4 h-4 text-red-400 animate-pulse" />
            <span>SLA Crítico:</span>
            <span className="bg-red-600 text-white px-1.5 py-0.2 rounded font-bold">{criticalCount}</span>
          </div>

          {/* Warning SLA */}
          <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>En Advertencia:</span>
            <span className="bg-amber-600/80 text-white px-1.5 py-0.2 rounded font-bold">{warningCount}</span>
          </div>

          {/* Reincidencias SLA 60 días */}
          <div className="flex items-center gap-2 bg-purple-950/40 border border-purple-500/40 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-200">
            <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>Equipos Reincidentes (SLA 60d):</span>
            <span className="bg-purple-600 text-white px-1.5 py-0.2 rounded font-bold">{criticalCronicosCount}</span>
          </div>
        </div>

        {/* User Profile Selector & Actions */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end relative">
          
          {/* User Profile Dropdown Pill */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(prev => !prev)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 rounded-xl p-1.5 pr-2.5 transition text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-xs shadow">
                {currentUser.nombre.charAt(0)}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-white leading-none">{currentUser.nombre}</p>
                <p className="text-[10px] text-amber-400 font-mono mt-0.5">{currentUser.email}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 space-y-1 animate-fadeIn">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <p className="text-xs font-bold text-white">{currentUser.nombre}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{currentUser.email}</p>
                  <span className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {currentUser.cargo}
                  </span>
                </div>

                {/* Open User Management (Admin only or all) */}
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    onOpenUserManagement();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition text-left font-medium"
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
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition text-left font-medium"
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Primer Ingreso / Crear Clave Marcos</span>
                </button>

                {/* Login with other user / Logout */}
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    onOpenAuthModal('LOGIN');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition text-left font-bold border-t border-slate-800 mt-1 pt-2"
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
            title="Recalcular métricas"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Export Report */}
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-md shadow-amber-500/10"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
        </div>

      </div>
    </header>
  );
};
