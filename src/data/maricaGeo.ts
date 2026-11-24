import type { FeatureCollection, Geometry } from 'geojson';
import bairrosJson from './maricaBairros.json';
import usfsJson from './maricaUsfs.json';
import type { DistrictId, DistrictInfo, PublicFacility } from '../types/integra';

export const MARICA_CENTER: [number, number] = [-22.922, -42.825];
export const MARICA_DEFAULT_ZOOM = 11.5;

export interface BairroFeatureProps {
  bairro: string;
  districtId: DistrictId;
}

export const MARICA_BAIRROS_GEOJSON = bairrosJson as unknown as FeatureCollection<
  Geometry,
  BairroFeatureProps
>;

export interface RealUsf {
  id: string;
  name: string;
  address: string;
  coords: [number, number];
}

export const MARICA_REAL_USFS: RealUsf[] = usfsJson as RealUsf[];

/**
 * 5 Setores Territoriais Oficiais de Maricá-RJ.
 * Os polígonos exatos dos 50 bairros oficiais vêm de maricaBairros.json (base IBGE 2022 Maricá).
 */
export const MARICA_DISTRICTS: DistrictInfo[] = [
  {
    id: 1,
    name: '1º Distrito (Centro)',
    shortName: 'Centro',
    color: '#0F5C9E',
    fillColor: '#2B7BBB',
    center: [-22.892, -42.812],
    neighborhoods: [
      'Centro', 'Mumbuca', 'Flamengo', 'Araçatiba', 'Barra de Maricá',
      'Itapeba', 'Caxito', 'Ubatiba', 'Jacaroá', 'Zacarias',
    ],
    macroFamilies: 11840,
    macroMumbucaTrabalho: 2140,
    macroPendingProof: 620,
    polygon: [],
  },
  {
    id: 2,
    name: '2º Distrito (Ponta Negra)',
    shortName: 'Ponta Negra',
    color: '#1F7A63',
    fillColor: '#2E967B',
    center: [-22.916, -42.708],
    neighborhoods: [
      'Ponta Negra', 'Cordeirinho', 'Balneário Bambuí', 'Jaconé',
      'Guaratiba', 'Espraiado', 'Bananal', 'Manoel Ribeiro',
    ],
    macroFamilies: 6920,
    macroMumbucaTrabalho: 1090,
    macroPendingProof: 410,
    polygon: [],
  },
  {
    id: 3,
    name: '3º Distrito (Inoã)',
    shortName: 'Inoã',
    color: '#C97A16',
    fillColor: '#E59A00',
    center: [-22.890, -42.918],
    neighborhoods: [
      'Inoã', 'Spar', 'Calaboca', 'Santa Paula',
      'Chácaras de Inoã', 'Cassorotiba', 'Itaocaia Valley',
    ],
    macroFamilies: 8450,
    macroMumbucaTrabalho: 1480,
    macroPendingProof: 530,
    polygon: [],
  },
  {
    id: 4,
    name: '4º Distrito (Itaipuaçu)',
    shortName: 'Itaipuaçu',
    color: '#9E2A4B',
    fillColor: '#C24163',
    center: [-22.948, -42.988],
    neighborhoods: [
      'Barroco', 'Jardim Atlântico Central', 'Jardim Atlântico Leste',
      'Jardim Atlântico Oeste', 'Praia de Itaipuaçu', 'Recanto de Itaipuaçu',
      'Cajueiros', 'Morada das Águias',
    ],
    macroFamilies: 11260,
    macroMumbucaTrabalho: 2290,
    macroPendingProof: 740,
    polygon: [],
  },
  {
    id: 5,
    name: '5º Distrito (São José do Imbassaí)',
    shortName: 'São José',
    color: '#3E6B89',
    fillColor: '#5688A8',
    center: [-22.906, -42.872],
    neighborhoods: ['São José do Imbassaí', 'Parque Nanci', 'Ponta Grossa', 'Retiro'],
    macroFamilies: 5380,
    macroMumbucaTrabalho: 960,
    macroPendingProof: 310,
    polygon: [],
  },
];

export const DISTRICT_BY_ID: Record<DistrictId, DistrictInfo> = MARICA_DISTRICTS.reduce(
  (acc, d) => {
    acc[d.id] = d;
    return acc;
  },
  {} as Record<DistrictId, DistrictInfo>
);

/**
 * Equipamentos públicos reais de Maricá (UBSs com coordenadas oficiais da base IBGE/Maricá + Escolas Municipais)
 */
export const PUBLIC_FACILITIES: PublicFacility[] = [
  {
    id: 'ubs-central',
    name: 'USF Central',
    type: 'UBS',
    districtId: 1,
    coords: [-22.9237, -42.8154],
    neighborhood: 'Centro',
  },
  {
    id: 'ubs-mumbuca',
    name: 'USF Mumbuca',
    type: 'UBS',
    districtId: 1,
    coords: [-22.9136, -42.8279],
    neighborhood: 'Mumbuca',
  },
  {
    id: 'ubs-ponta-negra',
    name: 'USF Ponta Negra',
    type: 'UBS',
    districtId: 2,
    coords: [-22.9528, -42.7004],
    neighborhood: 'Ponta Negra',
  },
  {
    id: 'ubs-cordeirinho',
    name: 'USF Bambuí / Cordeirinho',
    type: 'UBS',
    districtId: 2,
    coords: [-22.9364, -42.7559],
    neighborhood: 'Balneário Bambuí',
  },
  {
    id: 'ubs-inoa',
    name: 'USF Inoã 2',
    type: 'UBS',
    districtId: 3,
    coords: [-22.9052, -42.9360],
    neighborhood: 'Inoã',
  },
  {
    id: 'ubs-barroco',
    name: 'USF Carlos Marighella (Barroco)',
    type: 'UBS',
    districtId: 4,
    coords: [-22.9451, -42.9546],
    neighborhood: 'Barroco',
  },
  {
    id: 'ubs-jardim-atlantico',
    name: 'USF Jardim Atlântico',
    type: 'UBS',
    districtId: 4,
    coords: [-22.9686, -42.9530],
    neighborhood: 'Jardim Atlântico',
  },
  {
    id: 'ubs-sao-jose',
    name: 'USF São José 1',
    type: 'UBS',
    districtId: 5,
    coords: [-22.9333, -42.8834],
    neighborhood: 'São José do Imbassaí',
  },
  {
    id: 'esc-joana-benedicta',
    name: 'E.M. Joana Benedicta Rangel',
    type: 'ESCOLA',
    districtId: 1,
    coords: [-22.9204, -42.8165],
    neighborhood: 'Centro',
  },
  {
    id: 'esc-zilca',
    name: 'CEPT Zilca Lopes da Fontoura',
    type: 'ESCOLA',
    districtId: 1,
    coords: [-22.9265, -42.8012],
    neighborhood: 'Flamengo',
  },
  {
    id: 'esc-ponta-negra',
    name: 'E.M. Alfredo Nicolau da Silva',
    type: 'ESCOLA',
    districtId: 2,
    coords: [-22.9485, -42.7025],
    neighborhood: 'Ponta Negra',
  },
  {
    id: 'esc-darcy-inoa',
    name: 'E.M. Darcy Ribeiro (Inoã)',
    type: 'ESCOLA',
    districtId: 3,
    coords: [-22.9082, -42.9265],
    neighborhood: 'Inoã',
  },
  {
    id: 'esc-carlos-magno',
    name: 'E.M. Carlos Magno Legentil',
    type: 'ESCOLA',
    districtId: 4,
    coords: [-22.9628, -42.9532],
    neighborhood: 'Itaipuaçu',
  },
  {
    id: 'esc-sao-jose',
    name: 'E.M. João Monteiro (São José)',
    type: 'ESCOLA',
    districtId: 5,
    coords: [-22.9195, -42.8645],
    neighborhood: 'São José do Imbassaí',
  },
];

export const FACILITY_BY_ID: Record<string, PublicFacility> = PUBLIC_FACILITIES.reduce(
  (acc, f) => {
    acc[f.id] = f;
    return acc;
  },
  {} as Record<string, PublicFacility>
);

export function calculateDistanceMeters(
  pointA: [number, number],
  pointB: [number, number]
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(pointB[0] - pointA[0]);
  const dLng = toRad(pointB[1] - pointA[1]);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(pointA[0])) *
      Math.cos(toRad(pointB[0])) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
