import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  User, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Filter, 
  Car, 
  Compass, 
  Maximize2,
  Minimize2,
  Building,
  Info
} from 'lucide-react';
import L from 'leaflet';
import { Ticket, ZonaInfo } from '../types';
import { getCoordinatesForTicket, calculateHaversineDistance, estimateDrivingDistance, Coordinates } from '../utils/geoUtils';
import { getTechnicianAvatar, getInitials } from '../utils/avatarUtils';

interface MapaAgendaDiariaProps {
  tickets: Ticket[];
  zonas: ZonaInfo[];
  onSelectTicket: (ticket: Ticket) => void;
  selectedTechName?: string;
  onSelectTech?: (techName: string) => void;
}

export const MapaAgendaDiaria: React.FC<MapaAgendaDiariaProps> = ({
  tickets,
  zonas,
  onSelectTicket,
  selectedTechName = 'ALL',
  onSelectTech
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const [selectedZona, setSelectedZona] = useState<string>('ALL');
  const [selectedTecnico, setSelectedTecnico] = useState<string>(selectedTechName);
  const [slaFilter, setSlaFilter] = useState<'ALL' | 'CRITICO' | 'ALERTA' | 'OK'>('ALL');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Sync prop changes
  useEffect(() => {
    if (selectedTechName) {
      setSelectedTecnico(selectedTechName);
    }
  }, [selectedTechName]);

  // Unique technicians with tickets
  const techniciansList = useMemo(() => {
    const map = new Map<string, { nombre: string; zona: string; ticketsCount: number }>();
    tickets.forEach(t => {
      const name = t.tecnico || 'SIN ASIGNAR';
      if (!map.has(name)) {
        map.set(name, { nombre: name, zona: t.zonaLocal || t.zona || '', ticketsCount: 0 });
      }
      map.get(name)!.ticketsCount++;
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [tickets]);

  // Filtered tickets with geographic coordinates
  const mappedTickets = useMemo(() => {
    return tickets
      .filter(t => {
        if (selectedZona !== 'ALL' && t.zonaLocal !== selectedZona && t.zona !== selectedZona) return false;
        if (selectedTecnico !== 'ALL' && (t.tecnico || 'SIN ASIGNAR') !== selectedTecnico) return false;
        if (slaFilter === 'CRITICO' && !(t.hsSla <= 2 || t.slaPorcentaje <= 30)) return false;
        if (slaFilter === 'ALERTA' && !(t.hsSla > 2 && t.hsSla <= 6)) return false;
        if (slaFilter === 'OK' && !(t.hsSla > 6)) return false;
        return true;
      })
      .map(t => {
        const coords = getCoordinatesForTicket(t.luno, t.localidad);
        return {
          ticket: t,
          coords: coords || { lat: -38.0055, lng: -57.5426 } // fallback Mar del Plata
        };
      });
  }, [tickets, selectedZona, selectedTecnico, slaFilter]);

  // Localities summary
  const localitiesSummary = useMemo(() => {
    const map = new Map<string, { localidad: string; count: number; tickets: Ticket[] }>();
    mappedTickets.forEach(({ ticket }) => {
      const loc = ticket.localidad || 'S/D';
      if (!map.has(loc)) {
        map.set(loc, { localidad: loc, count: 0, tickets: [] });
      }
      const item = map.get(loc)!;
      item.count++;
      item.tickets.push(ticket);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [mappedTickets]);

  // Route statistics for selected technician
  const routeStats = useMemo(() => {
    if (selectedTecnico === 'ALL') {
      return { totalKm: 0, stops: mappedTickets.length, estHours: 0 };
    }
    const points = mappedTickets.map(m => m.coords);
    let totalKm = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalKm += estimateDrivingDistance(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng);
    }
    const estHours = Math.round((totalKm / 75 + points.length * 0.75) * 10) / 10;
    return {
      totalKm: Math.round(totalKm),
      stops: points.length,
      estHours
    };
  }, [mappedTickets, selectedTecnico]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-40.8135, -65.0942], // Patagonia center
        zoom: 6,
        zoomControl: true,
        attributionControl: false
      });

      // CartoDB Dark Matter tiles (dark theme)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers and Route on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    const bounds: L.LatLngBounds = L.latLngBounds([]);

    // Plot tickets
    mappedTickets.forEach(({ ticket, coords }, idx) => {
      const latLng = L.latLng(coords.lat, coords.lng);
      bounds.extend(latLng);

      // Status color
      let pinColor = '#0084ff'; // blue default
      let badgeClass = 'bg-blue-500';
      if (ticket.hsSla <= 2 || ticket.slaPorcentaje <= 25) {
        pinColor = '#ff4b68'; // red
        badgeClass = 'bg-red-500';
      } else if (ticket.hsSla <= 6) {
        pinColor = '#ff9900'; // orange
        badgeClass = 'bg-amber-500';
      }

      const avatar = getTechnicianAvatar(ticket.tecnico);
      const initials = getInitials(ticket.tecnico);

      // Custom HTML Marker Pin
      const iconHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="
            background: ${pinColor};
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            border: 2px solid #ffffff;
          ">
            <span style="
              transform: rotate(45deg);
              color: #ffffff;
              font-size: 11px;
              font-weight: 800;
              font-family: var(--font-sans);
            ">${idx + 1}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-map-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const marker = L.marker(latLng, { icon: customIcon });

      // Popup Content
      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
            <span style="font-weight: 800; font-size: 13px; color: #38bdf8;">${ticket.pedido}</span>
            <span style="font-size: 10px; background: ${pinColor}33; color: ${pinColor}; padding: 2px 6px; border-radius: 9999px; font-weight: 700; border: 1px solid ${pinColor}66;">
              ${ticket.hsSla <= 0 ? 'VENCIDO' : `${ticket.hsSla}h SLA`}
            </span>
          </div>
          <div style="font-size: 12px; color: #f8fafc; font-weight: 700; margin-bottom: 2px;">${ticket.cliente}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">LUNO: <strong style="color:#ffffff;">${ticket.luno}</strong> • ${ticket.localidad || 'Patagonia'}</div>
          
          <div style="display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.3); padding: 6px 8px; border-radius: 8px; margin-bottom: 8px;">
            ${avatar 
              ? `<img src="${avatar}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #38bdf8;" />` 
              : `<div style="width: 28px; height: 28px; border-radius: 50%; background: #334155; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700;">${initials}</div>`
            }
            <div style="line-height: 1.2;">
              <div style="font-size: 11px; font-weight: 700; color: #ffffff;">${ticket.tecnico}</div>
              <div style="font-size: 10px; color: #64748b;">${ticket.zonaLocal || ticket.zona}</div>
            </div>
          </div>

          <button id="btn-ticket-${ticket.id}" style="
            width: 100%;
            background: #0084ff;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 6px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
          ">
            Abrir Detalle Completo
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-ticket-${ticket.id}`);
        if (btn) {
          btn.onclick = () => onSelectTicket(ticket);
        }
      });

      marker.addTo(layer);
    });

    // Draw route polyline if single technician is selected
    if (selectedTecnico !== 'ALL' && mappedTickets.length > 1) {
      const latLngs = mappedTickets.map(m => [m.coords.lat, m.coords.lng] as [number, number]);
      const polyline = L.polyline(latLngs, {
        color: '#0084ff',
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.8
      }).addTo(map);
      routePolylineRef.current = polyline;
    }

    // Fit map bounds if points exist
    if (mappedTickets.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [mappedTickets, selectedTecnico]);

  // Quick region zoom helper
  const handleQuickZoom = (region: 'NORTE' | 'SUR' | 'COSTA' | 'CORDILLERA' | 'ALL') => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (region === 'NORTE') {
      map.flyTo([-38.9516, -68.0591], 8); // Neuquén / Cipolletti / Alto Valle
    } else if (region === 'SUR') {
      map.flyTo([-45.8647, -67.4965], 8); // Comodoro / Trelew / Rawson
    } else if (region === 'COSTA') {
      map.flyTo([-38.0055, -57.5426], 8); // MDP / Costa
    } else if (region === 'CORDILLERA') {
      map.flyTo([-41.1335, -71.3103], 8); // Bariloche
    } else {
      map.flyTo([-40.8135, -65.0942], 6);
    }
  };

  return (
    <div className={`space-y-4 ${isFullScreen ? 'fixed inset-4 z-50 bg-[#0c0f1d] p-4 rounded-2xl shadow-2xl border border-slate-700' : ''}`}>
      
      {/* Control Toolbar */}
      <div className="bg-[#14182d] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">Geolocalización & Rutas de Agenda</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {mappedTickets.length} Atenciones Mapeadas
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Visualización espacial de visitas por localidad, optimización de trayectos y cálculo de km.
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zona Filter */}
          <div className="flex items-center gap-1.5 bg-[#1b203c] border border-slate-700/70 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedZona}
              onChange={e => setSelectedZona(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">Todas las Zonas</option>
              {zonas.map(z => (
                <option key={z.id} value={z.nombre} className="bg-slate-900">{z.nombre}</option>
              ))}
            </select>
          </div>

          {/* Technician Filter */}
          <div className="flex items-center gap-1.5 bg-[#1b203c] border border-slate-700/70 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedTecnico}
              onChange={e => {
                setSelectedTecnico(e.target.value);
                if (onSelectTech) onSelectTech(e.target.value);
              }}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="ALL" className="bg-slate-900">Todos los Técnicos ({techniciansList.length})</option>
              {techniciansList.map(t => (
                <option key={t.nombre} value={t.nombre} className="bg-slate-900">
                  {t.nombre} ({t.ticketsCount})
                </option>
              ))}
            </select>
          </div>

          {/* SLA Filter */}
          <div className="flex items-center gap-1 bg-[#1b203c] border border-slate-700/70 rounded-xl p-1 text-xs">
            <button
              onClick={() => setSlaFilter('ALL')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${slaFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setSlaFilter('CRITICO')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${slaFilter === 'CRITICO' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Críticos
            </button>
            <button
              onClick={() => setSlaFilter('ALERTA')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${slaFilter === 'ALERTA' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Alerta
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2 rounded-xl bg-[#1b203c] hover:bg-slate-700 border border-slate-700/70 text-slate-300 hover:text-white transition"
            title={isFullScreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Map & Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Left Map View */}
        <div className="lg:col-span-3 space-y-3">
          
          {/* Quick Region Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-400" /> Enfoque:
            </span>
            <button
              onClick={() => handleQuickZoom('ALL')}
              className="px-2.5 py-1 rounded-lg bg-[#14182d] hover:bg-[#1b203c] border border-white/5 text-slate-300 hover:text-white transition font-medium"
            >
              Patagonia Completa
            </button>
            <button
              onClick={() => handleQuickZoom('NORTE')}
              className="px-2.5 py-1 rounded-lg bg-[#14182d] hover:bg-[#1b203c] border border-white/5 text-slate-300 hover:text-white transition font-medium"
            >
              Alto Valle / Neuquén
            </button>
            <button
              onClick={() => handleQuickZoom('SUR')}
              className="px-2.5 py-1 rounded-lg bg-[#14182d] hover:bg-[#1b203c] border border-white/5 text-slate-300 hover:text-white transition font-medium"
            >
              Chubut / Comodoro
            </button>
            <button
              onClick={() => handleQuickZoom('COSTA')}
              className="px-2.5 py-1 rounded-lg bg-[#14182d] hover:bg-[#1b203c] border border-white/5 text-slate-300 hover:text-white transition font-medium"
            >
              Atlántica / MDP
            </button>
            <button
              onClick={() => handleQuickZoom('CORDILLERA')}
              className="px-2.5 py-1 rounded-lg bg-[#14182d] hover:bg-[#1b203c] border border-white/5 text-slate-300 hover:text-white transition font-medium"
            >
              Suroeste / Bariloche
            </button>
          </div>

          {/* Map Leaflet Container */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0c0f1d]" style={{ height: isFullScreen ? 'calc(100vh - 220px)' : '520px' }}>
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Map Legend Overlay */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-[#14182d]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl text-xs space-y-1.5 max-w-[200px]">
              <div className="font-bold text-white text-[11px] uppercase tracking-wider mb-1">Estado SLA</div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                <span>Crítico / Vencido (&lt; 2h)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                <span>En Advertencia (2h - 6h)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
                <span>En Tiempo (&gt; 6h)</span>
              </div>
            </div>

            {/* Technician Route Summary Floating Card (if single technician selected) */}
            {selectedTecnico !== 'ALL' && (
              <div className="absolute top-4 right-4 z-[1000] bg-[#14182d]/95 backdrop-blur-md border border-blue-500/30 rounded-xl p-3.5 shadow-2xl max-w-[260px]">
                <div className="flex items-center gap-2 mb-2">
                  {getTechnicianAvatar(selectedTecnico) ? (
                    <img 
                      src={getTechnicianAvatar(selectedTecnico)!} 
                      alt={selectedTecnico} 
                      className="w-9 h-9 rounded-full object-cover border-2 border-blue-400"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      {getInitials(selectedTecnico)}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-white truncate">{selectedTecnico}</h4>
                    <p className="text-[10px] text-blue-400 font-semibold">Itinerario de Visitas</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60 text-center">
                  <div className="bg-[#1b203c] p-2 rounded-lg">
                    <div className="text-[10px] text-slate-400">Trayecto Est.</div>
                    <div className="text-sm font-extrabold text-blue-300">{routeStats.totalKm} km</div>
                  </div>
                  <div className="bg-[#1b203c] p-2 rounded-lg">
                    <div className="text-[10px] text-slate-400">Tiempo Ruta</div>
                    <div className="text-sm font-extrabold text-emerald-300">{routeStats.estHours} hs</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Localities & Dispatch Panel */}
        <div className="space-y-3">
          <div className="bg-[#14182d] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col h-[565px]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-bold text-white">Localidades del Día</h4>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {localitiesSummary.length} ciudades
              </span>
            </div>

            {/* Scrollable Localities List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {localitiesSummary.map(loc => (
                <div 
                  key={loc.localidad}
                  className="p-2.5 rounded-xl bg-[#1b203c] border border-slate-700/50 hover:border-blue-500/40 transition group cursor-pointer"
                  onClick={() => {
                    const firstTicket = loc.tickets[0];
                    if (firstTicket) {
                      const coords = getCoordinatesForTicket(firstTicket.luno, firstTicket.localidad);
                      if (coords && mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo([coords.lat, coords.lng], 11);
                      }
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white group-hover:text-blue-300 transition">
                      {loc.localidad}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {loc.count} {loc.count === 1 ? 'visita' : 'visitas'}
                    </span>
                  </div>

                  <div className="space-y-1 mt-1.5 pt-1.5 border-t border-slate-700/30">
                    {loc.tickets.slice(0, 3).map(t => (
                      <div 
                        key={t.id} 
                        className="flex items-center justify-between text-[11px] text-slate-300 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTicket(t);
                        }}
                      >
                        <span className="truncate max-w-[120px] font-mono text-[10px] text-slate-400">{t.pedido}</span>
                        <span className="truncate max-w-[90px] text-[10px] text-slate-300">{t.cliente}</span>
                      </div>
                    ))}
                    {loc.tickets.length > 3 && (
                      <div className="text-[10px] text-slate-500 font-medium text-right">
                        +{loc.tickets.length - 3} más...
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {localitiesSummary.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No hay visitas para los filtros seleccionados.
                </div>
              )}
            </div>

            {/* Quick Km Notice */}
            <div className="mt-3 pt-3 border-t border-white/5 bg-[#1b203c]/60 p-2.5 rounded-xl flex items-start gap-2 text-[11px] text-slate-400">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <span>Coordenadas exactas obtenidas de la base geocodificada de 6.702 ATMs en Patagonia y Argentina.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
