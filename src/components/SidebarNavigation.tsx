import React, { useState } from 'react';
import { 
  Clock, 
  Activity, 
  Wrench, 
  BarChart3, 
  Truck, 
  Package, 
  Database,
  UploadCloud,
  Building2,
  FileSpreadsheet,
  LayoutDashboard,
  Pin,
  PinOff,
  Sparkles,
  ChevronRight,
  Bot
} from 'lucide-react';
import { TabKey } from './TabNavigation';

interface SidebarNavigationProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  ticketCount: number;
  cronicosCount: number;
  mpPendingCount: number;
  baseEquiposCount?: number;
  onOpenHallAi?: () => void;
}

interface NavItem {
  key: TabKey;
  label: string;
  shortLabel: string;
  category: 'OPERACIONES' | 'GESTIÓN' | 'AUDITORÍA & DATOS';
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeType?: 'danger' | 'warning' | 'info' | 'neutral';
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeTab,
  onTabChange,
  ticketCount,
  cronicosCount,
  mpPendingCount,
  baseEquiposCount,
  onOpenHallAi,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const navItems: NavItem[] = [
    {
      key: 'sla_agenda',
      label: 'Control SLA & Agenda',
      shortLabel: 'SLA',
      category: 'OPERACIONES',
      icon: Clock,
      badge: ticketCount,
      badgeType: ticketCount > 100 ? 'danger' : 'info'
    },
    {
      key: 'reincidencias',
      label: 'Radar de Reincidencias',
      shortLabel: 'Radar',
      category: 'OPERACIONES',
      icon: Activity,
      badge: cronicosCount,
      badgeType: cronicosCount > 0 ? 'danger' : 'neutral'
    },
    {
      key: 'preventivos',
      label: 'Plan de Preventivos (MP)',
      shortLabel: 'Preventivos',
      category: 'OPERACIONES',
      icon: Wrench,
      badge: mpPendingCount,
      badgeType: 'warning'
    },
    {
      key: 'dashboard_operativo',
      label: 'Dashboard Operativo',
      shortLabel: 'Dashboard',
      category: 'GESTIÓN',
      icon: LayoutDashboard,
    },
    {
      key: 'base_instalada',
      label: 'Base Instalada 2026',
      shortLabel: 'Base',
      category: 'GESTIÓN',
      icon: Building2,
      badge: baseEquiposCount,
      badgeType: 'neutral'
    },
    {
      key: 'analisis_patagonia',
      label: 'Análisis Atenciones',
      shortLabel: 'Atenciones',
      category: 'GESTIÓN',
      icon: FileSpreadsheet,
    },
    {
      key: 'tablas_ref',
      label: 'Stock Fijo & Referencias',
      shortLabel: 'Stock Fijo',
      category: 'GESTIÓN',
      icon: Database,
    },
    {
      key: 'call_rate',
      label: 'Call Rate & Fabricantes',
      shortLabel: 'Call Rate',
      category: 'GESTIÓN',
      icon: BarChart3,
    },
    {
      key: 'carga_laboral',
      label: 'Carga Laboral & KM',
      shortLabel: 'Carga',
      category: 'GESTIÓN',
      icon: Truck,
    },
    {
      key: 'repuestos',
      label: 'Repuestos & Despachos',
      shortLabel: 'Repuestos',
      category: 'AUDITORÍA & DATOS',
      icon: Package,
    },
    {
      key: 'importador',
      label: 'Repositorio de Reportes',
      shortLabel: 'Reportes',
      category: 'AUDITORÍA & DATOS',
      icon: UploadCloud,
    }
  ];

  const expanded = isPinned || isHovered;

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative z-50 flex flex-col bg-[#121318] border-r border-white/10 transition-all duration-300 ease-in-out shadow-2xl flex-shrink-0 select-none ${
        expanded ? 'w-64' : 'w-16'
      }`}
    >
      {/* Top Header / HAL 9000 Branding */}
      <div className="h-14 flex items-center px-3 border-b border-white/5 overflow-hidden">
        <div 
          onClick={onOpenHallAi}
          className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-red-500/80 shadow-md shadow-red-500/30 flex-shrink-0 bg-black flex items-center justify-center cursor-pointer group hover:border-red-400 hover:shadow-red-500/60 transition-all duration-300" 
          title="HAL IA 9000 — Click para abrir asistente táctico"
        >
          <img 
            src="/hal9000.webp" 
            alt="HAL 9000 Logo" 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
          />
          <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-red-500/30 pointer-events-none" />
          <div className="absolute inset-0 rounded-full bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>

        {expanded && (
          <div className="ml-3 flex-1 min-w-0 transition-opacity duration-200 opacity-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-wider text-white truncate flex items-center gap-1.5">
                HAL IA
                <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-bold">
                  9000
                </span>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPinned(!isPinned);
                }}
                className={`p-1 rounded text-xs transition-colors ${
                  isPinned ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500 hover:text-slate-300'
                }`}
                title={isPinned ? 'Desanclar menú (ocultar automáticamente)' : 'Fijar menú siempre abierto'}
              >
                {isPinned ? <Pin className="w-3.5 h-3.5 rotate-45" /> : <PinOff className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 truncate">Supervisor Patagonia</p>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden space-y-1">
        {navItems.map((item, index) => {
          const isActive = activeTab === item.key;
          const Icon = item.icon;
          const showCategoryHeader = expanded && (index === 0 || navItems[index - 1].category !== item.category);

          return (
            <React.Fragment key={item.key}>
              {showCategoryHeader && (
                <div className="pt-2.5 pb-1 px-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    {item.category}
                  </span>
                </div>
              )}

              <button
                onClick={() => onTabChange(item.key)}
                className={`group w-full flex items-center rounded-xl px-2.5 py-2.5 transition-all text-left relative ${
                  isActive
                    ? 'bg-[#1e2029] text-white shadow-sm border border-white/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#181920]'
                }`}
                title={!expanded ? item.label : undefined}
              >
                {/* Active Indicator Strip */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-amber-500 rounded-r-full shadow-sm shadow-amber-500/50" />
                )}

                {/* Icon */}
                <div className={`flex items-center justify-center w-5 h-5 flex-shrink-0 ${
                  isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Collapsed notification dot */}
                {!expanded && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-[#121318]" />
                )}

                {/* Expanded Label & Badges */}
                {expanded && (
                  <div className="ml-3 flex-1 flex items-center justify-between min-w-0 transition-opacity duration-200">
                    <span className={`text-xs font-semibold truncate ${
                      isActive ? 'text-white font-bold' : 'text-slate-300 group-hover:text-white'
                    }`}>
                      {item.label}
                    </span>

                    {item.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1.5 flex-shrink-0 ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : item.badgeType === 'danger'
                          ? 'bg-red-950/60 text-red-300 border border-red-500/40'
                          : item.badgeType === 'warning'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                          : 'bg-[#22242d] text-slate-300 border border-white/5'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Bottom Footer / HAL IA Assistant Trigger */}
      <div className="p-2 border-t border-white/5">
        <button
          onClick={onOpenHallAi}
          className={`w-full flex items-center rounded-xl p-2 transition-all group ${
            expanded
              ? 'bg-gradient-to-r from-red-950/60 via-[#181920] to-[#121318] border border-red-500/30 hover:border-red-400/60 text-slate-200'
              : 'justify-center text-red-400 hover:bg-[#181920]'
          }`}
          title="Abrir Asistente HAL IA (Chat Inteligente)"
        >
          <div className="relative w-6 h-6 rounded-full overflow-hidden border border-red-500/80 flex-shrink-0 bg-black flex items-center justify-center">
            <img src="/hal9000.webp" alt="HAL IA" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-red-500/20 animate-pulse" />
          </div>

          {expanded && (
            <div className="ml-2.5 flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white group-hover:text-red-300 transition-colors">
                  HAL IA Copilot
                </span>
                <Sparkles className="w-3 h-3 text-red-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-slate-400 truncate">Consultar base & SLA</p>
            </div>
          )}
        </button>

        {/* Pin Status Button in Collapsed Mode */}
        {!expanded && (
          <button
            onClick={() => setIsPinned(!isPinned)}
            className="w-full mt-2 flex items-center justify-center p-2 text-slate-500 hover:text-slate-300 hover:bg-[#181920] rounded-lg transition-colors"
            title="Fijar menú lateral abierto"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
