import { COUPONS, FLOOR_LABEL, type Floor, MISSIONS } from '@cde/shared';
import {
  AchievementToast,
  BottomNav,
  Button,
  CAPI_EXPRESSIONS,
  CAPI_LOOKS,
  Capi,
  Card,
  Chip,
  CouponTicket,
  ExampleTag,
  FilterChips,
  FloorTabs,
  ICON_NAMES,
  Icon,
  MapPin,
  MissionCard,
  type NavLinkLikeProps,
  PuzzleMap,
  ScannerFrame,
  SEASON_IDS,
  SEASON_THEME,
  type Season,
  SeasonBanner,
  SeasonScope,
  Sheet,
  SpeechBubble,
  StatusRing,
  StickerCard,
  StreakChip,
  SystemNote,
  Tag,
  TreasureReveal,
  useSeason,
  WalletBadge,
  XpBar,
} from '@cde/ui';
import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEASON_COPY, seasonInfo } from '../lib/content';

const COLOR_TOKENS = [
  ['--cde-bg', 'fundo'],
  ['--cde-surface', 'superfície'],
  ['--cde-surface-2', 'superfície 2'],
  ['--cde-ink', 'texto'],
  ['--cde-line', 'borda'],
  ['--cde-primary', 'ação principal'],
  ['--cde-secondary', 'apoio'],
  ['--cde-accent', 'progresso'],
  ['--cde-gold', 'XP e prêmio'],
  ['--cde-paper', 'papel'],
] as const;

const FLOORS: Array<{ id: Floor; label: string; short: string }> = [
  { id: 'terreo', label: FLOOR_LABEL.terreo, short: 'Térreo' },
  { id: 'segundo', label: FLOOR_LABEL.segundo, short: '2º Pav.' },
  { id: 'subsolo', label: FLOOR_LABEL.subsolo, short: 'Subsolo 1' },
];

const missionDemo = MISSIONS.find((m) => m.id === 'm-natal') ?? MISSIONS[0];
const couponDemo = COUPONS[0];

function FakeLink({ href, children, ...rest }: NavLinkLikeProps) {
  return (
    <a href={href} onClick={(e) => e.preventDefault()} {...rest}>
      {children}
    </a>
  );
}

/** Catálogo da @cde/ui: todos os componentes, variações e estados, com troca de temporada ao vivo. */
export function Catalog() {
  const { season, setSeason } = useSeason();
  const [sheet, setSheet] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [floor, setFloor] = useState<Floor>('terreo');
  const [chip, setChip] = useState('todos');
  const [pin, setPin] = useState('cinemark');

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="sticky top-0 z-40 border-b-[3px] border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              aria-label="Voltar ao app"
              className="grid size-11 place-items-center rounded-sm chunk-thin focus-ring"
            >
              <Icon name="chevronLeft" />
            </Link>
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink-soft">
                @cde/ui
              </p>
              <h1 className="font-display text-2xl font-extrabold leading-none">
                Catálogo de componentes
              </h1>
            </div>
          </div>
          <FilterChips<Season>
            label="Temporada"
            options={SEASON_IDS.map((id) => ({ value: id, label: SEASON_THEME[id].label }))}
            value={season}
            onChange={setSeason}
          />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-24">
        <section className="grid gap-6 py-8 md:grid-cols-[1.3fr_1fr] md:items-end">
          <div>
            <h2 className="font-display text-4xl font-extrabold leading-[0.95] tracking-tight md:text-5xl">
              Uma biblioteca.
              <br />
              Três roupas.
            </h2>
            <p className="mt-3 max-w-prose text-base text-ink-soft">
              Toda tela do app é montada com estes componentes. As temporadas redefinem só os tokens
              de design (cores, fontes, raios, fantasia da Capi); a estrutura nunca muda. Troque a
              temporada lá em cima e veja tudo mudar junto.
            </p>
          </div>
          <SystemNote label="como funciona">
            {'<html data-season="'}
            {season}
            {'">'} redefine variáveis --cde-*; o Tailwind lê essas variáveis via @theme inline.
          </SystemNote>
        </section>

        {/* ---------- prova de componentização ---------- */}
        <section aria-labelledby="tres" className="rounded-xl bg-ink p-4 text-bg md:p-6">
          <h2 id="tres" className="font-display text-3xl font-extrabold">
            Um componente, três temporadas
          </h2>
          <p className="mt-1 text-sm opacity-80">
            Mesmo código, mesmas props. Cada coluna só tem um atributo data-season diferente.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {SEASON_IDS.map((id) => (
              <SeasonScope
                key={id}
                season={id}
                className="flex flex-col gap-5 rounded-lg p-4 chunk"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs font-bold uppercase">data-season="{id}"</p>
                  <Capi size={58} expression="animada" />
                </div>
                <MissionCard
                  kind="season"
                  title={seasonInfo(id).theme}
                  description={SEASON_COPY[id].mission}
                  current={2}
                  target={5}
                  reward={{ xp: 100, coins: 40, tickets: 1, sticker: true }}
                  size="featured"
                />
                {couponDemo && (
                  <CouponTicket
                    title={couponDemo.title}
                    storeName={couponDemo.storeName}
                    cost={couponDemo.cost}
                    validDays={couponDemo.validDays}
                    onRedeem={() => {}}
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm">Primário</Button>
                  <Button size="sm" variant="secondary">
                    Secundário
                  </Button>
                </div>
              </SeasonScope>
            ))}
          </div>
        </section>

        {/* ---------- tokens ---------- */}
        <Specimen name="Tokens de design" note="variáveis CSS em packages/ui/src/styles.css">
          <div className="grid w-full gap-5">
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {COLOR_TOKENS.map(([token, label]) => (
                <li key={token} className="overflow-hidden rounded-sm bg-surface chunk-thin">
                  <span
                    className="block h-12 border-b-2 border-line"
                    style={{ background: `var(${token})` }}
                  />
                  <span className="block px-2 py-1.5">
                    <span className="block font-mono text-xs font-bold">{token}</span>
                    <span className="block text-xs text-ink-soft">{label}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="font-mono text-xs text-ink-soft">--cde-font-display</p>
                <p className="font-display text-3xl font-extrabold leading-none">
                  Achou o presente!
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-ink-soft">--cde-font-body</p>
                <p className="text-base">Texto curto, em tom de conversa, nunca menor que 14 px.</p>
              </div>
              <div>
                <p className="font-mono text-xs text-ink-soft">--cde-font-mono</p>
                <p className="font-mono text-3xl font-extrabold">+340 XP</p>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              {(
                ['rounded-xs', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-blob'] as const
              ).map((r) => (
                <div key={r} className="text-center">
                  <div className={`size-16 bg-gold chunk shadow-hard ${r}`} />
                  <p className="mt-2 font-mono text-xs">{r}</p>
                </div>
              ))}
              {(['shadow-hard-sm', 'shadow-hard', 'shadow-hard-lg'] as const).map((s) => (
                <div key={s} className="text-center">
                  <div className={`size-16 rounded-md bg-surface chunk ${s}`} />
                  <p className="mt-2 font-mono text-xs">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </Specimen>

        <Specimen name="Capi" note="4 expressões, 4 visuais, fantasia por temporada">
          {CAPI_EXPRESSIONS.map((e) => (
            <figure key={e} className="text-center">
              <Capi size={110} expression={e} />
              <figcaption className="font-mono text-xs">{e}</figcaption>
            </figure>
          ))}
          <div className="flex w-full flex-wrap gap-4 border-t-2 border-dashed border-ink-soft/40 pt-4">
            {CAPI_LOOKS.map((l) => (
              <figure key={l.id} className="text-center">
                <Capi size={80} look={l.id} expression="animada" />
                <figcaption className="font-display text-sm font-bold">{l.name}</figcaption>
              </figure>
            ))}
            <figure className="text-center">
              <Capi size={80} costume={false} />
              <figcaption className="font-mono text-xs">sem fantasia</figcaption>
            </figure>
          </div>
        </Specimen>

        <Specimen
          name="Button"
          note="primary · secondary · gold · ghost · danger | padrão, foco (Tab), desabilitado, carregando"
        >
          <Button icon="location">Cheguei!</Button>
          <Button variant="secondary">Agora não</Button>
          <Button variant="gold" icon="coin">
            Trocar moedas
          </Button>
          <Button variant="ghost">Pular</Button>
          <Button variant="danger" icon="trash">
            Apagar
          </Button>
          <Button disabled>Desabilitado</Button>
          <Button loading loadingLabel="Verificando">
            Verificando
          </Button>
          <Button size="sm">Pequeno 44 px</Button>
          <Button size="lg" iconRight="arrowRight">
            Grande
          </Button>
        </Specimen>

        <Specimen
          name="MissionCard"
          note="featured · default · compact | em andamento, concluída, clicável"
        >
          <div className="grid w-full gap-5 md:grid-cols-3">
            {missionDemo && (
              <MissionCard
                kind={missionDemo.kind}
                title={missionDemo.title}
                description={missionDemo.description}
                current={2}
                target={missionDemo.target}
                reward={{ ...missionDemo.reward, sticker: true }}
                size="featured"
              />
            )}
            <MissionCard
              kind="weekly"
              title="Maratona de lojas"
              description="Visite 5 lojas parceiras nesta semana."
              current={3}
              target={5}
              reward={{ xp: 60, coins: 30 }}
              onClick={() => {}}
            />
            <div className="flex flex-col gap-3">
              <MissionCard
                kind="daily"
                title="Cheguei!"
                current={1}
                target={1}
                reward={{ xp: 30, coins: 10 }}
                size="compact"
              />
              <MissionCard
                kind="store"
                title="Visite a Leitura"
                current={0}
                target={1}
                reward={{ xp: 15, coins: 5 }}
                size="compact"
              />
              <MissionCard
                kind="welcome"
                title="Boas-vindas"
                current={0}
                target={1}
                reward={{ xp: 50, coins: 0 }}
                size="compact"
              />
            </div>
          </div>
        </Specimen>

        <Specimen
          name="XpBar · StreakChip · WalletBadge"
          note="nível e progresso | sequência normal, em risco, baú | pill e tile"
        >
          <div className="w-full max-w-sm">
            <XpBar
              xp={340}
              levelMinXp={300}
              nextLevelXp={800}
              levelName="Aventureiro"
              levelNumber={2}
              nextLevelName="Caçador"
              fromXp={300}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <StreakChip days={5} />
            <StreakChip days={7} />
            <StreakChip days={3} atRisk />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <WalletBadge kind="xp" value={340} />
            <WalletBadge kind="coins" value={90} />
            <WalletBadge kind="tickets" value={1} />
          </div>
          <div className="grid w-full grid-cols-3 gap-2 sm:max-w-md">
            <WalletBadge kind="xp" value={340} variant="tile" hint="Mede o nível. Nunca diminui." />
            <WalletBadge kind="coins" value={90} variant="tile" hint="Troca por cupons." />
            <WalletBadge kind="tickets" value={1} variant="tile" hint="Chances no sorteio." />
          </div>
        </Specimen>

        <Specimen
          name="CouponTicket"
          note="disponível · resgatado · expirado · sem saldo | todo cupom traz a marca exemplo"
        >
          <div className="grid w-full gap-5 md:grid-cols-2">
            <CouponTicket
              title="Pipoca média"
              storeName="Cinemark"
              cost={120}
              validDays={7}
              trailLabel="Para todos"
              onRedeem={() => {}}
            />
            <CouponTicket
              title="Pipoca média"
              storeName="Cinemark"
              cost={120}
              validDays={7}
              loading
              onRedeem={() => {}}
            />
            <CouponTicket
              title="Casquinha"
              storeName="McDonald's"
              cost={60}
              validDays={7}
              state="redeemed"
              code="CDE-K7QX-4M"
              deadlineLabel="vence em 6 dias e 23 h"
              onShow={() => {}}
            />
            <CouponTicket
              title="10% em brinquedos"
              storeName="Ri Happy"
              cost={150}
              validDays={10}
              state="expired"
            />
            <CouponTicket
              title="15 minutos extras"
              storeName="Wow Park"
              cost={180}
              validDays={10}
              state="insufficient"
              missingCoins={90}
              onEarn={() => {}}
            />
          </div>
        </Specimen>

        <Specimen name="StickerCard" note="comum · rara (brilho) · trancada (silhueta)">
          <div className="grid w-full max-w-lg grid-cols-4 gap-3">
            <StickerCard
              name="Presente vermelho"
              rarity="comum"
              motif="gift"
              number="02"
              tiltDeg={-2}
            />
            <StickerCard name="Capi Dourada" rarity="rara" motif="capi" number="12" tiltDeg={1.5} />
            <StickerCard
              name="Sino da praça"
              rarity="comum"
              motif="bell"
              number="07"
              locked
              hint="Segredo da praça"
              tiltDeg={-1}
            />
            <StickerCard
              name="Guirlanda trançada"
              rarity="rara"
              motif="wreath"
              number="11"
              locked
              hint="Baú dos 7 dias"
              tiltDeg={2}
            />
          </div>
        </Specimen>

        <Specimen
          name="MapPin · FloorTabs"
          note="loja · segredo · evento · você | aba ativa com setas do teclado"
        >
          <div className="w-full max-w-md">
            <FloorTabs floors={FLOORS} value={floor} onChange={setFloor} />
            <div className="relative mt-4 h-52 rounded-lg bg-surface-2 chunk">
              <MapPin
                kind="store"
                label="Cinemark"
                x={75}
                y={45}
                selected={pin === 'cinemark'}
                onSelect={() => setPin('cinemark')}
              />
              <MapPin
                kind="store"
                label="Leitura"
                x={30}
                y={55}
                selected={pin === 'leitura'}
                onSelect={() => setPin('leitura')}
              />
              <MapPin
                kind="secret"
                label="Segredo"
                x={50}
                y={80}
                selected={pin === 'segredo'}
                onSelect={() => setPin('segredo')}
              />
              <MapPin
                kind="event"
                label="Praça de Eventos"
                x={52}
                y={35}
                selected={pin === 'evento'}
                onSelect={() => setPin('evento')}
              />
              <MapPin kind="you" label="Você está aqui" x={18} y={88} />
            </div>
          </div>
        </Specimen>

        <Specimen
          name="Chip · FilterChips · Tag"
          note="selecionado, normal, desabilitado | rótulos mono"
        >
          <div className="flex flex-wrap gap-2">
            <Chip selected>Selecionado</Chip>
            <Chip icon="star">Com ícone</Chip>
            <Chip count={3}>Com contador</Chip>
            <Chip disabled>Desabilitado</Chip>
          </div>
          <FilterChips
            label="Trilha"
            value={chip}
            onChange={setChip}
            options={[
              { value: 'todos', label: 'Tudo' },
              { value: 'kids', label: 'Kids' },
              { value: 'ela', label: 'Ela' },
              { value: 'ele', label: 'Ele' },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <Tag>ink</Tag>
            <Tag tone="primary">primary</Tag>
            <Tag tone="gold" icon="sparkle">
              rara
            </Tag>
            <ExampleTag />
          </div>
        </Specimen>

        <Specimen name="AchievementToast" note="sucesso · figurinha · baú · aviso">
          <div className="grid w-full gap-3 md:grid-cols-2">
            <AchievementToast
              variant="success"
              title="Check-in feito!"
              reward="+30 XP · +10 moedas"
              duration={0}
            />
            <AchievementToast
              variant="sticker"
              title="Sino da praça"
              description="Foi para o álbum."
              duration={0}
            />
            <AchievementToast
              variant="chest"
              title="7 dias seguidos! Baú aberto."
              reward="+60 XP · +30 moedas · +1 bilhete"
              duration={0}
            />
            <AchievementToast
              variant="warning"
              title="Faltam algumas moedas"
              description="Uma missão rápida resolve."
              duration={0}
            />
          </div>
        </Specimen>

        <Specimen
          name="ScannerFrame · StatusRing"
          note="aguardando · lendo · erro · sucesso | anel do check-in"
        >
          {(['idle', 'scanning', 'error', 'success'] as const).map((s) => (
            <div key={s} className="w-40">
              <ScannerFrame state={s} />
            </div>
          ))}
          <div className="flex flex-wrap gap-6">
            <StatusRing state="idle" size={110}>
              <Icon name="location" size={40} />
            </StatusRing>
            <StatusRing state="busy" size={110}>
              <Icon name="compass" size={40} />
            </StatusRing>
            <StatusRing state="warning" size={110}>
              <Icon name="info" size={40} />
            </StatusRing>
          </div>
        </Specimen>

        <Specimen
          name="SeasonBanner · PuzzleMap · SpeechBubble · SystemNote"
          note="faixa da temporada, peças do mapa, fala da Capi, nota para a banca"
        >
          <div className="grid w-full gap-5 md:grid-cols-2">
            <SeasonBanner
              name={seasonInfo(season).name}
              theme={seasonInfo(season).theme}
              tagline={seasonInfo(season).tagline}
            />
            <div className="flex flex-col gap-4">
              <PuzzleMap total={5} collected={2} labels={['Praça de Eventos central', 'Leitura']} />
              <SpeechBubble>Psiu! Tem presente perto da livraria.</SpeechBubble>
              <SystemNote>
                compara a localização com a área do shopping e guarda só "dentro" ou "fora".
              </SystemNote>
            </div>
          </div>
        </Specimen>

        <Specimen name="BottomNav" note="cinco itens, item ativo, centro em destaque">
          <div className="w-full max-w-sm overflow-hidden rounded-lg chunk pt-8">
            <BottomNav
              className="static"
              activeId="home"
              linkAs={FakeLink}
              items={[
                { id: 'home', label: 'Início', icon: 'home', href: '#' },
                { id: 'missoes', label: 'Missões', icon: 'target', href: '#' },
                { id: 'scanner', label: 'Ler QR', icon: 'qr', href: '#', emphasis: true },
                { id: 'mapa', label: 'Mapa', icon: 'map', href: '#' },
                { id: 'recompensas', label: 'Prêmios', icon: 'gift', href: '#' },
              ]}
            />
          </div>
        </Specimen>

        <Specimen
          name="Sheet · TreasureReveal · Card"
          note="folha com foco preso e Esc | revelação do QR (pulável) | superfície base"
        >
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Abrir Sheet
          </Button>
          <Button variant="gold" icon="gift" onClick={() => setReveal(true)}>
            Tocar a revelação
          </Button>
          <Card tone="paper" tilt="left" className="max-w-xs p-4">
            <p className="font-display text-lg font-extrabold">Card tone="paper" tilt="left"</p>
            <p className="text-sm">Inclinação só em pontos de destaque.</p>
          </Card>
          <Sheet
            open={sheet}
            onClose={() => setSheet(false)}
            title="Resgatar a pipoca?"
            description="Custa 120 moedas. Fica com você por 7 dias."
            footer={
              <>
                <Button block onClick={() => setSheet(false)}>
                  Resgatar
                </Button>
                <Button block variant="secondary" onClick={() => setSheet(false)}>
                  Agora não
                </Button>
              </>
            }
          >
            <ExampleTag />
          </Sheet>
          <TreasureReveal
            open={reveal}
            title="Presente 3 de 5!"
            subtitle="Estava em: Ri Happy"
            reward={{ xp: 40, coins: 10 }}
            puzzle={{
              total: 5,
              collected: 3,
              labels: ['Praça de Eventos central', 'Leitura', 'Ri Happy'],
            }}
            actions={
              <Button block size="lg" onClick={() => setReveal(false)}>
                Fechar
              </Button>
            }
            onClose={() => setReveal(false)}
          />
        </Specimen>

        <Specimen name="Icon" note={`${ICON_NAMES.length} ícones próprios, traço da identidade`}>
          <ul className="flex flex-wrap gap-2">
            {ICON_NAMES.map((name) => (
              <li
                key={name}
                title={name}
                className="grid size-11 place-items-center rounded-sm bg-surface chunk-thin"
              >
                <Icon name={name} label={name} />
              </li>
            ))}
          </ul>
        </Specimen>

        <Specimen
          name="PhoneFrame"
          note="moldura de celular acima de 960 px; abaixo disso o app ocupa a tela"
        >
          <p className="max-w-prose text-sm text-ink-soft">
            É ela que envolve o app neste notebook. Folhas, avisos e a revelação são renderizados
            dentro da tela do celular (usePortalTarget), para a projeção ficar fiel ao celular.
          </p>
        </Specimen>
      </div>
    </div>
  );
}

function Specimen({ name, note, children }: { name: string; note: string; children: ReactNode }) {
  return (
    <section className="mt-10 border-t-[3px] border-line pt-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-extrabold">{name}</h2>
        <p className="font-mono text-xs text-ink-soft">{note}</p>
      </div>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}
