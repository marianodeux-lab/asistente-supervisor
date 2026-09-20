/**
 * Centralized Business Rules for the Asistente Supervisor Application
 * 
 * This module is the SINGLE SOURCE OF TRUTH for all closure code filtering,
 * regional boundaries, and quality thresholds. Both the frontend (excelProcessor.ts)
 * and the backend scripts (process_all_reports_deep.cjs) must reference these constants.
 * 
 * DO NOT duplicate these values elsewhere in the codebase.
 */

// ═══════════════════════════════════════════════════════════════
// CLOSURE CODES (Códigos de Cierre)
// ═══════════════════════════════════════════════════════════════

/** Cierres exitosos que se reportan en el Reporte SLA */
export const SLA_VALID_CLOSURES = ['CEF', 'CEFIC', 'COMPL'] as const;

/** Cierres de asistencia remota (TELCA) — tab exclusiva */
export const TELCA_CLOSURES = ['TELCA', 'TELCA2', 'TELCA3', 'TELFA', 'MONITOREO'] as const;

/** Cierres que NO deben aparecer en el Reporte de Suspendidos */
export const SUSPENDIDOS_EXCLUDED_CLOSURES = [...TELCA_CLOSURES, 'DERIV'] as const;

/** Cierres de derivación (no son visitas de campo) */
export const DERIVACION_CLOSURES = ['DERIV'] as const;

// ═══════════════════════════════════════════════════════════════
// REGIONAL BOUNDARIES (Zonas y Regiones)
// ═══════════════════════════════════════════════════════════════

/** Las dos regiones que competen al Supervisor */
export const VALID_REGIONS = ['PATAGONIA', 'SUROESTE'] as const;

/** Zonas técnicas del Suroeste bajo supervisión (IN BAR, IN CIP, IN NQN) */
export const SUROESTE_ZONES = ['IN BAR', 'IN CIP', 'IN NQN'] as const;

/** Zonas expandidas del Suroeste (incluye variantes de texto) */
export const SUROESTE_ZONES_EXPANDED = [
  ...SUROESTE_ZONES,
  'Suroeste',
  'Bariloche',
  'Cipolletti',
  'Neuquen',
  'Neuquén'
] as const;

// ═══════════════════════════════════════════════════════════════
// MP (MANTENIMIENTO PREVENTIVO) THRESHOLDS
// ═══════════════════════════════════════════════════════════════

/** Umbral máximo de tiempo de asistencia (T Asis) en minutos, por tipo de equipo */
export const MP_TASIS_THRESHOLDS = {
  ATM: 45,
  CASH_TODAY: 30,
  GLORY_CIMA: 60,
  DEFAULT: 45
} as const;

/** Días para considerar un MP como "deficiente" (si falla dentro de este rango post-MP) */
export const MP_DEFICIENTE_DAYS = 30;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

export function isSlaValidClosure(code: string): boolean {
  return SLA_VALID_CLOSURES.includes(code.toUpperCase().trim() as any);
}

export function isTelcaClosure(code: string): boolean {
  return TELCA_CLOSURES.includes(code.toUpperCase().trim() as any);
}

export function isSuspendidosExcluded(code: string): boolean {
  const normalized = code.toUpperCase().trim();
  return SUSPENDIDOS_EXCLUDED_CLOSURES.includes(normalized as any);
}

export function isValidRegion(region: string): boolean {
  return VALID_REGIONS.includes(region.toUpperCase().trim() as any);
}

export function isSuroesteZone(zona: string): boolean {
  const upper = zona.toUpperCase().trim();
  return SUROESTE_ZONES_EXPANDED.some(z => upper.includes(z.toUpperCase()));
}

// ═══════════════════════════════════════════════════════════════
// JSON-EXPORTABLE CONSTANTS (for CJS scripts)
// ═══════════════════════════════════════════════════════════════

export const REPORT_RULES = {
  slaValidClosures: [...SLA_VALID_CLOSURES],
  telcaClosures: [...TELCA_CLOSURES],
  suspendidosExcludedClosures: [...SUSPENDIDOS_EXCLUDED_CLOSURES],
  derivacionClosures: [...DERIVACION_CLOSURES],
  validRegions: [...VALID_REGIONS],
  suroesteZones: [...SUROESTE_ZONES],
  suroesteZonesExpanded: [...SUROESTE_ZONES_EXPANDED],
  mpTasisThresholds: { ...MP_TASIS_THRESHOLDS },
  mpDeficienteDays: MP_DEFICIENTE_DAYS
} as const;
