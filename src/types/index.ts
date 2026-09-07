export type SlaStatus = 'CRITICAL' | 'WARNING' | 'ON_TRACK' | 'EXPIRED';

export interface MovimientoStockItem {
  pedido: string;
  cleanPed: string;
  fecha: string | number;
  hora: string;
  idInstala: string;
  idRetira: string;
  instalaBase?: string;
  instalaQr?: string;
  retiraBase?: string;
  retiraQr?: string;
  esStockFijo?: boolean;
  cantAsignadaSf?: number;
  origenStock?: string;
  conReemplazo?: string | boolean;
  tecnico: string;
  obs: string;
}

export interface VisitaHistoricaLuno {
  pedido: string;
  fecha: string | number;
  concepto: string;
  codCierre: string;
  cierreInfo: {
    desc: string;
    tipo: string;
    color: string;
    esRemoto?: boolean;
    esCampo?: boolean;
  };
  tecnico: string;
  tuvoTecnico?: boolean;
  esSoporteRemoto?: boolean;
  esVisitaCampo?: boolean;
  categoria?: 'Soporte Remoto' | 'Visita de Campo' | string;
  observaciones: string;
  zona: string;
}

export interface Ticket {
  id: string;
  pedido: string;
  pedidoFull?: string;
  diasUltimaAtencion: string;
  slaPorcentaje: number;
  fechaVencimiento: string;
  hsSla: number;
  fechaCoordinada: string;
  fCoorDate?: string;
  hCoor?: string;
  controlInicio: string;
  estado: string;
  stock: string;
  repuestos: string;
  cliente: string;
  luno: string;
  equipo?: string;
  tecnico: string;
  concepto: string;
  detalleFalla?: string;
  zona: string;
  zonaTecnica?: string;
  zonaLocal?: string;
  region?: string;
  tecnicoZona?: string;
  localidad: string;
  direccion: string;
  lat?: number | null;
  lng?: number | null;
  despacho?: string;
  contactoCliente?: string;
  notasSupervision?: string;
  esAdicional?: boolean;
  esAsignadoCOT?: boolean;
  notificadoMovil?: boolean;
  m?: string;
  origenReporte?: string;
  alertaMpPendiente?: boolean;
  alertaMpSinAsignar?: boolean;
  mpPendienteDetalle?: { pedido: string; detalleFalla: string; tecAsignado: string } | null;
  alertaAdicionalPendiente?: boolean;
  adicionalDetalle?: { pedido: string; detalleFalla: string; concepto: string } | null;
  movimientosStock?: MovimientoStockItem[];
  cantidadVisitasHistoricas?: number;
  cantidadSoporteRemoto?: number;
  historialPrevioLuno?: VisitaHistoricaLuno[];
}

export interface ControlInicioPrimerPedido {
  cliente: string;
  luno: string;
  direccion: string;
  localidad: string;
  horaCoordinada: string;
  fechaVto: string;
  estado: string;
  cumplePrimerHorario: boolean;
}

export interface ControlInicioItem {
  tecnico: string;
  zonaLocal: string;
  zonaTecnica: string;
  region: string;
  tienePedidos: boolean;
  primerPedido: ControlInicioPrimerPedido | null;
  estadoMarcaje: 'ASISTENCIA_OK' | 'PENDIENTE_INICIO' | 'SIN_PEDIDOS';
}


export interface FallaHistorica {
  pedido: string | number;
  fecha: string;
  falla: string;
  tecnico: string;
  origen: string;
  causa: string;
}

export interface EquipoCronico {
  luno: string;
  equipo?: string;
  cliente: string;
  modelo: string;
  direccion?: string;
  localidad?: string;
  totalFallas: number;
  fallasServiceCall: number;
  fallasTelca: number;
  fallasOtros: number;
  ultimasFallas: FallaHistorica[];
  zona: string;
  tecnicosInvolucrados: string[];
  causasFrecuentes: Record<string, number>;
  conceptosFrecuentes?: Record<string, number>;
  estadoSalud: 'CRÍTICO' | 'ADVERTENCIA' | 'NORMAL' | string;
  nivelCriticidad: number;
  topCausa: string;
  ultimoMtmFecha?: string | null;
  tiempoPostMtm?: string;
  recomendacion: string;
}

export interface StockFijoItem {
  pn: string;
  tecnico: string;
  tipo: string;
  cantMinima: number;
  unidades: number;
  diferencia: number;
}

export interface ModeloMpcrItem {
  fabricante: string;
  modeloBase: string;
  modelos: string;
  mpcr: string;
  negocio: string;
  marcaDesc?: string;
  modeloDesc?: string;
}

export interface CallRateBenchmark {
  fabricante: string;
  mpcr: string;
  callRateTarget: number;
}

export interface ZonaTecnicoRef {
  tecnico?: string;
  nombre?: string;
  codigoZona?: string;
  zonaTecnica?: string;
  region: string;
  baseAtm?: number;
  atm?: number;
  baseCtd?: number;
  cashToday?: number;
  zonaLocal: string;
  subTotal: number;
  domicilio?: string;
}

export interface ZonaPreventivo {
  zona: string;
  baseAtm: number;
  baseCtd: number;
  pendientes: number;
  realizados: number;
  meta: number;
  cumplimiento: number;
  ritmoDiario: number;
}

export interface MpPendienteDetalle {
  pedido: string;
  cliente: string;
  luno: string;
  direccion: string;
  localidad: string;
  tecnico: string;
  modelo: string;
  zona: string;
  negocio: string;
  fabricante: string;
}

export interface CtdDemoradoItem {
  luno: string;
  cliente: string;
  direccion: string;
  localidad: string;
  zona: string;
  tecnico: string;
  modelo: string;
  ultimoMtmFecha: string;
  diasSinMtm: number;
  mesesSinMtm: number;
  criticidad: 'CRÍTICO' | 'ADVERTENCIA' | 'SEGUIMIENTO';
  motivo: string;
}

export interface PreventivosState {
  totalPendientes: number;
  totalRealizados: number;
  metaMensual: number;
  diasHabilesRestantes: number;
  ritmoDiarioRequerido: number;
  porZona: ZonaPreventivo[];
  pendientesDetalle: MpPendienteDetalle[];
  ctdDemorados?: CtdDemoradoItem[];
}

export interface DespachoItem {
  id: string;
  pedidoStock: string;
  reclamo: string;
  destino: string;
  tecnico: string;
  guia: string;
  transporte: string;
  fechaAlta: string;
  zona: string;
}

export interface PlantaCallRate {
  planta: string;
  baseAtm: number;
  baseCtd: number;
  totalBase: number;
  serviceCalls: number;
  vencidos: number;
  callRate: number;
  slaCumplimiento: number;
  telca: number;
}

export interface FabricanteCallRate {
  fabricante: string;
  base: number;
  fallas: number;
  callRate: number;
  telca: number;
  tipo: string;
}

export interface CallRateState {
  resumenPorPlanta: PlantaCallRate[];
  porFabricante: FabricanteCallRate[];
}

export interface TecnicoCarga {
  tecnico: string;
  zona: string;
  ciudad: string;
  pedidosAtendidos: number;
  kmTotal: number;
  horasLabor: number;
  horasViaje: number;
  slaEfectivo: number;
  ratioEficiencia: string;
}

export interface CargaLaboralState {
  kpisGenerales: {
    totalKmRecorridosMes: number;
    horasLaborTotales: number;
    horasViajeTotales: number;
    promedioAsistenciasPorTecnicoDia: number;
    ratioKmVsduracion: number;
  };
  porTecnico: TecnicoCarga[];
}

export interface RepuestoMasUsado {
  pn: string;
  descripcion: string;
  cantidad: number;
  fabricante: string;
  tipo: string;
}

export interface RepuestosState {
  masUtilizados: RepuestoMasUsado[];
}

export interface TecnicoInfo {
  nombre: string;
  zona: string;
  cargo?: string;
  ciudad: string;
  cel: string;
  codigoZona?: string;
}

export interface ZonaInfo {
  id: string;
  nombre: string;
  cabecera: string;
  tecnicos: string[];
}

export interface BaseInstaladaEquipo {
  id: string;
  serie: string;
  cliente: string;
  modelo: string;
  marca: string;
  negocio: string;
  zona: string;
  tecnico: string;
  localidad: string;
  direccion: string;
  ubicacion?: string;
  provincia?: string;
  red?: string;
  esquema?: string;
  habilitado?: string;
}

export interface AbmCambioDetalle {
  campo: string;
  antes: string;
  despues: string;
}

export interface AbmModificacionItem {
  equipo: BaseInstaladaEquipo;
  changes: AbmCambioDetalle[];
}

export interface AbmPeriodoItem {
  periodo: string;
  mesActual: string;
  mesAnterior: string;
  totalAnterior: number;
  totalActual: number;
  variacionNeta: number;
  altasCount: number;
  bajasCount: number;
  modificacionesCount: number;
  altasDetalle: BaseInstaladaEquipo[];
  bajasDetalle: BaseInstaladaEquipo[];
  modificacionesDetalle: AbmModificacionItem[];
}

export interface BaseInstaladaAbmState {
  resumenMensual: {
    mes: string;
    total: number;
    atm: number;
    ctd: number;
  }[];
  historialAbm: AbmPeriodoItem[];
  baseActualAgosto: {
    mes: string;
    totalSupervisado: number;
    atm: number;
    ctd: number;
    equipos: BaseInstaladaEquipo[];
  };
}

export interface BaseInstaladaClienteRow {
  cliente: string;
  atm: string;
  serie: string;
  direccion: string;
  localidad: string;
  provincia: string;
  distancia: string;
  mpcr: string;
  red: string;
  sla: string;
  tecnicoZona: string;
  antiguedad: string;
  fechaHabilitacion: string;
  fabricante: string;
  modelo: string;
  region: string;
  plantaCabecera: string;
  negocio: string;
  recaudador: string;
}

export type UserRole = 'ADMIN' | 'SUPERVISOR_LIDER' | 'SUPERVISOR';
export type UserStatus = 'ACTIVO' | 'PENDIENTE_PRIMER_INGRESO' | 'BLOQUEADO';

export interface UserAccount {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  cargo: string;
  zona?: string;
  region?: string;
  avatarUrl?: string;
  estado: UserStatus;
  requiereCambioClave?: boolean;
  ultimoAcceso?: string;
  fechaCreacion?: string;
}

export interface PasswordResetToken {
  email: string;
  codigo: string;
  fechaExpiracion: number;
}

