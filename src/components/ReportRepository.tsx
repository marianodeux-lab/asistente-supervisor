import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  RotateCcw, 
  Database, 
  ShieldCheck, 
  AlertCircle,
  Sparkles,
  Cloud,
  CloudOff,
  Settings2,
  RefreshCw,
  ExternalLink,
  Check,
  X
} from 'lucide-react';
import { parseExcelFile, ProcessedExcelResult } from '../services/excelProcessor';
import { processStockFiles } from '../services/stockProcessor';
import { ReportSyncService, UploadHistoryItem } from '../services/reportSyncService';
import { 
  getSupabaseConfig, 
  saveRuntimeSupabaseConfig, 
  clearRuntimeSupabaseConfig, 
  testSupabaseConnection 
} from '../services/supabaseClient';
import { Ticket, UserAccount, StockAuditoriaState } from '../types';

export interface ReportItem {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  rowCount: number;
  isActive: boolean;
  ticketsCount: number;
  data: Ticket[];
  author?: string;
  isCloudSynced?: boolean;
}

interface ReportRepositoryProps {
  reports: ReportItem[];
  onUploadSuccess: (newReport: ReportItem) => void;
  onActivateReport: (reportId: string) => void;
  onDeleteReport: (reportId: string) => void;
  onRestoreDefaultAgenda?: () => void;
  activeReportName: string;
  currentUser?: UserAccount;
  onStockAuditSuccess?: (newStock: StockAuditoriaState) => void;
}

export const ReportRepository: React.FC<ReportRepositoryProps> = ({
  reports,
  onUploadSuccess,
  onActivateReport,
  onDeleteReport,
  onRestoreDefaultAgenda,
  activeReportName,
  currentUser,
  onStockAuditSuccess
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase Configuration State
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig());
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Cloud History State
  const [cloudHistory, setCloudHistory] = useState<UploadHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const hist = await ReportSyncService.fetchUploadHistory('agenda_activa');
      setCloudHistory(hist);
    } catch (e) {
      console.warn('Could not load upload history', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    setSupabaseConfig(getSupabaseConfig());
    loadHistory();
  }, []);

  const handleOpenConfigModal = () => {
    const cfg = getSupabaseConfig();
    setInputUrl(cfg.url);
    setInputKey(cfg.anonKey);
    setTestResult(null);
    setIsConfigModalOpen(true);
  };

  const handleTestAndSaveConfig = async () => {
    if (!inputUrl || !inputKey) {
      setTestResult({ success: false, message: 'Ingresa tanto la URL como la Anon Key.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      saveRuntimeSupabaseConfig(inputUrl, inputKey);
      const res = await testSupabaseConnection();
      setTestResult(res);
      setSupabaseConfig(getSupabaseConfig());

      if (res.success) {
        setTimeout(() => {
          setIsConfigModalOpen(false);
          loadHistory();
        }, 1500);
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Error al conectar' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearConfig = () => {
    clearRuntimeSupabaseConfig();
    setSupabaseConfig(getSupabaseConfig());
    setInputUrl('');
    setInputKey('');
    setTestResult(null);
  };

  const handleFilesProcess = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const authorName = currentUser?.nombre || 'Mariano Deux';
      const messages: string[] = [];

      // 1. Separate Stock Reports (Stock Deuda / Stock Tecnico) from Agenda Reports
      const stockFiles = files.filter(f => {
        const l = f.name.toLowerCase();
        return l.includes('deuda') || l.includes('stock tecnico') || l.includes('stock técnico');
      });

      const agendaFiles = files.filter(f => {
        const l = f.name.toLowerCase();
        return !l.includes('deuda') && !l.includes('stock tecnico') && !l.includes('stock técnico');
      });

      // Process Stock Reports if present
      if (stockFiles.length > 0) {
        const { result: stockResult, processedFiles: stockProcessed } = await processStockFiles(stockFiles);
        if (stockProcessed.length > 0) {
          const totalStockBytes = stockFiles.reduce((acc, f) => acc + f.size, 0);
          const syncStock = await ReportSyncService.upsertReportDataset(
            'stock_repuestos_activo',
            stockResult,
            {
              updated_by: authorName,
              archivos_origen: stockProcessed,
              total_registros: stockResult.totalAdeudadoRegion,
              tamaño_kb: Math.round(totalStockBytes / 1024)
            }
          );

          if (onStockAuditSuccess) {
            onStockAuditSuccess(stockResult);
          }

          messages.push(`¡Repuestos de Stock procesados (${stockProcessed.join(', ')})! Total a devolver: ${stockResult.totalAdeudadoRegion} piezas.`);
        }
      }

      // Process Agenda Reports if present
      if (agendaFiles.length > 0) {
        const mergedMap = new Map<string, Ticket>();
        let totalRows = 0;
        let totalBytes = 0;
        const processedNames: string[] = [];

        for (const file of agendaFiles) {
          if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
            continue;
          }

          const result: ProcessedExcelResult = await parseExcelFile(file);
          totalRows += result.rowCount;
          totalBytes += file.size;
          processedNames.push(file.name);

          result.tickets.forEach(t => {
            if (!mergedMap.has(t.pedido)) {
              mergedMap.set(t.pedido, t);
            } else {
              const existing = mergedMap.get(t.pedido)!;
              mergedMap.set(t.pedido, { ...existing, ...t });
            }
          });
        }

        const mergedTickets = Array.from(mergedMap.values());
        if (mergedTickets.length > 0) {
          const sizeKB = (totalBytes / 1024).toFixed(1);
          const sizeStr = totalBytes > 1024 * 1024 ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB` : `${sizeKB} KB`;
          const displayName = agendaFiles.length === 1 ? agendaFiles[0].name : `Agenda Unificada (${agendaFiles.length} reportes)`;

          const syncResult = await ReportSyncService.upsertReportDataset(
            'agenda_activa',
            mergedTickets,
            {
              updated_by: authorName,
              archivos_origen: processedNames,
              total_registros: mergedTickets.length,
              tamaño_kb: Math.round(totalBytes / 1024)
            }
          );

          const newReport: ReportItem = {
            id: `rep_${Date.now()}`,
            name: displayName,
            size: sizeStr,
            uploadDate: new Date().toLocaleString('es-AR'),
            rowCount: totalRows,
            isActive: true,
            ticketsCount: mergedTickets.length,
            data: mergedTickets,
            author: authorName,
            isCloudSynced: syncResult.savedToCloud
          };

          onUploadSuccess(newReport);
          messages.push(`¡Agenda sincronizada con ${mergedTickets.length} pedidos!`);
        }
      }

      if (messages.length > 0) {
        setSuccessMsg(messages.join(' '));
        loadHistory();
      } else {
        setErrorMsg('No se encontraron registros válidos de Agenda ni de Stock en los archivos.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al procesar los archivos. Verifica que sean formatos válidos de Flow Pro.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesProcess(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Corporate Cloud Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl border mt-0.5 ${
            supabaseConfig.isConfigured 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
          }`}>
            {supabaseConfig.isConfigured ? <Cloud className="w-6 h-6" /> : <CloudOff className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white">
                Repositorio de Reportes Flow Pro
              </h3>
              {supabaseConfig.isConfigured ? (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Supabase Conectado
                </span>
              ) : (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Modo Local (Pendiente Supabase)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
              Descarga tus reportes de <strong>Flow Pro</strong> (Pendientes Patagonia, Pendientes Suroeste, Asignados, Adicionales) directamente en la PC de tu oficina y arrástralos aquí. La aplicación los unifica, cruza con la base técnica y los sincroniza automáticamente en la nube.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
          <button
            onClick={handleOpenConfigModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition shadow-sm"
          >
            <Settings2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Configurar Supabase</span>
          </button>

          {onRestoreDefaultAgenda && (
            <button
              onClick={onRestoreDefaultAgenda}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition shadow-md shadow-amber-500/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Restablecer Agenda Oficial</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Drag & Drop Area (Multiple Files Supported) */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-amber-500 bg-amber-500/10 scale-[0.99]'
            : 'border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900/90'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFilesProcess(e.target.files);
            }
          }}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-inner">
            <UploadCloud className="w-8 h-8 animate-bounce" />
          </div>

          <div>
            <h4 className="text-base font-bold text-white">
              {isProcessing ? 'Procesando y sincronizando con la nube...' : 'Arrastra aquí tus Reportes de Flow Pro'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Puedes seleccionar uno o varios archivos simultáneamente (<strong className="text-slate-200">Pendientes Patagonia, Suroeste, Asignados, Adicionales, Stock Deuda, Stock Técnico</strong>).
            </p>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-center justify-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Historical Repository & Cloud Sync Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Local & Active Reports (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Versiones Disponibles en el Panel</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {reports.length} reportes en sesión
            </span>
          </div>

          <div className="space-y-2.5">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  rep.isActive
                    ? 'bg-slate-950 border-amber-500/60 shadow-md shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    rep.isActive ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{rep.name}</span>
                      {rep.isActive && (
                        <span className="text-[10px] bg-emerald-950 border border-emerald-600 text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> ACTIVO
                        </span>
                      )}
                      {rep.isCloudSynced && (
                        <span className="text-[10px] bg-blue-950 border border-blue-600 text-blue-300 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                          <Cloud className="w-2.5 h-2.5" /> NUBE
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span>Subido: <strong>{rep.uploadDate}</strong></span>
                      <span>•</span>
                      <span>Tamaño: {rep.size}</span>
                      <span>•</span>
                      <span>Pedidos: <strong className="text-amber-400">{rep.ticketsCount || rep.rowCount}</strong></span>
                      {rep.author && (
                        <>
                          <span>•</span>
                          <span>Por: <strong className="text-slate-300">{rep.author}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!rep.isActive && (
                    <button
                      onClick={() => onActivateReport(rep.id)}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Activar en Panel</span>
                    </button>
                  )}

                  {reports.length > 1 && (
                    <button
                      onClick={() => onDeleteReport(rep.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
                      title="Eliminar de repositorio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cloud Audit History (1 Col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Historial en Nube Supabase</h3>
            </div>
            <button
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="text-slate-400 hover:text-white transition p-1"
              title="Refrescar historial"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {cloudHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No hay registros de cargas en la nube todavía.</p>
              <p className="mt-1 text-[11px] text-slate-600">Al arrastrar tus reportes se listarán aquí para todos los supervisores.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {cloudHistory.map((item) => (
                <div key={item.id} className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 truncate max-w-[180px]" title={item.nombre_archivo}>
                      {item.nombre_archivo}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      {item.total_registros} reg
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{item.subido_por}</span>
                    <span>{new Date(item.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Supabase Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Conexión a Supabase Nube</h3>
                  <p className="text-xs text-slate-400">Sincronización multi-dispositivo sin Google Drive</p>
                </div>
              </div>
              <button 
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Supabase Project URL:
                </label>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Supabase Anon / Public Key:
                </label>
                <textarea
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                />
              </div>

              {testResult && (
                <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  testResult.success 
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' 
                    : 'bg-red-950/60 border-red-500/50 text-red-300'
                }`}>
                  {testResult.success ? <Check className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={handleClearConfig}
                className="text-xs text-slate-400 hover:text-red-400 transition underline"
              >
                Limpiar datos guardados
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleTestAndSaveConfig}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition shadow-md shadow-amber-500/10"
                >
                  {isTesting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Probar y Guardar</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
