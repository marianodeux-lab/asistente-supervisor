import React, { useState } from 'react';
import { Header } from './components/Header';
import { TabNavigation, TabKey } from './components/TabNavigation';
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
import { AuthService } from './services/authService';

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
  UserAccount
} from './types';

export function App() {
  // User Authentication & Session State
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => AuthService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'FIRST_LOGIN' | 'FORGOT_PASSWORD'>('LOGIN');
  const [isUserManagementOpen, setIsUserManagementOpen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<TabKey>('sla_agenda');

  // Application Data State
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets as Ticket[]);
  const [cronicos, setCronicos] = useState<EquipoCronico[]>(initialCronicos as unknown as EquipoCronico[]);
  const [preventivos, setPreventivos] = useState<PreventivosState>(initialPreventivos as PreventivosState);
  const [callRate, setCallRate] = useState<CallRateState>(initialCallRate as CallRateState);
  const [cargaLaboral, setCargaLaboral] = useState<CargaLaboralState>(initialCargaLaboral as CargaLaboralState);
  const [despachos, setDespachos] = useState<DespachoItem[]>(initialDespachos as DespachoItem[]);
  const [repuestos, setRepuestos] = useState<RepuestosState>(initialRepuestos as RepuestosState);
  
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
      data: initialTickets as Ticket[]
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
    setTickets(initialTickets as Ticket[]);
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

  // Refresh simulation
  const handleRefresh = () => {
    setTickets(prev => [...prev]);
  };

  const handleExport = () => {
    setActiveTab('sla_agenda');
  };

  const handleOpenAuthModal = (mode: 'LOGIN' | 'FIRST_LOGIN' | 'FORGOT_PASSWORD' = 'LOGIN') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        onOpenAuthModal={handleOpenAuthModal}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        tickets={tickets}
        cronicos={cronicos}
        onRefresh={handleRefresh}
        onExport={handleExport}
        activeTab={activeTab}
      />

      {/* Tabs Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ticketCount={tickets.length}
        cronicosCount={cronicos.filter(c => c.estadoSalud === 'CRÍTICO').length}
        mpPendingCount={preventivos.totalPendientes}
        baseEquiposCount={baseClientes.length}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        
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
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-4 text-center text-xs text-slate-500">
        <p>Portal Asistente Supervisor • Servicio Técnico Patagonia & Suroeste (IN BAR, IN CIP, IN NQN) • Operaciones Flow Pro</p>
      </footer>

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

    </div>
  );
}

export default App;
