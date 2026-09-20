/**
 * Centralized Hardware Families & Cascading Filter Rules
 * Powered by src/core/fuenteDeVerdad.ts
 */

import {
  resolveEquipmentTaxonomy,
  normalizeFabricanteName,
  CANONICAL_FABRICANTES,
  CANONICAL_NEGOCIOS,
  NegocioTipo,
  HardwareMapping
} from './fuenteDeVerdad';
import fuenteDeVerdadData from '../data/fuenteDeVerdadData.json';

export interface ModelMpcrEntry {
  fabricante: string;
  modeloBase: string;
  modelos: string;
  mpcr: string;
  negocio: NegocioTipo;
  marcaDesc?: string;
  modeloDesc?: string;
}

export const CANONICAL_CATALOG: HardwareMapping[] = (fuenteDeVerdadData.catalog || []) as unknown as HardwareMapping[];

/**
 * Normaliza nombres de fabricante para agrupar sinónimos
 */
export function normalizeFabricante(raw: string): string {
  return normalizeFabricanteName(raw);
}

/**
 * Obtiene lista única de Fabricantes canónicos
 */
export function getCanonicalFabricantes(): string[] {
  const set = new Set<string>();
  CANONICAL_CATALOG.forEach(item => {
    if (item.fabricante) set.add(item.fabricante.trim());
  });
  CANONICAL_FABRICANTES.forEach(f => set.add(f));
  return Array.from(set).sort();
}

/**
 * Obtiene lista de Modelos correspondientes a un Fabricante seleccionado
 */
export function getModelosForFabricante(fabricante: string): string[] {
  const set = new Set<string>();
  const normFab = normalizeFabricante(fabricante);

  CANONICAL_CATALOG.forEach(item => {
    if (fabricante === 'ALL' || normalizeFabricante(item.fabricante) === normFab) {
      if (item.modeloEstandar) set.add(item.modeloEstandar.trim());
      else if (item.modeloBase) set.add(item.modeloBase.trim());
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

  CANONICAL_CATALOG.forEach(item => {
    const matchFab = fabricante === 'ALL' || normalizeFabricante(item.fabricante) === normFab;
    const matchMod = modelo === 'ALL' || 
      (item.modeloEstandar || '').toLowerCase() === normMod || 
      (item.modeloBase || '').toLowerCase() === normMod ||
      (item.modeloOriginal || '').toLowerCase() === normMod;

    if (matchFab && matchMod && item.mpcr) {
      set.add(item.mpcr.trim());
    }
  });

  return Array.from(set).sort();
}

/**
 * Obtiene el Negocio ('ATM' | 'Cash Today' | 'CRP') canónico para un Modelo / MPCR
 */
export function getNegocioForModel(fabricante: string, modelo: string, mpcr: string): NegocioTipo | 'ALL' {
  const normFab = normalizeFabricante(fabricante);
  const normMod = (modelo || '').trim().toLowerCase();
  const normMpcr = (mpcr || '').trim().toLowerCase();

  const found = CANONICAL_CATALOG.find(item => {
    const matchFab = fabricante === 'ALL' || normalizeFabricante(item.fabricante) === normFab;
    const matchMod = modelo === 'ALL' || 
      (item.modeloEstandar || '').toLowerCase() === normMod || 
      (item.modeloBase || '').toLowerCase() === normMod ||
      (item.modeloOriginal || '').toLowerCase() === normMod;
    const matchMpcr = mpcr === 'ALL' || (item.mpcr || '').toLowerCase() === normMpcr;
    return matchFab && matchMod && matchMpcr;
  });

  if (found) return found.negocio;

  if (normFab === 'prosegur crp' || normMod.includes('crp') || normMpcr.includes('crp')) {
    return 'CRP';
  }
  if (normFab === 'glory' || normFab === 'snbc' || normFab === 'cima' || normFab === 'kisan' || normFab === 'mei' || normFab === 'gunnebo') {
    return 'Cash Today';
  }
  return 'ATM';
}

export {
  resolveEquipmentTaxonomy,
  CANONICAL_NEGOCIOS
};
