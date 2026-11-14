import {
  AchievementToast,
  BottomNav,
  type BottomNavItem,
  Button,
  type NavLinkLikeProps,
  PhoneFrame,
  TreasureReveal,
  usePortalTarget,
} from '@cde/ui';
import { AnimatePresence } from 'motion/react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../data/GameProvider';
import { DemoPanel } from '../demo/DemoPanel';
import { lookOf } from '../lib/content';
import { CapiCompanion } from './CapiCompanion';
import { ProjectAside } from './ProjectAside';

const NAV: BottomNavItem[] = [
  { id: 'home', label: 'Início', icon: 'home', href: '/' },
  { id: 'missoes', label: 'Missões', icon: 'target', href: '/missoes' },
  { id: 'scanner', label: 'Ler QR', icon: 'qr', href: '/scanner', emphasis: true },
  { id: 'mapa', label: 'Mapa', icon: 'map', href: '/mapa' },
  { id: 'recompensas', label: 'Prêmios', icon: 'gift', href: '/recompensas' },
];

function activeNav(path: string): string | undefined {
  if (path === '/') return 'home';
  if (path.startsWith('/missoes') || path.startsWith('/caca')) return 'missoes';
  if (path.startsWith('/scanner')) return 'scanner';
  if (path.startsWith('/mapa')) return 'mapa';
  if (path.startsWith('/recompensas') || path.startsWith('/roleta')) return 'recompensas';
  return undefined;
}

function RouterLink({ href, children, ...rest }: NavLinkLikeProps) {
  return (
    <Link to={href} {...rest}>
      {children}
    </Link>
  );
}

/** Estrutura do app: moldura de celular, navegação inferior, avisos, revelação e painel da demo. */
export function AppShell() {
  const scroller = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { ready, profile } = useGame();
  const onboarding = location.pathname.startsWith('/bem-vindo');

  // biome-ignore lint/correctness/useExhaustiveDependencies: volta ao topo a cada troca de rota
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // trilhas adultas ganham o tom sóbrio; Kids e o cadastro ficam com o tom de jogo
  const tone = profile && profile.trail !== 'kids' ? 'sobrio' : 'jogo';
  useEffect(() => {
    document.documentElement.dataset.tone = tone;
  }, [tone]);

  if (ready && !profile && !onboarding) return <Navigate to="/bem-vindo" replace />;

  return (
    <PhoneFrame scrollerRef={scroller} aside={<ProjectAside />}>
      <main id="conteudo" className="flex flex-1 flex-col">
        {ready ? <Outlet /> : <Loading />}
      </main>
      {!onboarding && profile && (
        <BottomNav items={NAV} activeId={activeNav(location.pathname)} linkAs={RouterLink} />
      )}
      <Overlays />
    </PhoneFrame>
  );
}

function Loading() {
  return (
    <div className="grid flex-1 place-items-center p-10">
      <p className="font-display text-lg font-bold">Chamando a Capi...</p>
    </div>
  );
}

/** Avisos de conquista, revelação do QR e painel da demonstração, dentro da tela do celular. */
function Overlays() {
  const target = usePortalTarget();
  const { toasts, dismiss, reveal, closeReveal, profile } = useGame();
  const navigate = useNavigate();

  const hunt = reveal?.result.hunt;
  const actions = !reveal ? null : hunt && !hunt.completed ? (
    <>
      <Button
        size="lg"
        block
        iconRight="arrowRight"
        onClick={() => {
          closeReveal();
          navigate('/caca');
        }}
      >
        Ver a próxima pista
      </Button>
      <Button variant="secondary" block onClick={closeReveal}>
        Fechar
      </Button>
    </>
  ) : hunt?.completed ? (
    <>
      <Button
        size="lg"
        block
        variant="gold"
        icon="album"
        onClick={() => {
          closeReveal();
          navigate('/album');
        }}
      >
        Ver no álbum
      </Button>
      <Button variant="secondary" block icon="share" onClick={() => shareFeat(hunt.hunt.title)}>
        Compartilhar o feito
      </Button>
    </>
  ) : (
    <Button size="lg" block onClick={closeReveal}>
      Continuar
    </Button>
  );

  return (
    <>
      {target &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col gap-2 px-3 pt-3 min-[960px]:pt-10"
            aria-live="polite"
          >
            <AnimatePresence initial={false}>
              {toasts.map((t) => (
                <AchievementToast
                  key={t.id}
                  variant={t.variant}
                  title={t.title}
                  description={t.description}
                  reward={t.reward}
                  onClose={() => dismiss(t.id)}
                />
              ))}
            </AnimatePresence>
          </div>,
          target,
        )}
      <CapiCompanion />
      <TreasureReveal
        open={!!reveal}
        title={reveal?.title ?? ''}
        subtitle={reveal?.subtitle}
        reward={reveal?.result.reward ?? { xp: 0, coins: 0 }}
        puzzle={reveal?.puzzle}
        stickerName={reveal?.stickerName}
        capiLook={lookOf(profile?.character)}
        capiLine={
          hunt?.completed
            ? 'Fábrica completa! Você é das minhas.'
            : hunt
              ? 'Achou! A próxima pista já está liberada.'
              : 'Boa! Isso vai pra carteira.'
        }
        actions={actions}
        onClose={closeReveal}
      />
      <DemoPanel />
    </>
  );
}

async function shareFeat(title: string) {
  const text = `Completei a caça "${title}" no Capim Dourado Experience!`;
  try {
    if (navigator.share) await navigator.share({ title: 'Capim Dourado Experience', text });
    else await navigator.clipboard?.writeText(text);
  } catch {
    // compartilhamento cancelado
  }
}
