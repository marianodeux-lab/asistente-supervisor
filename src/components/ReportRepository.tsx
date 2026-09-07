import React, { useState, useRef } from 'react';
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
  FileCheck,
  Sparkles,
  Layers
} from 'lucide-react';
import { parseExcelFile, ProcessedExcelResult } from '../services/excelProcessor';
import { Ticket } from '../types';

export interface ReportItem {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  rowCount: number;
  isActive: boolean;
  ticketsCount: number;
  data: Ticket[];
}

interface ReportRepositoryProps {
  reports: ReportItem[];
  onUploadSuccess: (newReport: ReportItem) => void;
  onActivateReport: (reportId: string) => void;
  onDeleteReport: (reportId: string) => void;
  onRestoreDefaultAgenda?: () => void;
  activeReportName: string;
}

export const ReportRepository: React.FC<ReportRepositoryProps> = ({
  reports,
  onUploadSuccess,
  onActivateReport,
  onDeleteReport,
  onRestoreDefaultAgenda,
  activeReportName
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesProcess = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const mergedMap = new Map<string, Ticket>();
      let totalRows = 0;
      let totalBytes = 0;
      const processedNames: string[] = [];

      for (const file of files) {
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
            // merge additional metadata if exists
            const existing = mergedMap.get(t.pedido)!;
            mergedMap.set(t.pedido, { ...existing, ...t });
          }
        });
      }

      const mergedTickets = Array.from(mergedMap.values());
      if (mergedTickets.length === 0) {
        setErrorMsg('No se encontraron registros de pedidos válidos en los archivos seleccionados.');
        return;
      }

      const sizeKB = (totalBytes / 1024).toFixed(1);
      const sizeStr = totalBytes > 1024 * 1024 ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB` : `${sizeKB} KB`;
      const displayName = files.length === 1 ? files[0].name : `Agenda Unificada (${files.length} reportes)`;

      const newReport: ReportItem = {
        id: `rep_${Date.now()}`,
        name: displayName,
        size: sizeStr,
        uploadDate: new Date().toLocaleString('es-AR'),
        rowCount: totalRows,
        isActive: true,
        ticketsCount: mergedTickets.length,
        data: mergedTickets
      };

      onUploadSuccess(newReport);
      setSuccessMsg(`¡Se procesaron y unificaron ${mergedTickets.length} pedidos exitosamente!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al procesar el archivo Excel. Verifica que sea un formato válido.');
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
      
      {/* Corporate Security & Freedom Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Repositorio Interno y Autónomo (Sin Dependencia de Google Drive ni Nubes Externas)
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                100% Corporativo
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-3xl">
              Puedes descargar tus reportes de <strong>Flow Pro</strong> (Pendientes Patagonia, Pendientes Suroeste, Asignados, Adicionales) directamente a tu PC de oficina y arrastrarlos aquí. La aplicación los unifica y versiona de forma autónoma.
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0 space-y-2">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Reporte Activo Actual</span>
            <span className="text-xs font-mono font-bold text-amber-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 inline-block mt-1">
              {activeReportName}
            </span>
          </div>

          {onRestoreDefaultAgenda && (
            <button
              onClick={onRestoreDefaultAgenda}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition shadow-md shadow-amber-500/10 ml-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Restablecer Agenda Oficial (505 pedidos)</span>
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
              {isProcessing ? 'Procesando y unificando archivos de Flow Pro...' : 'Arrastra aquí tus Reportes de Flow Pro'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Puedes seleccionar uno o varios archivos simultáneamente (<strong className="text-slate-200">Pendientes Patagonia, Pendientes Suroeste, Asignados, Adicionales</strong>).
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

      {/* Historical Repository List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl space-y-3 p-5">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Historial de Reportes en el Repositorio Interno</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {reports.length} reportes guardados
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
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>Subido: <strong>{rep.uploadDate}</strong></span>
                    <span>•</span>
                    <span>Tamaño: {rep.size}</span>
                    <span>•</span>
                    <span>Registros: <strong className="text-amber-400">{rep.ticketsCount || rep.rowCount}</strong></span>
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
                    <span>Cargar en Panel</span>
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

    </div>
  );
};
