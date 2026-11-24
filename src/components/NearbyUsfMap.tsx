import L from 'leaflet';
import { Crosshair, ExternalLink, Loader2, MapPin, Navigation } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  calculateDistanceMeters,
  formatDistance,
  MARICA_BAIRROS_GEOJSON,
  MARICA_CENTER,
  MARICA_DISTRICTS,
  MARICA_REAL_USFS,
} from '../data/maricaGeo';

function expandUsfName(raw: string): string {
  return raw.replace(/^USF\s+/i, 'Unidade de Saúde da Família ');
}

export function NearbyUsfMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [selectedDistrict, setSelectedDistrict] = useState<number>(1);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locMessage, setLocMessage] = useState<string | null>(null);
  const [focusedUsfId, setFocusedUsfId] = useState<string | null>(null);

  // Reference point: real user GPS if inside/near Maricá, else selected district center
  const referencePoint = useMemo<[number, number]>(() => {
    if (userCoords) return userCoords;
    const dist = MARICA_DISTRICTS.find((d) => d.id === selectedDistrict);
    return dist ? dist.center : MARICA_CENTER;
  }, [userCoords, selectedDistrict]);

  const rankedUsfs = useMemo(() => {
    return MARICA_REAL_USFS.map((u) => ({
      ...u,
      fullName: expandUsfName(u.name),
      distance: calculateDistanceMeters(referencePoint, u.coords),
    })).sort((a, b) => a.distance - b.distance);
  }, [referencePoint]);

  const closestThree = rankedUsfs.slice(0, 4);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: MARICA_CENTER,
      zoom: 12,
      zoomControl: false,
      minZoom: 10.5,
      maxZoom: 18,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap | Rede Municipal de Saúde de Maricá',
      maxZoom: 19,
    }).addTo(map);
    map.getPane('tilePane')?.classList.add('osm-clean');

    L.geoJSON(MARICA_BAIRROS_GEOJSON, {
      interactive: false,
      style: {
        color: '#0B3B49',
        weight: 1,
        opacity: 0.3,
        fillColor: '#0E7490',
        fillOpacity: 0.04,
      },
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const topIds = new Set(closestThree.map((u) => u.id));

    // User / reference location pin
    if (userCoords) {
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;border-radius:999px;background:#0E7490;border:3px solid #FFFFFF;box-shadow:0 0 0 7px rgba(14,116,144,0.28);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker(userCoords, { icon: userIcon, zIndexOffset: 900 })
        .bindTooltip('Sua localização', { direction: 'top', offset: [0, -12], className: 'bairro-tip' })
        .addTo(layer);
    }

    // Plot all 29 Unidades de Saúde da Família
    rankedUsfs.forEach((u) => {
      const isTop = topIds.has(u.id);
      const isFocused = focusedUsfId === u.id;
      const size = isFocused ? 34 : isTop ? 28 : 20;
      const bg = isFocused ? '#D93829' : isTop ? '#D93829' : '#0B3B49';
      const border = isFocused ? '#E89B0C' : '#FFFFFF';

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:7px;background:${bg};border:2.5px solid ${border};box-shadow:0 3px 10px rgba(11,59,73,0.3);display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-weight:900;font-size:${isTop ? '16px' : '12px'};line-height:1;">+</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker(u.coords, {
        icon,
        zIndexOffset: isFocused ? 950 : isTop ? 500 : 100,
      });

      marker.bindPopup(
        `<div style="padding:12px 14px;min-width:220px;">
          <div style="font-size:11px;font-weight:700;color:#D93829;">Atendimento presencial gratuito</div>
          <div style="font-size:14px;font-weight:800;color:#0B3B49;margin-top:2px;">${u.fullName}</div>
          <div style="font-size:12px;color:#52646D;margin-top:4px;">${u.address || 'Consulte o endereço na recepção municipal'}</div>
          <div style="font-size:12px;font-weight:700;color:#156F48;margin-top:6px;">Distância aproximada: ${formatDistance(u.distance)}</div>
        </div>`
      );

      marker.on('click', () => setFocusedUsfId(u.id));
      marker.addTo(layer);

      if (isTop && userCoords && u.distance < 35000) {
        L.polyline([userCoords, u.coords], {
          color: '#0E7490',
          weight: 2,
          dashArray: '5 5',
          opacity: 0.7,
        }).addTo(layer);
      }
    });

    if (focusedUsfId) {
      const target = rankedUsfs.find((u) => u.id === focusedUsfId);
      if (target) {
        map.flyTo(target.coords, 15, { duration: 0.65 });
      }
    } else {
      const pts: [number, number][] = closestThree.map((u) => u.coords);
      if (userCoords && closestThree[0].distance < 35000) {
        pts.push(userCoords);
      }
      if (pts.length > 0) {
        map.fitBounds(L.latLngBounds(pts).pad(0.35), { maxZoom: 14, animate: true });
      }
    }
  }, [rankedUsfs, closestThree, userCoords, focusedUsfId]);

  const applyUsfPosition = (pos: GeolocationPosition) => {
    const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
    const distToMarica = calculateDistanceMeters(MARICA_CENTER, coords);
    setUserCoords(coords);
    setLocating(false);
    if (distToMarica > 28000) {
      setLocMessage(
        `Localização obtida (${formatDistance(distToMarica)} do Centro de Maricá). Mostrando as Unidades de Saúde da Família mais próximas da sua posição.`
      );
    } else {
      setLocMessage(
        'Localização encontrada. Veja abaixo as Unidades de Saúde da Família mais perto de você.'
      );
    }
  };

  const handleUsfGeoError = (err: GeolocationPositionError) => {
    setLocating(false);
    if (err.code === err.PERMISSION_DENIED) {
      setLocMessage(
        'Permissão de localização bloqueada no navegador. Libere o acesso ou selecione seu distrito ao lado.'
      );
    } else {
      setLocMessage(
        'Não foi possível obter o GPS agora. Selecione seu distrito ao lado para ver as unidades mais próximas.'
      );
    }
  };

  const handleFindNearMe = () => {
    setLocMessage(null);
    setFocusedUsfId(null);
    if (!navigator.geolocation) {
      setLocMessage('Seu navegador não permite localização automática. Selecione seu distrito ao lado.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      applyUsfPosition,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          handleUsfGeoError(err);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          applyUsfPosition,
          handleUsfGeoError,
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  };

  return (
    <div className="space-y-5">
      {/* Primary CTA + District Fallback */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleFindNearMe}
          disabled={locating}
          className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-[8px] bg-[#D93829] px-6 py-3.5 text-sm font-extrabold text-white transition-all hover:bg-[#B52B1E] active:scale-[0.98] cursor-pointer sm:text-base"
        >
          {locating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Crosshair className="h-5 w-5 text-[#E89B0C]" />
          )}
          {locating
            ? 'Localizando unidades próximas...'
            : 'Unidade de Saúde da Família perto de mim'}
        </button>

        <div className="flex flex-wrap gap-1.5">
          {MARICA_DISTRICTS.map((d) => {
            const active = !userCoords && selectedDistrict === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setUserCoords(null);
                  setFocusedUsfId(null);
                  setLocMessage(null);
                  setSelectedDistrict(d.id);
                }}
                className={`min-h-[42px] rounded-[6px] px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer sm:text-sm ${
                  active
                    ? 'bg-[#0B3B49] text-white'
                    : 'border border-[#DCE3E8] bg-white text-[#52646D] hover:border-[#0B3B49]/40 hover:text-[#0B3B49]'
                }`}
              >
                {d.shortName}
              </button>
            );
          })}
        </div>
      </div>

      {locMessage && (
        <div className="rounded-[8px] border border-[#0E7490]/30 bg-[#EDF7FA] px-4 py-3 text-sm font-medium text-[#0B3B49]">
          {locMessage}
        </div>
      )}

      {/* Map + Closest Units Cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="isolate relative h-[360px] w-full overflow-hidden rounded-[10px] border border-[#DCE3E8] bg-[#D9E8EE] lg:h-[430px]">
          <div ref={containerRef} className="h-full w-full" />
          <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-[6px] border border-[#DCE3E8] bg-white px-3 py-1.5 text-xs font-bold text-[#0B3B49] shadow-sm">
            29 Unidades de Saúde da Família em Maricá
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {closestThree.map((u, idx) => {
            const isFocused = focusedUsfId === u.id;
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${u.coords[0]},${u.coords[1]}`;
            return (
              <div
                key={u.id}
                onClick={() => setFocusedUsfId(u.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setFocusedUsfId(u.id);
                  }
                }}
                className={`rounded-[10px] border p-4 text-left transition-all cursor-pointer ${
                  isFocused
                    ? 'border-[#D93829] bg-[#FFF8F7] shadow-sm'
                    : 'border-[#DCE3E8] bg-white hover:border-[#0B3B49]/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#D93829] text-sm font-extrabold text-white">
                      +
                    </span>
                    <div>
                      <div className="font-display text-sm font-extrabold text-[#0B3B49] sm:text-base">
                        {u.fullName}
                      </div>
                      <p className="mt-0.5 flex items-start gap-1 text-xs text-[#52646D] sm:text-sm">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0E7490]" />
                        {u.address && u.address !== 'não localizada'
                          ? u.address
                          : 'Rede Municipal de Saúde de Maricá'}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-[4px] bg-[#EDF7FA] px-2.5 py-1 text-xs font-bold text-[#0E7490] tabular-nums">
                    {idx === 0 && userCoords ? 'Mais perto' : formatDistance(u.distance)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[#DCE3E8] pt-2.5 text-xs">
                  <span className="font-semibold text-[#156F48]">Segunda a sexta, 8h às 17h</span>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 font-bold text-[#0B3B49] hover:text-[#D93829] hover:underline"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Traçar rota
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
