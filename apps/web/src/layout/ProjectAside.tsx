import { Chip, SEASON_IDS, SEASON_THEME, useSeason } from '@cde/ui';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { StageBackdrop } from './StageBackdrop';

gsap.registerPlugin(useGSAP, SplitText);

/** Painel ao lado do celular em telas largas: o que é o projeto, em poucas linhas, para projetar. */
export function ProjectAside() {
  const { season, setSeason } = useSeason();
  const [qr, setQr] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = `${window.location.origin}/?demo=1`;
    QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#141414', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, []);

  // entrada: o título sobe palavra por palavra (SplitText) e o resto aparece em cascata
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        SplitText.create('[data-title]', {
          type: 'lines,words',
          mask: 'lines',
          linesClass: 'title-line',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.words, {
              yPercent: 135,
              rotation: 4,
              duration: 0.8,
              ease: 'power4.out',
              stagger: 0.07,
              delay: 0.15,
            }),
        });
        gsap.from('[data-reveal]', {
          y: 22,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.1,
          delay: 0.45,
          clearProps: 'transform,opacity',
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <>
      <StageBackdrop />
      <div ref={root} className="flex flex-col gap-5">
        <p
          data-reveal
          className="font-mono text-xs font-bold uppercase tracking-widest text-ink-soft"
        >
          protótipo · hackathon
        </p>
        <div>
          <h1
            data-title
            // a máscara de cada linha corta com `overflow: clip`; a folga embaixo preserva g, p, j
            className="font-display text-4xl font-extrabold leading-[0.92] tracking-tight [&_.title-line-mask]:-mb-[0.2em] [&_.title-line-mask]:pb-[0.2em]"
          >
            O shopping virou
            <br />o mapa de um jogo.
          </h1>
          <p data-reveal className="mt-3 text-base leading-relaxed text-ink-soft">
            Check-in por localização, missões, QR codes escondidos e capicoins que viram cupons. Os
            pavimentos são as fases; a Capi guia.
          </p>
          <p data-reveal className="mt-3 font-display text-sm font-bold">
            por Capim Dourado Shopping
          </p>
        </div>

        <div data-reveal className="rounded-md border-2 border-dashed border-ink-soft/60 p-3">
          <p className="font-mono text-xs font-bold uppercase text-ink-soft">
            Uma biblioteca, dois temas
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SEASON_IDS.map((id) => (
              <Chip key={id} selected={season === id} onClick={() => setSeason(id)}>
                {SEASON_THEME[id].label}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            Troca só os tokens de design. A tela é a mesma.
          </p>
        </div>

        <div data-reveal className="flex flex-wrap gap-3">
          <Link
            to="/catalogo"
            className="inline-flex min-h-12 items-center rounded-md bg-surface px-4 font-display font-bold chunk shadow-hard focus-ring pressable"
          >
            Catálogo de componentes
          </Link>
        </div>

        {qr && (
          <figure className="flex items-center gap-3">
            <img
              src={qr}
              alt="QR code para abrir o protótipo no celular"
              className="size-28 rounded-sm chunk"
            />
            <figcaption className="text-sm text-ink-soft">
              Aponte a câmera para abrir no celular.
              <br />
              <span className="font-mono text-xs">funciona sem baixar nada</span>
            </figcaption>
          </figure>
        )}
      </div>
    </>
  );
}
