import type { ApiRequest, ApiResponse } from '../server/http.js';
import gtfs from 'gtfs-realtime-bindings';

const SCHEDULE = 'https://www.eptmarica.rj.gov.br/horariosbd/listarLinhas.php?tp_linha=1';

async function source(url: string) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('Fonte da EPT indisponível.');
  return response;
}

export async function eptLines() {
  const html = await (await source(SCHEDULE)).text();
  const routes = [...html.matchAll(/<a\s+href=['"](listarHorarios\.php\?[^'"]+)['"][^>]*>([^<]+)<\/a>/gi)]
    .flatMap(([, path, text]) => {
      const title = text.replace(/&amp;/g, '&').trim();
      const code = title.match(/^([A-Z]\d{1,3}[A-Z]?)\s*-/i)?.[1].toUpperCase();
      if (!code) return [];
      return [{ code, title, schedule: new URL(path.replace(/&amp;/g, '&'), SCHEDULE).href }];
    });
  if (!routes.length) throw new Error('Catálogo de linhas indisponível.');
  return routes;
}

export function transitVehicles(bytes: Uint8Array, now = Date.now()) {
  const feed = gtfs.transit_realtime.FeedMessage.decode(bytes);
  if (feed.header.incrementality === gtfs.transit_realtime.FeedHeader.Incrementality.DIFFERENTIAL) {
    throw new Error('O painel precisa de um feed completo de posições.');
  }
  const feedTime = Number(feed.header.timestamp);
  return feed.entity.flatMap(({ id, isDeleted, vehicle }) => {
    const point = vehicle?.position;
    const time = (Number(vehicle?.timestamp) || feedTime) * 1000;
    if (!vehicle || isDeleted || !point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) ||
        Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180 ||
        !Number.isFinite(time) || time <= 0 || time > now + 60_000) return [];
    return [{
      id: vehicle.vehicle?.id || id,
      label: vehicle.vehicle?.label || vehicle.vehicle?.id || id,
      line: vehicle.trip?.routeId || '',
      lat: point.latitude,
      lng: point.longitude,
      speed: Object.hasOwn(point, 'speed') && typeof point.speed === 'number' && point.speed >= 0 ? Math.round(point.speed * 3.6) : null,
      timestamp: new Date(time).toISOString(),
    }];
  });
}

async function telemetry() {
  const url = process.env.EPT_GTFS_RT_URL;
  if (!url) return { state: 'not_configured', vehicles: [] };
  if (new URL(url).protocol !== 'https:') throw new Error('O feed precisa usar HTTPS.');
  const response = await source(url);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > 3_000_000) throw new Error('Feed da EPT acima do limite.');
  const vehicles = transitVehicles(bytes);
  return { state: 'ok', vehicles };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Método indisponível.' });
  const [lines, positions] = await Promise.allSettled([eptLines(), telemetry()]);
  res.setHeader('Cache-Control', 'public, max-age=10, s-maxage=15');
  return res.status(200).json({
    lines: lines.status === 'fulfilled' ? lines.value : null,
    telemetry: positions.status === 'fulfilled' ? positions.value : { state: 'unavailable', vehicles: [] },
  });
}
