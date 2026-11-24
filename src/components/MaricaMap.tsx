import L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Layers, Lock, Map as MapIcon, RotateCcw, Satellite, X } from 'lucide-react';
import { MARICA_CRAS_UNITS } from '../data/maricaCatalog';
import {
  DISTRICT_BY_ID,
  expandUsfName,
  MARICA_BAIRROS_GEOJSON,
  MARICA_CENTER,
  MARICA_DEFAULT_ZOOM,
  MARICA_DISTRICTS,
  MARICA_REAL_USFS,
  MARICA_VERMELHINHAS,
} from '../data/maricaGeo';
import {
  computeSocioeconomicSummary,
  formatCurrency,
  getPerCapitaIncome,
  normalizeSearch,
  WORK_REGIME_LABELS,
} from '../engine/analyticsEngine';
import type { BeneficiaryRecord, DistrictId } from '../types/integra';
import {
  LayerBairrosIcon,
  LayerBikeIcon,
  LayerCrasIcon,
  LayerHealthIcon,
  LayerHeatIcon,
  LayerSchoolIcon,
  LayerTriangulationIcon,
} from './CivicIcons';

export type ChoroplethMetric = 'CONCENTRACAO' | 'PER_CAPITA' | 'DESEMPREGO' | 'FORMALIZACAO';

interface MaricaMapProps {
  beneficiaries: BeneficiaryRecord[];
  selectedBeneficiaryId: string | null;
  onSelectBeneficiary: (id: string) => void;
  selectedDistrict: DistrictId | 'ALL';
  onSelectDistrict: (district: DistrictId | 'ALL') => void;
  canViewIndividualPoints: boolean;
}

function titleCaseBairro(raw: string): string {
  const lower = raw.toLowerCase();
  const small = new Set(['de', 'da', 'do', 'das', 'dos']);
  return lower
    .split(' ')
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

function getPinColor(b: BeneficiaryRecord): { bg: string; ring: string; tag: string } {
  if (b.employmentStatus === 'DESEMPREGADO') {
    return { bg: '#D93829', ring: 'rgba(217, 56, 41, 0.30)', tag: 'Desempregado' };
  }
  if (b.workRegime === 'CLT' || b.workRegime === 'ESTATUTARIO') {
    return { bg: '#156F48', ring: 'rgba(21, 111, 72, 0.30)', tag: WORK_REGIME_LABELS[b.workRegime] };
  }
  if (b.workRegime === 'MEI') {
    return { bg: '#0E7490', ring: 'rgba(14, 116, 144, 0.30)', tag: 'MEI' };
  }
  return { bg: '#E89B0C', ring: 'rgba(232, 155, 12, 0.30)', tag: WORK_REGIME_LABELS[b.workRegime] };
}

export function MaricaMap({
  beneficiaries,
  selectedBeneficiaryId,
  onSelectBeneficiary,
  selectedDistrict,
  onSelectDistrict,
  canViewIndividualPoints,
}: MaricaMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const fullBoundsRef = useRef<L.LatLngBounds | null>(null);

  const bairrosLayerRef = useRef<L.LayerGroup | null>(null);
  const anchorsLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);
  const commutingLayerRef = useRef<L.LayerGroup | null>(null);
  const usfsLayerRef = useRef<L.LayerGroup | null>(null);
  const crasLayerRef = useRef<L.LayerGroup | null>(null);
  const vermelhinhasLayerRef = useRef<L.LayerGroup | null>(null);
  const pointsLayerRef = useRef<L.LayerGroup | null>(null);
  const layersPopoverRef = useRef<HTMLDivElement | null>(null);

  const [basemap, setBasemap] = useState<'osm' | 'satellite'>('satellite');
  const [layersOpen, setLayersOpen] = useState(false);
  const [showBairros, setShowBairros] = useState(true);
  const [choroplethMetric, setChoroplethMetric] = useState<ChoroplethMetric>('CONCENTRACAO');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showIndividualPoints, setShowIndividualPoints] = useState(canViewIndividualPoints);
  const [showCommuting, setShowCommuting] = useState(false);
  const [showUsfs, setShowUsfs] = useState(false);
  const [showCras, setShowCras] = useState(false);
  const [showVermelhinhas, setShowVermelhinhas] = useState(false);

  // Sync individual points layer with RBAC permission changes
  useEffect(() => {
    setShowIndividualPoints(canViewIndividualPoints);
  }, [canViewIndividualPoints]);

  useEffect(() => {
    if (!layersOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLayersOpen(false);
    };
    const handleOutside = (e: MouseEvent) => {
      if (layersPopoverRef.current && !layersPopoverRef.current.contains(e.target as Node)) {
        setLayersOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleOutside);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [layersOpen]);

  const summary = useMemo(() => computeSocioeconomicSummary(beneficiaries), [beneficiaries]);

  const bairroStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { count: number; avgPerCapita: number; unemploymentPct: number; formalPct: number }
    >();
    summary.neighborhoodStats.forEach((n) => {
      map.set(normalizeSearch(n.neighborhood), {
        count: n.count,
        avgPerCapita: n.avgPerCapita,
        unemploymentPct: n.unemploymentPct,
        formalPct: n.formalPct,
      });
    });
    return map;
  }, [summary]);

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
    commutingLayerRef.current = L.layerGroup().addTo(map);
    usfsLayerRef.current = L.layerGroup().addTo(map);
    crasLayerRef.current = L.layerGroup().addTo(map);
    vermelhinhasLayerRef.current = L.layerGroup().addTo(map);
    anchorsLayerRef.current = L.layerGroup().addTo(map);
    pointsLayerRef.current = L.layerGroup().addTo(map);

    const geoBounds = L.geoJSON(MARICA_BAIRROS_GEOJSON).getBounds();
    fullBoundsRef.current = geoBounds;
    map.fitBounds(geoBounds, { paddingTopLeft: [24, 64], paddingBottomRight: [24, 92] });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch Basemap (Satellite default / OSM Streets)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (baseLayerRef.current) map.removeLayer(baseLayerRef.current);

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

  // Smooth flyTo on district change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedDistrict === 'ALL') {
      if (fullBoundsRef.current) {
        map.flyToBounds(fullBoundsRef.current, {
          paddingTopLeft: [24, 64],
          paddingBottomRight: [24, 92],
          duration: 0.65,
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
        paddingBottomRight: [28, 92],
        duration: 0.65,
      });
    }
  }, [selectedDistrict]);

  // Choropleth 50 Neighborhoods Layer
  useEffect(() => {
    const layer = bairrosLayerRef.current;
    const anchors = anchorsLayerRef.current;
    if (!layer || !anchors) return;
    layer.clearLayers();
    anchors.clearLayers();
    if (!showBairros) return;

    const getMetricFill = (
      stats: { count: number; avgPerCapita: number; unemploymentPct: number; formalPct: number } | undefined,
      fallbackColor: string
    ) => {
      if (!stats || stats.count === 0) return { color: fallbackColor, opacity: 0.08 };
      if (choroplethMetric === 'CONCENTRACAO') {
        if (stats.count >= 3) return { color: '#D93829', opacity: 0.44 };
        if (stats.count === 2) return { color: '#E89B0C', opacity: 0.36 };
        return { color: '#0E7490', opacity: 0.28 };
      }
      if (choroplethMetric === 'PER_CAPITA') {
        if (stats.avgPerCapita <= 850) return { color: '#D93829', opacity: 0.46 };
        if (stats.avgPerCapita <= 1250) return { color: '#E89B0C', opacity: 0.38 };
        return { color: '#156F48', opacity: 0.36 };
      }
      if (choroplethMetric === 'DESEMPREGO') {
        if (stats.unemploymentPct >= 40) return { color: '#D93829', opacity: 0.48 };
        if (stats.unemploymentPct > 0) return { color: '#E89B0C', opacity: 0.34 };
        return { color: '#156F48', opacity: 0.24 };
      }
      // FORMALIZACAO
      if (stats.formalPct >= 60) return { color: '#156F48', opacity: 0.44 };
      if (stats.formalPct > 0) return { color: '#0E7490', opacity: 0.34 };
      return { color: '#E89B0C', opacity: 0.24 };
    };

    const geoLayer = L.geoJSON(MARICA_BAIRROS_GEOJSON, {
      style: (feature) => {
        const dId = (feature?.properties?.districtId ?? 1) as DistrictId;
        const dist = DISTRICT_BY_ID[dId];
        const nomeKey = normalizeSearch(feature?.properties?.bairro ?? '');
        const stats = bairroStatsMap.get(nomeKey);
        const isFocused = selectedDistrict === dId;
        const isDimmed = selectedDistrict !== 'ALL' && !isFocused;
        const fill = getMetricFill(stats, dist.fillColor);
        return {
          color: basemap === 'satellite' ? '#FFFFFF' : dist.color,
          weight: isFocused ? 1.8 : 1.1,
          opacity: isDimmed ? 0.25 : 0.85,
          fillColor: fill.color,
          fillOpacity: isDimmed ? 0.05 : fill.opacity,
        };
      },
      onEachFeature: (feature, poly) => {
        const dId = feature.properties.districtId as DistrictId;
        const dist = DISTRICT_BY_ID[dId];
        const nomeBairro = titleCaseBairro(feature.properties.bairro);
        const stats = bairroStatsMap.get(normalizeSearch(feature.properties.bairro));

        const metricLine = stats
          ? `<div style="margin-top:3px;font-size:10px;color:#E89B0C;">${stats.count} cadastro(s) | Per capita ${formatCurrency(stats.avgPerCapita)} | CLT ${stats.formalPct}%</div>`
          : `<div style="margin-top:2px;font-size:10px;opacity:0.75;">Sem registros no filtro atual</div>`;

        poly.bindTooltip(
          `<div><strong>${nomeBairro}</strong> (${dist.shortName})</div>${metricLine}`,
          { sticky: true, className: 'bairro-tip' }
        );

        poly.on('mouseover', () => {
          (poly as L.Path).setStyle({ weight: 2.5, fillOpacity: 0.56 });
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
  }, [showBairros, selectedDistrict, basemap, choroplethMetric, bairroStatsMap, onSelectDistrict]);

  // Thermal Heatmap Concentration Layer (Aggregated, LGPD-safe)
  useEffect(() => {
    const layer = heatLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showHeatmap) return;

    beneficiaries.forEach((b) => {
      const pc = getPerCapitaIncome(b);
      const isLowIncome = pc <= 850 || b.employmentStatus === 'DESEMPREGADO';
      // Outer soft halo + inner core for crisp concentration heatmap feel
      L.circle(b.coords, {
        radius: isLowIncome ? 1450 : 1050,
        stroke: false,
        fillColor: isLowIncome ? '#D93829' : '#E89B0C',
        fillOpacity: isLowIncome ? 0.16 : 0.11,
        interactive: false,
      }).addTo(layer);
      L.circle(b.coords, {
        radius: isLowIncome ? 620 : 480,
        stroke: false,
        fillColor: isLowIncome ? '#D93829' : '#0E7490',
        fillOpacity: isLowIncome ? 0.24 : 0.16,
        interactive: false,
      }).addTo(layer);
    });
  }, [showHeatmap, beneficiaries]);

  // Home -> Work Commuting Lines
  useEffect(() => {
    const layer = commutingLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showCommuting) return;

    beneficiaries.forEach((b) => {
      if (!b.workCoords) return;
      L.polyline([b.coords, b.workCoords], {
        color: '#E89B0C',
        weight: 2.2,
        dashArray: '5 5',
        opacity: 0.85,
      })
        .bindTooltip(
          `Deslocamento: ${b.neighborhood} para ${b.workLocationBairro ?? 'trabalho'}`,
          { sticky: true, className: 'bairro-tip' }
        )
        .addTo(layer);
    });
  }, [showCommuting, beneficiaries]);

  // 29 Real Maricá Unidades de Saúde da Família
  useEffect(() => {
    const layer = usfsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showUsfs) return;

    MARICA_REAL_USFS.forEach((u) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;border-radius:5px;background:#D93829;border:2px solid #fff;box-shadow:0 2px 6px rgba(12,27,51,0.34);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;line-height:1;">+</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      L.marker(u.coords, { icon })
        .bindPopup(
          `<div style="padding:10px 12px;min-width:210px;">
            <div style="font-size:11px;font-weight:700;color:#D93829;">Rede Municipal de Saúde</div>
            <div style="font-size:13px;font-weight:800;color:#0B3B49;margin-top:2px;">${expandUsfName(u.name)}</div>
            <div style="font-size:11px;color:#52646D;margin-top:2px;">${u.address}</div>
          </div>`
        )
        .addTo(layer);
    });
  }, [showUsfs]);

  // 7 Real Maricá CRAS Units
  useEffect(() => {
    const layer = crasLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showCras) return;

    MARICA_CRAS_UNITS.forEach((c) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:24px;height:24px;border-radius:6px;background:#0E7490;border:2px solid #fff;box-shadow:0 2px 6px rgba(11,59,73,0.34);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:11px;">C</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker(c.coords, { icon })
        .bindPopup(
          `<div style="padding:10px 12px;min-width:210px;">
            <div style="font-size:11px;font-weight:700;color:#0E7490;">Assistência Social (CadÚnico)</div>
            <div style="font-size:13px;font-weight:800;color:#0B3B49;margin-top:2px;">${c.name}</div>
            <div style="font-size:11px;color:#52646D;margin-top:2px;">${c.address}</div>
            <div style="font-size:11px;font-weight:700;color:#0B3B49;margin-top:3px;">Tel.: ${c.phone}</div>
          </div>`
        )
        .addTo(layer);
    });
  }, [showCras]);

  // 68 Real Maricá Vermelhinhas Bike Stations (58 Regular + 10 Infantil)
  useEffect(() => {
    const layer = vermelhinhasLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showVermelhinhas) return;

    MARICA_VERMELHINHAS.forEach((v) => {
      const bg = v.isKids ? '#E89B0C' : '#D93829';
      const border = v.isKids ? '#0B3B49' : '#FFFFFF';
      const text = v.isKids ? '#072933' : '#FFFFFF';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;border-radius:999px;background:${bg};border:2px solid ${border};box-shadow:0 2px 6px rgba(11,59,73,0.36);display:flex;align-items:center;justify-content:center;color:${text};font-weight:900;font-size:9px;">${v.isKids ? 'I' : 'V'}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker(v.coords, { icon })
        .bindPopup(
          `<div style="padding:10px 12px;min-width:220px;">
            <div style="font-size:11px;font-weight:700;color:${v.isKids ? '#8A5600' : '#D93829'};">${v.isKids ? 'Estação Vermelhinha Infantil' : 'Estação Vermelhinha (Bicicleta Gratuita)'}</div>
            <div style="font-size:13px;font-weight:800;color:#0B3B49;margin-top:2px;">#${v.number} ${v.name}</div>
            <div style="font-size:11px;color:#52646D;margin-top:2px;">${v.address}</div>
            <div style="font-size:11px;font-weight:700;color:#156F48;margin-top:4px;">${v.docks} posições | Ativação: ${v.activatedAt.split('-').reverse().join('/')}</div>
          </div>`
        )
        .addTo(layer);
    });
  }, [showVermelhinhas]);

  // Individual Residential Points (STRICTLY gated by RBAC `canViewIndividualPoints`)
  useEffect(() => {
    const layer = pointsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!canViewIndividualPoints || !showIndividualPoints) return;

    beneficiaries.forEach((b) => {
      const pin = getPinColor(b);
      const isSelected = b.id === selectedBeneficiaryId;
      const size = isSelected ? 30 : 20;

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${pin.bg};border:2.5px solid #fff;box-shadow:0 0 0 ${isSelected ? '6px' : '3px'} ${pin.ring}, 0 4px 10px rgba(11,59,73,0.34);display:flex;align-items:center;justify-content:center;color:#fff;font-size:${isSelected ? '11px' : '9px'};font-weight:800;">${b.householdSize}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker(b.coords, {
        icon,
        zIndexOffset: isSelected ? 900 : 120,
      });

      marker.bindTooltip(
        `<div style="font-weight:700;font-size:12px;">${b.fullName}</div>
         <div style="font-size:11px;color:#CBD5E1;">${b.neighborhood} | ${pin.tag} | Per capita ${formatCurrency(getPerCapitaIncome(b))}</div>`,
        { direction: 'top', offset: [0, -14], className: 'bairro-tip' }
      );

      marker.on('click', () => onSelectBeneficiary(b.id));
      marker.addTo(layer);
    });
  }, [
    beneficiaries,
    selectedBeneficiaryId,
    canViewIndividualPoints,
    showIndividualPoints,
    onSelectBeneficiary,
  ]);

  const handleResetView = () => {
    onSelectDistrict('ALL');
    if (fullBoundsRef.current) {
      mapRef.current?.flyToBounds(fullBoundsRef.current, {
        paddingTopLeft: [24, 64],
        paddingBottomRight: [24, 92],
        duration: 0.65,
      });
    }
  };

  const activeLayersCount =
    (showBairros ? 1 : 0) +
    (showHeatmap ? 1 : 0) +
    (canViewIndividualPoints && showIndividualPoints ? 1 : 0) +
    (showCommuting ? 1 : 0) +
    (showUsfs ? 1 : 0) +
    (showCras ? 1 : 0) +
    (showVermelhinhas ? 1 : 0);

  return (
    <div className="isolate relative h-[480px] w-full bg-[#0E2832] sm:h-[540px] lg:h-[calc(100dvh-62px)]">
      <div ref={containerRef} className="h-full w-full" />

      {/* Top Floating Bar */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-[850] flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between">
        {/* Horizontal-scroll 5-district strip */}
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

        {/* Basemap Toggle + Responsive Multi-Tone Layers Popover */}
        <div
          ref={layersPopoverRef}
          className="pointer-events-auto relative flex shrink-0 items-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => setBasemap((b) => (b === 'osm' ? 'satellite' : 'osm'))}
            aria-label={basemap === 'satellite' ? 'Alternar para mapa de ruas' : 'Alternar para imagem de satélite'}
            className="flex min-h-[38px] items-center gap-1.5 rounded-[9px] border border-white/20 bg-[#0B3B49] px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-[#072933] cursor-pointer"
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

          {layersOpen && (
            <div
              id="map-layers-popover"
              role="region"
              aria-label="Camadas cartográficas do mapa"
              className="anim-modal absolute left-0 top-11 max-h-[72dvh] w-[min(21rem,calc(100vw-24px))] overflow-y-auto rounded-[12px] border border-[#DCE3E8] bg-white p-3 shadow-2xl sm:left-auto sm:right-0"
            >
              <div className="flex items-center justify-between border-b border-[#EDF1F4] pb-2">
                <div>
                  <div className="font-display text-xs font-extrabold text-[#0B3B49]">
                    Camadas e análises territoriais
                  </div>
                  <div className="text-[11px] text-[#52646D]">
                    Base {basemap === 'satellite' ? 'Satélite Esri' : 'Ruas OpenStreetMap'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLayersOpen(false)}
                  aria-label="Fechar camadas"
                  className="rounded-[6px] p-1 text-[#52646D] hover:bg-[#F4F6F8] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Choropleth Metric Selector */}
              <div className="mt-2.5">
                <div className="mb-1.5 text-[11px] font-bold text-[#0B3B49]">
                  Colorir bairros por indicador
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {(
                    [
                      { id: 'CONCENTRACAO', label: 'Concentração' },
                      { id: 'PER_CAPITA', label: 'Renda per capita' },
                      { id: 'DESEMPREGO', label: 'Desemprego' },
                      { id: 'FORMALIZACAO', label: 'Vínculo CLT' },
                    ] as { id: ChoroplethMetric; label: string }[]
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setShowBairros(true);
                        setChoroplethMetric(m.id);
                      }}
                      className={`rounded-[6px] px-2 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                        choroplethMetric === m.id && showBairros
                          ? 'bg-[#0B3B49] text-white'
                          : 'bg-[#F4F6F8] text-[#52646D] hover:text-[#0B3B49]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-2.5 space-y-1 border-t border-[#EDF1F4] pt-2">
                {[
                  {
                    label: '50 bairros (agregado)',
                    desc: 'Comparação territorial por indicador',
                    active: showBairros,
                    disabled: false,
                    toggle: () => setShowBairros((v) => !v),
                    icon: LayerBairrosIcon,
                  },
                  {
                    label: 'Mapa de calor',
                    desc: 'Concentração e baixa renda (LGPD)',
                    active: showHeatmap,
                    disabled: false,
                    toggle: () => setShowHeatmap((v) => !v),
                    icon: LayerHeatIcon,
                  },
                  {
                    label: 'Pontos residenciais exatos',
                    desc: canViewIndividualPoints
                      ? 'Liberado para perfil autorizado'
                      : 'Restrito pela LGPD no modo Analista',
                    active: canViewIndividualPoints && showIndividualPoints,
                    disabled: !canViewIndividualPoints,
                    toggle: () => canViewIndividualPoints && setShowIndividualPoints((v) => !v),
                    icon: LayerTriangulationIcon,
                  },
                  {
                    label: 'Deslocamento casa e trabalho',
                    desc: 'Fluxos territoriais de emprego',
                    active: showCommuting,
                    disabled: false,
                    toggle: () => setShowCommuting((v) => !v),
                    icon: LayerSchoolIcon,
                  },
                  {
                    label: 'Estações Vermelhinhas (68)',
                    desc: '58 estações adulto e 10 infantis',
                    active: showVermelhinhas,
                    disabled: false,
                    toggle: () => setShowVermelhinhas((v) => !v),
                    icon: LayerBikeIcon,
                  },
                  {
                    label: 'Unidades de Saúde (29)',
                    desc: 'Rede municipal de atendimento',
                    active: showUsfs,
                    disabled: false,
                    toggle: () => setShowUsfs((v) => !v),
                    icon: LayerHealthIcon,
                  },
                  {
                    label: 'Unidades CRAS (7)',
                    desc: 'Referência de assistência e CadÚnico',
                    active: showCras,
                    disabled: false,
                    toggle: () => setShowCras((v) => !v),
                    icon: LayerCrasIcon,
                  },
                ].map((layer) => {
                  const Icon = layer.icon;
                  return (
                    <button
                      type="button"
                      key={layer.label}
                      role="switch"
                      aria-checked={layer.active}
                      disabled={layer.disabled}
                      onClick={layer.toggle}
                      className={`flex w-full items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 text-left transition-colors ${
                        layer.disabled
                          ? 'cursor-not-allowed opacity-65'
                          : layer.active
                            ? 'bg-[#EDF4F6] cursor-pointer'
                            : 'hover:bg-[#F8FAFB] cursor-pointer'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="shrink-0">
                          <Icon />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 truncate text-xs font-bold text-[#0B3B49]">
                            {layer.label}
                            {layer.disabled && <Lock className="h-3 w-3 text-[#B52B1E]" />}
                          </span>
                          <span className="block truncate text-[11px] text-[#52646D]">
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
                          className={`block h-4 w-4 rounded-full bg-white transition-transform ${
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

      {/* Bottom-Left Live Cohort Telemetry Strip */}
      <div className="pointer-events-auto absolute bottom-3 left-3 right-14 z-[750] hidden max-w-[700px] items-center justify-between gap-4 rounded-[9px] border border-white/15 bg-[#0B3B49] px-4 py-2.5 text-white shadow-lg sm:flex">
        <div>
          <div className="font-display text-lg font-extrabold leading-none text-[#E89B0C] tabular-nums">
            {summary.total}
          </div>
          <div className="mt-0.5 text-[11px] text-[#C2D6DC]">Cadastrados no filtro</div>
        </div>
        <span className="h-7 w-px bg-white/15" />
        <div>
          <div className="font-display text-lg font-extrabold leading-none text-white tabular-nums">
            {formatCurrency(summary.avgPerCapitaIncome)}
          </div>
          <div className="mt-0.5 text-[11px] text-[#C2D6DC]">Per capita médio</div>
        </div>
        <span className="h-7 w-px bg-white/15" />
        <div>
          <div className="font-display text-lg font-extrabold leading-none text-[#E89B0C] tabular-nums">
            {summary.formalRatePct}%
          </div>
          <div className="mt-0.5 text-[11px] text-[#C2D6DC]">Vínculo formal (CLT/Est.)</div>
        </div>
        <span className="h-7 w-px bg-white/15" />
        <div>
          <div className="font-display text-lg font-extrabold leading-none text-white tabular-nums">
            {summary.unemploymentRatePct}%
          </div>
          <div className="mt-0.5 text-[11px] text-[#C2D6DC]">Desemprego na base</div>
        </div>
      </div>
    </div>
  );
}
