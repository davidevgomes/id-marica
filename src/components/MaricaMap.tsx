import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { Layers, Map as MapIcon, RotateCcw, Satellite, X } from 'lucide-react';
import {
  LayerBairrosIcon,
  LayerHealthIcon,
  LayerHeatIcon,
  LayerSchoolIcon,
  LayerTriangulationIcon,
} from './CivicIcons';
import {
  calculateDistanceMeters,
  DISTRICT_BY_ID,
  FACILITY_BY_ID,
  formatDistance,
  MARICA_BAIRROS_GEOJSON,
  MARICA_CENTER,
  MARICA_DEFAULT_ZOOM,
  MARICA_DISTRICTS,
  MARICA_REAL_USFS,
  PUBLIC_FACILITIES,
} from '../data/maricaGeo';
import { calculateFamilyMetrics, maskTitularName } from '../engine/rulesEngine';
import type { DistrictId, FamilyRecord } from '../types/integra';

interface MaricaMapProps {
  families: FamilyRecord[];
  selectedFamilyId: string | null;
  onSelectFamily: (id: string) => void;
  selectedDistrict: DistrictId | 'ALL';
  onSelectDistrict: (district: DistrictId | 'ALL') => void;
  telemetry: {
    totalFamilies: number;
    totalClt: number;
    proofPct: string;
    annualSavingsMil: string;
    activeSearchCount: number;
  };
}

function getFamilyPinStyle(family: FamilyRecord) {
  if (family.sigiloEspacial) {
    return { color: '#7B245A', ring: 'rgba(123, 36, 90, 0.28)', label: 'Sigilo LGPD' };
  }
  if (family.status === 'SUSPENSO_PREVENTIVO' || family.status === 'CANCELADO') {
    return { color: '#C8102E', ring: 'rgba(200, 16, 46, 0.30)', label: 'Suspenso / Alerta' };
  }
  if (family.status === 'ALERTA_D15') {
    return { color: '#D99100', ring: 'rgba(217, 145, 0, 0.30)', label: 'Prova de vida D-15' };
  }
  if (family.programs.includes('MUMBUCA_TRABALHO')) {
    return { color: '#0F5C9E', ring: 'rgba(15, 92, 158, 0.28)', label: 'Mumbuca Trabalho' };
  }
  return { color: '#156F48', ring: 'rgba(21, 111, 72, 0.28)', label: 'Regular (RBC)' };
}

function titleCaseBairro(raw: string): string {
  const lower = raw.toLowerCase();
  const small = new Set(['de', 'da', 'do', 'das', 'dos']);
  return lower
    .split(' ')
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export function MaricaMap({
  families,
  selectedFamilyId,
  onSelectFamily,
  selectedDistrict,
  onSelectDistrict,
  telemetry,
}: MaricaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const fullBoundsRef = useRef<L.LatLngBounds | null>(null);

  const bairrosLayerRef = useRef<L.LayerGroup | null>(null);
  const anchorsLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);
  const triangulationLayerRef = useRef<L.LayerGroup | null>(null);
  const facilitiesLayerRef = useRef<L.LayerGroup | null>(null);
  const familiesLayerRef = useRef<L.LayerGroup | null>(null);
  const layersPopoverRef = useRef<HTMLDivElement | null>(null);

  const [basemap, setBasemap] = useState<'osm' | 'satellite'>('satellite');
  const [layersOpen, setLayersOpen] = useState(false);
  const [showBairros, setShowBairros] = useState(true);
  const [showUsfs, setShowUsfs] = useState(false);
  const [showSchools, setShowSchools] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showTriangulation, setShowTriangulation] = useState(true);

  useEffect(() => {
    if (!layersOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLayersOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (layersPopoverRef.current && !layersPopoverRef.current.contains(e.target as Node)) {
        setLayersOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [layersOpen]);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: MARICA_CENTER,
      zoom: MARICA_DEFAULT_ZOOM,
      zoomSnap: 0.25,
      zoomControl: false,
      minZoom: 10.5,
      maxZoom: 18,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    bairrosLayerRef.current = L.layerGroup().addTo(map);
    heatLayerRef.current = L.layerGroup().addTo(map);
    triangulationLayerRef.current = L.layerGroup().addTo(map);
    facilitiesLayerRef.current = L.layerGroup().addTo(map);
    anchorsLayerRef.current = L.layerGroup().addTo(map);
    familiesLayerRef.current = L.layerGroup().addTo(map);

    const geoBounds = L.geoJSON(MARICA_BAIRROS_GEOJSON).getBounds();
    fullBoundsRef.current = geoBounds;
    map.fitBounds(geoBounds, { paddingTopLeft: [24, 64], paddingBottomRight: [24, 86] });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch Basemap (Mapa OSM / Satélite Esri)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
    }

    const tilePane = map.getPane('tilePane');
    if (basemap === 'osm') {
      baseLayerRef.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap | Base IBGE 2022 Maricá',
        maxZoom: 19,
      }).addTo(map);
      tilePane?.classList.add('osm-clean');
    } else {
      baseLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri Satélite | Base IBGE 2022 Maricá',
          maxZoom: 19,
        }
      ).addTo(map);
      tilePane?.classList.remove('osm-clean');
    }
  }, [basemap]);

  // Smooth flyTo when district filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedDistrict === 'ALL') {
      if (fullBoundsRef.current) {
        map.flyToBounds(fullBoundsRef.current, {
          paddingTopLeft: [24, 64],
          paddingBottomRight: [24, 86],
          duration: 0.7,
        });
      }
      return;
    }

    const districtFeatures = {
      type: 'FeatureCollection' as const,
      features: MARICA_BAIRROS_GEOJSON.features.filter(
        (f) => f.properties.districtId === selectedDistrict
      ),
    };
    const bounds = L.geoJSON(districtFeatures).getBounds();
    if (bounds.isValid()) {
      map.flyToBounds(bounds, {
        paddingTopLeft: [28, 64],
        paddingBottomRight: [28, 86],
        duration: 0.7,
      });
    }
  }, [selectedDistrict]);

  // Render Exact Official 50 Neighborhoods GeoJSON grouped by 5 Districts
  useEffect(() => {
    const layer = bairrosLayerRef.current;
    const anchors = anchorsLayerRef.current;
    if (!layer || !anchors) return;
    layer.clearLayers();
    anchors.clearLayers();
    if (!showBairros) return;

    const geoLayer = L.geoJSON(MARICA_BAIRROS_GEOJSON, {
      style: (feature) => {
        const dId = (feature?.properties?.districtId ?? 1) as DistrictId;
        const dist = DISTRICT_BY_ID[dId];
        const isFocused = selectedDistrict === dId;
        const isDimmed = selectedDistrict !== 'ALL' && !isFocused;
        return {
          color: basemap === 'satellite' ? '#FFFFFF' : dist.color,
          weight: isFocused ? 1.8 : 1.1,
          opacity: isDimmed ? 0.28 : 0.85,
          fillColor: dist.fillColor,
          fillOpacity: isFocused ? 0.34 : isDimmed ? 0.05 : basemap === 'satellite' ? 0.24 : 0.2,
        };
      },
      onEachFeature: (feature, poly) => {
        const dId = feature.properties.districtId as DistrictId;
        const dist = DISTRICT_BY_ID[dId];
        const nomeBairro = titleCaseBairro(feature.properties.bairro);

        poly.bindTooltip(
          `<div><strong>${nomeBairro}</strong></div><div style="opacity:0.85;font-size:10px;">${dist.name}</div>`,
          { sticky: true, className: 'bairro-tip' }
        );

        poly.on('mouseover', () => {
          (poly as L.Path).setStyle({ weight: 2.5, fillOpacity: 0.42 });
        });
        poly.on('mouseout', () => {
          geoLayer.resetStyle(poly);
        });
        poly.on('click', () => {
          onSelectDistrict(selectedDistrict === dId ? 'ALL' : dId);
        });
      },
    });

    geoLayer.addTo(layer);

    // Clean anchored district labels at non-overlapping positions
    MARICA_DISTRICTS.forEach((d) => {
      if (selectedDistrict !== 'ALL' && selectedDistrict !== d.id) return;
      L.marker(d.center, {
        interactive: false,
        icon: L.divIcon({ className: '', html: '', iconSize: [0, 0] }),
      })
        .bindTooltip(`${d.id}º ${d.shortName}`, {
          permanent: true,
          direction: 'center',
          className: 'district-anchor',
        })
        .addTo(anchors);
    });
  }, [showBairros, selectedDistrict, basemap, onSelectDistrict]);

  // Render Vulnerability Focus Circles
  useEffect(() => {
    const layer = heatLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showHeatmap) return;

    families.forEach((f) => {
      if (f.sigiloEspacial) return;
      const isAlert =
        f.needsActiveSearch || f.status === 'SUSPENSO_PREVENTIVO' || f.status === 'ALERTA_D15';
      L.circle(f.coords, {
        radius: isAlert ? 1250 : 750,
        stroke: false,
        fillColor: isAlert ? '#C8102E' : '#E59A00',
        fillOpacity: isAlert ? 0.24 : 0.12,
        interactive: false,
      }).addTo(layer);
    });
  }, [showHeatmap, families]);

  // Render All 29 Real Maricá USFs + Municipal Schools
  useEffect(() => {
    const layer = facilitiesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (showUsfs) {
      MARICA_REAL_USFS.forEach((u) => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:22px;height:22px;border-radius:4px;background:#0F5C9E;border:2px solid #fff;box-shadow:0 2px 6px rgba(12,27,51,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;line-height:1;">+</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        L.marker(u.coords, { icon })
          .bindPopup(
            `<div style="padding:10px 12px;min-width:210px;">
              <div style="font-size:11px;font-weight:700;color:#0F5C9E;">Rede Municipal de Saúde (e-SUS)</div>
              <div style="font-size:13px;font-weight:800;color:#0C1B33;margin-top:2px;">${u.name.replace(/^USF\s+/i, 'Unidade de Saúde da Família ')}</div>
              <div style="font-size:11px;color:#526071;margin-top:2px;">${u.address}</div>
            </div>`
          )
          .addTo(layer);
      });
    }

    if (showSchools) {
      PUBLIC_FACILITIES.filter((f) => f.type === 'ESCOLA').forEach((fac) => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:22px;height:22px;border-radius:4px;background:#0C1B33;border:2px solid #F2A900;box-shadow:0 2px 6px rgba(12,27,51,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:10px;">E</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        L.marker(fac.coords, { icon })
          .bindPopup(
            `<div style="padding:10px 12px;min-width:180px;">
              <div style="font-size:11px;font-weight:700;color:#0C1B33;">e-Cidade Educação</div>
              <div style="font-size:13px;font-weight:800;color:#0C1B33;margin-top:2px;">${fac.name}</div>
              <div style="font-size:11px;color:#526071;margin-top:2px;">${fac.neighborhood}</div>
            </div>`
          )
          .addTo(layer);
      });
    }
  }, [showUsfs, showSchools]);

  // Render Triangulation Lines & 100m Geofence for Selected Family
  useEffect(() => {
    const layer = triangulationLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showTriangulation || !selectedFamilyId) return;

    const fam = families.find((f) => f.id === selectedFamilyId);
    if (!fam || fam.sigiloEspacial) return;

    L.circle(fam.coords, {
      radius: 100,
      color: '#0C1B33',
      weight: 2,
      fillColor: '#F2A900',
      fillOpacity: 0.22,
    }).addTo(layer);

    const ubs = FACILITY_BY_ID[fam.crossCheck.ubsId];
    if (ubs) {
      const dist = calculateDistanceMeters(fam.coords, ubs.coords);
      L.polyline([fam.coords, ubs.coords], {
        color: '#0F5C9E',
        weight: 2.5,
        dashArray: '6 5',
      })
        .bindTooltip(`e-SUS: ${ubs.name} (${formatDistance(dist)})`, { sticky: true })
        .addTo(layer);

      L.marker(ubs.coords, {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:22px;height:22px;border-radius:4px;background:#0F5C9E;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;">+</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      })
        .bindTooltip(`${ubs.name} (${formatDistance(dist)})`)
        .addTo(layer);
    }

    if (fam.crossCheck.schoolId) {
      const school = FACILITY_BY_ID[fam.crossCheck.schoolId];
      if (school) {
        const dist = calculateDistanceMeters(fam.coords, school.coords);
        L.polyline([fam.coords, school.coords], {
          color: '#0C1B33',
          weight: 2.5,
          dashArray: '4 6',
        })
          .bindTooltip(`e-Cidade: ${school.name} (${formatDistance(dist)})`, { sticky: true })
          .addTo(layer);

        L.marker(school.coords, {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:22px;height:22px;border-radius:4px;background:#0C1B33;border:2px solid #F2A900;box-shadow:0 2px 8px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:10px;">E</div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
        })
          .bindTooltip(`${school.name} (${formatDistance(dist)})`)
          .addTo(layer);
      }
    }
  }, [showTriangulation, selectedFamilyId, families]);

  // Render Family Pins
  useEffect(() => {
    const layer = familiesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    families.forEach((fam) => {
      const style = getFamilyPinStyle(fam);
      const isSelected = fam.id === selectedFamilyId;
      const metrics = calculateFamilyMetrics(fam);
      const district = DISTRICT_BY_ID[fam.districtId];

      const displayCoords: [number, number] = fam.sigiloEspacial
        ? [district.center[0] + 0.006, district.center[1] - 0.005]
        : fam.coords;

      if (fam.sigiloEspacial) {
        L.circle(displayCoords, {
          radius: 950,
          color: '#7B245A',
          weight: 1.75,
          dashArray: '5 5',
          fillColor: '#7B245A',
          fillOpacity: 0.14,
          interactive: false,
        }).addTo(layer);
      }

      const size = isSelected ? 32 : 22;
      const innerMark = fam.sigiloEspacial
        ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
        : `${fam.members.length}`;

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${style.color};border:2.5px solid #fff;box-shadow:0 0 0 ${isSelected ? '6px' : '3px'} ${style.ring}, 0 4px 10px rgba(12,27,51,0.32);display:flex;align-items:center;justify-content:center;color:#fff;font-size:${isSelected ? '12px' : '10px'};font-weight:800;">${innerMark}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker(displayCoords, {
        icon,
        zIndexOffset: isSelected ? 900 : 100,
      });

      const displayName = maskTitularName(fam.titularName, fam.sigiloEspacial);
      marker.bindTooltip(
        `<div style="font-weight:700;font-size:12px;">${displayName}</div>
         <div style="font-size:11px;color:#CBD5E1;">${district.shortName}, M$ ${metrics.totalMumbucasMonthly}/mês (${style.label})</div>`,
        { direction: 'top', offset: [0, -14], className: 'bairro-tip' }
      );

      marker.on('click', () => onSelectFamily(fam.id));
      marker.addTo(layer);
    });
  }, [families, selectedFamilyId, onSelectFamily]);

  const handleResetView = () => {
    onSelectDistrict('ALL');
    if (fullBoundsRef.current) {
      mapRef.current?.flyToBounds(fullBoundsRef.current, {
        paddingTopLeft: [24, 64],
        paddingBottomRight: [24, 86],
        duration: 0.7,
      });
    }
  };

  const activeLayersCount =
    (showBairros ? 1 : 0) +
    (showTriangulation ? 1 : 0) +
    (showUsfs ? 1 : 0) +
    (showSchools ? 1 : 0) +
    (showHeatmap ? 1 : 0);

  return (
    <div className="isolate relative h-[480px] w-full bg-[#0E2832] sm:h-[540px] lg:h-[calc(100dvh-62px)]">
      <div ref={containerRef} className="h-full w-full" />

      {/* Top Floating Bar: Horizontal-Scroll Districts (Mobile Safe) + Basemap & Layers Controls */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-[400] flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between">
        {/* Single-row scrollable district filter strip */}
        <div className="pointer-events-auto no-scrollbar flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-[10px] border border-[#DCE3E8] bg-white p-1 shadow-md">
          <button
            type="button"
            onClick={handleResetView}
            className={`shrink-0 rounded-[7px] px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              selectedDistrict === 'ALL'
                ? 'bg-[#0B3B49] text-white'
                : 'text-[#52646D] hover:bg-[#F4F6F8] hover:text-[#0B3B49]'
            }`}
          >
            Toda Maricá
          </button>
          {MARICA_DISTRICTS.map((d) => {
            const active = selectedDistrict === d.id;
            return (
              <button
                type="button"
                key={d.id}
                onClick={() => onSelectDistrict(active ? 'ALL' : d.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  active ? 'text-white' : 'text-[#11222B] hover:bg-[#F4F6F8]'
                }`}
                style={active ? { backgroundColor: d.color } : undefined}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: active ? '#FFFFFF' : d.color }}
                />
                {d.shortName}
              </button>
            );
          })}
        </div>

        {/* Basemap Switch + Multi-Tone Layers Popover (Anchored Left on Mobile, Right on Desktop) */}
        <div
          ref={layersPopoverRef}
          className="pointer-events-auto relative flex shrink-0 items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => setBasemap((b) => (b === 'osm' ? 'satellite' : 'osm'))}
            aria-label={basemap === 'satellite' ? 'Alternar para mapa de ruas' : 'Alternar para imagem de satélite'}
            className="flex min-h-[38px] items-center gap-1.5 rounded-[9px] border border-white/20 bg-[#0B3B49] px-3 py-1.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-[#072933] cursor-pointer"
          >
            {basemap === 'satellite' ? (
              <>
                <MapIcon className="h-4 w-4 text-[#E89B0C]" />
                Mapa de ruas
              </>
            ) : (
              <>
                <Satellite className="h-4 w-4 text-[#E89B0C]" />
                Satélite
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setLayersOpen((v) => !v)}
            aria-expanded={layersOpen}
            aria-controls="map-layers-popover"
            className={`flex min-h-[38px] items-center gap-1.5 rounded-[9px] border px-3 py-1.5 text-xs font-bold shadow-md transition-colors cursor-pointer ${
              layersOpen
                ? 'border-[#0B3B49] bg-[#0B3B49] text-white'
                : 'border-[#DCE3E8] bg-white text-[#0B3B49] hover:bg-[#F4F6F8]'
            }`}
          >
            <Layers className="h-4 w-4" />
            Camadas ({activeLayersCount})
          </button>

          {selectedDistrict !== 'ALL' && (
            <button
              type="button"
              onClick={handleResetView}
              aria-label="Restaurar enquadramento de Maricá"
              className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-[9px] border border-[#DCE3E8] bg-white text-[#0B3B49] shadow-md hover:bg-[#F4F6F8] cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {/* Responsive Layers Popover — zero viewport clipping on 390px mobile */}
          {layersOpen && (
            <div
              id="map-layers-popover"
              role="region"
              aria-label="Camadas cartográficas do mapa"
              className="anim-modal absolute left-0 top-11 w-[min(20rem,calc(100vw-24px))] rounded-[12px] border border-[#DCE3E8] bg-white p-2.5 shadow-2xl sm:left-auto sm:right-0"
            >
              <div className="flex items-center justify-between border-b border-[#EDF1F4] px-2 pb-2 pt-0.5">
                <div>
                  <div className="font-display text-xs font-extrabold text-[#0B3B49]">
                    Camadas do território
                  </div>
                  <div className="text-[11px] text-[#52646D]">
                    Ative dados sobre a imagem de {basemap === 'satellite' ? 'satélite' : 'ruas'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLayersOpen(false)}
                  aria-label="Fechar camadas"
                  className="rounded-[6px] p-1 text-[#52646D] hover:bg-[#F4F6F8] hover:text-[#0B3B49] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {[
                  {
                    label: '50 bairros oficiais',
                    desc: 'Delimitação dos 5 distritos (IBGE)',
                    active: showBairros,
                    toggle: () => setShowBairros((v) => !v),
                    icon: LayerBairrosIcon,
                  },
                  {
                    label: 'Triangulação domiciliar',
                    desc: 'Raio de 100 m, saúde e escola',
                    active: showTriangulation,
                    toggle: () => setShowTriangulation((v) => !v),
                    icon: LayerTriangulationIcon,
                  },
                  {
                    label: 'Unidades de Saúde (29)',
                    desc: 'Postos da rede e-SUS de Maricá',
                    active: showUsfs,
                    toggle: () => setShowUsfs((v) => !v),
                    icon: LayerHealthIcon,
                  },
                  {
                    label: 'Escolas municipais',
                    desc: 'Rede pública integrada ao e-Cidade',
                    active: showSchools,
                    toggle: () => setShowSchools((v) => !v),
                    icon: LayerSchoolIcon,
                  },
                  {
                    label: 'Foco de vulnerabilidade',
                    desc: 'Mancha de alertas e busca ativa',
                    active: showHeatmap,
                    toggle: () => setShowHeatmap((v) => !v),
                    icon: LayerHeatIcon,
                  },
                ].map((layer) => {
                  const Icon = layer.icon;
                  return (
                    <button
                      type="button"
                      key={layer.label}
                      role="switch"
                      aria-checked={layer.active}
                      onClick={layer.toggle}
                      className={`flex w-full items-center justify-between gap-2.5 rounded-[8px] px-2.5 py-2 text-left transition-colors cursor-pointer ${
                        layer.active
                          ? 'bg-[#EDF4F6] text-[#0B3B49]'
                          : 'text-[#52646D] hover:bg-[#F8FAFB]'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="shrink-0">
                          <Icon />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-[#0B3B49]">
                            {layer.label}
                          </span>
                          <span className="block truncate text-[11px] font-normal text-[#52646D]">
                            {layer.desc}
                          </span>
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${
                          layer.active ? 'bg-[#0B3B49]' : 'bg-[#CBD5DC]'
                        }`}
                      >
                        <span
                          className={`block h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
                            layer.active ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom-Left Telemetry Strip */}
      <div className="pointer-events-auto absolute bottom-3 left-3 right-14 z-[400] hidden max-w-[660px] items-center justify-between gap-4 rounded-[8px] border border-white/15 bg-[#0B3B49] px-4 py-2.5 text-white shadow-lg sm:flex">
        <div>
          <div className="font-display text-lg font-extrabold leading-none text-[#E89B0C] tabular-nums">
            {telemetry.totalFamilies.toLocaleString('pt-BR')}
          </div>
          <div className="mt-0.5 text-[11px] text-[#C2D6DC]">Famílias mapeadas</div>
        </div>
        <span className="h-7 w-px bg-white/15" />
        <div>
          <div
            key={telemetry.totalClt}
            className="anim-value-pop font-display text-lg font-extrabold leading-none text-[#E89B0C] tabular-nums"
          >
            {telemetry.totalClt.toLocaleString('pt-BR')}
          </div>
          <div className="mt-0.5 text-[11px] text-[#C2D6DC]">Mumbuca Trabalho</div>
        </div>
        <span className="h-7 w-px bg-white/15" />
        <div>
          <div className="font-display text-lg font-extrabold leading-none text-white tabular-nums">
            {telemetry.proofPct}%
          </div>
          <div className="mt-0.5 text-[11px] text-[#C2D6DC]">Prova de vida em dia</div>
        </div>
        <span className="h-7 w-px bg-white/15" />
        <div>
          <div className="font-display text-lg font-extrabold leading-none text-white tabular-nums">
            R$ {telemetry.annualSavingsMil} mi
          </div>
          <div className="mt-0.5 text-[11px] text-[#C2D6DC]">
            Saneamento anual ({telemetry.activeSearchCount} p/ CRAS)
          </div>
        </div>
      </div>
    </div>
  );
}
