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
