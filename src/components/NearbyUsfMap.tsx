import L from 'leaflet';
import {
  Bike,
  Crosshair,
  ExternalLink,
  GraduationCap,
  HeartPulse,
  Loader2,
  MapPin,
  Navigation,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MARICA_CRAS_UNITS } from '../data/maricaCatalog';
import {
  calculateDistanceMeters,
  expandUsfName,
  formatDistance,
  MARICA_BAIRROS_GEOJSON,
  MARICA_CENTER,
  MARICA_DISTRICTS,
  MARICA_REAL_USFS,
  MARICA_SCHOOL_POINTS,
  MARICA_VERMELHINHAS,
} from '../data/maricaGeo';

type EquipmentCategory = 'ALL' | 'SAUDE' | 'CRAS' | 'ESCOLA' | 'VERMELHINHA';

interface EquipmentPoint {
  id: string;
  category: Exclude<EquipmentCategory, 'ALL'>;
  categoryLabel: string;
  name: string;
  address: string;
  extraInfo: string;
  coords: [number, number];
}

const ALL_EQUIPMENTS: EquipmentPoint[] = [
  ...MARICA_REAL_USFS.map((u) => ({
    id: u.id,
    category: 'SAUDE' as const,
    categoryLabel: 'Saúde (USF)',
    name: expandUsfName(u.name),
    address:
      u.address && u.address !== 'não localizada'
        ? u.address
        : 'Rede Municipal de Saúde de Maricá',
    extraInfo: 'Segunda a sexta, 8h às 17h',
    coords: u.coords,
  })),
  ...MARICA_CRAS_UNITS.map((c) => ({
    id: c.id,
    category: 'CRAS' as const,
    categoryLabel: 'CRAS',
    name: c.name,
    address: c.address,
    extraInfo: `Tel.: ${c.phone} (CadÚnico e assistência)`,
    coords: c.coords,
  })),
  ...MARICA_SCHOOL_POINTS.map((s) => ({
    id: s.id,
    category: 'ESCOLA' as const,
    categoryLabel: 'Rede municipal de ensino',
    name: s.name,
    address: 'Rede municipal de ensino de Maricá',
    extraInfo: 'Localização no mapa',
    coords: s.coords,
  })),
  ...MARICA_VERMELHINHAS.map((v) => ({
    id: v.id,
    category: 'VERMELHINHA' as const,
    categoryLabel: v.isKids ? 'Vermelhinha Infantil' : 'Vermelhinha',
    name: `Estação ${v.number} — ${v.name}`,
    address: v.address,
    extraInfo: `${v.docks} vagas gratuitas (${v.isKids ? 'bicicletas infantis' : 'bicicletas adulto'})`,
    coords: v.coords,
  })),
];

const CATEGORY_STYLE: Record<
  Exclude<EquipmentCategory, 'ALL'>,
  { bg: string; glyph: string; badgeCls: string; text: string }
> = {
  SAUDE: {
    bg: '#D93829',
    glyph: '+',
    badgeCls: 'bg-[#FDE8E6] text-[#B52B1E]',
    text: 'Saúde',
  },
  CRAS: {
    bg: '#0E7490',
    glyph: 'C',
    badgeCls: 'bg-[#EDF7FA] text-[#0E7490]',
    text: 'CRAS',
  },
  ESCOLA: {
    bg: '#0B3B49',
    glyph: 'E',
    badgeCls: 'bg-[#EEF3F6] text-[#0B3B49]',
    text: 'Escola',
  },
  VERMELHINHA: {
    bg: '#B52B1E',
    glyph: 'V',
    badgeCls: 'bg-[#FEF3DC] text-[#8A5600]',
    text: 'Vermelhinha',
  },
};

export function NearbyUsfMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [category, setCategory] = useState<EquipmentCategory>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<number>(1);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locMessage, setLocMessage] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const referencePoint = useMemo<[number, number]>(() => {
    if (userCoords) return userCoords;
    const dist = MARICA_DISTRICTS.find((d) => d.id === selectedDistrict);
    return dist ? dist.center : MARICA_CENTER;
  }, [userCoords, selectedDistrict]);

  const rankedEquipments = useMemo(() => {
    return ALL_EQUIPMENTS.filter((e) => category === 'ALL' || e.category === category)
      .map((e) => ({
        ...e,
        distance: calculateDistanceMeters(referencePoint, e.coords),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [category, referencePoint]);

  const closestFive = rankedEquipments.slice(0, 5);

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
      attribution: '&copy; OpenStreetMap | Equipamentos Públicos de Maricá',
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
    const topIds = new Set(closestFive.map((u) => u.id));

    if (userCoords) {
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;border-radius:999px;background:#0E7490;border:3px solid #FFFFFF;box-shadow:0 0 0 7px rgba(14,116,144,0.28);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker(userCoords, { icon: userIcon, zIndexOffset: 950 })
        .bindTooltip('Sua localização', { direction: 'top', offset: [0, -12], className: 'bairro-tip' })
        .addTo(layer);
    }

    rankedEquipments.forEach((item) => {
      const isTop = topIds.has(item.id);
      const isFocused = focusedId === item.id;
      const st = CATEGORY_STYLE[item.category];
      const size = isFocused ? 34 : isTop ? 27 : 18;
      const border = isFocused ? '#E89B0C' : '#FFFFFF';
      const radius = item.category === 'VERMELHINHA' ? '999px' : '6px';

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:${radius};background:${st.bg};border:2px solid ${border};box-shadow:0 2px 8px rgba(11,59,73,0.3);display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-weight:900;font-size:${isTop ? '13px' : '10px'};line-height:1;">${st.glyph}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker(item.coords, {
        icon,
        zIndexOffset: isFocused ? 960 : isTop ? 500 : 100,
      });

      marker.bindPopup(
        `<div style="padding:11px 13px;min-width:220px;">
          <div style="font-size:11px;font-weight:700;color:${st.bg};">${item.categoryLabel}</div>
          <div style="font-size:13px;font-weight:800;color:#0B3B49;margin-top:2px;">${item.name}</div>
          <div style="font-size:11px;color:#52646D;margin-top:3px;">${item.address}</div>
          <div style="font-size:11px;color:#11222B;margin-top:3px;">${item.extraInfo}</div>
          <div style="font-size:12px;font-weight:700;color:#156F48;margin-top:5px;">Distância aproximada: ${formatDistance(item.distance)}</div>
        </div>`
      );

      marker.on('click', () => setFocusedId(item.id));
      marker.addTo(layer);

      if (isTop && userCoords && item.distance < 35000) {
        L.polyline([userCoords, item.coords], {
          color: '#0E7490',
          weight: 2,
          dashArray: '5 5',
          opacity: 0.7,
        }).addTo(layer);
      }
    });

    if (focusedId) {
      const target = rankedEquipments.find((u) => u.id === focusedId);
      if (target) map.flyTo(target.coords, 15.5, { duration: 0.6 });
    } else {
      const pts: [number, number][] = closestFive.map((u) => u.coords);
      if (userCoords && closestFive[0] && closestFive[0].distance < 35000) pts.push(userCoords);
      if (pts.length > 0) {
        map.fitBounds(L.latLngBounds(pts).pad(0.35), { maxZoom: 14.5, animate: true });
      }
    }
  }, [rankedEquipments, closestFive, userCoords, focusedId]);

  const applyPos = (pos: GeolocationPosition) => {
    const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
    const distToMarica = calculateDistanceMeters(MARICA_CENTER, coords);
    setUserCoords(coords);
    setLocating(false);
    if (distToMarica > 28000) {
      setLocMessage(
        `Localização obtida (${formatDistance(distToMarica)} do Centro de Maricá). Mostrando os equipamentos públicos mais próximos da sua posição.`
      );
    } else {
      setLocMessage('Localização encontrada. Veja abaixo os equipamentos públicos mais perto de você.');
    }
  };

  const handleGeoErr = (err: GeolocationPositionError) => {
    setLocating(false);
    if (err.code === err.PERMISSION_DENIED) {
      setLocMessage('Permissão de localização bloqueada no navegador. Libere o acesso ou escolha seu distrito.');
    } else {
      setLocMessage('Não foi possível obter o GPS agora. Selecione seu distrito para listar os equipamentos.');
    }
  };

  const handleFindNearMe = () => {
    setLocMessage(null);
    setFocusedId(null);
    if (!navigator.geolocation) {
      setLocMessage('Seu navegador não permite localização automática. Selecione seu distrito.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      applyPos,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          handleGeoErr(err);
          return;
        }
        navigator.geolocation.getCurrentPosition(applyPos, handleGeoErr, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  };

  const categoryTabs: {
    id: EquipmentCategory;
    label: string;
    count: number;
    icon: typeof HeartPulse;
  }[] = [
    { id: 'ALL', label: 'Todos', count: ALL_EQUIPMENTS.length, icon: MapPin },
    { id: 'SAUDE', label: 'Unidades de Saúde', count: MARICA_REAL_USFS.length, icon: HeartPulse },
    { id: 'CRAS', label: 'CRAS', count: MARICA_CRAS_UNITS.length, icon: Users },
    { id: 'ESCOLA', label: 'Escolas', count: MARICA_SCHOOL_POINTS.length, icon: GraduationCap },
    { id: 'VERMELHINHA', label: 'Vermelhinhas', count: MARICA_VERMELHINHAS.length, icon: Bike },
  ];

  return (
    <div className="space-y-4">
      {/* Primary GPS CTA + District Selector */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <button
          type="button"
          onClick={handleFindNearMe}
          disabled={locating}
          className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-[8px] bg-[#D93829] px-6 py-3 text-sm font-extrabold text-white transition-all hover:bg-[#B52B1E] active:scale-[0.98] cursor-pointer sm:text-base"
        >
          {locating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Crosshair className="h-5 w-5 text-[#E89B0C]" />
          )}
          {locating ? 'Localizando equipamentos próximos...' : 'Equipamentos públicos perto de mim'}
        </button>

        <div className="no-scrollbar flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5">
          {MARICA_DISTRICTS.map((d) => {
            const active = !userCoords && selectedDistrict === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setUserCoords(null);
                  setFocusedId(null);
                  setLocMessage(null);
                  setSelectedDistrict(d.id);
                }}
                className={`min-h-[42px] shrink-0 rounded-[7px] px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer sm:text-sm ${
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

      {/* Category Filter Strip */}
      <div className="no-scrollbar flex flex-nowrap gap-2 overflow-x-auto pb-1">
        {categoryTabs.map((tab) => {
          const Icon = tab.icon;
          const active = category === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setFocusedId(null);
                setCategory(tab.id);
              }}
              className={`inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-[8px] border px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer sm:text-sm ${
                active
                  ? 'border-[#0B3B49] bg-[#0B3B49] text-white'
                  : 'border-[#DCE3E8] bg-[#F8FAFB] text-[#0B3B49] hover:bg-white'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-[#E89B0C]' : 'text-[#0E7490]'}`} />
              <span>{tab.label}</span>
              <span
                className={`rounded-[4px] px-1.5 py-0.5 text-[11px] tabular-nums ${
                  active ? 'bg-white/15 text-white' : 'bg-[#EEF3F6] text-[#52646D]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {locMessage && (
        <div className="rounded-[8px] border border-[#0E7490]/30 bg-[#EDF7FA] px-4 py-3 text-sm font-medium text-[#0B3B49]">
          {locMessage}
        </div>
      )}

      {/* Map + 5 Closest Equipment Cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="isolate relative h-[380px] w-full overflow-hidden rounded-[10px] border border-[#DCE3E8] bg-[#D9E8EE] lg:h-[480px]">
          <div ref={containerRef} className="h-full w-full" />
          <div className="pointer-events-none absolute left-3 top-3 z-[400] rounded-[6px] border border-[#DCE3E8] bg-white px-3 py-1.5 text-xs font-bold text-[#0B3B49] shadow-sm">
            {rankedEquipments.length} equipamentos públicos exibidos
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {closestFive.map((item, idx) => {
            const isFocused = focusedId === item.id;
            const st = CATEGORY_STYLE[item.category];
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${item.coords[0]},${item.coords[1]}`;
            return (
              <div
                key={item.id}
                onClick={() => setFocusedId(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setFocusedId(item.id);
                  }
                }}
                className={`rounded-[10px] border p-3.5 text-left transition-all cursor-pointer ${
                  isFocused
                    ? 'border-[#D93829] bg-[#FFF8F7] shadow-sm'
                    : 'border-[#DCE3E8] bg-white hover:border-[#0B3B49]/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-xs font-extrabold text-white"
                      style={{ backgroundColor: st.bg }}
                    >
                      {st.glyph}
                    </span>
                    <div className="min-w-0">
                      <span className={`inline-block rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold ${st.badgeCls}`}>
                        {item.categoryLabel}
                      </span>
                      <div className="font-display mt-0.5 text-sm font-extrabold text-[#0B3B49]">
                        {item.name}
                      </div>
                      <p className="mt-0.5 flex items-start gap-1 text-xs text-[#52646D]">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0E7490]" />
                        {item.address}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-[4px] bg-[#EDF7FA] px-2 py-1 text-xs font-bold text-[#0E7490] tabular-nums">
                    {idx === 0 && userCoords ? 'Mais perto' : formatDistance(item.distance)}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-[#DCE3E8] pt-2 text-xs">
                  <span className="font-semibold text-[#156F48]">{item.extraInfo}</span>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex shrink-0 items-center gap-1 font-bold text-[#0B3B49] hover:text-[#D93829] hover:underline"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Rota
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
