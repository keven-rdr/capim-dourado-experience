import { CURRENT_SEASON, FLOOR_LABEL, type Floor, TRAIL_LABEL } from '@cde/shared';
import {
  Button,
  Capi,
  Card,
  CoinRain,
  cx,
  Icon,
  type IconName,
  MissionCard,
  SeasonBanner,
  StreakChip,
  SystemNote,
  Tag,
  useSeason,
  WalletBadge,
  XpBar,
} from '@cde/ui';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame, useGameQuery } from '../data/GameProvider';
import { Capi3D } from '../layout/Capi3D';
import { FlashCard } from '../layout/FlashCard';
import { ProductArt, ProductCard, ProductSheet } from '../layout/Product';
import { brl, productById, productsFor } from '../lib/catalog';
import { HUNT_NOUN, levelInfo, lookOf, SEASON_COPY, seasonInfo } from '../lib/content';
import { createTapCounter, FAKE_LEVEL } from '../lib/eggs';
import { useCue, useDiscover, useKonami, useLongPress, usePokeEgg } from '../lib/useEggs';
import { useWishlist, wishStatus } from '../lib/wishlist';

const FLOOR_SHORTCUTS: Array<{ id: Floor; short: string }> = [
  { id: 'subsolo', short: 'Subsolo 1' },
  { id: 'terreo', short: 'Térreo' },
  { id: 'segundo', short: '2º Pav.' },
];

export function Home() {
  const { profile, today, notify } = useGame();
  const { season } = useSeason();
  const navigate = useNavigate();
  const hunt = useGameQuery(
    (api) => api.getHunt(season).catch(() => api.getHunt(CURRENT_SEASON)),
    [season],
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const { wishes, priceOf } = useWishlist();

  // ovos escondidos (cosméticos): Capi cutucada, Konami, toque longo no nome e barra de XP
  const { cue, fire } = useCue();
  const poke = usePokeEgg(fire);
  const discover = useDiscover();
  const [rain, setRain] = useState(false);
  const [fakeLevel, setFakeLevel] = useState(false);
  const xpTaps = useMemo(() => createTapCounter(), []);
  const fakeTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(fakeTimer.current), []);
  const konami = useCallback(() => {
    setRain(true);
    fire('Festa', 3);
    notify({
      variant: 'info',
      title: 'Código aceito',
      description: 'Vidas extras: 0. Moedas: 0. Mas a intenção contou.',
    });
    discover('konami');
  }, [fire, notify, discover]);
  useKonami(konami);
  const greetingPress = useLongPress(konami);

  if (!profile) return null;
  const myWishes = Object.entries(wishes).flatMap(([id, w]) => {
    const product = productById(id);
    return product ? [{ product, target: w.target, status: wishStatus(w, priceOf(product)) }] : [];
  });
  const { level, next, number } = levelInfo(profile.wallet.xp);
  const info = seasonInfo(season);
  const look = lookOf(profile.character);
  const noun = HUNT_NOUN[season];
  const firstVisit = profile.wallet.xp <= 50 && !today?.checkInDone;
  const atRisk = profile.streak.days > 0 && profile.streak.lastActiveDate !== today?.date;
  const huntState = hunt.data;
  const shown = fakeLevel
    ? { xp: FAKE_LEVEL.xp, min: 0, next: null, name: FAKE_LEVEL.name, number: FAKE_LEVEL.number }
    : {
        xp: profile.wallet.xp,
        min: level.minXp,
        next: next?.minXp ?? null,
        name: level.name,
        number,
      };

  /** 7 toques seguidos na barra: ela "sobe" para o nível 99 e, logo depois, admite a brincadeira. */
  const xpNow = profile.wallet.xp;
  function tapXp() {
    if (xpTaps.tap() < 7) return;
    xpTaps.reset();
    setFakeLevel(true);
    discover('nivel99');
    window.clearTimeout(fakeTimer.current);
    fakeTimer.current = window.setTimeout(() => {
      setFakeLevel(false);
      notify({
        variant: 'info',
        title: 'Brincadeira.',
        description: next ? `Faltam ${next.minXp - xpNow} XP.` : 'Mas você já está no máximo.',
      });
    }, 2500);
  }
  const hint =
    huntState && !huntState.completed
      ? `Psiu: a pista ${huntState.solved + 1} está esperando. Quer ler?`
      : 'Dá uma volta pelo mapa, tem segredo escondido.';

  return (
    <div className="flex flex-1 flex-col px-4 pb-8">
      <header className="flex items-center justify-between gap-2 pb-2 pt-4">
        <Link
          to="/perfil"
          className="flex min-h-11 items-center gap-2 rounded-md pr-2 focus-ring"
          aria-label="Abrir perfil"
          {...greetingPress}
        >
          <span className="grid size-12 place-items-end overflow-hidden rounded-blob bg-gold chunk">
            <Capi size={46} look={look} expression="animada" face className="-mb-2" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-extrabold">Oi, {profile.name}!</span>
            <span className="block text-xs text-ink-soft">{SEASON_COPY[season].greeting}</span>
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <WalletBadge kind="coins" value={profile.wallet.coins} />
          <WalletBadge kind="tickets" value={profile.wallet.tickets} />
        </div>
      </header>

      {/* feed da trilha primeiro: vitrine, oferta relâmpago e desejos; o jogo vem depois */}
      <section className="mt-3" aria-labelledby="vitrine">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 id="vitrine" className="font-display text-xl font-extrabold">
            Vitrine para você · {TRAIL_LABEL[profile.trail]}
          </h2>
        </div>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {productsFor(profile.trail).map((p) => (
            <ProductCard key={p.id} product={p} onOpen={() => setOpenId(p.id)} />
          ))}
        </div>
      </section>

      <FlashCard trail={profile.trail} className="mt-4" />

      {myWishes.length > 0 && (
        <section className="mt-6" aria-labelledby="desejos">
          <h2 id="desejos" className="mb-2 font-display text-xl font-extrabold">
            Seus desejos
          </h2>
          <div className="flex flex-col gap-2">
            {myWishes.map(({ product, status, target }) => (
              <button
                key={product.id}
                type="button"
                onClick={() => setOpenId(product.id)}
                className={`flex min-h-11 items-center gap-3 rounded-md p-2 text-left chunk-thin focus-ring ${
                  status.reached ? 'bg-gold text-on-gold' : 'bg-surface'
                }`}
              >
                <ProductArt product={product} className="size-14 shrink-0 rounded-sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{product.name}</span>
                  <span className="block text-xs">
                    {status.reached
                      ? 'Chegou no seu preço!'
                      : status.dropped > 0
                        ? `Baixou ${brl(status.dropped)} · aviso abaixo de ${brl(target)}`
                        : `Aviso abaixo de ${brl(target)}`}
                  </span>
                </span>
                <span className="shrink-0 font-display font-extrabold">
                  {brl(priceOf(product))}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      <ProductSheet
        product={openId ? (productById(openId) ?? null) : null}
        onClose={() => setOpenId(null)}
      />

      {/* ovo escondido: só um bônus, sem equivalente de teclado (o teclado tem o Konami) */}
      <Card className={cx('mt-6 p-4', fakeLevel && 'animate-shake')} shape="blob" onClick={tapXp}>
        <XpBar
          xp={shown.xp}
          levelMinXp={shown.min}
          nextLevelXp={shown.next}
          levelName={shown.name}
          levelNumber={shown.number}
          nextLevelName={next?.name}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <StreakChip days={profile.streak.days} atRisk={atRisk} />
          {!profile.streak.freezeAvailable && (
            <span className="font-mono text-xs text-ink-soft">folga da semana já usada</span>
          )}
        </div>
      </Card>

      {!profile.locationConsent && (
        <Link
          to="/perfil#privacidade"
          className="mt-4 flex min-h-11 items-center gap-2 rounded-md border-2 border-dashed border-ink-soft/60 px-3 py-2 text-sm focus-ring"
        >
          <Icon name="location" size={18} />
          <span>
            Sem localização você joga com QR, com menos pontos.{' '}
            <strong className="underline">Ativar</strong>
          </span>
        </Link>
      )}

      {/* chamada do check-in: o primeiro passo do dia */}
      {!today?.checkInDone ? (
        <Card className="mt-5 flex items-center gap-3 p-4">
          <div className="flex-1">
            <p className="font-mono text-xs font-bold uppercase">primeiro passo de hoje</p>
            <p className="font-display text-2xl font-extrabold leading-none">Chegou ao shopping?</p>
            <p className="mt-1 text-sm">+30 XP e +10 moedas, uma vez por dia.</p>
          </div>
          <Button icon="location" onClick={() => navigate('/checkin')}>
            Cheguei!
          </Button>
        </Card>
      ) : (
        <div className="mt-5 flex items-center gap-3 rounded-md bg-surface-2 p-3 chunk-thin">
          <Icon name="check" className="text-success" />
          <p className="text-sm font-semibold">Check-in de hoje feito. Agora é caçar.</p>
        </div>
      )}

      <RouletteTeaser />

      <h2 className="mb-3 mt-7 font-display text-xl font-extrabold">Missão do dia</h2>
      {firstVisit && (
        <MissionCard
          kind="welcome"
          title="Boas-vindas à turma!"
          description="Você já ganhou +50 XP só por chegar. Agora faça o check-in."
          current={1}
          target={2}
          reward={{ xp: 50, coins: 0 }}
          size="compact"
          className="mb-4"
        />
      )}
      {huntState ? (
        <MissionCard
          kind="season"
          size="featured"
          title={SEASON_COPY[season].mission}
          description={
            huntState.completed
              ? `Todos os ${noun.many} encontrados. Que olho!`
              : `${huntState.hunt.title}: ${huntState.solved} de ${huntState.hunt.clues.length} ${noun.many}.`
          }
          current={huntState.solved}
          target={huntState.hunt.clues.length}
          reward={{
            ...huntState.hunt.finalReward,
            sticker: !!huntState.hunt.finalReward.stickerId,
          }}
          onClick={() => navigate('/caca')}
        />
      ) : (
        <div className="h-48 animate-pulse rounded-blob bg-surface-2 chunk" />
      )}

      <Capi3D
        className="mt-6"
        size={120}
        intro={new Date().getHours() < 12 ? 'Espreguica' : 'Acenar'}
        cue={cue}
        say={poke.line ?? hint}
        idleReactions
        onTap={() => void poke.onTap()}
      />

      <SeasonBanner
        className="mt-2"
        name={info.name}
        theme={info.theme}
        tagline={info.tagline}
        look={look}
        action={
          <Button
            size="sm"
            variant="secondary"
            iconRight="arrowRight"
            onClick={() => navigate('/album')}
          >
            Álbum da temporada
          </Button>
        }
      />

      <h2 className="mb-3 mt-7 font-display text-xl font-extrabold">Os andares são as fases</h2>
      <ol className="flex flex-col-reverse gap-2">
        {FLOOR_SHORTCUTS.map((f, i) => (
          <li key={f.id}>
            <Link
              to={`/mapa?andar=${f.id}`}
              className={`flex min-h-14 items-center justify-between rounded-md bg-surface px-4 py-2 chunk shadow-hard-sm focus-ring pressable`}
            >
              <span>
                <span className="font-mono text-xs font-bold text-ink-soft">
                  fase {String(i + 1).padStart(2, '0')}
                </span>
                <span className="block font-display text-lg font-extrabold leading-tight">
                  {f.short}
                </span>
              </span>
              <span className="max-w-[45%] text-right text-xs text-ink-soft">
                {FLOOR_LABEL[f.id]}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-6 grid grid-cols-[1.2fr_1fr] gap-3">
        <Shortcut to="/album" icon="album" label="Álbum" tone="bg-gold text-on-gold" />
        <Shortcut
          to="/recompensas"
          icon="ticket"
          label="Cupons"
          tone="bg-secondary text-on-secondary"
        />
      </div>

      {rain && <CoinRain onDone={() => setRain(false)} />}

      <SystemNote className="mt-6">
        a Home só compõe componentes da @cde/ui; a temporada muda os tokens, a fantasia da Capi e os
        textos.
      </SystemNote>
    </div>
  );
}

/** Convite da roleta: mostra os giros do dia e avisa quando é hora dourada. */
function RouletteTeaser() {
  const navigate = useNavigate();
  const { data } = useGameQuery((api) => api.getRoulette());
  if (!data) return null;

  const golden = data.goldenNow;
  const left = data.spinsLeft;
  let title: string;
  let hint: string;
  if (!data.checkedIn) {
    title = golden ? 'Hora dourada: giros em dobro' : 'Check-in vale giro na roleta';
    hint = golden
      ? 'Faça o check-in agora e ganhe 2 giros.'
      : 'Faça o check-in e gire por um cupom de loja.';
  } else if (left > 0) {
    title = `Você tem ${left} ${left === 1 ? 'giro' : 'giros'}`;
    hint = golden ? 'Hora dourada ligada.' : 'Gire por um cupom de loja.';
  } else {
    title = 'Giros de hoje usados';
    hint = 'Seus cupons estão em Prêmios. Amanhã tem mais.';
  }

  return (
    <button
      type="button"
      onClick={() => navigate(data.checkedIn && left < 1 ? '/recompensas' : '/roleta')}
      className="mt-4 flex min-h-16 w-full items-center gap-3 rounded-lg bg-gold px-4 py-3 text-left text-on-gold chunk shadow-hard focus-ring pressable"
    >
      <Icon name="gift" size={28} />
      <span className="flex-1 leading-tight">
        <span className="block font-display text-lg font-extrabold">{title}</span>
        <span className="block text-xs font-semibold">{hint}</span>
      </span>
      {golden && <Tag tone="ink">dourada</Tag>}
      <Icon name="arrowRight" size={20} />
    </button>
  );
}

function Shortcut({
  to,
  icon,
  label,
  tone,
}: {
  to: string;
  icon: IconName;
  label: string;
  tone: string;
}) {
  return (
    <Link
      to={to}
      className={`flex min-h-16 items-center gap-2 rounded-lg px-4 font-display text-lg font-extrabold chunk shadow-hard focus-ring pressable ${tone}`}
    >
      <Icon name={icon} /> {label}
    </Link>
  );
}
