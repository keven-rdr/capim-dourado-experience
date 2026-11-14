import { Chip, SEASON_IDS, SEASON_THEME, useSeason } from '@cde/ui';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/** Painel ao lado do celular em telas largas: o que é o projeto, em poucas linhas, para projetar. */
export function ProjectAside() {
  const { season, setSeason } = useSeason();
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/?demo=1`;
    QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#141414', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink-soft">
        protótipo · hackathon
      </p>
      <div>
        <h1 className="font-display text-4xl font-extrabold leading-[0.92] tracking-tight">
          O shopping virou
          <br />o mapa de um jogo.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          Check-in por localização, missões, QR codes escondidos e capicoins que viram cupons. Os
          pavimentos são as fases; a Capi guia.
        </p>
        <p className="mt-3 font-display text-sm font-bold">por Capim Dourado Shopping</p>
      </div>

      <div className="rounded-md border-2 border-dashed border-ink-soft/60 p-3">
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

      <div className="flex flex-wrap gap-3">
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
  );
}
