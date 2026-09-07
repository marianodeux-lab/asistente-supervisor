import React from 'react';
import { 
  Clock, 
  Activity, 
  Wrench, 
  BarChart3, 
  Truck, 
  Package, 
  Database,
  UploadCloud,
  Building2
} from 'lucide-react';

export type TabKey = 
  | 'sla_agenda' 
  | 'reincidencias' 
  | 'preventivos' 
  | 'base_instalada'
  | 'tablas_ref'
  | 'call_rate' 
  | 'carga_laboral' 
  | 'repuestos' 
  | 'importador';

interface TabNavigationProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  ticketCount: number;
  cronicosCount: number;
  mpPendingCount: number;
  baseEquiposCount?: number;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  ticketCount,
  cronicosCount,
  mpPendingCount,
  baseEquiposCount
}) => {
  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      key: 'sla_agenda',
      label: 'Control SLA & Agenda',
      icon: <Clock className="w-4 h-4" />,
      badge: ticketCount
    },
    {
      key: 'reincidencias',
      label: 'Radar de Reincidencias',
      icon: <Activity className="w-4 h-4" />,
      badge: cronicosCount
    },
    {
      key: 'preventivos',
      label: 'Plan de Preventivos (MP)',
      icon: <Wrench className="w-4 h-4" />,
      badge: mpPendingCount
    },
    {
      key: 'base_instalada',
      label: 'Base Instalada',
      icon: <Building2 className="w-4 h-4" />,
      badge: baseEquiposCount
    },
    {
      key: 'tablas_ref',
      label: 'Stock Fijo & Referencias',
      icon: <Database className="w-4 h-4" />
    },
    {
      key: 'call_rate',
      label: 'Call Rate & Fabricantes',
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      key: 'carga_laboral',
      label: 'Carga Laboral & KM',
      icon: <Truck className="w-4 h-4" />
    },
    {
      key: 'repuestos',
      label: 'Repuestos & Despachos',
      icon: <Package className="w-4 h-4" />
    },
    {
      key: 'importador',
      label: 'Repositorio de Reportes',
      icon: <UploadCloud className="w-4 h-4" />
    }
  ];

  return (
    <nav className="bg-slate-900/90 border-b border-slate-800 px-4 lg:px-8 py-2 overflow-x-auto scrollbar-thin">
      <div className="flex items-center gap-1.5 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-slate-950 text-amber-300'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
