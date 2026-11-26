import type { ApiRequest, ApiResponse } from '../server/http.js';
import { XMLParser } from 'fast-xml-parser';

const NEWS = 'https://www.marica.rj.gov.br/feed/?post_type=noticia';
const COURSES = 'https://www.marica.rj.gov.br/?s=cursos+gratuitos&post_type=noticia&feed=rss2';
const JOBS = 'https://idr.marica.rj.gov.br/api/socioeconomico/monitor';

const xml = new XMLParser({ processEntities: false, parseTagValue: false, isArray: (_tag, path) => path === 'rss.channel.item' });

async function source(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: 'error' });
  if (!response.ok) throw new Error('Fonte indisponível');
  return response;
}

function clean(value: unknown, length = 600) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;|&#160;/g, ' ')
      .replace(/&#8211;|&ndash;/g, '–').replace(/&#8217;|&rsquo;/g, '’').trim().slice(0, length)
    : '';
}

export async function municipalPosts(url: string, courseSearch = false) {
  const feed = await (await source(url)).text();
  if (feed.length > 1_000_000 || /<!DOCTYPE|<!ENTITY/i.test(feed)) throw new Error('RSS inválido');
  const items: { title?: unknown; link?: unknown; description?: unknown; pubDate?: string }[] =
    xml.parse(feed)?.rss?.channel?.item ?? [];
  if (!Array.isArray(items)) throw new Error('RSS inválido');
  return items.flatMap((item) => {
    const title = clean(item.title, 250);
    const link = clean(item.link);
    const timestamp = Date.parse(item.pubDate ?? '');
    if (!title || !link.startsWith('https://www.marica.rj.gov.br/noticia/') || !Number.isFinite(timestamp)) return [];
    if (courseSearch && !/curso|qualifica|oficina|formaç[aã]o/i.test(title)) return [];
    return [{ title, link, date: new Date(timestamp).toISOString(), description: clean(item.description, 240) }];
  }).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
}

type JobRecord = Record<string, unknown>;
type Month = { referencia?: string; fontes?: { casa?: { vagas?: JobRecord[] }; sine?: { vagas?: JobRecord[] } } };

export async function localJobs() {
  const data = await (await source(JOBS)).json() as { meses?: Record<string, Month> };
  if (!data.meses || typeof data.meses !== 'object') throw new Error('Monitor inválido');
  const month = Object.keys(data.meses).filter((key) => /^\d{4}-(0[1-9]|1[0-2])$/.test(key)).sort().at(-1);
  if (!month) return { month: null, offers: [] };
  const entry = data.meses[month];
  const labels = { casa: 'Casa do Trabalhador', sine: 'SINE Maricá' };
  const offers = (['casa', 'sine'] as const).flatMap((key) => {
    const records = entry.fontes?.[key]?.vagas;
    if (!Array.isArray(records)) return [];
    return records.slice(0, 1000).flatMap((record, index) => {
      if (!record || typeof record !== 'object') return [];
      const title = clean(record.cargo ?? record.funcao, 180);
      const quantity = Number(record.quantidade ?? record.vagas);
      if (!title || !Number.isInteger(quantity) || quantity < 1) return [];
      return [{
        id: `${key}-${index}`, source: labels[key], title, quantity,
        district: clean(record.distrito ?? record.local, 120), sector: clean(record.setor, 120),
        type: clean(record.tipo, 100), education: clean(record.escolaridade, 150),
        salary: clean(record.salario, 100), benefits: clean(record.beneficios),
        requirements: clean(record.requisitos, 1000),
      }];
    });
  });
  return { month, offers };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Método indisponível.' });
  const [news, courses, jobs] = await Promise.allSettled([municipalPosts(NEWS), municipalPosts(COURSES, true), localJobs()]);
  const complete = [news, courses, jobs].every((result) => result.status === 'fulfilled');
  res.setHeader('Cache-Control', complete ? 'public, max-age=60, s-maxage=300, stale-while-revalidate=60' : 'no-store');
  return res.status(200).json({
    checkedAt: new Date().toISOString(),
    news: news.status === 'fulfilled' ? news.value : null,
    courses: courses.status === 'fulfilled' ? courses.value : null,
    jobs: jobs.status === 'fulfilled' ? jobs.value : null,
  });
}
