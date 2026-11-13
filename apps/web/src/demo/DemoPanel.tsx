import { CURRENT_SEASON, demoQr, localDate, SECRETS, STORES } from '@cde/shared';
import {
  Button,
  FilterChips,
  type FilterOption,
  Icon,
  SEASON_IDS,
  SEASON_THEME,
  type Season,
  Sheet,
  SystemNote,
  usePortalTarget,
  useSeason,
} from '@cde/ui';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { type ScanOutcome, useGame } from '../data/GameProvider';
import {
  consumeOpenOnStart,
  type DemoLocation,
  demoNow,
  resetDemo,
  setDemo,
  useDemo,
} from './demoStore';

const OPEN_EVENT = 'cde:demo-open';

/** Abre o painel da demonstração de qualquer lugar (ex.: painel lateral em telas largas). */
export function openDemoPanel() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const LOCATIONS: ReadonlyArray<FilterOption<DemoLocation>> = [
  { value: 'inside', label: 'No shopping' },
  { value: 'outside', label: 'Fora' },
  { value: 'imprecise', label: 'GPS impreciso' },
  { value: 'denied', label: 'Sem permissão' },
  { value: 'real', label: 'GPS real' },
];

/**
 * Painel discreto do modo demonstração: simula localização, leituras de QR, temporada,
 * passagem de dias e reinício. Funciona 100% offline com o LocalGameApi.
 */
export function DemoPanel() {
  const { mode, api, local, profile, scan, notify, advanceDay, resetAll } = useGame();
  const { season, setSeason } = useSeason();
  const demo = useDemo();
  const target = usePortalTarget();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    if (consumeOpenOnStart()) setOpen(true);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  if (mode !== 'local') return null;

  function report(outcome: ScanOutcome) {
    if (!outcome.ok)
      notify({ variant: 'warning', title: outcome.title, description: outcome.message });
  }

  async function run(id: string, task: () => Promise<void>) {
    setBusy(id);
    try {
      await task();
    } finally {
      setBusy(null);
    }
  }

  const needsProfile = !profile;

  const scanNextClue = () =>
    run('clue', async () => {
      const hunt = await api.getHunt(season).catch(() => api.getHunt(CURRENT_SEASON));
      if (hunt.completed) {
        notify({
          variant: 'info',
          title: 'A caça já está completa',
          description: 'Reinicie os dados para jogar de novo.',
        });
        return;
      }
      setOpen(false);
      report(await scan(demoQr('clue', `${hunt.hunt.id}:${hunt.solved + 1}`)));
    });

  /** Tenta os códigos em ordem até achar um que ainda não foi usado. */
  const scanFirstNew = (id: string, tokens: string[], emptyTitle: string) =>
    run(id, async () => {
      setOpen(false);
      for (const token of tokens) {
        const outcome = await scan(token);
        if (outcome.ok) return;
        if (outcome.code !== 'qr_already_used') {
          report(outcome);
          return;
        }
      }
      notify({ variant: 'info', title: emptyTitle });
    });

  const trailStores = profile
    ? [...STORES].sort(
        (a, b) =>
          Number(b.trails.includes(profile.trail)) - Number(a.trails.includes(profile.trail)),
      )
    : [...STORES];

  const panel = (
    <Sheet
      open={open}
      onClose={() => setOpen(false)}
      title="Modo demonstração"
      description="Para apresentar sem GPS, sem câmera e fora do horário. Tudo fica neste navegador."
    >
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="mb-2 font-mono text-xs font-bold uppercase text-ink-soft">
            Onde eu estou
          </h3>
          <FilterChips
            label="Localização simulada"
            options={LOCATIONS}
            value={demo.location}
            onChange={(value) => setDemo({ location: value })}
          />
          {location.pathname !== '/checkin' && (
            <Button
              size="sm"
              variant="secondary"
              iconRight="arrowRight"
              disabled={needsProfile}
              onClick={() => {
                setOpen(false);
                navigate('/checkin');
              }}
            >
              Ir para o check-in
            </Button>
          )}
        </section>

        <section>
          <h3 className="mb-2 font-mono text-xs font-bold uppercase text-ink-soft">
            Simular leitura de QR
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              size="sm"
              icon="gift"
              disabled={needsProfile}
              loading={busy === 'clue'}
              onClick={scanNextClue}
            >
              Próxima pista
            </Button>
            <Button
              size="sm"
              variant="gold"
              icon="sparkle"
              disabled={needsProfile}
              loading={busy === 'secret'}
              onClick={() =>
                scanFirstNew(
                  'secret',
                  SECRETS.map((s) => demoQr('secret', s.id)),
                  'Todos os segredos já foram achados',
                )
              }
            >
              Um segredo
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon="pin"
              disabled={needsProfile}
              loading={busy === 'store'}
              onClick={() =>
                scanFirstNew(
                  'store',
                  trailStores.map((s) => demoQr('store', s.id)),
                  'Todas as lojas de hoje já foram visitadas',
                )
              }
            >
              Uma loja
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon="qr"
              disabled={needsProfile}
              loading={busy === 'entrada'}
              onClick={() =>
                run('entrada', async () => {
                  setOpen(false);
                  report(await scan(demoQr('checkin', 'entrada')));
                })
              }
            >
              QR da entrada
            </Button>
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-mono text-xs font-bold uppercase text-ink-soft">Temporada</h3>
          <FilterChips<Season>
            label="Temporada"
            options={SEASON_IDS.map((id) => ({ value: id, label: SEASON_THEME[id].label }))}
            value={season}
            onChange={setSeason}
          />
        </section>

        <section>
          <h3 className="mb-2 font-mono text-xs font-bold uppercase text-ink-soft">Tempo</h3>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              size="sm"
              icon="calendar"
              variant="secondary"
              loading={busy === 'day'}
              disabled={needsProfile}
              onClick={() => run('day', advanceDay)}
            >
              Avançar 1 dia
            </Button>
            <span className="font-mono text-xs font-bold">
              hoje no jogo: {formatDay(localDate(demoNow()))}
              {demo.dayOffset > 0 && ` (+${demo.dayOffset})`}
            </span>
          </div>
          <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              className="size-5 accent-[var(--cde-primary)]"
              checked={demo.respectHours}
              onChange={(e) => setDemo({ respectHours: e.target.checked })}
            />
            Respeitar o horário do shopping
          </label>
        </section>

        <section className="flex flex-col gap-2.5">
          <h3 className="font-mono text-xs font-bold uppercase text-ink-soft">Dados</h3>
          <Button
            size="sm"
            variant="gold"
            icon="user"
            onClick={() => {
              resetDemo();
              local?.seedExample();
              window.location.assign('/');
            }}
          >
            Carregar perfil de exemplo (Marina)
          </Button>
          <Button
            size="sm"
            variant="danger"
            icon="refresh"
            onClick={async () => {
              resetDemo();
              await resetAll();
              setOpen(false);
              navigate('/bem-vindo');
            }}
          >
            Reiniciar os dados
          </Button>
        </section>

        <SystemNote>
          tudo roda no LocalGameApi, com as regras de @cde/shared. Com VITE_API_URL, o app usa a API
          de verdade (abra com ?demo=1 para forçar este modo).
        </SystemNote>
      </div>
    </Sheet>
  );

  return (
    <>
      {target &&
        createPortal(
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir o painel do modo demonstração"
            className="fixed right-0 top-1/3 z-40 flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-l-md border-y-2 border-l-2 border-line bg-ink px-1.5 font-mono text-xs font-bold text-bg opacity-70 [writing-mode:vertical-rl] focus-ring hover:opacity-100"
          >
            <Icon name="bolt" size={16} /> demo
          </button>,
          target,
        )}
      {panel}
    </>
  );
}

function formatDay(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}
