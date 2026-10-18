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
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { Ticket, EquipoCronico, UserAccount } from '../types';
import { getTechnicianAvatar } from '../utils/avatarUtils';

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
  sla_causalidades: 'Auditoría SLA & Causalidades',
  reincidencias: 'Radar de Reincidencias (60 Días)',
  preventivos: 'Plan de Mantenimiento Preventivo (MP)',
  base_instalada: 'Base Instalada Clientes 2026',
  analisis_patagonia: 'Análisis Atenciones (SLA, Suspendidos, TELCA)',
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
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-3 lg:px-6 flex items-center justify-between shadow-sm flex-shrink-0 select-none">
      
      {/* LEFT: Active Module Breadcrumb & Status */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800 tracking-tight truncate">
            {currentTabName}
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping"></span>
            <span className="hidden sm:inline">Flow Pro</span> Live
          </span>
        </div>
      </div>

      {/* CENTER: Compact Pastel KPI Pills */}
      <div className="hidden md:flex items-center gap-2.5">
        {/* Critical SLA - Pastel Rose */}
        <div 
          className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl text-xs font-semibold text-rose-800 shadow-xs"
          title="Tickets con SLA mayor al 85% o menos de 2 horas restantes"
        >
          <Flame className="w-3.5 h-3.5 text-rose-500" />
          <span className="hidden xl:inline text-[11px] text-rose-700">SLA Crítico:</span>
          <span className="bg-rose-200/80 text-rose-900 px-1.5 py-0.2 rounded-md font-bold text-[11px]">{criticalCount}</span>
        </div>

        {/* Reincidencias 60d - Pastel Purple */}
        <div 
          className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl text-xs font-semibold text-purple-800 shadow-xs"
          title="Equipos con fallas reincidentes en los últimos 60 días"
        >
          <Radio className="w-3.5 h-3.5 text-purple-500" />
          <span className="hidden xl:inline text-[11px] text-purple-700">Reincidentes (60d):</span>
          <span className="bg-purple-200/80 text-purple-900 px-1.5 py-0.2 rounded-md font-bold text-[11px]">{criticalCronicosCount}</span>
        </div>

        {/* Warning SLA - Pastel Amber */}
        <div 
          className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-semibold text-amber-800 shadow-xs"
          title="Tickets en advertencia (SLA entre 65% y 85%)"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden xl:inline text-[11px] text-amber-700">En Advertencia:</span>
          <span className="bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded-md font-bold text-[11px]">{warningCount}</span>
        </div>
      </div>

      {/* RIGHT: Operational Time, HAL Trigger, User Profile & Actions */}
      <div className="flex items-center gap-2.5 relative">
        
        {/* Compact Operational Time */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-xl border border-slate-200 font-mono">
          <span className="text-teal-700 font-bold">Sem {weekNum}</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-700">{shortDateStr}</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-900 font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3 text-teal-600" /> {timeStr}
          </span>
        </div>

        {/* HAL IA Assistant Pill Button */}
        {onOpenHallAi && (
          <button
            onClick={onOpenHallAi}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 px-2.5 py-1 rounded-xl text-xs font-bold transition shadow-xs border border-rose-200 group"
            title="Abrir Asistente Táctico HAL IA"
          >
            <div className="w-4 h-4 rounded-full overflow-hidden border border-rose-300 shadow-xs flex-shrink-0 bg-black">
              <img src="/hal9000.webp" alt="HAL" className="w-full h-full object-cover group-hover:scale-110 transition" />
            </div>
            <span className="font-extrabold tracking-wide hidden sm:inline text-rose-800">
              HAL IA
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
          </button>
        )}

        {/* User Profile Selector */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(prev => !prev)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl p-1.5 pr-2.5 transition text-left shadow-xs"
          >
            {getTechnicianAvatar(currentUser.nombre) || (currentUser.rol === 'ADMIN' ? '/avatars/Deus_Mariano.png' : null) ? (
              <img
                src={getTechnicianAvatar(currentUser.nombre) || '/avatars/Deus_Mariano.png'}
                alt={currentUser.nombre}
                className="w-7 h-7 rounded-full object-cover border border-teal-500 shadow-xs"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                {currentUser.nombre.charAt(0)}
              </div>
            )}
            <span className="text-xs font-bold text-slate-800 hidden md:inline leading-none">
              {currentUser.nombre.split(' ')[0]}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {/* Dropdown Menu */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-fadeIn">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-800">{currentUser.nombre}</p>
                <p className="text-[11px] text-slate-500 font-mono">{currentUser.email}</p>
                <span className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                  {currentUser.cargo}
                </span>
              </div>

              {/* Open User Management */}
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  onOpenUserManagement();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition text-left font-medium"
              >
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>Gestionar Usuarios & Accesos</span>
              </button>

              {/* Change password / Activate Marcos */}
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  onOpenAuthModal('FIRST_LOGIN');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition text-left font-medium"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                <span>Primer Ingreso / Clave Marcos</span>
              </button>

              {/* Login with other user */}
              <button
                onClick={() => {
                  setShowUserDropdown(false);
                  onOpenAuthModal('LOGIN');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-xl transition text-left font-bold border-t border-slate-100 mt-1 pt-2"
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
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Export Report */}
        <button
          onClick={onExport}
          title="Exportar datos actuales"
          className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exportar</span>
        </button>

      </div>
    </header>
  );
};
