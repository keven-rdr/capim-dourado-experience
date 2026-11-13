import type { Profile, UpdateProfileInput } from '@cde/shared';

export interface UsersRepository {
  findById(id: string): Promise<Profile | null>;
  insert(profile: Profile): Promise<void>;
  update(id: string, patch: UpdateProfileInput): Promise<Profile | null>;
  /** Apaga o perfil e todos os dados ligados ao usuário (LGPD). */
  deleteAccount(id: string): Promise<void>;
}
