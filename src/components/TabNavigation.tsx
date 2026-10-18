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
  Building2,
  FileSpreadsheet,
  LayoutDashboard,
  ShieldAlert
} from 'lucide-react';

export type TabKey = 
  | 'dashboard_operativo'
  | 'sla_agenda' 
  | 'sla_causalidades'
  | 'reincidencias' 
  | 'preventivos' 
  | 'base_instalada'
  | 'analisis_patagonia'
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
      key: 'dashboard_operativo',
      label: 'Dashboard KPIs',
      icon: <LayoutDashboard className="w-4 h-4 text-teal-600" />
    },
    {
      key: 'sla_agenda',
      label: 'Control SLA & Agenda',
      icon: <Clock className="w-4 h-4 text-slate-500" />,
      badge: ticketCount
    },
    {
      key: 'sla_causalidades',
      label: 'Auditoría SLA & Causales',
      icon: <ShieldAlert className="w-4 h-4 text-teal-600" />,
      badge: 664
    },
    {
      key: 'reincidencias',
      label: 'Radar de Reincidencias',
      icon: <Activity className="w-4 h-4 text-purple-500" />,
      badge: cronicosCount
    },
    {
      key: 'preventivos',
      label: 'Plan de Preventivos (MP)',
      icon: <Wrench className="w-4 h-4 text-amber-500" />,
      badge: mpPendingCount
    },
    {
      key: 'base_instalada',
      label: 'Base Instalada',
      icon: <Building2 className="w-4 h-4 text-sky-500" />,
      badge: baseEquiposCount
    },
    {
      key: 'analisis_patagonia',
      label: 'Análisis Atenciones',
      icon: <FileSpreadsheet className="w-4 h-4 text-teal-600" />
    },
    {
      key: 'tablas_ref',
      label: 'Stock Fijo & Referencias',
      icon: <Database className="w-4 h-4 text-slate-500" />
    },
    {
      key: 'call_rate',
      label: 'Call Rate & Fabricantes',
      icon: <BarChart3 className="w-4 h-4 text-slate-500" />
    },
    {
      key: 'carga_laboral',
      label: 'Carga Laboral & KM',
      icon: <Truck className="w-4 h-4 text-slate-500" />
    },
    {
      key: 'repuestos',
      label: 'Repuestos & Despachos',
      icon: <Package className="w-4 h-4 text-slate-500" />
    },
    {
      key: 'importador',
      label: 'Repositorio de Reportes',
      icon: <UploadCloud className="w-4 h-4 text-slate-500" />
    }
  ];

  return (
    <nav className="bg-[#f1f5f9]/95 border-b border-slate-300 px-4 lg:px-8 py-2 overflow-x-auto scrollbar-thin backdrop-blur-xs">
      <div className="flex items-center gap-1.5 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-teal-100 text-teal-950 border border-teal-300 font-bold shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-teal-200/90 text-teal-900'
                      : 'bg-slate-200 text-slate-700 border border-slate-300'
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
