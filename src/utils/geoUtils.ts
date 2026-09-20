/**
 * Geolocation & Route Calculation Utilities
 */

import geoData from '../data/geoCoordinatesData.json';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodedAtmInfo {
  lat: number;
  lng: number;
  denom: string;
  localidad: string;
  provincia: string;
  zona: string;
  tecnico: string;
  km: number;
}

const atmCoordsMap: Record<string, GeocodedAtmInfo> = (geoData as any).atmCoords || {};
const localidadCoordsMap: Record<string, any> = (geoData as any).localidadCoords || {};

/**
 * Look up geocoded coordinates by ATM/LUNO code or localidad fallback
 */
export function getCoordinatesForTicket(luno: string, localidad?: string): Coordinates | null {
  if (luno) {
    const cleanLuno = String(luno).trim();
    if (atmCoordsMap[cleanLuno]) {
      return {
        lat: atmCoordsMap[cleanLuno].lat,
        lng: atmCoordsMap[cleanLuno].lng
      };
    }
  }

  if (localidad) {
    const cleanLoc = localidad.trim().toLowerCase();
    if (localidadCoordsMap[cleanLoc]) {
      return {
        lat: localidadCoordsMap[cleanLoc].lat,
        lng: localidadCoordsMap[cleanLoc].lng
      };
    }
  }

  return null;
}

export function getAtmGeoInfo(luno: string): GeocodedAtmInfo | null {
  if (!luno) return null;
  const cleanLuno = String(luno).trim();
  return atmCoordsMap[cleanLuno] || null;
}

/**
 * Calculates geodesic distance between two points in km using the Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Estimates driving distance taking into account typical road tortuosity factor (~1.25x - 1.35x in Patagonia)
 */
export function estimateDrivingDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const straightLine = calculateHaversineDistance(lat1, lon1, lat2, lon2);
  // Tortuosity factor for highways/routes in Argentina
  const factor = straightLine < 15 ? 1.2 : straightLine < 100 ? 1.25 : 1.3;
  return Math.round(straightLine * factor * 10) / 10;
}

/**
 * Calculates total route km for an ordered sequence of tickets
 */
export function calculateRouteSummary(points: Coordinates[]): { totalKm: number; stops: number } {
  if (points.length < 2) {
    return { totalKm: 0, stops: points.length };
  }

  let totalKm = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dist = estimateDrivingDistance(
      points[i].lat,
      points[i].lng,
      points[i + 1].lat,
      points[i + 1].lng
    );
    totalKm += dist;
  }

  return {
    totalKm: Math.round(totalKm),
    stops: points.length
  };
}
