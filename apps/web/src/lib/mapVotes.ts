import { useSyncExternalStore } from 'react';

/**
 * Missão "Ajude a Capi a mapear": o visitante confirma onde a loja fica ou aponta o lugar certo
 * no desenho do andar. Guarda só o toque no desenho, nunca o GPS.
 * shortcut: fica no localStorage porque o contrato da API ainda não tem a rota de sugestões;
 * com a rota, as respostas de todos viram a posição do pin pela mediana (mínimo de 3 iguais).
 */
export type MapAnswer = { kind: 'confirmou' } | { kind: 'sugeriu'; x: number; y: number };

const KEY = 'cde-mapa-respostas';
const EVENT = 'cde-mapa-respostas';
const EMPTY: Record<string, MapAnswer> = {};
let cache: Record<string, MapAnswer> | null = null;

function read(): Record<string, MapAnswer> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, MapAnswer>) : EMPTY;
  } catch {
    cache = EMPTY; // armazenamento bloqueado ou corrompido: começa vazio
  }
  return cache;
}

function write(next: Record<string, MapAnswer>) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(fn: () => void) {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

/** Respostas do visitante, uma por loja. `answer` devolve quantas lojas ele já ajudou a mapear. */
export function useMapAnswers() {
  const answers = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    answers,
    answer: (storeId: string, value: MapAnswer): number => {
      const next = { ...read(), [storeId]: value };
      write(next);
      return Object.keys(next).length;
    },
    forget: (storeId: string) => {
      const { [storeId]: _, ...rest } = read();
      write(rest);
    },
  };
}

/**
 * Lojas cujo QR da vitrine o visitante leu hoje. Só quem esteve na frente da loja pode opinar
 * sobre o lugar dela.
 * shortcut: a API só conta quantas lojas foram visitadas (TodayStatus.storesVisited); quando o
 * contrato disser quais, esta lista sai do aparelho.
 */
const VISITS_KEY = 'cde-lojas-hoje';
type Visits = { date: string; stores: string[] };
let visitsCache: Visits | null = null;

function readVisits(today: string): Visits {
  if (!visitsCache) {
    try {
      const raw = localStorage.getItem(VISITS_KEY);
      visitsCache = raw ? (JSON.parse(raw) as Visits) : { date: today, stores: [] };
    } catch {
      visitsCache = { date: today, stores: [] };
    }
  }
  // virou o dia: as leituras de ontem não valem mais
  if (visitsCache.date !== today) visitsCache = { date: today, stores: [] };
  return visitsCache;
}

/** Registra a leitura do QR da vitrine. Chamado quando o leitor confirma uma loja. */
export function markStoreVisit(storeId: string, today: string) {
  const current = readVisits(today);
  if (current.stores.includes(storeId)) return;
  visitsCache = { date: today, stores: [...current.stores, storeId] };
  try {
    localStorage.setItem(VISITS_KEY, JSON.stringify(visitsCache));
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Lojas com QR lido no dia `today` (vazio se as leituras guardadas são de outro dia). */
export function visitedOn(today: string): readonly string[] {
  return readVisits(today).stores;
}

/** As lojas visitadas hoje, atualizando quando o leitor registra uma nova. */
export function useVisitedToday(today: string): readonly string[] {
  return useSyncExternalStore(
    subscribe,
    () => visitedOn(today),
    () => NO_VISITS,
  );
}
const NO_VISITS: readonly string[] = [];

/** Converte um toque na tela em posição no desenho (0 a 100), sem sair da imagem. */
export function toMapPercent(
  box: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
  return {
    x: clamp(((clientX - box.left) / box.width) * 100),
    y: clamp(((clientY - box.top) / box.height) * 100),
  };
}
