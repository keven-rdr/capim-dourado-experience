import {
  MALL_DESK_ID,
  MALL_DESK_NAME,
  STORES,
  type StoreStats,
  type UseCouponResult,
} from '@cde/shared';
import { Button, Card, Icon, SystemNote } from '@cde/ui';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { friendlyError, isGameApiError } from '../data/errors';
import { useGame } from '../data/GameProvider';
import { formatDateTime } from '../lib/time';

const KEY_STORAGE = 'cde:store-key';

const STORE_OPTIONS = [
  { id: MALL_DESK_ID, name: MALL_DESK_NAME },
  ...STORES.map((store) => ({ id: store.id, name: store.name })),
];

function readKey(): string {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

type Message = { kind: 'ok' | 'error'; text: string } | null;

/** O que o caixa mostra: o texto da API (que diz onde o cupom vale) ou o aviso amigável. */
function errorText(error: unknown): string {
  if (isGameApiError(error) && error.code !== 'network') return error.message;
  return friendlyError(error).message;
}

/**
 * Painel mínimo da loja: três números e a baixa do cupom no caixa.
 * Com API real, a loja entra com a chave que o shopping deu a ela (não usa o login do visitante).
 * No modo demonstração, os números e os cupons vêm deste aparelho.
 */
export function StorePanel() {
  const { panel, mode } = useGame();
  const [storeId, setStoreId] = useState(STORES[1]?.id ?? MALL_DESK_ID);
  const [storeKey, setStoreKey] = useState(readKey);
  const [code, setCode] = useState('');
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const needsKey = mode === 'http';
  const api = useMemo(
    () => panel(needsKey ? storeKey.trim() || null : null),
    [panel, needsKey, storeKey],
  );

  const load = useCallback(async () => {
    if (needsKey && !storeKey.trim()) {
      setStats(null);
      return;
    }
    try {
      setStats(await api.getStoreStats(storeId));
    } catch (error) {
      setStats(null);
      setMessage({ kind: 'error', text: errorText(error) });
    }
  }, [api, storeId, needsKey, storeKey]);

  useEffect(() => {
    void load();
  }, [load]);

  function changeKey(value: string) {
    setStoreKey(value);
    setMessage(null);
    try {
      sessionStorage.setItem(KEY_STORAGE, value);
    } catch {
      // sem armazenamento: vale só nesta aba
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const typed = code.trim();
    if (!typed) {
      setMessage({ kind: 'error', text: 'Digite o código do cupom.' });
      return;
    }
    if (needsKey && !storeKey.trim()) {
      setMessage({ kind: 'error', text: 'Digite a chave da loja.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result: UseCouponResult = await api.markCouponUsed(storeId, { code: typed });
      setStats(result.stats);
      setCode('');
      setMessage({
        kind: 'ok',
        text: `Baixa feita: ${result.redemption.title}. Cupom ${result.redemption.code} usado em ${formatDateTime(result.redemption.usedAt ?? new Date().toISOString())}.`,
      });
    } catch (error) {
      setMessage({ kind: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 bg-bg px-4 pb-10 pt-6 text-ink">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink-soft">
            painel da loja
          </p>
          <h1 className="font-display text-3xl font-extrabold leading-[0.95] tracking-tight">
            Cupons no caixa
          </h1>
        </div>
        <Link
          to="/"
          aria-label="Voltar ao app"
          className="grid size-11 shrink-0 place-items-center rounded-sm bg-surface chunk-thin focus-ring"
        >
          <Icon name="home" size={22} />
        </Link>
      </header>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-bold" htmlFor="loja">
          Loja
          <select
            id="loja"
            value={storeId}
            onChange={(event) => {
              setStoreId(event.target.value);
              setMessage(null);
            }}
            className="min-h-12 rounded-md bg-surface px-3 text-base font-semibold chunk-thin focus-ring"
          >
            {STORE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        {needsKey && (
          <label className="flex flex-col gap-1 text-sm font-bold" htmlFor="chave">
            Chave da loja
            <input
              id="chave"
              type="password"
              autoComplete="off"
              value={storeKey}
              onChange={(event) => changeKey(event.target.value)}
              className="min-h-12 rounded-md bg-surface px-3 text-base font-semibold chunk-thin focus-ring"
            />
            <span className="text-xs font-normal text-ink-soft">
              A chave é do shopping para cada loja. Fica só nesta aba.
            </span>
          </label>
        )}
      </div>

      <section aria-label="Números da loja" className="grid grid-cols-3 gap-2">
        <Metric label="Giros que caíram aqui" value={stats?.spinsLanded} />
        <Metric label="Visitas pelo app" value={stats?.visits} />
        <Metric label="Cupons usados" value={stats?.couponsUsed} />
      </section>

      <Card tone="surface" className="p-4">
        <form onSubmit={submit} noValidate className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-bold" htmlFor="codigo">
            Cliente no caixa? Digite o código do cupom
            <input
              id="codigo"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setMessage(null);
              }}
              placeholder="CDE-7K3M-4QXP"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="min-h-14 rounded-md bg-paper px-3 font-mono text-xl font-extrabold uppercase tracking-[0.12em] text-on-paper chunk-thin focus-ring"
            />
          </label>
          <Button type="submit" size="lg" icon="check" loading={busy} loadingLabel="Dando baixa">
            Dar baixa
          </Button>
          <p
            role="status"
            aria-live="polite"
            className={`min-h-6 text-sm font-semibold ${message?.kind === 'error' ? 'text-danger' : 'text-success'}`}
          >
            {message?.text}
          </p>
        </form>
      </Card>

      <div className="flex items-center gap-2">
        <p className="text-xs text-ink-soft">
          {mode === 'local'
            ? 'Modo demonstração: números e cupons deste aparelho.'
            : 'Números reais da API. Prêmios e lojas do protótipo são exemplos.'}
        </p>
      </div>

      <SystemNote>
        a loja só vê três números e dá baixa no cupom (uso único, validade e loja conferidos pela
        API).
      </SystemNote>
    </div>
  );
}

/** `null` e `undefined` aparecem como traço: a loja não tem esse número (ou ainda carrega). */
function Metric({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="flex flex-col justify-between gap-1 rounded-md bg-surface-2 p-3 chunk-thin">
      <p className="text-xs font-semibold leading-tight text-ink-soft">{label}</p>
      <p className="font-display text-3xl font-extrabold tabular-nums">{value ?? '—'}</p>
    </div>
  );
}
