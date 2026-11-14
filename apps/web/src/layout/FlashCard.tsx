import type { Trail } from '@cde/shared';
import { Button, Card, Tag } from '@cde/ui';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { countdown, currentFlash } from '../lib/flash';

/** Card da Hora do Capi: oferta relâmpago da trilha da pessoa, com contagem regressiva. */
export function FlashCard({ trail, className }: { trail: Trail; className?: string }) {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [remind, setRemind] = useState(false);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const { start, end, live, offer } = currentFlash(now, trail);

  return (
    <Card tone={live ? 'primary' : 'surface'} tilt="left" className={`p-4 ${className ?? ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-xs font-bold uppercase tracking-wide">Hora do Capi</p>
        <Tag tone={live ? 'gold' : 'outline'}>{live ? 'ao vivo' : `às ${start.getHours()}h`}</Tag>
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold leading-tight">{offer.title}</p>
      <p className="text-sm font-semibold">{offer.storeName}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase">{live ? 'acaba em' : 'começa em'}</p>
          <p className="font-mono text-3xl font-bold tabular-nums" aria-live="off">
            {countdown(now, live ? end : start)}
          </p>
        </div>
        {live ? (
          <Button variant="secondary" icon="map" onClick={() => navigate('/mapa')}>
            Ver no mapa
          </Button>
        ) : (
          // shortcut: o aviso fica só na tela; notificação de verdade precisa de Web Push na API
          <Button
            variant={remind ? 'gold' : 'secondary'}
            icon={remind ? 'check' : 'clock'}
            aria-pressed={remind}
            onClick={() => setRemind((r) => !r)}
          >
            {remind ? 'Aviso ativado' : 'Me avise'}
          </Button>
        )}
      </div>
    </Card>
  );
}
