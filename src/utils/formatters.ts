/**
 * Utility functions for formatting time strings and mapping operational zones
 */

/**
 * Strips seconds from any time string, returning "HH:mm"
 * Handles "14:00:00" -> "14:00", "08:30:00" -> "08:30", "07/09/2026 14:00:00" -> "07/09/2026 14:00"
 */
export const formatTimeClean = (timeStr?: string | null): string => {
  if (!timeStr) return '';
  // Replace :ss in time patterns (e.g. 14:00:00 -> 14:00)
  return String(timeStr).replace(/(\b\d{1,2}:\d{2}):\d{2}\b/g, '$1');
};

/**
 * Converts Excel serial date numbers (e.g. 46079) or ISO dates to "DD/MM/YYYY"
 */
export const formatExcelDate = (val: any): string => {
  if (!val && val !== 0) return '';
  const num = typeof val === 'number' ? val : (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val.trim()) ? Number(val.trim()) : NaN);
  if (!isNaN(num) && num > 30000 && num < 70000) {
    const utcDays = num - 25569;
    const utcMs = utcDays * 86400 * 1000;
    const d = new Date(utcMs);
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
  const str = String(val).trim();
  if (str.includes('-')) {
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return str;
};

/**
 * Mapping of Technical Zone acronyms to Local Zones (Patagonia & Suroeste)
 */
export const ZONA_TECNICA_TO_LOCAL: Record<string, string> = {
  'IN MDP 1': 'Atlántica',
  'IN MDP 2': 'Atlántica',
  'IN MDP3': 'Atlántica',
  'IN COS': 'Atlántica',
  'IN SRO': 'La Pampa',
  'IN PCO': 'La Pampa',
  'IN PCO1': 'La Pampa',
  'IN TDL': 'Oeste',
  'IN TRQ': 'Oeste',
  'IN OLA': 'Oeste',
  'IN BB2': 'Centro',
  'IN VIE': 'Centro',
  'IN TRE': 'Sur',
  'IN COM': 'Sur',
  'IN BAR': 'Suroeste',
  'IN CIP': 'Suroeste',
  'IN NQN': 'Suroeste',
  'IN RIT': 'Contratistas',
  'IN TDF': 'Contratistas',
  'IN RGA': 'Contratistas'
};

/**
 * Returns formatted label for Zona Técnica including its Local Zone
 * e.g., "IN MDP 1 (Atlántica)", "IN SRO (La Pampa)"
 */
export const getZonaLabelWithLocal = (zonaTecnica: string): string => {
  const local = ZONA_TECNICA_TO_LOCAL[zonaTecnica];
  if (local) {
    return `${zonaTecnica} (${local})`;
  }
  return zonaTecnica;
};

/**
 * Extracts real client, branch, and real address for RELEVAMIENTOS CASH TODAY orders
 * where Flow sets a generic client ("RELEVAMIENTOS CASH TODAY") but the store/business is in the notes.
 */
export function extractRelevamientoClient(detalle?: string): { 
  clienteReal: string; 
  obra?: string; 
  sucursal?: string; 
  direccionReal?: string; 
  localidadReal?: string; 
} | null {
  if (!detalle) return null;
  const lines = String(detalle).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  // Template pattern with 'Contacto del cliente' separator
  const contactIdx = lines.findIndex(l => /Contacto (del )?cliente/i.test(l));
  if (contactIdx !== -1 && contactIdx + 1 < lines.length) {
    const dataLines = lines.slice(contactIdx + 1);
    if (dataLines[0] && !dataLines[0].startsWith('¿') && !dataLines[0].startsWith('-')) {
      return {
        clienteReal: dataLines[0],
        obra: dataLines[1] || '',
        sucursal: dataLines[2] || '',
        direccionReal: dataLines[3] || '',
        localidadReal: dataLines[4] || ''
      };
    }
  }

  // Non-template format: check line right after "relevamiento"
  const idxNombre = lines.findIndex(l => /relevamiento/i.test(l));
  if (idxNombre !== -1 && lines[idxNombre + 1]) {
    const nextLine = lines[idxNombre + 1];
    if (nextLine && !nextLine.startsWith('¿') && !/^(A entregar|A mover|Nombre|El técnico)/i.test(nextLine)) {
      return {
        clienteReal: nextLine,
        obra: lines[idxNombre + 2] || '',
        sucursal: lines[idxNombre + 3] || '',
        direccionReal: lines[idxNombre + 4] || '',
        localidadReal: lines[idxNombre + 5] || ''
      };
    }
  }

  // Search for company indicators (S.A., S.R.L., etc.)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(S\.?A\.?|S\.?R\.?L\.?|S\.?A\.?S\.?|INC|SOCIEDAD|ASOCIADOS|ARGENTINA)/i.test(line) && 
        !line.includes('¿') && !/Nombre Cliente/i.test(line) && !/relevamiento/i.test(line) && !/El técnico/i.test(line)) {
      return { 
        clienteReal: line, 
        sucursal: lines[i + 2] || lines[i + 1] || '' 
      };
    }
  }
  
  return null;
}

/**
 * Parses strict DD/MM/YYYY [HH:mm[:ss]] strings into a valid Date object,
 * preventing JavaScript V8 from confusing DD and MM as US MM/DD.
 * e.g., "Hasta 10/09/2026 17:00:00" -> Date(2026, 8, 10, 17, 0, 0)
 */
export function parseExcelDateTime(str?: string | null): Date | null {
  if (!str) return null;
  const s = String(str).trim();

  // Excel serial number
  const num = Number(s);
  if (!isNaN(num) && num > 30000 && num < 70000) {
    const utcDays = num - 25569;
    return new Date(utcDays * 86400 * 1000);
  }

  // Check DD/MM/YYYY pattern
  const match = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? parseInt(match[5], 10) : 0;
    const sec = match[6] ? parseInt(match[6], 10) : 0;
    return new Date(year, month, day, hour, min, sec);
  }

  // Fallback to ISO parsing if YYYY-MM-DD
  const isoMatch = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Formats SLA Expiration date and calculates true remaining hours or overdue time,
 * clearly distinguishing expired tickets from active tickets.
 */
export function formatSlaExpirationDisplay(
  fechaVtoStr?: string | null,
  slaPorcentaje: number = 0,
  hsSlaInput?: number,
  refDate: Date = new Date('2026-09-13T12:00:00') // Operational dynamic reference
): {
  isExpired: boolean;
  formattedVto: string;
  badgeTitle: string;
  badgeDesc: string;
  diffHours: number;
} {
  const vtoDate = parseExcelDateTime(fechaVtoStr);
  
  if (!vtoDate || isNaN(vtoDate.getTime())) {
    return {
      isExpired: slaPorcentaje >= 100,
      formattedVto: fechaVtoStr || 'No especificada',
      badgeTitle: slaPorcentaje >= 100 ? 'SLA Consumido (100%)' : `${slaPorcentaje}% Consumido`,
      badgeDesc: `${slaPorcentaje}% Consumido`,
      diffHours: hsSlaInput ?? 0
    };
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const formattedVto = `${pad(vtoDate.getDate())}/${pad(vtoDate.getMonth() + 1)}/${vtoDate.getFullYear()} a las ${pad(vtoDate.getHours())}:${pad(vtoDate.getMinutes())} hs`;

  // Compare against reference date
  const diffMs = vtoDate.getTime() - refDate.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(Math.abs(diffHours) / 24);

  const isExpired = diffMs <= 0 || slaPorcentaje >= 100;

  if (isExpired) {
    const expiredAgo = diffDays >= 1 
      ? `hace ${diffDays} día(s)` 
      : `hace ${Math.abs(diffHours)} hora(s)`;
    return {
      isExpired: true,
      formattedVto,
      badgeTitle: '🚨 SLA VENCIDO',
      badgeDesc: `Venció el ${formattedVto} (${expiredAgo})`,
      diffHours: Math.min(0, diffHours)
    };
  }

  return {
    isExpired: false,
    formattedVto,
    badgeTitle: `${slaPorcentaje}% Consumido (${Math.max(1, diffHours)} hs restantes)`,
    badgeDesc: `Vence el ${formattedVto} (quedan ~${Math.max(1, diffHours)} hs)`,
    diffHours
  };
}

/**
 * Parses MP 'T Asis' (Tiempo de Asistencia) string or number into minutes and formatted string
 * e.g., "1:32:49" -> { minutos: 92, display: "1h 32m" }
 * e.g., "0:31:54" -> { minutos: 31, display: "31m" }
 */
export function parseTiempoAsistencia(tAsisStr?: string | number | null): { minutos: number; display: string } {
  if (!tAsisStr && tAsisStr !== 0) return { minutos: 0, display: 'No registrado' };
  
  if (typeof tAsisStr === 'number') {
    // Excel fraction of a day (1 = 24 hours, 0.041666 = 1 hour)
    const totalMinutes = Math.round(tAsisStr * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const display = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return { minutos: totalMinutes, display };
  }

  const s = String(tAsisStr).trim();
  const parts = s.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const totalMinutes = h * 60 + m;
    const display = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return { minutos: totalMinutes, display };
  }

  return { minutos: 0, display: s };
}

/**
 * Evaluates labor time employed in Preventative Maintenance (MP) according to equipment category:
 * - ATM: Average should be 60m. If < 45 min -> ALERT
 * - Cash Today: Minimum required is 30m. If < 30 min -> ALERT
 * - Glory / CIMA: Minimum required is 60m. If < 60 min -> ALERT
 */
export function evaluarTiempoLaboralMp(
  modelo?: string | null,
  minutos: number = 0
): {
  tieneAlerta: boolean;
  tipoEquipo: 'ATM' | 'CASH_TODAY' | 'GLORY_CIMA';
  tipoEquipoLabel: string;
  umbralMinutos: number;
  mensaje: string;
} {
  const m = String(modelo || '').toUpperCase();

  // 1. Glory o CIMA: 60 minutos mínimo requerido
  if (m.includes('GLORY') || m.includes('CIMA')) {
    const umbral = 60;
    const tieneAlerta = minutos > 0 && minutos < umbral;
    return {
      tieneAlerta,
      tipoEquipo: 'GLORY_CIMA',
      tipoEquipoLabel: 'Bóveda / Recicladora (Glory / CIMA)',
      umbralMinutos: umbral,
      mensaje: tieneAlerta 
        ? `⚠️ Tiempo MP insuficiente en Glory/CIMA (${minutos} min vs mínimo requerido de 60 min)`
        : `✓ Tiempo de asistencia adecuado (${minutos} min de 60 min requeridos)`
    };
  }

  // 2. Cash Today (CTI, CTE, KISAN, TAS, TDE, CASH TODAY, SMART BOX): 30 minutos mínimo requerido
  if (
    m.includes('CTI') || 
    m.includes('CTE') || 
    m.includes('KISAN') || 
    m.includes('TAS') || 
    m.includes('TDE') || 
    m.includes('CASH') ||
    m.includes('SNBC') ||
    m.includes('SMART BOX') ||
    m.includes('SMARTBOX')
  ) {
    const umbral = 30;
    const tieneAlerta = minutos > 0 && minutos < umbral;
    return {
      tieneAlerta,
      tipoEquipo: 'CASH_TODAY',
      tipoEquipoLabel: 'Terminal Cash Today',
      umbralMinutos: umbral,
      mensaje: tieneAlerta 
        ? `⚠️ Tiempo MP insuficiente en Cash Today (${minutos} min vs mínimo requerido de 30 min)`
        : `✓ Tiempo de asistencia adecuado (${minutos} min de 30 min requeridos)`
    };
  }

  // 3. ATM estándar (Diebold, NCR, GRG, Opteva, CS280, CS2070, DT-7000...): media esperada 60m, alerta < 45m
  const umbral = 45;
  const tieneAlerta = minutos > 0 && minutos < umbral;
  return {
    tieneAlerta,
    tipoEquipo: 'ATM',
    tipoEquipoLabel: 'Cajero Automático (ATM)',
    umbralMinutos: umbral,
    mensaje: tieneAlerta 
      ? `⚠️ Tiempo MP insuficiente en ATM (${minutos} min vs media requerida de 45-60 min)`
      : `✓ Tiempo de asistencia adecuado (${minutos} min vs media de 60 min)`
  };
}

/**
 * Determina si un equipo es Cajero Automático (ATM) o Terminal Cash Today (Smart Box).
 * Regla de negocio: Los cajeros automáticos (ATM) jamás reciben asistencia remota ni tienen atenciones TELCA.
 */
export function isAtmEquipment(modelo?: string, tipo?: string): boolean {
  const m = String(modelo || '').toUpperCase();
  const t = String(tipo || '').toUpperCase();
  if (
    t.includes('SMART BOX') ||
    m.includes('SMART BOX') ||
    m.includes('SMARTBOX') ||
    m.includes('CTI') || 
    m.includes('CTE') || 
    m.includes('KISAN') || 
    m.includes('TAS') || 
    m.includes('TDE') || 
    m.includes('CASH') ||
    m.includes('SNBC') ||
    m.includes('CIMA')
  ) {
    return false; // Es Cash Today
  }
  return true; // Es Cajero Automático (ATM)
}
