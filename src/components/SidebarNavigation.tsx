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
  Bot,
  ShieldAlert
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
      key: 'sla_causalidades',
      label: 'Auditoría SLA & Causales',
      shortLabel: 'Causales',
      category: 'OPERACIONES',
      icon: ShieldAlert,
      badge: 664,
      badgeType: 'warning'
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
      className={`relative z-50 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out shadow-sm flex-shrink-0 select-none ${
        expanded ? 'w-64' : 'w-16'
      }`}
    >
      {/* Top Header / HAL 9000 Branding */}
      <div className="h-14 flex items-center px-3 border-b border-slate-100 overflow-hidden bg-slate-50/60">
        <div 
          onClick={onOpenHallAi}
          className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-rose-300 shadow-xs flex-shrink-0 bg-black flex items-center justify-center cursor-pointer group hover:border-rose-400 transition-all duration-300" 
          title="HAL IA 9000 — Click para abrir asistente táctico"
        >
          <img 
            src="/hal9000.webp" 
            alt="HAL 9000 Logo" 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
          />
          <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-rose-500/20 pointer-events-none" />
          <div className="absolute inset-0 rounded-full bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>

        {expanded && (
          <div className="ml-3 flex-1 min-w-0 transition-opacity duration-200 opacity-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-wider text-slate-800 truncate flex items-center gap-1.5">
                HAL IA
                <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                  9000
                </span>
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPinned(!isPinned);
                }}
                className={`p-1 rounded text-xs transition-colors ${
                  isPinned ? 'text-teal-600 hover:text-teal-700' : 'text-slate-400 hover:text-slate-600'
                }`}
                title={isPinned ? 'Desanclar menú (ocultar automáticamente)' : 'Fijar menú siempre abierto'}
              >
                {isPinned ? <Pin className="w-3.5 h-3.5 rotate-45" /> : <PinOff className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 truncate">Supervisor Patagonia</p>
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
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {item.category}
                  </span>
                </div>
              )}

              <button
                onClick={() => onTabChange(item.key)}
                className={`group w-full flex items-center rounded-xl px-2.5 py-2 transition-all text-left relative ${
                  isActive
                    ? 'bg-teal-50 text-teal-900 border border-teal-200/80 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
                title={!expanded ? item.label : undefined}
              >
                {/* Active Indicator Strip */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-teal-600 rounded-r-full shadow-xs" />
                )}

                {/* Icon */}
                <div className={`flex items-center justify-center w-5 h-5 flex-shrink-0 ${
                  isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Collapsed notification dot */}
                {!expanded && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500 ring-2 ring-white" />
                )}

                {/* Expanded Label & Badges */}
                {expanded && (
                  <div className="ml-3 flex-1 flex items-center justify-between min-w-0 transition-opacity duration-200">
                    <span className={`text-xs truncate ${
                      isActive ? 'text-teal-950 font-bold' : 'text-slate-700 group-hover:text-slate-900 font-medium'
                    }`}>
                      {item.label}
                    </span>

                    {item.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ml-1.5 flex-shrink-0 ${
                        isActive
                          ? 'bg-teal-100 text-teal-800 border border-teal-200'
                          : item.badgeType === 'danger'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : item.badgeType === 'warning'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
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
      <div className="p-2 border-t border-slate-100 bg-slate-50/50">
        <button
          onClick={onOpenHallAi}
          className={`w-full flex items-center rounded-xl p-2 transition-all group ${
            expanded
              ? 'bg-white border border-slate-200 hover:border-teal-300 text-slate-700 shadow-xs'
              : 'justify-center text-rose-500 hover:bg-slate-100'
          }`}
          title="Abrir Asistente HAL IA (Chat Inteligente)"
        >
          <div className="relative w-6 h-6 rounded-full overflow-hidden border border-rose-300 flex-shrink-0 bg-black flex items-center justify-center">
            <img src="/hal9000.webp" alt="HAL IA" className="w-full h-full object-cover" />
          </div>

          {expanded && (
            <div className="ml-2.5 flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
                  HAL IA Copilot
                </span>
                <Sparkles className="w-3 h-3 text-teal-600" />
              </div>
              <p className="text-[10px] text-slate-500 truncate">Consultar base & SLA</p>
            </div>
          )}
        </button>

        {/* Pin Status Button in Collapsed Mode */}
        {!expanded && (
          <button
            onClick={() => setIsPinned(!isPinned)}
            className="w-full mt-2 flex items-center justify-center p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Fijar menú lateral abierto"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
