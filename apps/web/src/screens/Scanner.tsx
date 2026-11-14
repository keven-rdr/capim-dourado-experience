import { CURRENT_SEASON, demoQr } from '@cde/shared';
import { Button, ScannerFrame, type ScannerState, useSeason } from '@cde/ui';
import type { Html5Qrcode } from 'html5-qrcode';
import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGame } from '../data/GameProvider';
import { Screen } from '../layout/Screen';
import { findWordEgg } from '../lib/eggs';
import { useDiscover } from '../lib/useEggs';

const READER_ID = 'cde-qr-reader';

export function Scanner() {
  const { api, scan } = useGame();
  const discover = useDiscover();
  const { season } = useSeason();
  const [params] = useSearchParams();
  const entrance = params.get('modo') === 'entrada';
  const storeId = params.get('loja');
  const [camera, setCamera] = useState<'off' | 'starting' | 'on'>('off');
  const [state, setState] = useState<ScannerState>('idle');
  const [message, setMessage] = useState<string | undefined>();
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({
    supported: false,
    on: false,
  });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const reader = useRef<Html5Qrcode | null>(null);
  const handling = useRef(false);
  const inputId = useId();

  const stopCamera = useCallback(async () => {
    const instance = reader.current;
    reader.current = null;
    if (instance) {
      try {
        await instance.stop();
        instance.clear();
      } catch {
        // já parado
      }
    }
    setCamera('off');
    setTorch({ supported: false, on: false });
  }, []);

  const submit = useCallback(
    async (token: string) => {
      if (handling.current) return;
      handling.current = true;
      setBusy(true);
      setState('scanning');
      setMessage('Conferindo o código...');
      try {
        const outcome = await scan(token);
        if (outcome.ok) {
          setState('success');
          setMessage('Achou!');
          setCode('');
          await stopCamera();
        } else {
          setState('error');
          setMessage(`${outcome.title}. ${outcome.message}`);
        }
      } finally {
        setBusy(false);
        handling.current = false;
      }
    },
    [scan, stopCamera],
  );

  useEffect(() => {
    if (camera !== 'starting') return;
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const instance = new Html5Qrcode(READER_ID, { verbose: false });
        reader.current = instance;
        await instance.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => void submit(text),
          () => {},
        );
        if (cancelled) return;
        setCamera('on');
        setState('scanning');
        setMessage(undefined);
        try {
          const supported = instance
            .getRunningTrackCameraCapabilities()
            .torchFeature()
            .isSupported();
          setTorch({ supported, on: false });
        } catch {
          setTorch({ supported: false, on: false });
        }
      } catch {
        if (cancelled) return;
        reader.current = null;
        setCamera('off');
        setState('error');
        setMessage('A câmera não abriu aqui. Use o código impresso ou a simulação.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [camera, submit]);

  useEffect(() => () => void stopCamera(), [stopCamera]);

  async function toggleTorch() {
    const instance = reader.current;
    if (!instance) return;
    try {
      await instance.getRunningTrackCameraCapabilities().torchFeature().apply(!torch.on);
      setTorch((t) => ({ ...t, on: !t.on }));
    } catch {
      setTorch({ supported: false, on: false });
    }
  }

  async function simulate() {
    if (entrance) return submit(demoQr('checkin', 'entrada'));
    if (storeId) return submit(demoQr('store', storeId));
    const hunt = await api.getHunt(season).catch(() => api.getHunt(CURRENT_SEASON));
    if (hunt.completed) {
      setState('error');
      setMessage('A caça já está completa. Que tal procurar um segredo?');
      return;
    }
    return submit(demoQr('clue', `${hunt.hunt.id}:${hunt.solved + 1}`));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const typed = code.trim();
    // palavra secreta (ovo escondido): a Capi responde e nada vai para a API
    const reply = findWordEgg(typed);
    if (reply) {
      setState('success');
      setMessage(reply);
      setCode('');
      discover('palavra');
      return;
    }
    if (typed.length >= 3) void submit(code);
  }

  return (
    <Screen
      kicker={entrance ? 'plano B do check-in' : 'leitor de QR'}
      title={entrance ? 'QR da entrada' : 'Aponte e ache'}
      back={entrance ? '/checkin' : storeId ? '/mapa' : '/caca'}
    >
      <ScannerFrame state={state} message={message}>
        {camera !== 'off' ? <div id={READER_ID} className="size-full" /> : undefined}
      </ScannerFrame>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {camera === 'off' ? (
          <Button variant="secondary" icon="camera" onClick={() => setCamera('starting')}>
            Ligar câmera
          </Button>
        ) : (
          <Button
            variant="secondary"
            icon="close"
            loading={camera === 'starting'}
            onClick={() => void stopCamera()}
          >
            Desligar
          </Button>
        )}
        <Button
          variant="secondary"
          icon="flash"
          disabled={!torch.supported}
          onClick={toggleTorch}
          aria-pressed={torch.on}
          title={torch.supported ? undefined : 'Lanterna indisponível nesta câmera'}
        >
          {torch.on ? 'Apagar' : 'Lanterna'}
        </Button>
      </div>

      <Button
        size="lg"
        block
        icon="sparkle"
        className="mt-4"
        loading={busy}
        loadingLabel="Lendo"
        onClick={() => void simulate()}
      >
        Simular leitura
      </Button>

      <form onSubmit={onSubmit} className="mt-6 rounded-lg bg-surface p-4 chunk">
        <label htmlFor={inputId} className="font-display text-base font-bold">
          Digitar o código impresso
        </label>
        <p className="text-xs text-ink-soft">Fica embaixo de cada QR. Ex.: cde:secret:s2</p>
        <div className="mt-2 flex gap-2">
          <input
            id={inputId}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="cde:..."
            className="min-h-12 min-w-0 flex-1 rounded-sm bg-bg px-3 font-mono text-base text-ink chunk-thin focus-ring placeholder:text-ink-soft"
          />
          <Button type="submit" disabled={code.trim().length < 3 || busy}>
            Enviar
          </Button>
        </div>
      </form>
    </Screen>
  );
}
