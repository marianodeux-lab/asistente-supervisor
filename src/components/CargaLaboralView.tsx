import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Clock, 
  MapPin, 
  Search, 
  TrendingUp, 
  Download, 
  ShieldCheck,
  User,
  Activity,
  Calendar,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  CargaLaboralState, 
  ZonaInfo, 
  CargaLaboralSemanalPayload, 
  CargaLaboralSemanalItem, 
  CargaLaboralDia, 
  PedidoDiaItem 
} from '../types';
import cargaLaboralSemanalRaw from '../data/cargaLaboralSemanalData.json';

const cargaSemanalData = cargaLaboralSemanalRaw as unknown as CargaLaboralSemanalPayload;

interface CargaLaboralViewProps {
  data: CargaLaboralState;
  zonas: ZonaInfo[];
}

export const CargaLaboralView: React.FC<CargaLaboralViewProps> = ({ data, zonas }) => {
  // View mode: Excel Weekly Model (default) vs Monthly Consolidated
  const [activeMode, setActiveMode] = useState<'SEMANAL_EXCEL' | 'CONSOLIDADO_MENSUAL'>('SEMANAL_EXCEL');

  // Weekly Excel Model Filters
  const [semanaSeleccionada, setSemanaSeleccionada] = useState<number>(cargaSemanalData.semanaActual || 38);
  const [zonaSemanal, setZonaSemanal] = useState<string>('Atlántica');
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<string>('Buratti, Fabian');

  // Interactive Modal for Daily Orders Detail
  const [modalDia, setModalDia] = useState<CargaLaboralDia | null>(null);

  // Monthly Table Filters
  const [search, setSearch] = useState('');
  const [selectedZona, setSelectedZona] = useState<string>('ALL');
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const { kpisGenerales, porTecnico } = data;

  // Available technicians filtered by weekly zone
  const tecnicosPorZonaSemanal = useMemo(() => {
    const tecsSet = new Set<string>();
    cargaSemanalData.resumenSemanas.forEach(item => {
      if (zonaSemanal === 'ALL' || item.zonaLocal.toLowerCase() === zonaSemanal.toLowerCase()) {
        tecsSet.add(item.tecnico);
      }
    });
    return Array.from(tecsSet).sort();
  }, [zonaSemanal]);

  // Current weekly item for the selected technician and week
  const cargaSemanalActual = useMemo<CargaLaboralSemanalItem | null>(() => {
    const found = cargaSemanalData.resumenSemanas.find(s => 
      s.semana === semanaSeleccionada && 
      s.tecnico.toLowerCase() === tecnicoSeleccionado.toLowerCase()
    );
    return found || null;
  }, [semanaSeleccionada, tecnicoSeleccionado]);

  // Monthly filtered list
  const filteredMonthly = useMemo(() => {
    return porTecnico.filter(t => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const match = 
          t.tecnico.toLowerCase().includes(query) ||
          t.ciudad.toLowerCase().includes(query) ||
          t.zona.toLowerCase().includes(query);
        if (!match) return false;
      }
      if (selectedZona !== 'ALL') {
        const sNorm = selectedZona.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
        const tNorm = (t.zona || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
        const match = tNorm === sNorm || `zona ${tNorm}` === sNorm || sNorm.includes(tNorm);
        if (!match) return false;
      }
      return true;
    });
  }, [porTecnico, search, selectedZona]);

  const totalPages = Math.ceil(filteredMonthly.length / pageSize) || 1;
  const paginatedMonthly = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMonthly.slice(start, start + pageSize);
  }, [filteredMonthly, currentPage, pageSize]);

  // Handler to update zone and auto-select first tech
  const handleZonaSemanalChange = (newZona: string) => {
    setZonaSemanal(newZona);
    const tecs = Array.from(new Set(
      cargaSemanalData.resumenSemanas
        .filter(s => newZona === 'ALL' || s.zonaLocal.toLowerCase() === newZona.toLowerCase())
        .map(s => s.tecnico)
    )).sort();

    if (tecs.length > 0) {
      if (!tecs.includes(tecnicoSeleccionado)) {
        setTecnicoSeleccionado(tecs[0]);
      }
    }
  };

  // Export CSV of the weekly sheet
  const handleExportSemanaCSV = () => {
    if (!cargaSemanalActual) return;
    const headers = ["Dia", "Orden", "Cliente", "Localidad", "Direccion", "Distancia KM", "Hora Inicio", "Hora Fin", "Horas Dia", "KM Estimados Dia"];
    const rows: any[] = [];

    cargaSemanalActual.dias.forEach(d => {
      if (d.tieneActividad && d.primerPedido && d.ultimoPedido) {
        rows.push([
          d.diaSemana,
          "Primer Pedido",
          `"${d.primerPedido.cliente}"`,
          `"${d.primerPedido.localidad}"`,
          `"${d.primerPedido.direccion}"`,
          d.primerPedido.distanciaKm,
          d.primerPedido.horaInicio,
          d.primerPedido.horaFin,
          d.horasLaboralesDiaStr,
          d.kmEstimadosDia
        ]);
        rows.push([
          d.diaSemana,
          "Ultimo Pedido",
          `"${d.ultimoPedido.cliente}"`,
          `"${d.ultimoPedido.localidad}"`,
          `"${d.ultimoPedido.direccion}"`,
          d.ultimoPedido.distanciaKm,
          d.ultimoPedido.horaInicio,
          d.ultimoPedido.horaFin,
          "",
          ""
        ]);
      } else {
        rows.push([d.diaSemana, "Sin Datos", "", "", "", "", "", "", "00:00", 0]);
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `carga_laboral_semana_${semanaSeleccionada}_${tecnicoSeleccionado.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">

      {/* Mode Navigation Toggle */}
      <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center justify-between flex-wrap gap-2 shadow-lg">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveMode('SEMANAL_EXCEL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeMode === 'SEMANAL_EXCEL'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Planilla Semanal & Rutas Diarias (Modelo Excel)</span>
          </button>

          <button
            onClick={() => setActiveMode('CONSOLIDADO_MENSUAL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeMode === 'CONSOLIDADO_MENSUAL'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Rendimiento Mensual Consolidado (Ranking & Gráficos)</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 pr-3 font-mono flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Semana Actual: <strong>38</strong></span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: EXCEL WEEKLY MODEL (PRIMARY)                                      */}
      {/* ========================================================================= */}
      {activeMode === 'SEMANAL_EXCEL' && (
        <div className="space-y-5">
          
          {/* Controls Bar: Semana, Zona, Técnico */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Selector de Semana */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" /> Semana:
                </span>
                <select
                  value={semanaSeleccionada}
                  onChange={(e) => setSemanaSeleccionada(Number(e.target.value))}
                  className="bg-transparent text-white font-black text-xs focus:outline-none cursor-pointer"
                >
                  {cargaSemanalData.semanasDisponibles.map(sem => (
                    <option key={sem} value={sem} className="bg-slate-950 text-white">
                      Semana {sem} {sem === 38 ? '(Actual)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Zona Local */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" /> Zona:
                </span>
                <select
                  value={zonaSemanal}
                  onChange={(e) => handleZonaSemanalChange(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-950 text-white">Todas las Zonas</option>
                  {zonas.map(z => (
                    <option key={z.id} value={z.id} className="bg-slate-950 text-white">
                      {z.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Técnico */}
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-amber-500/40 shadow-sm">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-amber-400" /> Técnico:
                </span>
                <select
                  value={tecnicoSeleccionado}
                  onChange={(e) => setTecnicoSeleccionado(e.target.value)}
                  className="bg-transparent text-amber-300 font-black text-xs focus:outline-none cursor-pointer"
                >
                  {tecnicosPorZonaSemanal.map(tec => (
                    <option key={tec} value={tec} className="bg-slate-950 text-white">
                      {tec}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <button
              onClick={handleExportSemanaCSV}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 transition shadow"
              title="Descargar planilla semanal en CSV"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Exportar Planilla Semanal (CSV)</span>
            </button>

          </div>

          {/* Table Replicating Excel: Daily Primer & Último Pedido */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Registro Diario de Asistencias • {tecnicoSeleccionado} (Semana {semanaSeleccionada})
                </h3>
              </div>
              <span className="text-xs text-slate-400 italic">
                * Haz clic en cualquier día para ver la lista completa de pedidos atendidos
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase font-bold text-[11px] border-b border-slate-800 tracking-wider">
                    <th className="py-3 px-4 w-32">Día</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Localidad</th>
                    <th className="py-3 px-4">Dirección</th>
                    <th className="py-3 px-4 text-center">Distancia (KM Base)</th>
                    <th className="py-3 px-4 text-center">Inicia</th>
                    <th className="py-3 px-4 text-center">Finaliza</th>
                    <th className="py-3 px-4 text-center bg-slate-950/80">Horas Jornada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {cargaSemanalActual ? (
                    cargaSemanalActual.dias.map((dia) => {
                      const tieneActividad = dia.tieneActividad && dia.primerPedido && dia.ultimoPedido;
                      
                      // Color theme per day matching Excel aesthetics
                      let diaBgClass = 'bg-slate-900/60 text-slate-300';
                      if (dia.diaSemana === 'Lunes') diaBgClass = 'bg-blue-950/70 text-blue-300 border-l-4 border-blue-500';
                      else if (dia.diaSemana === 'Martes') diaBgClass = 'bg-amber-950/70 text-amber-300 border-l-4 border-amber-500';
                      else if (dia.diaSemana === 'Miércoles') diaBgClass = 'bg-orange-950/70 text-orange-300 border-l-4 border-orange-500';
                      else if (dia.diaSemana === 'Jueves') diaBgClass = 'bg-yellow-950/70 text-yellow-300 border-l-4 border-yellow-500';
                      else if (dia.diaSemana === 'Viernes') diaBgClass = 'bg-cyan-950/70 text-cyan-300 border-l-4 border-cyan-500';
                      else diaBgClass = 'bg-slate-950/70 text-slate-400 border-l-4 border-slate-700';

                      return (
                        <React.Fragment key={dia.diaSemana}>
                          {/* Row 1: Primer Pedido del Día */}
                          <tr 
                            onClick={() => tieneActividad && setModalDia(dia)}
                            className={`transition cursor-pointer group hover:bg-slate-800/70 ${!tieneActividad ? 'opacity-60' : ''}`}
                          >
                            {/* Día (spans 2 rows if has activity) */}
                            <td 
                              rowSpan={tieneActividad ? 2 : 1} 
                              className={`py-3 px-4 font-black align-middle text-sm ${diaBgClass}`}
                            >
                              <div className="flex flex-col gap-1">
                                <span>{dia.diaSemana}</span>
                                {tieneActividad && (
                                  <span className="text-[10px] font-medium opacity-90 group-hover:underline flex items-center gap-0.5">
                                    <Eye className="w-3 h-3 text-amber-400" />
                                    {dia.totalPedidos} pedido{dia.totalPedidos > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-2.5 px-4 font-bold text-white">
                              {tieneActividad ? dia.primerPedido!.cliente : 'Sin Datos'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-300">
                              {tieneActividad ? dia.primerPedido!.localidad : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-400 max-w-xs truncate">
                              {tieneActividad ? dia.primerPedido!.direccion : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-400">
                              {tieneActividad ? `${dia.primerPedido!.distanciaKm} km` : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono text-emerald-400 font-semibold">
                              {tieneActividad ? dia.primerPedido!.horaInicio : '-'}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono text-slate-300">
                              {tieneActividad ? dia.primerPedido!.horaFin : '-'}
                            </td>

                            {/* Horas del día (spans 2 rows if has activity) */}
                            <td 
                              rowSpan={tieneActividad ? 2 : 1}
                              className="py-3 px-4 text-center font-mono font-black text-sm text-amber-400 bg-slate-950/60 border-l border-slate-800"
                            >
                              {tieneActividad ? (
                                <div className="space-y-0.5">
                                  <span>{dia.horasLaboralesDiaStr}</span>
                                  <span className="block text-[10px] font-normal text-slate-500">
                                    ~{dia.kmEstimadosDia} km est.
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-600">00:00</span>
                              )}
                            </td>
                          </tr>

                          {/* Row 2: Último Pedido del Día */}
                          {tieneActividad && (
                            <tr 
                              onClick={() => setModalDia(dia)}
                              className="transition cursor-pointer group hover:bg-slate-800/70 border-b border-slate-800/60 bg-slate-900/30"
                            >
                              <td className="py-2.5 px-4 font-bold text-slate-200">
                                {dia.ultimoPedido!.cliente}
                              </td>
                              <td className="py-2.5 px-4 text-slate-300">
                                {dia.ultimoPedido!.localidad}
                              </td>
                              <td className="py-2.5 px-4 text-slate-400 max-w-xs truncate">
                                {dia.ultimoPedido!.direccion}
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-400">
                                {dia.ultimoPedido!.distanciaKm} km
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono text-slate-300">
                                {dia.ultimoPedido!.horaInicio}
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono text-red-400 font-semibold">
                                {dia.ultimoPedido!.horaFin}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                        No se encontraron datos registrados para este técnico en la Semana {semanaSeleccionada}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Weekly Summary (Replicating Excel Cards & 45h Balance) */}
            {cargaSemanalActual && (
              <div className="bg-slate-950 p-5 border-t border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  
                  {/* Total Horas Trabajadas */}
                  <div className="bg-slate-900 border border-teal-500/40 p-3.5 rounded-xl shadow-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block">
                        Total Horas Trabajadas
                      </span>
                      <p className="text-xl font-black text-white font-mono mt-1">
                        {cargaSemanalActual.totalHorasTrabajadasStr} hs
                      </p>
                      <span className="text-[10px] text-teal-400/80">Jornada computable en semana</span>
                    </div>
                    <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Promedio Horas Trabajadas */}
                  <div className="bg-slate-900 border border-sky-500/40 p-3.5 rounded-xl shadow-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider block">
                        Promedio Horas / Día
                      </span>
                      <p className="text-xl font-black text-white font-mono mt-1">
                        {cargaSemanalActual.promedioHorasDiaStr} hs
                      </p>
                      <span className="text-[10px] text-sky-400/80">{cargaSemanalActual.diasConActividad} días con actividad</span>
                    </div>
                    <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Horas Disponibles Semanales */}
                  <div className="bg-slate-900 border border-amber-500/40 p-3.5 rounded-xl shadow-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                        Horas Disponibles Semanal
                      </span>
                      <p className="text-xl font-black text-amber-400 font-mono mt-1">
                        {cargaSemanalActual.horasDisponiblesSemanales} hs
                      </p>
                      <span className="text-[10px] text-amber-400/80">Jornada estándar legal (45h)</span>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Diferencia Horas */}
                  <div className={`border p-3.5 rounded-xl shadow-lg flex items-center justify-between ${
                    cargaSemanalActual.esDeficitario
                      ? 'bg-red-950/40 border-red-500/50 text-red-300'
                      : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  }`}>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-90">
                        Diferencia Horas (Balance)
                      </span>
                      <p className="text-xl font-black font-mono mt-1 text-white">
                        {cargaSemanalActual.diferenciaHorasStr} hs
                      </p>
                      <span className="text-[10px] opacity-80">
                        {cargaSemanalActual.esDeficitario ? 'Balance por debajo de 45 hs' : 'Horas extras registradas'}
                      </span>
                    </div>
                    <div className={`p-2 rounded-lg ${cargaSemanalActual.esDeficitario ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {cargaSemanalActual.esDeficitario ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Total KM Estimados */}
                  <div className="bg-slate-900 border border-purple-500/40 p-3.5 rounded-xl shadow-lg flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                        KM Estimados en Semana
                      </span>
                      <p className="text-xl font-black text-white font-mono mt-1">
                        {cargaSemanalActual.totalKmSemana} km
                      </p>
                      <span className="text-[10px] text-purple-400/80">Ruta estimada (ida y vuelta)</span>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                      <Truck className="w-5 h-5" />
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: CONSOLIDATED MONTHLY VIEW (CHARTS & RANKING)                      */}
      {/* ========================================================================= */}
      {activeMode === 'CONSOLIDADO_MENSUAL' && (
        <div className="space-y-6">

          {/* Top Banner KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total KM Recorridos</span>
                <Truck className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-3xl font-black text-white mt-1">
                {kpisGenerales.totalKmRecorridosMes.toLocaleString()} km
              </p>
              <span className="text-[11px] text-slate-400">Flota técnica en Patagonia</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Horas de Labor en Sitio</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-black text-emerald-300 mt-1">
                {kpisGenerales.horasLaborTotales.toLocaleString()} hs
              </p>
              <span className="text-[11px] text-emerald-300/80">Tiempo efectivo de reparación</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Horas de Traslado / Viaje</span>
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-3xl font-black text-blue-300 mt-1">
                {kpisGenerales.horasViajeTotales.toLocaleString()} hs
              </p>
              <span className="text-[11px] text-slate-400">Rutas patagónicas</span>
            </div>

            <div className="bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-500/40 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Promedio Diario</span>
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-3xl font-black text-purple-300 mt-1">
                {kpisGenerales.promedioAsistenciasPorTecnicoDia} visitas
              </p>
              <span className="text-[11px] text-purple-300/80">Por técnico / día</span>
            </div>

          </div>

          {/* Chart: Horas Labor vs Viaje por Técnico */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Horas de Trabajo (Labor vs Traslado)</h3>
              </div>
              <span className="text-xs text-slate-400">Distribución horaria mensual</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredMonthly.slice(0, 12)} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                  <XAxis dataKey="tecnico" stroke="#94a3b8" fontSize={10} angle={-25} textAnchor="end" />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="horasLabor" name="Horas en Cliente (Labor)" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="horasViaje" name="Horas en Ruta (Viaje)" fill="#3b82f6" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Technician Detailed Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <h3 className="text-sm font-bold text-white">Carga Laboral y Rendimiento Individual</h3>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                  {filteredMonthly.length} técnicos
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <div className="relative w-full sm:w-48">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="Buscar técnico o ciudad..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={selectedZona}
                  onChange={(e) => { setSelectedZona(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 py-1.5 px-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Todas las Zonas</option>
                  {zonas.map(z => (
                    <option key={z.id} value={z.id}>{z.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <th className="py-3 px-4">Técnico & Zona</th>
                    <th className="py-3 px-4">Base / Ciudad</th>
                    <th className="py-3 px-4 text-center">Visitas Atendidas</th>
                    <th className="py-3 px-4 text-center">KM Recorridos</th>
                    <th className="py-3 px-4 text-center">Labor / Viaje</th>
                    <th className="py-3 px-4 text-center">Ratio Eficiencia</th>
                    <th className="py-3 px-4 text-right">SLA Efectivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedMonthly.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No se encontraron técnicos con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    paginatedMonthly.map((t) => (
                      <tr key={t.tecnico} className="hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-bold text-white">
                          {t.tecnico}
                          <span className="text-[11px] text-amber-400 font-normal block">Zona {t.zona}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {t.ciudad}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-100">{t.pedidosAtendidos}</td>
                        <td className="py-3 px-4 text-center text-amber-400 font-mono font-semibold">{t.kmTotal} km</td>
                        <td className="py-3 px-4 text-center text-slate-300">
                          <span className="text-emerald-400 font-semibold">{t.horasLabor}h</span> / <span className="text-blue-400">{t.horasViaje}h</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-slate-200 border border-slate-700">
                            {t.ratioEficiencia}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-400">{t.slaEfectivo}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Técnicos por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-200 text-xs focus:outline-none"
                >
                  <option value={20}>20</option>
                  <option value={40}>40</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span className="text-slate-500">
                  Mostrando {filteredMonthly.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filteredMonthly.length)} de {filteredMonthly.length} técnicos
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 text-xs font-mono text-slate-200">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE MODAL: DAILY ORDERS FORM (SOLICITADO POR EL USUARIO)           */}
      {/* ========================================================================= */}
      {modalDia && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Detalle de Asistencias: {modalDia.diaSemana}</span>
                    <span className="text-xs bg-amber-950 text-amber-300 border border-amber-800 px-2.5 py-0.5 rounded-full font-bold font-mono">
                      {modalDia.totalPedidos} Pedidos
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Técnico: <strong className="text-slate-200">{tecnicoSeleccionado}</strong> • Horas computadas del día: <strong className="text-amber-400 font-mono">{modalDia.horasLaboralesDiaStr} hs</strong> • KM estimados: <strong className="text-white font-mono">~{modalDia.kmEstimadosDia} km</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalDia(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Table with strict requested columns: Cliente, Nº equipo, Dirección, Localidad, Tiempo laboral, Observaciones */}
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              <div className="rounded-xl border border-slate-800 overflow-hidden shadow">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800 tracking-wider">
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Nº de Equipo</th>
                      <th className="py-2.5 px-3">Dirección</th>
                      <th className="py-2.5 px-3">Localidad</th>
                      <th className="py-2.5 px-3 text-center">Horario & Tiempo Laboral</th>
                      <th className="py-2.5 px-3">Observaciones / Cierre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/80">
                    {modalDia.pedidos.map((ped, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50 transition">
                        <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                          {ped.cliente}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                          {ped.equipo || 'S/D'}
                        </td>
                        <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                          {ped.direccion}
                        </td>
                        <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                          {ped.localidad}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="font-mono text-emerald-400 font-bold block text-xs">
                            {ped.tiempoLaboral}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {ped.horaInicio} - {ped.horaFin}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300 text-[11px] max-w-sm">
                          <p className="line-clamp-2 leading-relaxed italic">
                            "{ped.observaciones || 'Atención registrada'}"
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Rango horario del día: <strong className="text-slate-200 font-mono">{modalDia.primerPedido?.horaInicio}</strong> hasta <strong className="text-slate-200 font-mono">{modalDia.ultimoPedido?.horaFin}</strong></span>
              <button
                onClick={() => setModalDia(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
