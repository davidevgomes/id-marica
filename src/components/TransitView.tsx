import L from 'leaflet';
import { Bus, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MARICA_CENTER } from '../data/maricaGeo';

type Vehicle = { id: string; label: string; line: string; lat: number; lng: number; speed: number | null; timestamp: string };
type BusData = {
  lines: { code: string; title: string; schedule: string }[] | null;
  telemetry: { state: 'ok' | 'unavailable' | 'not_configured'; vehicles: Vehicle[] };
};

const schedule = 'https://www.eptmarica.rj.gov.br/horariosbd/listarLinhas.php?tp_linha=1';
const itineraries = 'https://www.eptmarica.rj.gov.br/index.php/vermelhinhos/itinerarios';
const officialApp = 'https://www.eptmarica.rj.gov.br/links/';
const time = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'medium', timeZone: 'America/Sao_Paulo' });

function BusMap({ vehicles }: { vehicles: Vehicle[] }) {
  const container = useRef<HTMLDivElement>(null);
  const markers = useRef<L.LayerGroup>(null);

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current).setView(MARICA_CENTER, 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
    markers.current = L.layerGroup().addTo(map);
    return () => { map.remove(); markers.current = null; };
  }, []);

  useEffect(() => {
    const layer = markers.current;
    if (!layer) return;
    layer.clearLayers();
    vehicles.forEach((vehicle) => {
      const popup = document.createElement('p');
      popup.textContent = `Ônibus ${vehicle.label} · Linha ${vehicle.line || 'não informada'} · GPS ${time.format(new Date(vehicle.timestamp))}`;
      popup.className = 'p-3';
      L.circleMarker([vehicle.lat, vehicle.lng], {
        radius: 8, fillOpacity: 0.95, fillColor: '#B52B1E', color: '#FFFFFF', weight: 2,
      }).bindPopup(popup).addTo(layer);
    });
  }, [vehicles]);

  return <div ref={container} aria-label="Mapa da posição dos ônibus" className="h-[360px] rounded-xl border border-[#C4D0D7]" />;
}

export function TransitView() {
  const [data, setData] = useState<BusData | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [lastFetch, setLastFetch] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const base = new URL(import.meta.env.BASE_URL, document.baseURI);
    const refresh = async () => {
      try {
        const response = await fetch(new URL('api/ept', base), { signal: controller.signal });
        if (!response.ok) throw new Error();
        const result = await response.json() as BusData;
        setData(result);
        setLastFetch(Date.now());
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    };
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 20_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);

  const search = query.trim().toLocaleLowerCase('pt-BR');
  const lines = data?.lines?.filter((route) => route.title.toLocaleLowerCase('pt-BR').includes(search)) ?? [];
  const vehicles = data?.telemetry.vehicles.filter((vehicle) =>
    lastFetch - Date.parse(vehicle.timestamp) <= 180_000 &&
    (!search || `${vehicle.line} ${vehicle.label}`.toLocaleLowerCase('pt-BR').includes(search))
  ) ?? [];
  const live = !failed && data?.telemetry.state === 'ok';

  return (
    <section className="anim-step mx-auto max-w-[1280px] space-y-5 px-4 py-6 pb-24 sm:px-6">
      <div className="rounded-2xl bg-[#0B3B49] p-5 text-white sm:p-7">
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold sm:text-3xl"><Bus aria-hidden="true" /> Transporte público da EPT</h1>
        <p className="mt-2 text-sm text-[#D8E7EC]">Consulte os Vermelhinhos do Tarifa Zero por número da linha ou destino.</p>
      </div>
      <div className="rounded-xl border border-[#DCE3E8] bg-white p-4">
        <label className="block text-sm font-bold text-[#0B3B49]">Buscar linha, destino ou veículo
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: E01 ou Ponta Negra"
            className="mt-1 block min-h-11 w-full rounded-lg border border-[#C4D0D7] px-3 sm:max-w-sm" />
        </label>
        <div className="mt-3 flex flex-wrap gap-x-4">
          {[[schedule, 'Horários oficiais'], [itineraries, 'Itinerários'], [officialApp, 'App EPT Maricá']].map(([href, label]) => (
            <a href={href} key={href} className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-[#0B3B49] underline">
              {label} <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          ))}
        </div>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-[#DCE3E8] bg-white p-4">
          <h2 className="font-display text-xl font-extrabold text-[#0B3B49]">Telemetria dos ônibus</h2>
          <p role="status" className="text-sm text-[#52646D]">
            {live ? `${vehicles.length} veículo(s) com posição recebida nos últimos três minutos. Consulta a cada 20 segundos.`
              : !data && !failed ? 'Consultando a posição dos veículos…'
              : data?.telemetry.state === 'not_configured' ? 'O painel aguarda a conexão com o feed da EPT. A localização ao vivo está no app oficial.'
              : 'A telemetria está indisponível agora. Consulte a localização no app oficial.'}
          </p>
          {live && <BusMap vehicles={vehicles} />}
          {live && vehicles.length > 0 && (
            <ul className="max-h-56 divide-y divide-[#DCE3E8] overflow-y-auto text-sm">
              {vehicles.map((vehicle) => <li key={vehicle.id} className="py-2">
                <strong>Ônibus {vehicle.label}</strong> · Linha {vehicle.line || 'não informada'} · {time.format(new Date(vehicle.timestamp))}
                {vehicle.speed !== null && ` · ${vehicle.speed} km/h`}
              </li>)}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-[#DCE3E8] bg-white p-4">
          <h2 className="font-display text-xl font-extrabold text-[#0B3B49]">Linhas e horários</h2>
          <p className="mt-2 text-sm text-[#52646D]">{data?.lines ? `${lines.length} itinerário(s) no catálogo da EPT.` : 'Consulte a lista de horários no site oficial da EPT.'}</p>
          <ul className="mt-3 max-h-[470px] divide-y divide-[#DCE3E8] overflow-y-auto">
            {lines.map((line) => <li key={line.schedule}>
              <a href={line.schedule} className="flex min-h-11 items-center justify-between gap-2 py-2 text-sm font-bold text-[#0B3B49] hover:underline">
                {line.title} <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
              </a>
            </li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
