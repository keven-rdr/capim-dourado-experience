import type { Store } from '@cde/shared';
import type { StoresRepository } from './repository.js';

export class StoresService {
  constructor(private readonly stores: StoresRepository) {}

  list(): Promise<Store[]> {
    return this.stores.list();
  }

  findById(id: string): Promise<Store | null> {
    return this.stores.findById(id);
  }
}
