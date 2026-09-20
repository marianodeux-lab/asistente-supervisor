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
 * 2. JERARQUÍA DE FILTROS DEPENDIENTES:
 *    Región -> Fabricante -> Modelo -> MPCR -> Negocio -> Planta Cabecera -> Técnico -> Red -> Recaudador.
 * 
 * 3. AUDITORÍA TÉCNICA Y REINCIDENCIAS:
 *    - Reincidencias en campo: Basadas estrictamente en VISITAS PRESENCIALES en los últimos 30 días.
 *    - Cierres remotos (TELCA, TELCA2, TELFA): Aplican exclusivamente a Cash Today y se muestran
 *      como dato complementario de soporte remoto sin penalizar la reincidencia presencial.
 *    - Solo computan órdenes donde hubo técnico asignado en la supervisión de servicio.
 *    - Filtro de año (2025 / 2026 / Todos) presente en todos los análisis históricos.
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
    if (modeloUpper.includes('CIMA') || modeloUpper.includes('SDM500')) {
      fabricante = 'CIMA';
      modeloBase = 'SDM500';
      modeloEstandar = 'CIMA SDM500';
      mpcr = 'CIMA';
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
    } else if (modeloUpper.includes('GLORY') || modeloUpper.includes('P500') || modeloUpper.includes('P1000') || modeloUpper.includes('P1001') || modeloUpper.includes('INLANE')) {
      fabricante = 'GLORY';
      if (modeloUpper.includes('P1000')) {
        modeloBase = 'GLORY P1000';
        modeloEstandar = 'GLORY P1000';
        mpcr = 'GLORY P1000';
      } else if (modeloUpper.includes('P1001')) {
        modeloBase = 'GLORY P1001';
        modeloEstandar = 'GLORY P1001';
        mpcr = 'GLORY P1001';
      } else if (modeloUpper.includes('INLANE')) {
        modeloBase = modeloUpper.includes('DEPO') ? 'INLANE 300 DEPO' : 'INLANE 300';
        modeloEstandar = modeloBase;
        mpcr = 'GLORY';
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
    if (marcaUpper === 'GRG' || modeloUpper.includes('DT-7000') || modeloUpper.includes('CI8000')) {
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
    } else if (marcaUpper.includes('DIEBOLD NIXDORF') || modeloUpper.includes('CS280') || modeloUpper.includes('CS285') || modeloUpper.includes('CS2070') || modeloUpper.includes('DN200V')) {
      fabricante = 'Diebold Nixdorf';
      if (modeloUpper.includes('DN200V')) {
        modeloBase = modelo;
        modeloEstandar = 'DN200V Reciclador';
        mpcr = 'DN';
      } else if (modeloUpper.includes('CS2070')) {
        modeloBase = modelo;
        modeloEstandar = 'CS2070 Cash';
        mpcr = 'DN';
      } else if (modeloUpper.includes('CS285')) {
        modeloBase = modelo;
        modeloEstandar = 'CS285 TTW';
        mpcr = 'DN';
      } else if (modeloUpper.includes('CS280')) {
        modeloBase = modelo;
        modeloEstandar = 'CS280 Cash';
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
  if (norm.includes('grg')) return 'GRG Banking';
  if (norm.includes('procomp') || norm.includes('tde')) return 'Diebold Procomp';
  if (norm.includes('diebold') || norm.includes('nixdorf') || norm.includes('opteva')) return 'Diebold Nixdorf';
  if (norm.includes('glory')) return 'GLORY';
  if (norm.includes('snbc')) return 'SNBC';
  if (norm.includes('cima')) return 'CIMA';
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
  TARGET_MINUTES: 120, // 2 horas
  ALERT_MINUTES: 150,  // 2.5 horas
  POST_MP_DEFICIENTE_DAYS: 30
} as const;

// ───────────────────────────────────────────────────────────────────────────────────
// 5. HELPERS DE VALIDACIÓN RÁPIDA
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
  return VALID_REGIONS.includes((region || '').toUpperCase().trim() as any);
}

export default {
  resolveEquipmentTaxonomy,
  normalizeFabricanteName,
  CANONICAL_FABRICANTES,
  CANONICAL_NEGOCIOS,
  SLA_VALID_CLOSURES,
  TELCA_CLOSURES,
  SUSPENDIDOS_EXCLUDED_CLOSURES,
  VALID_REGIONS,
  REINCIDENCIAS_RULES,
  MP_RULES
};
