import { COUPONS, FLOOR_LABEL, type Floor, TRAIL_LABEL } from '@cde/shared';
import { Button, Card, FloorTabs, MapPin, SystemNote, Tag } from '@cde/ui';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame, useGameQuery } from '../data/GameProvider';
import { Screen } from '../layout/Screen';

const FLOORS: Array<{ id: Floor; label: string; short: string }> = [
  { id: 'subsolo', label: FLOOR_LABEL.subsolo, short: 'Subsolo 1' },
  { id: 'terreo', label: FLOOR_LABEL.terreo, short: 'Térreo' },
  { id: 'segundo', label: FLOOR_LABEL.segundo, short: '2º Pav.' },
];

const EVENTS: Record<Floor, Array<{ id: string; label: string; x: number; y: number }>> = {
  terreo: [
    { id: 'ev-praca', label: 'Praça de Eventos', x: 30, y: 40 },
    { id: 'ev-familia', label: 'Espaço Família', x: 74, y: 50 },
  ],
  segundo: [{ id: 'ev-escada', label: 'Escadas rolantes', x: 50, y: 52 }],
  subsolo: [{ id: 'ev-entrada', label: 'Entrada (QR do check-in)', x: 50, y: 34 }],
};

/** Blocos estilizados das áreas públicas. Não é a planta do shopping. */
function FloorArt({ floor }: { floor: Floor }) {
  const block = 'fill-surface stroke-line';
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full"
      aria-hidden="true"
    >
      <g strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round">
        {floor === 'terreo' && (
          <>
            <path
              d="M6 10h88v80H6z"
              className="fill-surface-2 stroke-line"
              vectorEffect="non-scaling-stroke"
            />
            <path d="M6 38h88v14H6zM38 10h14v80H38z" className="fill-paper" stroke="none" />
            <path
              d="M8 12h28v24H8zM54 12h38v24H54zM8 54h28v34H8zM54 54h38v34H54z"
              className={block}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx="45"
              cy="45"
              r="6"
              className="fill-gold stroke-line"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
        {floor === 'segundo' && (
          <>
            <path
              d="M10 8h80v84H10z"
              className="fill-surface-2 stroke-line"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M14 12h72v18H14zM14 70h72v18H14z"
              className={block}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M24 38h52v24H24z"
              className="fill-paper stroke-line"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            {[30, 42, 54, 66].map((x) => (
              <circle
                key={x}
                cx={x}
                cy="50"
                r="3"
                className="fill-gold stroke-line"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </>
        )}
        {floor === 'subsolo' && (
          <>
            <path
              d="M6 14h88v72H6z"
              className="fill-surface-2 stroke-line"
              vectorEffect="non-scaling-stroke"
            />
            {[12, 24, 36, 48, 60, 72, 84].map((x) => (
              <path
                key={x}
                d={`M${x} 46v16M${x} 70v12`}
                className="stroke-ink-soft"
                strokeDasharray="2 2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path
              d="M40 18h20v12H40z"
              className="fill-gold stroke-line"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </g>
    </svg>
  );
}

export function MapScreen() {
  const { profile } = useGame();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initial = params.get('andar');
  const floor: Floor = initial === 'segundo' || initial === 'subsolo' ? initial : 'terreo';
  const [selected, setSelected] = useState<string | null>(null);
  const stores = useGameQuery((api) => api.listStores());

  const onFloor = (stores.data ?? []).filter((s) => s.floor === floor);
  const store = onFloor.find((s) => s.id === selected);
  const event = EVENTS[floor].find((e) => e.id === selected);
  const coupon = store ? COUPONS.find((c) => c.storeId === store.id) : undefined;

  return (
    <Screen kicker="o mapa do jogo" title="Pavimentos">
      <FloorTabs
        floors={FLOORS}
        value={floor}
        panelId="mapa-painel"
        onChange={(id) => {
          setSelected(null);
          setParams({ andar: id }, { replace: true });
        }}
      />
      <p className="mt-3 font-display text-base font-bold">{FLOOR_LABEL[floor]}</p>

      <div
        id="mapa-painel"
        role="tabpanel"
        className="relative mt-2 aspect-square overflow-hidden rounded-lg bg-bg chunk shadow-hard"
      >
        <FloorArt floor={floor} />
        {onFloor.map((s) => (
          <MapPin
            key={s.id}
            kind="store"
            label={s.name}
            x={s.map.x}
            y={s.map.y}
            selected={selected === s.id}
            dimmed={!!profile && !s.trails.includes(profile.trail) && !s.trails.includes('todos')}
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
        <span className="absolute bottom-2 right-2 rounded-xs bg-surface px-1.5 py-0.5 font-mono text-xs font-bold chunk-thin">
          áreas públicas · fora de escala
        </span>
      </div>

      {store && (
        <Card tilt="left" className="mt-5 p-4">
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
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
              Cupom: {coupon.title} por {coupon.cost} moedas
            </p>
          )}
          <p className="mt-2 text-sm">
            Leia o QR na vitrine: +15 XP e +5 moedas, uma vez por dia (parceria de exemplo).
          </p>
          <Button className="mt-3" icon="qr" onClick={() => navigate(`/scanner?loja=${store.id}`)}>
            Ler o QR da vitrine
          </Button>
        </Card>
      )}
      {event && (
        <Card tone="muted" className="mt-5 p-4">
          <h2 className="font-display text-xl font-extrabold">{event.label}</h2>
          <p className="text-sm text-ink-soft">
            {floor === 'subsolo'
              ? 'No Subsolo 1 o GPS é fraco: o QR da entrada faz o check-in.'
              : 'Área pública. Fique de olho: segredos aparecem em lugares assim.'}
          </p>
        </Card>
      )}
      {!store && !event && floor === 'subsolo' && (
        <p className="mt-4 text-sm text-ink-soft">
          Estacionamento. Sem lojas, mas com o QR da entrada para o check-in.
        </p>
      )}
      {!store && !event && floor !== 'subsolo' && (
        <p className="mt-4 text-sm text-ink-soft">
          Toque num pin para ver a loja. Lojas da sua trilha aparecem em destaque.
        </p>
      )}

      <SystemNote className="mt-6">
        desenho simplificado só com áreas públicas; as posições vêm de store.map em @cde/shared.
      </SystemNote>
    </Screen>
  );
}
