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

