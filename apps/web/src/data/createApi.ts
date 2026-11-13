import type { GameApi } from '@cde/shared';
import { demoNow, getDemo, setDemo } from '../demo/demoStore';
import { HttpGameApi } from './HttpGameApi';
import { LocalGameApi } from './LocalGameApi';
import { getAccessToken } from './supabase';

export interface ApiSetup {
  api: GameApi;
  /** Presente só no modo local: dá acesso aos extras da demonstração (reiniciar, perfil de exemplo). */
  local: LocalGameApi | null;
  mode: 'local' | 'http';
}

/**
 * Escolhe a implementação de `GameApi`.
 * - Com `VITE_API_URL`: `HttpGameApi` (token do Supabase, se configurado).
 * - Sem ela, ou com `?demo=1` na URL: `LocalGameApi` (modo demonstração, 100% offline).
 */
export function createApi(search = typeof window === 'undefined' ? '' : window.location.search): ApiSetup {
  const params = new URLSearchParams(search);
  if (params.get('demo') === '1') setDemo({ forced: true });
  if (params.get('demo') === '0') setDemo({ forced: false });

  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && !getDemo().forced) {
    return { api: new HttpGameApi({ baseUrl: apiUrl, getToken: getAccessToken }), local: null, mode: 'http' };
  }
  const local = new LocalGameApi({ now: demoNow, ignoreMallHours: () => !getDemo().respectHours });
  return { api: local, local, mode: 'local' };
}
