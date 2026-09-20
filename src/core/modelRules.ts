/**
 * Centralized Hardware Families & Cascading Filter Rules
 * Single Source of Truth for: Fabricante -> Modelo -> MPCR -> Negocio
 * 
 * Sourced directly from Modelos MPCR (src/data/modelosMpcrData.json)
 */

import modelosMpcrData from '../data/modelosMpcrData.json';

export interface ModelMpcrEntry {
  fabricante: string;
  modeloBase: string;
  modelos: string;
  mpcr: string;
  negocio: 'ATM' | 'Cash Today';
  marcaDesc?: string;
  modeloDesc?: string;
}

export const CANONICAL_MPCR_LIST: ModelMpcrEntry[] = (modelosMpcrData.modelos || []) as ModelMpcrEntry[];

/**
 * Normaliza nombres de fabricante para agrupar sinónimos
 */
export function normalizeFabricante(raw: string): string {
  const norm = (raw || '').trim();
  const lower = norm.toLowerCase();
  if (lower.includes('grg')) return 'GRG';
  if (lower.includes('diebold') || lower.includes('procomp') || lower.includes('opteva') || lower.includes('tde') || lower.includes('crp')) return 'Diebold Nixdorf';
  if (lower.includes('smart box') || lower.includes('smartbox')) return 'Smart Box';
  if (lower.includes('gunnebo')) return 'Gunnebo';
  if (lower.includes('glory')) return 'GLORY';
  if (lower.includes('cima')) return 'CIMA';
  if (lower.includes('snbc')) return 'SNBC';
  if (lower.includes('hasar')) return 'HASAR';
  if (lower.includes('ncr')) return 'NCR';
  if (lower.includes('hyosung')) return 'Nautilus Hyosung';
  return norm || 'Otro';
}

/**
 * Obtiene lista única de Fabricantes canónicos
 */
export function getCanonicalFabricantes(): string[] {
  const set = new Set<string>();
  CANONICAL_MPCR_LIST.forEach(item => {
    const fab = normalizeFabricante(item.fabricante);
    if (fab) set.add(fab);
  });
  set.add('GRG');
  set.add('Diebold Nixdorf');
  set.add('Smart Box');
  set.add('Gunnebo');
  set.add('GLORY');
  set.add('CIMA');
  set.add('SNBC');
  return Array.from(set).sort();
}

/**
 * Obtiene lista de Modelos correspondientes a un Fabricante seleccionado
 */
export function getModelosForFabricante(fabricante: string): string[] {
  const set = new Set<string>();
  const normFab = normalizeFabricante(fabricante);

  CANONICAL_MPCR_LIST.forEach(item => {
    if (fabricante === 'ALL' || normalizeFabricante(item.fabricante) === normFab) {
      if (item.modeloBase) set.add(item.modeloBase.trim());
      if (item.modelos) set.add(item.modelos.trim());
    }
  });

  return Array.from(set).sort();
}

/**
 * Obtiene lista de MPCRs correspondientes a un Fabricante y Modelo
 */
export function getMpcrsForFabricanteAndModelo(fabricante: string, modelo: string): string[] {
  const set = new Set<string>();
  const normFab = normalizeFabricante(fabricante);
  const normMod = (modelo || '').trim().toLowerCase();

  CANONICAL_MPCR_LIST.forEach(item => {
    const matchFab = fabricante === 'ALL' || normalizeFabricante(item.fabricante) === normFab;
    const itemModBase = (item.modeloBase || '').trim().toLowerCase();
    const itemModelos = (item.modelos || '').trim().toLowerCase();
    const matchMod = modelo === 'ALL' || itemModBase === normMod || itemModelos === normMod;

    if (matchFab && matchMod && item.mpcr) {
      set.add(item.mpcr.trim());
    }
  });

  return Array.from(set).sort();
}

/**
 * Obtiene el Negocio (ATM vs Cash Today) canónico para un Modelo / MPCR
 */
export function getNegocioForModel(fabricante: string, modelo: string, mpcr: string): 'ATM' | 'Cash Today' | 'ALL' {
  const normFab = normalizeFabricante(fabricante);
  const normMod = (modelo || '').trim().toLowerCase();
  const normMpcr = (mpcr || '').trim().toLowerCase();

  const found = CANONICAL_MPCR_LIST.find(item => {
    const matchFab = fabricante === 'ALL' || normalizeFabricante(item.fabricante) === normFab;
    const matchMod = modelo === 'ALL' || (item.modeloBase || '').toLowerCase() === normMod || (item.modelos || '').toLowerCase() === normMod;
    const matchMpcr = mpcr === 'ALL' || (item.mpcr || '').toLowerCase() === normMpcr;
    return matchFab && matchMod && matchMpcr;
  });

  if (found) return found.negocio;

  // Fallbacks
  if (normFab === 'smart box' || normMod.includes('cte') || normMpcr.includes('cash today') || normMpcr.includes('smart')) {
    return 'Cash Today';
  }
  return 'ATM';
}
