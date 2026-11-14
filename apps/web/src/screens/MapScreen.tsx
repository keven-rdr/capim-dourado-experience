import { COUPONS, FLOOR_LABEL, type Floor, localDate, type Store, TRAIL_LABEL } from '@cde/shared';
import { Button, Card, FilterChips, MapPin, Tag } from '@cde/ui';
import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame, useGameQuery } from '../data/GameProvider';
import { demoNow } from '../demo/demoStore';
import { Screen } from '../layout/Screen';
import { PRODUCTS } from '../lib/catalog';
import { type MapAnswer, toMapPercent, useMapAnswers, useVisitedToday } from '../lib/mapVotes';
import { useWishlist } from '../lib/wishlist';

type Spot = { x: number; y: number };

/** Andares de cima para baixo, como na maquete. Desenhos simplificados, sem a planta real. */
const FLOORS: Array<{ id: Floor; name: string; hint: string; img: string; ratio: number }> = [
  {
    id: 'segundo',
    name: 'Praça de Alimentação',
    hint: '2º andar',
    img: '/mapa/segundo.webp',
    ratio: 900 / 442,
  },
  {
    id: 'terreo',
    name: 'Térreo',
    hint: '1º andar · lojas',
    img: '/mapa/terreo.webp',
    ratio: 900 / 371,
  },
  {
    id: 'subsolo',
    name: 'Subsolo',
    hint: 'estacionamento',
    img: '/mapa/subsolo.webp',
    ratio: 900 / 299,
  },
];

/**
 * Onde cada loja fica no desenho do andar (em % da imagem). O desenho segue a vista de satélite
 * girada: direita = lado do Cinemark (norte), esquerda = lado do oval (sul), frente = lado do
 * estacionamento. Âncoras pelos pinos públicos do Google Maps; as demais são ilustrativas.
 */
const STORE_SPOTS: Record<string, Spot> = {
  cinemark: { x: 78.5, y: 19.9 },
  riachuelo: { x: 40.8, y: 5.8 },
  cea: { x: 38.1, y: 74.4 },
  renner: { x: 22.2, y: 19.9 },
  marisa: { x: 71.9, y: 74.4 },
  centauro: { x: 10.2, y: 75.8 },
  hering: { x: 89, y: 57.4 },
  vivara: { x: 16.3, y: 39.7 },
  leitura: { x: 58.9, y: 5.8 },
  rihappy: { x: 28.3, y: 74.4 },
  wowpark: { x: 70, y: 5.8 },
  zigzag: { x: 89.8, y: 74.4 },
  outback: { x: 62.3, y: 74.4 },
  madero: { x: 83.4, y: 39.7 },
  // praça: o lado do oval (sul) fica à esquerda, como no Térreo
  mcdonalds: { x: 20.9, y: 29.5 },
  giraffas: { x: 30.4, y: 23.1 },
  spoleto: { x: 40.4, y: 21.4 },
  pizzahut: { x: 60.7, y: 21.4 },
  subway: { x: 70.7, y: 23.7 },
};

/** Loja nova sem lugar no desenho: cai no miolo do andar pela posição antiga do seed. */
// shortcut: aproxima pelo store.map do seed; quando entrar loja nova, cadastrar em STORE_SPOTS.
function spotOf(store: Store): Spot {
  return STORE_SPOTS[store.id] ?? { x: 15 + store.map.x * 0.7, y: 15 + store.map.y * 0.6 };
}

const EVENTS: Record<Floor, Array<{ id: string; label: string; text: string } & Spot>> = {
  segundo: [
    {
      id: 'ev-escada',
      label: 'Escadas do átrio',
      text: 'Chegam do Térreo direto na praça. Bom ponto de encontro.',
      x: 50,
      y: 67.9,
    },
  ],
  terreo: [
    {
      id: 'ev-escada',
      label: 'Escadas para a praça',
      text: 'Duas rolantes e a escada do meio sobem para a Praça de Alimentação.',
      x: 50.2,
      y: 33.4,
    },
    {
      id: 'ev-praca',
      label: 'Praça de Eventos',
      text: 'Área pública. Fique de olho: segredos aparecem em lugares assim.',
      x: 50.2,
      y: 88.5,
    },
    {
      id: 'ev-familia',
      label: 'Espaço Família',
      text: 'Área pública. Segredos da caça também aparecem por aqui.',
      x: 25.7,
      y: 50.4,
    },
  ],
  subsolo: [
    {
      id: 'ev-entrada',
      label: 'Entrada do shopping',
      text: 'No subsolo o GPS é fraco: o QR da entrada faz o check-in.',
      x: 49.6,
      y: 19.6,
    },
  ],
};

type Filter = 'tudo' | 'trilha' | 'cupom' | 'desejos';
const COUPON_STORES = new Set(COUPONS.map((c) => c.storeId));

function isFloor(v: string | null): v is Floor {
  return v === 'segundo' || v === 'terreo' || v === 'subsolo';
}

export function MapScreen() {
  const { profile, notify } = useGame();
  const navigate = useNavigate();
  const { wishes } = useWishlist();
  const { answers, answer, forget } = useMapAnswers();
  const visited = useVisitedToday(localDate(demoNow()));
  const [placing, setPlacing] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useSearchParams();
  const stores = useGameQuery((api) => api.listStores());
  const all = stores.data ?? [];
  const linked = all.find((s) => s.id === params.get('loja'));
  const andar = params.get('andar');
  const floor: Floor | null = linked?.floor ?? (isFloor(andar) ? andar : null);
  const [selected, setSelected] = useState<string | null>(() => params.get('loja'));
  const [filter, setFilter] = useState<Filter>('tudo');
  const mapRef = useRef<HTMLDivElement>(null);

  const wishStores = new Set(
    Object.keys(wishes).flatMap((id) => PRODUCTS.find((p) => p.id === id)?.storeId ?? []),
  );
  const mine = (s: Store) =>
    !!profile && (s.trails.includes(profile.trail) || s.trails.includes('todos'));
  const pass: Record<Filter, (s: Store) => boolean> = {
    tudo: () => true,
    trilha: mine,
    cupom: (s) => COUPON_STORES.has(s.id),
    desejos: (s) => wishStores.has(s.id),
  };

  const openFloor = (id: Floor | null) => {
    setSelected(null);
    setPlacing(null);
    setFilter('tudo');
    setParams(id ? { andar: id } : {}, { replace: true });
  };

  if (!floor) {
    return (
      <Screen kicker="o mapa do jogo" title="Mapa">
        <p className="text-sm text-ink-soft">Toque num andar para ver o que tem nele.</p>
        <div className="mt-4 flex flex-col">
          {FLOORS.map((f, i) => {
            const count = all.filter((s) => s.floor === f.id).length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => openFloor(f.id)}
                aria-label={`Abrir ${f.name}`}
                className="group relative block rounded-lg text-left focus-ring"
                style={{ zIndex: FLOORS.length - i, marginTop: i ? '-9%' : 0 }}
              >
                <motion.img
                  layoutId={`andar-${f.id}`}
                  src={f.img}
                  alt=""
                  className="w-full transition-transform duration-300 group-hover:-translate-y-1.5"
                  style={{ aspectRatio: f.ratio }}
                />
                <span className="absolute left-0 top-[18%] rounded-sm bg-gold px-2.5 py-1 text-on-gold chunk-thin shadow-hard-sm">
                  <span className="block font-display text-sm font-extrabold leading-tight">
                    {f.name}
                  </span>
                  <span className="block font-mono text-[11px] font-bold">
                    {count ? `${count} ${f.id === 'segundo' ? 'restaurantes' : 'lojas'}` : f.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-right font-mono text-xs font-bold text-ink-soft">
          posições ilustrativas · fora de escala
        </p>
        <div className="h-20" aria-hidden />
      </Screen>
    );
  }

  // biome-ignore lint/style/noNonNullAssertion: floor sempre está em FLOORS
  const meta = FLOORS.find((f) => f.id === floor)!;
  const onFloor = all.filter((s) => s.floor === floor);
  const shown = onFloor.filter(pass[filter]);
  const store = onFloor.find((s) => s.id === selected);
  const event = EVENTS[floor].find((e) => e.id === selected);
  const coupon = store ? COUPONS.find((c) => c.storeId === store.id) : undefined;
  const pick = (id: string) => {
    setSelected(id);
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const placingStore = onFloor.find((s) => s.id === placing);
  const mapped = Object.keys(answers).length;
  const save = (storeId: string, value: MapAnswer) => {
    const n = answer(storeId, value);
    setPlacing(null);
    notify({
      variant: 'success',
      title: 'Valeu, cartógrafo!',
      description: `Você já ajudou a mapear ${n} ${n === 1 ? 'loja' : 'lojas'}.`,
    });
  };

  return (
    <Screen kicker="o mapa do jogo" title={meta.name}>
      {/* os outros andares viram fatias: tocar troca de andar */}
      <div className="flex gap-2">
        {FLOORS.filter((f) => f.id !== floor).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => openFloor(f.id)}
            className="relative h-14 flex-1 overflow-hidden rounded-md bg-surface-2 chunk-thin focus-ring"
          >
            <motion.img
              layoutId={`andar-${f.id}`}
              src={f.img}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-60"
            />
            <span className="relative font-display text-sm font-extrabold">{f.name}</span>
          </button>
        ))}
        <Button size="sm" variant="ghost" icon="layers" onClick={() => openFloor(null)}>
          Todos
        </Button>
      </div>

      <div ref={mapRef} className="-mx-3 mt-4 scroll-mt-4 pt-9">
        {placingStore && (
          <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-md bg-accent px-3 py-2 text-on-accent chunk-thin">
            <p className="text-sm font-bold" aria-live="polite">
              Toque no desenho onde fica a {placingStore.name}.
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="shrink-0"
              onClick={() => setPlacing(null)}
            >
              Cancelar
            </Button>
          </div>
        )}
        <div ref={boxRef} className="relative" style={{ aspectRatio: meta.ratio }}>
          <motion.img
            layoutId={`andar-${floor}`}
            src={meta.img}
            alt={`Desenho do andar: ${meta.name}`}
            className="absolute inset-0 size-full"
          />
          {shown.map((s) => (
            <MapPin
              key={s.id}
              kind="store"
              label={s.name}
              {...spotOf(s)}
              selected={selected === s.id}
              onSelect={() => setSelected(s.id)}
            />
          ))}
          {EVENTS[floor].map((e) => (
            <MapPin
              key={e.id}
              kind="event"
              label={e.label}
              x={e.x}
              y={e.y}
              selected={selected === e.id}
              onSelect={() => setSelected(e.id)}
            />
          ))}
          {onFloor.map((s) => {
            const a = answers[s.id];
            return a?.kind === 'sugeriu' ? (
              <MapPin
                key={`sugestao-${s.id}`}
                kind="you"
                label={`Sua sugestão: ${s.name}`}
                x={a.x}
                y={a.y}
                dimmed={selected !== s.id}
                onSelect={() => setSelected(s.id)}
              />
            ) : null;
          })}
          {placingStore && (
            <button
              type="button"
              aria-label={`Marcar no desenho onde fica a ${placingStore.name}`}
              className="absolute inset-0 z-30 cursor-crosshair rounded-md bg-accent/10 ring-4 ring-accent"
              onClick={(e) => {
                const box = boxRef.current?.getBoundingClientRect();
                if (box)
                  save(placingStore.id, {
                    kind: 'sugeriu',
                    ...toMapPercent(box, e.clientX, e.clientY),
                  });
              }}
            />
          )}
        </div>
      </div>
      <p className="mt-1 flex flex-wrap items-center justify-between gap-2 font-mono text-xs font-bold text-ink-soft">
        <span className="flex gap-3">
          {onFloor.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-full bg-primary chunk-thin" /> loja
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="size-3 rounded-full bg-secondary chunk-thin" /> encontro
          </span>
          {onFloor.some((st) => answers[st.id]?.kind === 'sugeriu') && (
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-full bg-accent chunk-thin" /> sua sugestão
            </span>
          )}
        </span>
        <span>posições ilustrativas</span>
      </p>
      {onFloor.length > 0 && (
        <p className="mt-2 text-sm">
          <strong>Ajude a Capi a mapear:</strong> leia o QR da vitrine e diga se a loja fica mesmo
          ali.
          {mapped > 0 && ` Você já mapeou ${mapped} ${mapped === 1 ? 'loja' : 'lojas'}.`}
        </p>
      )}

      {store && (
        <Card className="mt-4 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs font-bold uppercase text-ink-soft">
                {store.category}
              </p>
              <h2 className="font-display text-2xl font-extrabold leading-tight">{store.name}</h2>
              <p className="text-xs text-ink-soft">{FLOOR_LABEL[store.floor]}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              {store.trails.map((t) => (
                <Tag key={t} tone={t === profile?.trail ? 'gold' : 'outline'}>
                  {TRAIL_LABEL[t]}
                </Tag>
              ))}
            </div>
          </div>
          {coupon && (
            <p className="mt-3 text-sm font-semibold">
              Cupom: {coupon.title} por {coupon.cost} moedas
            </p>
          )}
          <p className="mt-2 text-sm">
            Leia o QR na vitrine: +15 XP e +5 moedas, uma vez por dia (parceria de exemplo).
          </p>
          <Button className="mt-3" icon="qr" onClick={() => navigate(`/scanner?loja=${store.id}`)}>
            Ler o QR da vitrine
          </Button>

          <div className="mt-4 border-t-2 border-dashed border-line/30 pt-3">
            <p className="font-display font-bold">Ajude a Capi a mapear</p>
            {!visited.includes(store.id) ? (
              <p className="text-sm text-ink-soft">
                Leia o QR da vitrine da {store.name} para opinar: só quem esteve na loja ajuda a
                mapear.
              </p>
            ) : answers[store.id] ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">
                  {answers[store.id]?.kind === 'confirmou'
                    ? 'Você confirmou o lugar desta loja. Valeu!'
                    : 'Sua sugestão está no mapa, no pin de alfinete. Valeu!'}
                </p>
                <Button size="sm" variant="ghost" onClick={() => forget(store.id)}>
                  Refazer
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm">A {store.name} fica mesmo neste ponto do mapa?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    icon="check"
                    onClick={() => save(store.id, { kind: 'confirmou' })}
                  >
                    Fica aqui
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="location"
                    onClick={() => {
                      setPlacing(store.id);
                      mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    Fica em outro lugar
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
      {event && (
        <Card tone="muted" className="mt-4 p-4">
          <h2 className="font-display text-xl font-extrabold">{event.label}</h2>
          <p className="text-sm text-ink-soft">{event.text}</p>
          {floor === 'subsolo' && (
            <Button className="mt-3" icon="qr" onClick={() => navigate('/scanner?modo=entrada')}>
              Ler o QR da entrada
            </Button>
          )}
        </Card>
      )}

      {onFloor.length > 0 ? (
        <>
          <FilterChips<Filter>
            className="mt-5"
            label="Mostrar no mapa"
            value={filter}
            onChange={(f) => {
              setFilter(f);
              setSelected(null);
            }}
            options={[
              { value: 'tudo', label: 'Tudo' },
              { value: 'trilha', label: 'Da sua trilha' },
              { value: 'cupom', label: 'Com cupom' },
              { value: 'desejos', label: 'Seus desejos' },
            ]}
          />
          {shown.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              {filter === 'desejos'
                ? 'Nada da sua lista de desejos neste andar.'
                : 'Nenhuma loja com esse filtro neste andar.'}
            </p>
          ) : (
            <ul className="mt-1 flex flex-col gap-2">
              {shown.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => pick(s.id)}
                    aria-pressed={selected === s.id}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left chunk-thin focus-ring ${
                      selected === s.id ? 'bg-gold text-on-gold' : 'bg-surface'
                    }`}
                  >
                    <span className="flex-1">
                      <span className="block font-display font-bold leading-tight">{s.name}</span>
                      <span className="block text-xs opacity-75">{s.category}</span>
                    </span>
                    <span className="flex flex-wrap justify-end gap-1">
                      {wishStores.has(s.id) && <Tag tone="outline">desejo</Tag>}
                      {COUPON_STORES.has(s.id) && <Tag tone="outline">cupom</Tag>}
                      {mine(s) && <Tag tone="outline">sua trilha</Tag>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        !event && (
          <p className="mt-4 text-sm text-ink-soft">
            Estacionamento. Sem lojas, mas com o QR da entrada para o check-in.
          </p>
        )
      )}
      <div className="h-20" aria-hidden />
    </Screen>
  );
}
