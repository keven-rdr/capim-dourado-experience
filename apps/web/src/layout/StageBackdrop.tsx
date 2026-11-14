import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useRef } from 'react';

gsap.registerPlugin(useGSAP);

/** Halos de cor do tema (as cores vêm dos tokens, então trocar a temporada troca o palco). */
const BLOBS = [
  { color: 'var(--cde-primary)', alpha: 34, size: '46vmax', left: '-12%', top: '-18%', depth: 26 },
  { color: 'var(--cde-gold)', alpha: 48, size: '38vmax', left: '58%', top: '-14%', depth: -34 },
  {
    color: 'var(--cde-secondary)',
    alpha: 30,
    size: '42vmax',
    left: '-14%',
    top: '54%',
    depth: -20,
  },
  { color: 'var(--cde-accent)', alpha: 28, size: '34vmax', left: '66%', top: '58%', depth: 40 },
] as const;

/** Anéis vazados e brilhos ✦ que flutuam entre os halos (posições em %, fixas entre renders). */
const RINGS = [
  { left: 6, top: 14, size: 88, depth: 18 },
  { left: 90, top: 30, size: 56, depth: -24 },
  { left: 78, top: 82, size: 110, depth: 30 },
  { left: 30, top: 88, size: 64, depth: -16 },
] as const;
const SPARKS = [
  { left: 12, top: 62, size: 22, depth: 36 },
  { left: 46, top: 8, size: 16, depth: -28 },
  { left: 94, top: 62, size: 20, depth: 22 },
  { left: 70, top: 14, size: 14, depth: -40 },
  { left: 22, top: 30, size: 12, depth: 28 },
  { left: 56, top: 92, size: 18, depth: -22 },
] as const;

const WIDE_MOTION = '(min-width: 960px) and (prefers-reduced-motion: no-preference)';

/**
 * Palco atrás do painel e do celular, só em telas largas: halos de cor do tema que derivam, anéis
 * e brilhos que flutuam, com paralaxe leve seguindo o mouse. Também inclina o celular de leve na
 * direção do ponteiro. Tudo é `transform`; com `prefers-reduced-motion` fica estático.
 * Renderizar dentro de um ancestral que só aparece em telas largas (o `aside` do PhoneFrame).
 */
export function StageBackdrop() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(WIDE_MOTION, () => {
        // deriva ambiente: cada elemento flutua no seu ritmo (interno), a paralaxe fica no externo
        for (const el of gsap.utils.toArray<HTMLElement>('[data-drift]')) {
          gsap.to(el, {
            x: gsap.utils.random(-40, 40),
            y: gsap.utils.random(-34, 34),
            scale: gsap.utils.random(0.92, 1.1),
            duration: gsap.utils.random(8, 14),
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          });
        }
        for (const el of gsap.utils.toArray<HTMLElement>('[data-twinkle]')) {
          gsap.fromTo(
            el,
            { opacity: 0.2, scale: 0.6, rotation: -20 },
            {
              opacity: 1,
              scale: 1.1,
              rotation: 20,
              duration: gsap.utils.random(1.4, 2.8),
              delay: gsap.utils.random(0, 2),
              ease: 'sine.inOut',
              repeat: -1,
              yoyo: true,
            },
          );
        }

        // paralaxe: camadas com profundidades diferentes seguem o ponteiro (quickTo = barato)
        const layers = gsap.utils.toArray<HTMLElement>('[data-depth]').map((el) => ({
          depth: Number(el.dataset.depth),
          x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3.out' }),
          y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3.out' }),
        }));

        // celular: inclina até ~5° e volta ao centro quando o mouse sai da janela
        const device = document.querySelector<HTMLElement>('.cde-phone-device');
        const tilt = device
          ? {
              rx: gsap.quickTo(device, 'rotationX', { duration: 0.9, ease: 'power3.out' }),
              ry: gsap.quickTo(device, 'rotationY', { duration: 0.9, ease: 'power3.out' }),
            }
          : null;
        if (device) gsap.set(device, { transformPerspective: 1400 });

        const follow = (nx: number, ny: number) => {
          for (const l of layers) {
            l.x(nx * l.depth);
            l.y(ny * l.depth);
          }
          tilt?.ry(nx * 5);
          tilt?.rx(-ny * 4);
        };
        const onMove = (e: PointerEvent) =>
          follow(
            (e.clientX / window.innerWidth - 0.5) * 2,
            (e.clientY / window.innerHeight - 0.5) * 2,
          );
        const onLeave = () => follow(0, 0);
        window.addEventListener('pointermove', onMove, { passive: true });
        document.documentElement.addEventListener('pointerleave', onLeave);

        return () => {
          window.removeEventListener('pointermove', onMove);
          document.documentElement.removeEventListener('pointerleave', onLeave);
          if (device) gsap.set(device, { clearProps: 'transform' });
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* grade de pontinhos, na cor do texto do tema */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(color-mix(in srgb, var(--cde-ink) 14%, transparent) 1.1px, transparent 1.4px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse at center, #000 25%, transparent 85%)',
        }}
      />
      {BLOBS.map((b) => (
        <span
          key={b.color}
          data-depth={b.depth}
          className="absolute block will-change-transform"
          style={{ left: b.left, top: b.top, width: b.size, height: b.size }}
        >
          <span
            data-drift
            className="block size-full rounded-full will-change-transform"
            style={{
              background: `radial-gradient(circle, color-mix(in srgb, ${b.color} ${b.alpha}%, transparent), transparent 68%)`,
            }}
          />
        </span>
      ))}
      {RINGS.map((r) => (
        <span
          key={`${r.left}-${r.top}`}
          data-depth={r.depth}
          className="absolute block will-change-transform"
          style={{ left: `${r.left}%`, top: `${r.top}%`, width: r.size, height: r.size }}
        >
          <span
            data-drift
            className="block size-full rounded-full will-change-transform"
            style={{
              border: '2px solid color-mix(in srgb, var(--cde-ink) 14%, transparent)',
            }}
          />
        </span>
      ))}
      {SPARKS.map((s) => (
        <span
          key={`${s.left}-${s.top}`}
          data-depth={s.depth}
          className="absolute block will-change-transform"
          style={{ left: `${s.left}%`, top: `${s.top}%` }}
        >
          <span
            data-twinkle
            className="block select-none will-change-transform"
            style={{ fontSize: s.size, color: 'var(--cde-gold)' }}
          >
            ✦
          </span>
        </span>
      ))}
    </div>
  );
}
