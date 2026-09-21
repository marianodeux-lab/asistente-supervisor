/**
 * ═══════════════════════════════════════════════════════════════════════════════════
 * ASISTENTE SUPERVISOR - ÚNICA FUENTE DE VERDAD (SINGLE SOURCE OF TRUTH)
 * ═══════════════════════════════════════════════════════════════════════════════════
 * 
 * Este archivo centraliza y gobierna TODA la lógica de negocio, jerarquías de hardware,
 * taxonomía de equipos, reglas de filtrado y criterios de auditoría técnica.
 * 
 * Reemplaza de forma definitiva y canónica a "Modelos MPCR.xlsx".
 * 
 * DIRECTIVAS PRINCIPALES DEL SUPERVISOR:
 * 1. NEGOCIOS:
 *    - MARCA_DESC contiene 'Smart Box' -> Negocio: 'Cash Today' (CTD).
 *    - MARCA_DESC contiene 'CRP' -> Negocio: 'CRP' (Control de Asistencia del Personal en Plantas Prosegur).
 *    - MARCA_DESC 'GUNNEBO' -> Negocio: 'Cash Today' (CTD).
 *    - Todas las demás marcas (OPTEVA, OPTEVA MI, OPTEVA TAS, GRG, DIEBOLD NIXDORF, TDE 4500) -> Negocio: 'ATM'.
 * 
 * 2. CORRECCIONES DE FABRICANTES Y MODELOS:
 *    - INLANE 300, INLANE 300 DEPO -> Fabricante: CIMA (Cash Today).
 *    - CS280 Cash, CS285 TTW, CS2070 (ATM full con depósito CCDM) -> Fabricante: Wincor (ATM).
 * 
 * 3. MANTENIMIENTO PREVENTIVO (MP) - UMBRALES DE DESVÍO:
 *    - Alerta de desvío por tiempo insuficiente en sitio:
 *      * < 60 minutos para ATM, Glory y CIMA.
 *      * < 40 minutos para SNBC.
 * 
 * 4. CONTROL SLA & AGENDA DIARIA (CONTROL DE INICIO • MARCAJE DE ASISTENCIA • CRUCES INTELIGENTES):
 *    - FUENTES DE DATOS DE CORTE DIARIO:
 *      * Se nutre de los reportes en D:\Asistente Supervisor\Reportes\Agenda Diaria:
 *        `Asignados.xls`, `Adicionales.xls`, `Pendientes Patagonia.xls`, `Pendientes Suroeste.xls`.
 *      * Define la agenda operativa de 'Hoy' o la proyectada del 'Día Siguiente / Mañana' (con filtro dinámico de jornada).
 * 
 *    - ASIGNACIÓN EFECTIVA EN REPORTE ASIGNADOS:
 *      * Un pedido se considera efectivamente asignado a la supervisión si y solo si:
 *        1. La columna M figura estrictamente en 'S' (informado/notificado al móvil del técnico).
 *        2. Pertenece a los técnicos de la supervisión (Región PATAGONIA y CENTRO-OESTE / SUROESTE).
 *        3. La fecha de asignación/coordinada (F Coor) corresponde a la fecha actual ('Hoy') o el día posterior inmediato ('Mañana').
 *      * En el corte 21/09/2026 con M = 'S', son exactamente 23 pedidos asignados en total.
 *      * Todo registro fuera de fecha o con M != 'S' no fue informado al móvil para la jornada.
 * 
 *    - CRUCES INTELIGENTES POR EQUIPO (LUNO):
 *      1. MP PENDIENTE ("Oportunidad de Preventivo"):
 *         * Cruza cada LUNO con los reportes `MP Pendientes` (Patagonia, Suroeste y Bariloche).
 *         * Si el equipo tiene un MP pendiente, se alerta visualmente para que el técnico aproveche la visita y realice el preventivo en el mismo viaje.
 *      2. ÚLTIMA ATENCIÓN / HISTORIAL PREVIO:
 *         * Cruza con `MP Cerrados`, `SLA` y `Suspendidos` para determinar:
 *           - Tiempo transcurrido: Formato canónico `SC - X meses, Y días` / `MPR - X meses, Y días`.
 *           - Tipo de pedido previo: Service Call (SC), Mantenimiento Preventivo (MPR / PMR), etc.
 *           - Tiempo laboral empleado en sitio (T Asis / horas y minutos de atención).
 *           - Observaciones del cierre previo (Obs Control / Notas de servicio).
 *           - Técnico que realizó la atención anterior.
 *      3. HISTORIAL DE REPUESTOS Y DESPACHOS:
 *         * Cruza el LUNO y Pedido con `Reporte Buzon Movimientos.xlsx` y cierres con repuestos.
 *         * Identifica repuestos utilizados, retirados, despachos de stock en tránsito y remitos.
 *         * Indicador de Reincidencia (R) en el equipo en los últimos 30 días.
 * 
 *    - CONCILIACIÓN CON PENDIENTES (Patagonia 9 + Suroeste 15 = 24 tickets):
 *      * 7 pedidos figuran asignados en COT con M = 'S' ("Pendientes Asignados en COT").
 *      * 17 pedidos no fueron asignados para la jornada ("Sin Asignar Pat/Sur - Riesgo SLA Directo").
 * 
 *    - CONTROL DE INICIO DE JORNADA:
 *      * Refleja la agenda real informada al móvil para la jornada y verifica el estado de marcaje de asistencia (07:00 a 10:00 hs).
 * 
 * 5. ANÁLISIS DE ATENCIONES - SUSPENDIDOS:
 *    - Se deben excluir obligatoriamente los cierres MONITOREO (además de TELCA, TELCA2, TELCA3, TELFA y DERIV).
 * 
 * 6. JERARQUÍA DE FILTROS DEPENDIENTES:
 *    Región -> Fabricante -> Modelo -> MPCR -> Negocio -> Planta Cabecera -> Técnico -> Red -> Recaudador.
 * 
 * 7. AUDITORÍA TÉCNICA Y REINCIDENCIAS:
 *    - Reincidencias en campo: Basadas estrictamente en VISITAS PRESENCIALES en los últimos 30 días.
 *    - Cierres remotos (TELCA, TELCA2, TELFA): Aplican exclusivamente a Cash Today y se muestran
 *      como dato complementario de soporte remoto sin penalizar la reincidencia presencial.
 *    - Solo computan órdenes donde hubo técnico asignado en la supervisión de servicio.
 *    - Filtro de año (2025 / 2026 / Todos) presente en todos los análisis históricos.
 * 
 * 8. NÓMINA DE TÉCNICOS Y ZONAS SUPERVISADAS:
 *    - REGIÓN PATAGONIA:
 *      * Aldayturriaga, Martin (IN TDL - Oeste)
 *      * Allende, Martin Leandro (IN SRO - La Pampa)
 *      * Buratti, Fabian (IN MDP 2 - Atlántica)
 *      * Castaño, Matias (IN MDP3 - Atlántica / Cash Today)
 *      * Chiriello, Pablo Javier (IN MDP 1 - Atlántica)
 *      * Garcia, Alejandro Javier (IN TRQ - Oeste)
 *      * Godoy, Diego (IN TRE - Sur)
 *      * Gonzalez Cabrera, Antonio (IN COM - Sur)
 *      * Hernandez, Marcos Alberto (IN PCO / IN PCO1 - La Pampa)
 *      * Martos, Jose Angel (IN OLA - Oeste)
 *      * Montiel, Juan Fernando (IN COS - Atlántica)
 *      * Pavon, Diego Emanuel (IN BB2 - Centro)
 *      * Vicente, Francisco Ariel (IN VIE - Centro)
 *      * Contratistas Patagonia: Barrera Fernando (IN RIT), Corti Victor (IN TDF), Foschi Alejandro (IN RGA).
 *    - REGIÓN CENTRO-OESTE / SUROESTE:
 *      * Lazzaro, Leonardo (IN NQN - Neuquén)
 *      * Ibañez, Pablo Fernando / Fernando Ibañez (IN CIP - Cipolletti)
 *      * Torres, Florencia / Fix Computer (IN BAR - Bariloche / Contratista)
 *      * Estos técnicos figuran en los reportes de Suspendidos, MP Pendientes, MP Cerrados y Pendientes Suroeste.
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────────────────────
// 1. TIPOS Y ESTRUCTURAS DE DOMINIO
// ───────────────────────────────────────────────────────────────────────────────────

export type NegocioTipo = 'ATM' | 'Cash Today' | 'CRP';

export interface HardwareMapping {
  marcaOriginal: string;
  modeloOriginal: string;
  negocio: NegocioTipo;
  fabricante: string;
  modeloBase: string;
  modeloEstandar: string;
  mpcr: string;
  callRateTarget?: number;
  callRate?: number;
  totalBaseInstaladaRecords?: number;
  foundInMonths?: string[];
}

export interface HardwareTaxonomyNode {
  fabricante: string;
  modelos: string[];
  mpcrs: string[];
  negocio: NegocioTipo;
}

// ───────────────────────────────────────────────────────────────────────────────────
// 2. DICCIONARIO CANÓNICO DE EQUIPOS (MAPPING 1:1 BASE INSTALADA 2026)
// ───────────────────────────────────────────────────────────────────────────────────

/**
 * Función canónica para resolver la taxonomía exacta de cualquier equipo
 * a partir de su MARCA_DESC y MODELO_DESC en los reportes de Base Instalada.
 */
export function resolveEquipmentTaxonomy(marcaDescRaw: string, modeloDescRaw: string): HardwareMapping {
  const marca = (marcaDescRaw || '').trim();
  const modelo = (modeloDescRaw || '').trim();
  const marcaUpper = marca.toUpperCase();
  const modeloUpper = modelo.toUpperCase();

  // 1. REGLA DE NEGOCIO PRIMARIA
  let negocio: NegocioTipo = 'ATM';
  if (marcaUpper.includes('SMART BOX') || marcaUpper.includes('SMARTBOX')) {
    negocio = 'Cash Today';
  } else if (marcaUpper.includes('CRP')) {
    negocio = 'CRP';
  } else if (marcaUpper.includes('GUNNEBO')) {
    negocio = 'Cash Today';
  }

  // 2. RESOLUCIÓN POR GRUPOS DE HARDWARE
  let fabricante = 'Diebold Nixdorf';
  let modeloBase = modelo;
  let modeloEstandar = modelo;
  let mpcr = 'OPTEVA';
  let callRateTarget = 0.5;

  if (negocio === 'CRP') {
    fabricante = 'Prosegur CRP';
    modeloBase = 'CRP-100';
    modeloEstandar = 'CRP-100 Control Asistencia';
    mpcr = 'CRP';
    callRateTarget = 0.3;
  } else if (negocio === 'Cash Today') {
    // CIMA (incluye SDM500 e INLANE 300 / INLANE 300 DEPO)
    if (modeloUpper.includes('CIMA') || modeloUpper.includes('SDM500') || modeloUpper.includes('INLANE')) {
      fabricante = 'CIMA';
      if (modeloUpper.includes('INLANE')) {
        modeloBase = modeloUpper.includes('DEPO') ? 'INLANE 300 DEPO' : 'INLANE 300';
        modeloEstandar = modeloUpper.includes('DEPO') ? 'CIMA Inlane 300 Depo' : 'CIMA Inlane 300';
        mpcr = 'CIMA';
      } else {
        modeloBase = 'SDM500';
        modeloEstandar = 'CIMA SDM500';
        mpcr = 'CIMA';
      }
      callRateTarget = 0.35;
    } else if (modeloUpper.includes('CTE1')) {
      fabricante = 'SNBC';
      modeloBase = 'CTE1 SNBC';
      modeloEstandar = 'CTE1 SNBC';
      mpcr = 'CTE1 SNBC';
      callRateTarget = 0.35;
    } else if (modeloUpper.includes('CTE2')) {
      fabricante = 'SNBC';
      const isC = modeloUpper.includes('-C') || modeloUpper.includes('- C');
      modeloBase = isC ? 'CTE2 SNBC -C' : 'CTE2 SNBC';
      modeloEstandar = isC ? 'CTE2 SNBC -C' : 'CTE2 SNBC';
      mpcr = 'CTE2 SNBC';
      callRateTarget = 0.35;
    } else if (modeloUpper.includes('CTI90')) {
      fabricante = 'SNBC';
      const isC = modeloUpper.includes('-C') || modeloUpper.includes('- C');
      modeloBase = isC ? 'CTI90 SNBC - C' : 'CTI90 SNBC';
      modeloEstandar = isC ? 'CTI90 SNBC - C' : 'CTI90 SNBC';
      mpcr = 'CTI90 SNBC';
      callRateTarget = 0.35;
    } else if (modeloUpper.includes('CTI UL') || modeloUpper.includes('CTI COMPACT')) {
      fabricante = 'SNBC';
      if (modeloUpper.includes('COMPACT')) {
        modeloBase = 'CTI COMPACT';
        modeloEstandar = 'CTI COMPACT';
      } else {
        const isC = modeloUpper.includes('-C') || modeloUpper.includes('- C');
        modeloBase = isC ? 'CTI UL - C' : 'CTI UL';
        modeloEstandar = isC ? 'CTI UL - C' : 'CTI UL';
      }
      mpcr = 'CTI UL SNBC';
      callRateTarget = 0.35;
    } else if (modeloUpper.includes('DI90S')) {
      fabricante = 'SNBC';
      modeloBase = 'DI90S';
      modeloEstandar = 'DI90S';
      mpcr = 'CTI90 SNBC';
      callRateTarget = 0.35;
    } else if (modeloUpper.includes('GLORY') || modeloUpper.includes('P500') || modeloUpper.includes('P1000') || modeloUpper.includes('P1001')) {
      fabricante = 'GLORY';
      if (modeloUpper.includes('P1000')) {
        modeloBase = 'GLORY P1000';
        modeloEstandar = 'GLORY P1000';
        mpcr = 'GLORY P1000';
      } else if (modeloUpper.includes('P1001')) {
        modeloBase = 'GLORY P1001';
        modeloEstandar = 'GLORY P1001';
        mpcr = 'GLORY P1001';
      } else {
        modeloBase = 'GLORY P500';
        modeloEstandar = 'GLORY P500';
        mpcr = 'GLORY P500';
      }
      callRateTarget = 0.35;
    } else if (modeloUpper.includes('KISAN') || modeloUpper.includes('KD30')) {
      fabricante = 'KISAN';
      modeloBase = 'KISAN KD30';
      modeloEstandar = 'KISAN KD30';
      mpcr = 'KISAN';
      callRateTarget = 0.35;
    } else if (modeloUpper.includes('PMINI') || modeloUpper.includes('MEI')) {
      fabricante = 'MEI';
      modeloBase = 'PMINI-MEI';
      modeloEstandar = 'PMINI-MEI';
      mpcr = 'MEI';
      callRateTarget = 0.35;
    } else if (modeloUpper.includes('TAS') || modeloUpper === 'TAS') {
      fabricante = 'GLORY';
      modeloBase = 'TAS';
      modeloEstandar = 'GLORY TAS';
      mpcr = 'GLORY TAS';
      callRateTarget = 0.35;
    } else if (marcaUpper.includes('GUNNEBO')) {
      fabricante = 'GUNNEBO';
      modeloBase = 'CAJA ROBOTIZADA';
      modeloEstandar = 'Gunnebo Robotizada';
      mpcr = 'GUNNEBO';
      callRateTarget = 0.2;
    }
  } else {
    // Negocio: 'ATM'
    // 1. WINCOR NIXDORF (CS280 Cash, CS285 TTW, CS2070 Full con depósito CCDM)
    if (modeloUpper.includes('CS280') || modeloUpper.includes('CS285') || modeloUpper.includes('CS2070')) {
      fabricante = 'Wincor';
      if (modeloUpper.includes('CS2070')) {
        modeloBase = modelo;
        modeloEstandar = 'Wincor CS2070 Full CCDM';
        mpcr = 'WINCOR';
      } else if (modeloUpper.includes('CS285')) {
        modeloBase = modelo;
        modeloEstandar = 'Wincor CS285 TTW';
        mpcr = 'WINCOR';
      } else if (modeloUpper.includes('CS280')) {
        modeloBase = modelo;
        modeloEstandar = 'Wincor CS280 Cash';
        mpcr = 'WINCOR';
      }
      callRateTarget = 0.5;
    } else if (marcaUpper === 'GRG' || modeloUpper.includes('DT-7000') || modeloUpper.includes('CI8000')) {
      fabricante = 'GRG Banking';
      if (modeloUpper.includes('H68') || modeloUpper.includes('68N') || modeloUpper.includes('68V')) {
        modeloBase = modelo;
        modeloEstandar = 'GRG H68 Reciclador';
        mpcr = 'GRG H68';
        callRateTarget = 0.5;
      } else if (modeloUpper.includes('H34') || modeloUpper.includes('34N') || modeloUpper.includes('34NL')) {
        modeloBase = modelo;
        modeloEstandar = 'GRG H34 Full';
        mpcr = 'GRG H34';
        callRateTarget = 0.5;
      } else if (modeloUpper.includes('H22') || modeloUpper.includes('22V') || modeloUpper.includes('22VL') || modeloUpper.includes('22N') || modeloUpper.includes('22NL')) {
        modeloBase = modelo;
        modeloEstandar = 'GRG H22 Cash';
        mpcr = 'GRG H22';
        callRateTarget = 0.5;
      } else if (modeloUpper.includes('I21') || modeloUpper.includes('21')) {
        modeloBase = modelo;
        modeloEstandar = 'GRG H21';
        mpcr = 'GRG H21';
        callRateTarget = 0.5;
      } else {
        modeloBase = modelo;
        modeloEstandar = `GRG ${modelo}`;
        mpcr = 'GRG';
        callRateTarget = 0.5;
      }
    } else if (marcaUpper.includes('DIEBOLD NIXDORF') || modeloUpper.includes('DN200V')) {
      fabricante = 'Diebold Nixdorf';
      if (modeloUpper.includes('DN200V')) {
        modeloBase = modelo;
        modeloEstandar = 'DN200V Reciclador';
        mpcr = 'DN';
      } else if (modeloUpper.includes('4534')) {
        fabricante = 'Diebold Procomp';
        modeloBase = 'TDE 4534';
        modeloEstandar = 'TDE 4534';
        mpcr = 'TDE';
      } else if (modeloUpper.includes('828')) {
        modeloBase = 'Opteva 828';
        modeloEstandar = 'Opteva 828';
        mpcr = 'OPTEVA';
      } else {
        modeloBase = modelo;
        modeloEstandar = `Diebold ${modelo}`;
        mpcr = 'DN';
      }
      callRateTarget = 0.5;
    } else if (marcaUpper === 'TDE 4500' || modeloUpper.includes('TDE')) {
      fabricante = 'Diebold Procomp';
      modeloBase = modelo;
      modeloEstandar = modelo;
      mpcr = modeloUpper.includes('MI') ? 'TDE MI' : 'TDE';
      callRateTarget = 0.3;
    } else if (marcaUpper.includes('OPTEVA')) {
      fabricante = 'Diebold Nixdorf';
      if (marcaUpper === 'OPTEVA TAS' || modeloUpper.includes('TAS')) {
        if (modeloUpper.includes('720')) {
          modeloBase = modelo;
          modeloEstandar = 'Tas Opteva 720';
          mpcr = modeloUpper.includes('ENA') ? 'TAS MI' : 'OPTEVA';
        } else if (modeloUpper.includes('522')) {
          modeloBase = modelo;
          modeloEstandar = 'Tas Opteva 522';
          mpcr = 'OPTEVA';
        } else if (modeloUpper.includes('520')) {
          modeloBase = modelo;
          modeloEstandar = 'Tas Opteva 520';
          mpcr = 'OPTEVA';
        } else {
          modeloBase = modelo;
          modeloEstandar = `Tas Opteva ${modelo}`;
          mpcr = 'OPTEVA';
        }
      } else if (marcaUpper === 'OPTEVA MI' || modeloUpper.includes('ENA') || modeloUpper.includes('IDM')) {
        if (modeloUpper.includes('868')) {
          modeloBase = modelo;
          modeloEstandar = 'Opteva 868 ECRM';
          mpcr = 'OPTEVA ECRM';
          callRateTarget = 0.7;
        } else {
          modeloBase = modelo;
          modeloEstandar = 'Opteva 720 ENA / MI';
          mpcr = 'OPTEVA MI';
          callRateTarget = 0.5;
        }
      } else {
        if (modeloUpper.includes('720')) {
          modeloBase = modelo;
          modeloEstandar = 'Opteva 720 Full';
          mpcr = 'OPTEVA';
        } else if (modeloUpper.includes('522')) {
          modeloBase = modelo;
          modeloEstandar = 'Opteva 522';
          mpcr = 'OPTEVA';
        } else if (modeloUpper.includes('520')) {
          modeloBase = modelo;
          modeloEstandar = 'Opteva 520';
          mpcr = 'OPTEVA';
        } else if (modeloUpper.includes('510')) {
          modeloBase = modelo;
          modeloEstandar = 'Opteva 510';
          mpcr = 'OPTEVA';
        } else if (modeloUpper.includes('828')) {
          modeloBase = 'Opteva 828';
          modeloEstandar = 'Opteva 828';
          mpcr = 'OPTEVA';
        } else {
          modeloBase = modelo;
          modeloEstandar = `Opteva ${modelo}`;
          mpcr = 'OPTEVA';
        }
        callRateTarget = 0.5;
      }
    }
  }

  return {
    marcaOriginal: marca,
    modeloOriginal: modelo,
    negocio,
    fabricante,
    modeloBase,
    modeloEstandar,
    mpcr,
    callRateTarget
  };
}

// ───────────────────────────────────────────────────────────────────────────────────
// 3. REGLAS DE CASCADA DE FILTROS (CASCADING FILTER ENGINE)
// ───────────────────────────────────────────────────────────────────────────────────

export const CANONICAL_FABRICANTES = [
  'Diebold Nixdorf',
  'Diebold Procomp',
  'Wincor',
  'GRG Banking',
  'GLORY',
  'SNBC',
  'CIMA',
  'KISAN',
  'MEI',
  'GUNNEBO',
  'Prosegur CRP'
] as const;

export const CANONICAL_NEGOCIOS: NegocioTipo[] = ['ATM', 'Cash Today', 'CRP'];

/**
 * Normaliza nombres de fabricante para comparación estricta
 */
export function normalizeFabricanteName(raw: string): string {
  const norm = (raw || '').trim().toLowerCase();
  if (norm.includes('wincor') || norm.includes('cs280') || norm.includes('cs285') || norm.includes('cs2070')) return 'Wincor';
  if (norm.includes('grg')) return 'GRG Banking';
  if (norm.includes('procomp') || norm.includes('tde')) return 'Diebold Procomp';
  if (norm.includes('diebold') || norm.includes('nixdorf') || norm.includes('opteva')) return 'Diebold Nixdorf';
  if (norm.includes('glory')) return 'GLORY';
  if (norm.includes('snbc')) return 'SNBC';
  if (norm.includes('cima') || norm.includes('inlane')) return 'CIMA';
  if (norm.includes('kisan')) return 'KISAN';
  if (norm.includes('mei')) return 'MEI';
  if (norm.includes('gunnebo')) return 'GUNNEBO';
  if (norm.includes('crp')) return 'Prosegur CRP';
  return (raw || '').trim() || 'Otro';
}

// ───────────────────────────────────────────────────────────────────────────────────
// 4. REGLAS DE NEGOCIO, CIERRES Y AUDITORÍA TÉCNICA
// ───────────────────────────────────────────────────────────────────────────────────

/** Cierres válidos para el cálculo de cumplimiento SLA */
export const SLA_VALID_CLOSURES = ['CEF', 'CEFIC', 'COMPL'] as const;

/** Cierres de asistencia remota (Exclusivos de Cash Today) */
export const TELCA_CLOSURES = ['TELCA', 'TELCA2', 'TELCA3', 'TELFA', 'MONITOREO'] as const;

/** Cierres excluidos del reporte de Suspendidos (no son fallas suspendidas en campo) */
export const SUSPENDIDOS_EXCLUDED_CLOSURES = [...TELCA_CLOSURES, 'DERIV'] as const;

/** Regiones supervisadas */
export const VALID_REGIONS = ['PATAGONIA', 'SUROESTE'] as const;

/** Zonas operativas del Suroeste */
export const SUROESTE_ZONES = ['IN BAR', 'IN CIP', 'IN NQN'] as const;

export const REINCIDENCIAS_RULES = {
  /** Ventana temporal canónica: 30 días */
  ANALYSIS_WINDOW_DAYS: 30,
  /** Solo cuentan visitas presenciales a campo */
  FIELD_VISITS_ONLY: true,
  /** Cierres remotos TELCA solo aplican a Cash Today como información complementaria */
  REMOTE_CLOSURES_APPLY_ONLY_TO_CASH_TODAY: true,
  /** Umbrales */
  CRITICO_THRESHOLD: 3,
  ADVERTENCIA_THRESHOLD: 2
} as const;

export const MP_RULES = {
  /**
   * Umbrales de desvío por tiempo insuficiente en sitio para Mantenimiento Preventivo:
   * - < 60 minutos para ATM, Glory y CIMA
   * - < 40 minutos para SNBC
   */
  MIN_TIME_THRESHOLDS_MINUTES: {
    ATM: 60,
    GLORY: 60,
    CIMA: 60,
    SNBC: 40,
    DEFAULT: 60
  },
  /** Helper para determinar si un tiempo de MP es desvío por ser demasiado corto */
  isTimeDeviation: (tiempoMinutos: number, fabricanteOrTipo: string): boolean => {
    const norm = (fabricanteOrTipo || '').toUpperCase();
    if (norm.includes('SNBC')) {
      return tiempoMinutos < 40;
    }
    return tiempoMinutos < 60; // ATM, GLORY, CIMA, DEFAULT
  },
  TARGET_MINUTES: 120, // 2 horas de referencia
  POST_MP_DEFICIENTE_DAYS: 30
} as const;

// ───────────────────────────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────────────────────────
// 5. NÓMINA CANÓNICA DE TÉCNICOS Y ZONAS SUPERVISADAS
// ───────────────────────────────────────────────────────────────────────────────────

export interface TecnicoSupervisionNode {
  nombre: string;
  region: 'PATAGONIA' | 'CENTRO-OESTE' | 'SUROESTE';
  zonaLocal: 'Atlántica' | 'Centro' | 'Oeste' | 'La Pampa' | 'Sur' | 'Contratistas' | 'Suroeste / Centro-Oeste';
  zonaTecnica: string;
  cabeceraBase: string;
  esContratista: boolean;
  atm: number;
  cashToday: number;
  subTotal: number;
}

export const NOMINA_TECNICOS_SUPERVISION: TecnicoSupervisionNode[] = [
  // ─── REGIÓN PATAGONIA ───
  // Sector Atlántica
  {
    nombre: 'Buratti, Fabian',
    region: 'PATAGONIA',
    zonaLocal: 'Atlántica',
    zonaTecnica: 'IN MDP 2',
    cabeceraBase: 'Mar del Plata (Base 2)',
    esContratista: false,
    atm: 78,
    cashToday: 1,
    subTotal: 79
  },
  {
    nombre: 'Chiriello, Pablo Javier',
    region: 'PATAGONIA',
    zonaLocal: 'Atlántica',
    zonaTecnica: 'IN MDP 1',
    cabeceraBase: 'Mar del Plata (Base 1)',
    esContratista: false,
    atm: 64,
    cashToday: 11,
    subTotal: 75
  },
  {
    nombre: 'Castaño, Matias',
    region: 'PATAGONIA',
    zonaLocal: 'Atlántica',
    zonaTecnica: 'IN MDP3',
    cabeceraBase: 'Mar del Plata (Cash Today)',
    esContratista: false,
    atm: 0,
    cashToday: 75,
    subTotal: 75
  },
  {
    nombre: 'Montiel, Juan Fernando',
    region: 'PATAGONIA',
    zonaLocal: 'Atlántica',
    zonaTecnica: 'IN COS',
    cabeceraBase: 'Costa Atlántica (Pinamar / Villa Gesell)',
    esContratista: false,
    atm: 43,
    cashToday: 28,
    subTotal: 71
  },

  // Sector Centro
  {
    nombre: 'Pavon, Diego Emanuel',
    region: 'PATAGONIA',
    zonaLocal: 'Centro',
    zonaTecnica: 'IN BB2',
    cabeceraBase: 'Bahía Blanca',
    esContratista: false,
    atm: 71,
    cashToday: 35,
    subTotal: 106
  },
  {
    nombre: 'Vicente, Francisco Ariel',
    region: 'PATAGONIA',
    zonaLocal: 'Centro',
    zonaTecnica: 'IN VIE',
    cabeceraBase: 'Viedma',
    esContratista: false,
    atm: 21,
    cashToday: 11,
    subTotal: 32
  },

  // Sector Oeste
  {
    nombre: 'Aldayturriaga, Martin',
    region: 'PATAGONIA',
    zonaLocal: 'Oeste',
    zonaTecnica: 'IN TDL',
    cabeceraBase: 'Tandil',
    esContratista: false,
    atm: 53,
    cashToday: 20,
    subTotal: 73
  },
  {
    nombre: 'Garcia, Alejandro Javier',
    region: 'PATAGONIA',
    zonaLocal: 'Oeste',
    zonaTecnica: 'IN TRQ',
    cabeceraBase: 'Trenque Lauquen',
    esContratista: false,
    atm: 78,
    cashToday: 10,
    subTotal: 88
  },
  {
    nombre: 'Martos, Jose Angel',
    region: 'PATAGONIA',
    zonaLocal: 'Oeste',
    zonaTecnica: 'IN OLA',
    cabeceraBase: 'Olavarría',
    esContratista: false,
    atm: 61,
    cashToday: 11,
    subTotal: 72
  },

  // Sector La Pampa
  {
    nombre: 'Allende, Martin Leandro',
    region: 'PATAGONIA',
    zonaLocal: 'La Pampa',
    zonaTecnica: 'IN SRO',
    cabeceraBase: 'Santa Rosa',
    esContratista: false,
    atm: 93,
    cashToday: 11,
    subTotal: 104
  },
  {
    nombre: 'Hernandez, Marcos Alberto',
    region: 'PATAGONIA',
    zonaLocal: 'La Pampa',
    zonaTecnica: 'IN PCO',
    cabeceraBase: 'General Pico (Base 1)',
    esContratista: false,
    atm: 44,
    cashToday: 2,
    subTotal: 46
  },
  {
    nombre: 'Hernandez, Marcos Alberto',
    region: 'PATAGONIA',
    zonaLocal: 'La Pampa',
    zonaTecnica: 'IN PCO1',
    cabeceraBase: 'General Pico (Base 2)',
    esContratista: false,
    atm: 36,
    cashToday: 1,
    subTotal: 37
  },

  // Sector Sur
  {
    nombre: 'Godoy, Diego',
    region: 'PATAGONIA',
    zonaLocal: 'Sur',
    zonaTecnica: 'IN TRE',
    cabeceraBase: 'Trelew / Puerto Madryn',
    esContratista: false,
    atm: 11,
    cashToday: 27,
    subTotal: 38
  },
  {
    nombre: 'Gonzalez Cabrera, Antonio',
    region: 'PATAGONIA',
    zonaLocal: 'Sur',
    zonaTecnica: 'IN COM',
    cabeceraBase: 'Comodoro Rivadavia',
    esContratista: false,
    atm: 25,
    cashToday: 32,
    subTotal: 57
  },

  // Sector Contratistas Patagonia
  {
    nombre: 'Barrera, Fernando Andrés',
    region: 'PATAGONIA',
    zonaLocal: 'Contratistas',
    zonaTecnica: 'IN RIT',
    cabeceraBase: 'Río Turbio',
    esContratista: true,
    atm: 4,
    cashToday: 0,
    subTotal: 4
  },
  {
    nombre: 'Corti Victor',
    region: 'PATAGONIA',
    zonaLocal: 'Contratistas',
    zonaTecnica: 'IN TDF',
    cabeceraBase: 'Tierra del Fuego (Ushuaia / Río Grande)',
    esContratista: true,
    atm: 2,
    cashToday: 19,
    subTotal: 21
  },
  {
    nombre: 'Foschi, Alejandro',
    region: 'PATAGONIA',
    zonaLocal: 'Contratistas',
    zonaTecnica: 'IN RGA',
    cabeceraBase: 'Río Gallegos',
    esContratista: true,
    atm: 8,
    cashToday: 19,
    subTotal: 27
  },

  // ─── REGIÓN CENTRO-OESTE / SUROESTE ───
  // Sector Suroeste / Centro-Oeste
  {
    nombre: 'Lazzaro, Leonardo',
    region: 'CENTRO-OESTE',
    zonaLocal: 'Suroeste / Centro-Oeste',
    zonaTecnica: 'IN NQN',
    cabeceraBase: 'Neuquén',
    esContratista: false,
    atm: 43,
    cashToday: 51,
    subTotal: 94
  },
  {
    nombre: 'Ibañez, Pablo Fernando',
    region: 'CENTRO-OESTE',
    zonaLocal: 'Suroeste / Centro-Oeste',
    zonaTecnica: 'IN CIP',
    cabeceraBase: 'Cipolletti / Alto Valle',
    esContratista: false,
    atm: 26,
    cashToday: 58,
    subTotal: 84
  },
  {
    nombre: 'Torres, Florencia',
    region: 'CENTRO-OESTE',
    zonaLocal: 'Suroeste / Centro-Oeste',
    zonaTecnica: 'IN BAR',
    cabeceraBase: 'Bariloche (Fix Computer)',
    esContratista: true,
    atm: 7,
    cashToday: 41,
    subTotal: 48
  }
];

// ───────────────────────────────────────────────────────────────────────────────────
// 6. HELPERS DE VALIDACIÓN RÁPIDA
// ───────────────────────────────────────────────────────────────────────────────────

export function isSlaValidClosure(code: string): boolean {
  return SLA_VALID_CLOSURES.includes((code || '').toUpperCase().trim() as any);
}

export function isTelcaClosure(code: string): boolean {
  return TELCA_CLOSURES.includes((code || '').toUpperCase().trim() as any);
}

export function isSuspendidosExcluded(code: string): boolean {
  return SUSPENDIDOS_EXCLUDED_CLOSURES.includes((code || '').toUpperCase().trim() as any);
}

export function isValidRegion(region: string): boolean {
  const norm = (region || '').toUpperCase().trim();
  return norm === 'PATAGONIA' || norm === 'SUROESTE' || norm === 'CENTRO-OESTE' || norm === 'CENTRO OESTE';
}

export default {
  resolveEquipmentTaxonomy,
  normalizeFabricanteName,
  CANONICAL_FABRICANTES,
  CANONICAL_NEGOCIOS,
  NOMINA_TECNICOS_SUPERVISION,
  SLA_VALID_CLOSURES,
  TELCA_CLOSURES,
  SUSPENDIDOS_EXCLUDED_CLOSURES,
  VALID_REGIONS,
  REINCIDENCIAS_RULES,
  MP_RULES
};
