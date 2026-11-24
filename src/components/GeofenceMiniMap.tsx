import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { MARICA_BAIRROS_GEOJSON } from '../data/maricaGeo';

const RAIO_RESIDENCIAL_METROS = 100;

interface GeofenceMiniMapProps {
  homeCoords: [number, number];
  captureCoords: [number, number] | null;
  accuracyMeters?: number | null;
  isWithinRadius: boolean;
}

export function GeofenceMiniMap({
  homeCoords,
  captureCoords,
  accuracyMeters,
  isWithinRadius,
}: GeofenceMiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: homeCoords,
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);
    map.getPane('tilePane')?.classList.add('osm-clean');

    L.geoJSON(MARICA_BAIRROS_GEOJSON, {
      interactive: false,
      style: {
        color: '#0B3B49',
        weight: 1,
        opacity: 0.3,
        fillOpacity: 0.03,
      },
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // 100m Home Geofence Ring
    L.circle(homeCoords, {
      radius: RAIO_RESIDENCIAL_METROS,
      color: '#156F48',
      weight: 2,
      fillColor: '#156F48',
      fillOpacity: 0.13,
      dashArray: '5 5',
    }).addTo(layer);

    // Custom architectural House Pin SVG
    const homeIcon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">
        <div style="width:30px;height:30px;border-radius:999px;background:#0B3B49;border:2.5px solid #E89B0C;box-shadow:0 4px 12px rgba(11,59,73,0.34);display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/></svg>
        </div>
      </div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    L.marker(homeCoords, { icon: homeIcon })
      .bindTooltip('Residência cadastrada (raio 100 m)', {
        direction: 'top',
        offset: [0, -16],
        className: 'bairro-tip',
      })
      .addTo(layer);

    if (captureCoords) {
      const color = isWithinRadius ? '#156F48' : '#D93829';

      if (accuracyMeters && accuracyMeters > 10 && accuracyMeters <= 1500) {
        L.circle(captureCoords, {
          radius: accuracyMeters,
          color: '#0E7490',
          weight: 1,
          fillColor: '#0E7490',
          fillOpacity: 0.1,
          interactive: false,
        }).addTo(layer);
      }

      const gpsIcon = L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;border-radius:999px;background:${color};border:3px solid #FFFFFF;box-shadow:0 0 0 6px ${isWithinRadius ? 'rgba(21,111,72,0.28)' : 'rgba(217,56,41,0.28)'};"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      L.marker(captureCoords, { icon: gpsIcon })
        .bindTooltip(
          isWithinRadius ? 'Localização confirmada em casa' : 'Fora da área residencial',
          { direction: 'bottom', offset: [0, 12], className: 'bairro-tip' }
        )
        .addTo(layer);

      L.polyline([homeCoords, captureCoords], {
        color,
        weight: 2.5,
        dashArray: '4 4',
      }).addTo(layer);

      const bounds = L.latLngBounds([homeCoords, captureCoords]).pad(0.45);
      map.fitBounds(bounds, { maxZoom: 17, animate: true });
    } else {
      map.setView(homeCoords, 16, { animate: true });
    }
  }, [homeCoords, captureCoords, accuracyMeters, isWithinRadius]);

  return (
    <div className="isolate relative h-52 w-full overflow-hidden rounded-[8px] border border-[#DCE3E8] bg-[#D9E8EE]">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-2 left-2 z-[400] rounded-[5px] border border-[#DCE3E8] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0B3B49] shadow-xs">
        Referência residencial (raio {RAIO_RESIDENCIAL_METROS} m)
      </div>
      {accuracyMeters != null && accuracyMeters > 0 && (
        <div className="pointer-events-none absolute right-2 top-2 z-[400] rounded-[5px] bg-[#0B3B49]/90 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
          Precisão ±{Math.round(accuracyMeters)} m
        </div>
      )}
    </div>
  );
}
