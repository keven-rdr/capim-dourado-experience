import type { Store } from '@cde/shared';

/** Catálogo de lojas parceiras (leitura pública). */
export interface StoresRepository {
  list(): Promise<Store[]>;
  findById(id: string): Promise<Store | null>;
}
