import type {
  GameApi,
  PointsResult,
  Profile,
  ScanResult,
  SeasonId,
  TodayStatus,
} from '@cde/shared';
import { type ToastVariant, useSeason } from '@cde/ui';
import {
  createContext,
  type DependencyList,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getDemo, setDemo } from '../demo/demoStore';
import { HUNT_NOUN, levelInfo, rewardLine, stickerName } from '../lib/content';
import type { ApiSetup } from './createApi';
import { type AppErrorCode, friendlyError } from './errors';
import type { LocalGameApi } from './LocalGameApi';

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
  reward?: string;
}

export interface RevealData {
  result: ScanResult;
  title: string;
  subtitle?: string;
  stickerName?: string;
  puzzle?: { total: number; collected: number; labels: Array<string | undefined> };
}

export type ScanOutcome =
  | { ok: true; result: ScanResult }
  | { ok: false; code: AppErrorCode; title: string; message: string };

interface GameContextValue {
  api: GameApi;
  /** Extras da demonstração. Só existe no modo local. */
  local: LocalGameApi | null;
  mode: ApiSetup['mode'];
  /** API do lado da loja (painel). Com API real, pede a chave da loja. */
  panel: ApiSetup['panel'];
  ready: boolean;
  profile: Profile | null;
  today: TodayStatus | null;
  /** Muda a cada ação que altera dados: as telas recarregam suas listas. */
  version: number;
  refresh: () => Promise<void>;
  toasts: ToastItem[];
  notify: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
  /** Mostra avisos de nível, baú e figurinha de um resultado de pontos. */
  celebrate: (result: PointsResult) => void;
  reveal: RevealData | null;
  closeReveal: () => void;
  /** Lê um código de QR e, se valer, abre a revelação. */
  scan: (token: string) => Promise<ScanOutcome>;
  /** Modo demonstração: adianta o relógio em um dia e registra a abertura do app. */
  advanceDay: () => Promise<void>;
  /** Apaga os dados locais e volta ao início. */
  resetAll: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ setup, children }: { setup: ApiSetup; children: ReactNode }) {
  const { api, local, mode, panel } = setup;
  const { season } = useSeason();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [today, setToday] = useState<TodayStatus | null>(null);
  const [version, setVersion] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const toastId = useRef(0);
  const seasonRef = useRef<SeasonId>(season);
  seasonRef.current = season;

  const notify = useCallback((toast: Omit<ToastItem, 'id'>) => {
    toastId.current += 1;
    const item = { ...toast, id: toastId.current };
    setToasts((list) => [...list.slice(-2), item]);
  }, []);
  const dismiss = useCallback(
    (id: number) => setToasts((list) => list.filter((t) => t.id !== id)),
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const me = await api.getMe();
      setProfile(me);
      setToday(me ? await api.getToday() : null);
    } catch (error) {
      const f = friendlyError(error);
      notify({ variant: 'warning', title: f.title, description: f.message });
    } finally {
      setVersion((v) => v + 1);
    }
  }, [api, notify]);

  const celebrate = useCallback(
    (result: PointsResult) => {
      if (result.leveledUp) {
        const { level } = levelInfo(result.wallet.xp);
        notify({
          variant: 'success',
          title: `Subiu de nível: ${level.name}!`,
          description: 'A Capi está orgulhosa.',
        });
      }
      if (result.streakMilestone) {
        notify({
          variant: 'chest',
          title: `${result.streakDays} dias seguidos! Baú aberto.`,
          description: 'Tem bilhete de sorteio e figurinha rara dentro.',
        });
      }
    },
    [notify],
  );

  const runDailyOpen = useCallback(async () => {
    const result = await api.dailyOpen();
    if (result) {
      notify({
        variant: 'info',
        title: `Que bom te ver! Sequência: ${result.streakDays} ${result.streakDays === 1 ? 'dia' : 'dias'}`,
        reward: rewardLine(result.reward),
      });
      celebrate(result);
    }
  }, [api, notify, celebrate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await api.getMe();
        if (!alive) return;
        if (me) await runDailyOpen();
      } catch {
        // sem perfil ou sem conexão: o refresh abaixo avisa
      }
      await refresh();
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [api, refresh, runDailyOpen]);

  const scan = useCallback(
    async (token: string): Promise<ScanOutcome> => {
      try {
        const result = await api.scanQr({ token });
        const noun = HUNT_NOUN[seasonRef.current];
        let data: RevealData;
        if (result.kind === 'clue' && result.hunt) {
          const { hunt, solved, completed } = result.hunt;
          const found = hunt.clues.find((c) => c.order === solved);
          data = {
            result,
            title: completed
              ? 'Baú final aberto!'
              : `${noun.one} ${solved} de ${hunt.clues.length}!`,
            subtitle: found ? `Estava em: ${found.locationLabel}` : undefined,
            puzzle: {
              total: hunt.clues.length,
              collected: solved,
              labels: hunt.clues.map((c) => c.locationLabel || undefined),
            },
          };
        } else if (result.kind === 'secret') {
          data = {
            result,
            title: 'Segredo encontrado!',
            subtitle: result.label.replace(/^.*?: /, 'Em: '),
          };
        } else if (result.kind === 'store') {
          data = {
            result,
            title: `Visita na ${result.store?.name ?? 'loja'}!`,
            subtitle: 'Loja parceira de exemplo. Cada loja vale uma vez por dia.',
          };
        } else {
          data = { result, title: 'Cheguei!', subtitle: 'Check-in feito pelo QR da entrada.' };
        }
        data.stickerName = stickerName(result.stickerId ?? result.reward.stickerId);
        setReveal(data);
        celebrate(result);
        await refresh();
        return { ok: true, result };
      } catch (error) {
        return { ok: false, ...friendlyError(error) };
      }
    },
    [api, celebrate, refresh],
  );

  const advanceDay = useCallback(async () => {
    setDemo({ dayOffset: getDemo().dayOffset + 1 });
    try {
      if (profile) await runDailyOpen();
    } finally {
      await refresh();
    }
  }, [profile, runDailyOpen, refresh]);

  const resetAll = useCallback(async () => {
    await api.deleteAccount();
    setReveal(null);
    setToasts([]);
    await refresh();
  }, [api, refresh]);

  const value = useMemo<GameContextValue>(
    () => ({
      api,
      local,
      mode,
      panel,
      ready,
      profile,
      today,
      version,
      refresh,
      toasts,
      notify,
      dismiss,
      celebrate,
      reveal,
      closeReveal: () => setReveal(null),
      scan,
      advanceDay,
      resetAll,
    }),
    [
      api,
      local,
      mode,
      panel,
      ready,
      profile,
      today,
      version,
      refresh,
      toasts,
      notify,
      dismiss,
      celebrate,
      reveal,
      scan,
      advanceDay,
      resetAll,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame precisa estar dentro de <GameProvider>.');
  return ctx;
}

/** Carrega dados da API e recarrega quando o jogo muda (`version`) ou quando `deps` mudam. */
export function useGameQuery<T>(load: (api: GameApi) => Promise<T>, deps: DependencyList = []) {
  const { api, version } = useGame();
  const [state, setState] = useState<{
    data: T | null;
    error: ReturnType<typeof friendlyError> | null;
    loading: boolean;
  }>({ data: null, error: null, loading: true });
  const loader = useRef(load);
  loader.current = load;

  // biome-ignore lint/correctness/useExhaustiveDependencies: deps é repassado por quem chama
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    loader
      .current(api)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch(
        (error) => alive && setState({ data: null, error: friendlyError(error), loading: false }),
      );
    return () => {
      alive = false;
    };
  }, [api, version, ...deps]);

  return state;
}
