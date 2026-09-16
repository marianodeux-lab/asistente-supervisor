import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SidebarNavigation } from './components/SidebarNavigation';
import { TabKey } from './components/TabNavigation';
import { SlaMonitor } from './components/SlaMonitor';
import { RecurrenceRadar } from './components/RecurrenceRadar';
import { PreventivosManager } from './components/PreventivosManager';
import { CallRateAnalytics } from './components/CallRateAnalytics';
import { CargaLaboralView } from './components/CargaLaboralView';
import { DespachosRepuestosView } from './components/DespachosRepuestosView';
import { ReferenceTablesView } from './components/ReferenceTablesView';
import { BaseInstaladaView } from './components/BaseInstaladaView';
import { ReportRepository, ReportItem } from './components/ReportRepository';
import { TicketDetailModal } from './components/TicketDetailModal';
import { ChronicDetailModal } from './components/ChronicDetailModal';
import { AuthModal } from './components/AuthModal';
import { UserManagementModal } from './components/UserManagementModal';
import { HallAiAssistantModal } from './components/HallAiAssistantModal';
import { AuthService } from './services/authService';
import { ReportSyncService } from './services/reportSyncService';

// Preloaded datasets
import initialTickets from './data/agendaData.json';
import initialCronicos from './data/reincidenciasData.json';
import initialPreventivos from './data/preventivosData.json';
import initialCallRate from './data/callRateData.json';
import initialCargaLaboral from './data/cargaLaboralData.json';
import initialDespachos from './data/despachosData.json';
import initialRepuestos from './data/repuestosData.json';
import tecnicosZonas from './data/tecnicosZonasData.json';

import stockFijoData from './data/stockFijoData.json';
import modelosMpcrData from './data/modelosMpcrData.json';
import zonasTecnicosRef from './data/zonasTecnicosReferencia.json';
import ctdDemoradosData from './data/ctdRadarDemoradosData.json';
import baseInstaladaClientesData from './data/baseInstaladaClientesData.json';
import stockAuditoriaData from './data/stockAuditoriaData.json';
import stockRegionalMdpData from './data/stockRegionalMdpData.json';
import solicitudesStockData from './data/solicitudesStockData.json';

import { 
  Ticket, 
  EquipoCronico, 
  PreventivosState, 
  CtdDemoradoItem,
  CallRateState, 
  CargaLaboralState, 
  DespachoItem, 
  RepuestosState, 
  TecnicoInfo, 
  ZonaInfo,
  StockFijoItem,
  ModeloMpcrItem,
  CallRateBenchmark,
  ZonaTecnicoRef,
  BaseInstaladaClienteRow,
  UserAccount,
  StockAuditoriaState,
  StockRegionalItem,
  SolicitudesStockState
} from './types';

export function App() {
  // User Authentication & Session State
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => AuthService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'FIRST_LOGIN' | 'FORGOT_PASSWORD'>('LOGIN');
  const [isUserManagementOpen, setIsUserManagementOpen] = useState<boolean>(false);
  const [isHallModalOpen, setIsHallModalOpen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<TabKey>('sla_agenda');

  // Application Data State
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets as unknown as Ticket[]);
  const [cronicos, setCronicos] = useState<EquipoCronico[]>(initialCronicos as unknown as EquipoCronico[]);
  const [preventivos, setPreventivos] = useState<PreventivosState>(initialPreventivos as PreventivosState);
  const [callRate, setCallRate] = useState<CallRateState>(initialCallRate as CallRateState);
  const [cargaLaboral, setCargaLaboral] = useState<CargaLaboralState>(initialCargaLaboral as CargaLaboralState);
  const [despachos, setDespachos] = useState<DespachoItem[]>(initialDespachos as DespachoItem[]);
  const [repuestos, setRepuestos] = useState<RepuestosState>(initialRepuestos as RepuestosState);
  const [stockAuditoria, setStockAuditoria] = useState<StockAuditoriaState>(stockAuditoriaData as unknown as StockAuditoriaState);
  
  // Reference Tables State
  const [stockFijo, setStockFijo] = useState<StockFijoItem[]>(stockFijoData as StockFijoItem[]);
  const [modelosMpcr, setModelosMpcr] = useState<ModeloMpcrItem[]>(modelosMpcrData.modelos as ModeloMpcrItem[]);
  const [benchmarks, setBenchmarks] = useState<CallRateBenchmark[]>(modelosMpcrData.benchmarks as CallRateBenchmark[]);
  const [zonasRef, setZonasRef] = useState<ZonaTecnicoRef[]>(zonasTecnicosRef as unknown as ZonaTecnicoRef[]);
  const [baseClientes, setBaseClientes] = useState<BaseInstaladaClienteRow[]>(baseInstaladaClientesData as BaseInstaladaClienteRow[]);

  const tecnicos: TecnicoInfo[] = tecnicosZonas.tecnicos;
  const zonas: ZonaInfo[] = tecnicosZonas.zonas;

  // Selected modals
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedCronico, setSelectedCronico] = useState<EquipoCronico | null>(null);

  // In-App Report Repository State
  const [reports, setReports] = useState<ReportItem[]>([
    {
      id: 'rep_base_1',
      name: 'Agenda_Diaria_Patagonia_Oficial.xlsx',
      size: '13.2 MB',
      uploadDate: '06/09/2026 21:00',
      rowCount: initialTickets.length,
      isActive: true,
      ticketsCount: initialTickets.length,
      data: initialTickets as unknown as Ticket[]
    },
    {
      id: 'rep_base_2',
      name: 'Reporte_Suspendidos_Patagonia.xls',
      size: '11.4 MB',
      uploadDate: '06/09/2026 22:30',
      rowCount: 9470,
      isActive: false,
      ticketsCount: 9470,
      data: []
    },
    {
      id: 'rep_base_3',
      name: 'Reporte_Suspendidos_Suroeste.xls',
      size: '15.1 MB',
      uploadDate: '06/09/2026 22:35',
      rowCount: 12275,
      isActive: false,
      ticketsCount: 12275,
      data: []
    }
  ]);

  const activeReportName = reports.find(r => r.isActive)?.name || 'Agenda_Diaria_Patagonia_Oficial.xlsx';

  // Handler for uploading new report
  const handleUploadSuccess = (newReport: ReportItem) => {
    setReports(prev => [
      newReport,
      ...prev.map(r => ({ ...r, isActive: false }))
    ]);

    if (newReport.data && newReport.data.length > 0) {
      setTickets(newReport.data);
    }
    setActiveTab('sla_agenda');
  };

  // Handler for activating previous report
  const handleActivateReport = (reportId: string) => {
    setReports(prev => prev.map(r => ({
      ...r,
      isActive: r.id === reportId
    })));

    const target = reports.find(r => r.id === reportId);
    if (target && target.data && target.data.length > 0) {
      setTickets(target.data);
    }
  };

  // Handler for restoring default unified agenda
  const handleRestoreDefaultAgenda = () => {
    setTickets(initialTickets as unknown as Ticket[]);
    setReports(prev => prev.map(r => ({
      ...r,
      isActive: r.name.includes('Agenda_Diaria_Patagonia_Oficial') || r.id === 'rep_base_1'
    })));
    setActiveTab('sla_agenda');
  };

  // Handler for deleting report
  const handleDeleteReport = (reportId: string) => {
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  // Handler for updating a single ticket
  const handleUpdateTicket = (updated: Ticket) => {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTicket(updated);
  };

  // Cloud Sync on Mount & Refresh
  const fetchCloudData = async () => {
    try {
      // 1. Fetch Agenda Activa
      const res = await ReportSyncService.fetchActiveDataset<Ticket[]>('agenda_activa');
      if (res.data && res.data.payload && Array.isArray(res.data.payload) && res.data.payload.length > 0) {
        const cloudTickets = res.data.payload;
        setTickets(cloudTickets);

        const cloudReportItem: ReportItem = {
          id: 'rep_cloud_active',
          name: res.data.archivos_origen.length > 0 ? res.data.archivos_origen.join(' + ') : 'Agenda Nube Supabase',
          size: `${(JSON.stringify(cloudTickets).length / (1024 * 1024)).toFixed(2)} MB`,
          uploadDate: new Date(res.data.updated_at).toLocaleString('es-AR'),
          rowCount: res.data.total_registros,
          isActive: true,
          ticketsCount: cloudTickets.length,
          data: cloudTickets,
          author: res.data.updated_by,
          isCloudSynced: res.source === 'supabase'
        };

        setReports(prev => [
          cloudReportItem,
          ...prev.filter(r => r.id !== 'rep_cloud_active').map(r => ({ ...r, isActive: false }))
        ]);
      }

      // 2. Fetch Stock Repuestos Activo
      const stockRes = await ReportSyncService.fetchActiveDataset<StockAuditoriaState>('stock_repuestos_activo');
      if (stockRes.data && stockRes.data.payload && stockRes.data.payload.tecnicos) {
        setStockAuditoria(stockRes.data.payload);
      }
    } catch (e) {
      console.warn('Error fetching cloud data on mount:', e);
    }
  };

  useEffect(() => {
    fetchCloudData();
  }, []);

  // Refresh handler
  const handleRefresh = () => {
    fetchCloudData();
  };

  const handleExport = () => {
    setActiveTab('sla_agenda');
  };

  const handleOpenAuthModal = (mode: 'LOGIN' | 'FIRST_LOGIN' | 'FORGOT_PASSWORD' = 'LOGIN') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="h-screen w-screen bg-[#0e0f13] text-[#f1f3f6] flex flex-row overflow-hidden selection:bg-amber-500 selection:text-slate-950">
      
      {/* Auto-Hiding Left Rail Sidebar with Hover Expansion */}
      <SidebarNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ticketCount={tickets.length}
        cronicosCount={cronicos.filter(c => c.estadoSalud === 'CRÍTICO').length}
        mpPendingCount={preventivos.totalPendientes}
        baseEquiposCount={baseClientes.length}
        onOpenHallAi={() => setIsHallModalOpen(true)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Ultra-compact Top Header */}
        <Header
          currentUser={currentUser}
          onOpenAuthModal={handleOpenAuthModal}
          onOpenUserManagement={() => setIsUserManagementOpen(true)}
          onOpenHallAi={() => setIsHallModalOpen(true)}
          tickets={tickets}
          cronicos={cronicos}
          onRefresh={handleRefresh}
          onExport={handleExport}
          activeTab={activeTab}
        />

        {/* High Availability Scrollable Data Canvas */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-5 bg-[#0e0f13]">
          
          {/* Tab 1: Control SLA & Agenda Diaria */}
          {activeTab === 'sla_agenda' && (
            <SlaMonitor
              tickets={tickets}
              tecnicos={tecnicos}
              zonas={zonas}
              cronicos={cronicos}
              onSelectTicket={setSelectedTicket}
              onOpenCronicoDetail={setSelectedCronico}
            />
          )}

          {/* Tab 2: Radar de Reincidencias */}
          {activeTab === 'reincidencias' && (
            <RecurrenceRadar
              cronicos={cronicos}
              zonas={zonas}
              onSelectCronico={setSelectedCronico}
            />
          )}

          {/* Tab 3: Plan de Preventivos (MP) */}
          {activeTab === 'preventivos' && (
            <PreventivosManager
              preventivos={preventivos}
              zonas={zonas}
              ctdDemorados={ctdDemoradosData as CtdDemoradoItem[]}
            />
          )}

          {/* Tab: Base Instalada Detalle Clientes */}
          {activeTab === 'base_instalada' && (
            <BaseInstaladaView
              data={baseClientes}
            />
          )}

          {/* Tab 4: Tablas de Referencia & Stock Fijo */}
          {activeTab === 'tablas_ref' && (
            <ReferenceTablesView
              stockFijo={stockFijo}
              modelosMpcr={modelosMpcr}
              benchmarks={benchmarks}
              zonasTecnicos={zonasRef}
              stockRegional={stockRegionalMdpData as StockRegionalItem[]}
              solicitudesStock={solicitudesStockData as unknown as SolicitudesStockState}
            />
          )}

          {/* Tab 5: Call Rate & Fabricantes */}
          {activeTab === 'call_rate' && (
            <CallRateAnalytics
              data={callRate}
            />
          )}

          {/* Tab 6: Carga Laboral & KM */}
          {activeTab === 'carga_laboral' && (
            <CargaLaboralView
              data={cargaLaboral}
              zonas={zonas}
            />
          )}

          {/* Tab 7: Repuestos & Despachos */}
          {activeTab === 'repuestos' && (
            <DespachosRepuestosView
              despachos={despachos}
              repuestos={repuestos}
              stockAuditoria={stockAuditoria}
              onRefreshAuditoria={handleRefresh}
            />
          )}

          {/* Tab 8: Repositorio Interno de Reportes */}
          {activeTab === 'importador' && (
            <ReportRepository
              reports={reports}
              onUploadSuccess={handleUploadSuccess}
              onActivateReport={handleActivateReport}
              onDeleteReport={handleDeleteReport}
              onRestoreDefaultAgenda={handleRestoreDefaultAgenda}
              activeReportName={activeReportName}
              currentUser={currentUser}
              onStockAuditSuccess={(newStock) => setStockAuditoria(newStock)}
            />
          )}

          {/* Footer inside data scroll */}
          <footer className="border-t border-white/5 py-4 text-center text-xs text-slate-500 mt-8">
            <p>Portal Asistente Supervisor • Servicio Técnico Patagonia & Suroeste (IN BAR, IN CIP, IN NQN) • Operaciones Flow Pro</p>
          </footer>

        </main>
      </div>

      {/* Modals */}
      <TicketDetailModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        tecnicos={tecnicos}
        cronicos={cronicos}
        onOpenCronicoDetail={setSelectedCronico}
        onUpdateTicket={handleUpdateTicket}
      />

      <ChronicDetailModal
        cronico={selectedCronico}
        onClose={() => setSelectedCronico(null)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserAuthenticated={(u) => setCurrentUser(u)}
        initialMode={authModalMode}
      />

      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUser={currentUser}
        onSwitchUser={(u) => setCurrentUser(u)}
      />

      <HallAiAssistantModal
        isOpen={isHallModalOpen}
        onClose={() => setIsHallModalOpen(false)}
        tickets={tickets}
        cronicos={cronicos}
        stockAuditoria={stockAuditoria}
        tecnicos={tecnicos}
        zonas={zonas}
      />

    </div>
  );
}

export default App;
