import { LEVELS, TRAIL_LABEL, type Trail } from '@cde/shared';
import { Button, Card, cx, FilterChips, Sheet, Tag, XpBar } from '@cde/ui';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { friendlyError } from '../data/errors';
import { useGame, useGameQuery } from '../data/GameProvider';
import { Capi3D } from '../layout/Capi3D';
import { AboutProject } from '../layout/ProjectCredits';
import { Screen, SectionTitle } from '../layout/Screen';
import { CAPI_NAME, levelInfo, lookOf } from '../lib/content';
import { EGG_COUNT, foundEggs } from '../lib/eggs';
import { formatDateTime } from '../lib/time';

export function Profile() {
  const { api, profile, refresh, notify, resetAll } = useGame();
  const navigate = useNavigate();
  const events = useGameQuery((a) => a.listEvents());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!profile) return null;
  const { level, next, number } = levelInfo(profile.wallet.xp);
  const look = lookOf(profile.character);
  const eggs = foundEggs();

  async function update(patch: { trail?: Trail; locationConsent?: boolean }) {
    try {
      await api.updateProfile(patch);
      await refresh();
    } catch (error) {
      const f = friendlyError(error);
      notify({ variant: 'warning', title: f.title, description: f.message });
    }
  }

  async function remove() {
    setDeleting(true);
    await resetAll();
    setDeleting(false);
    setConfirmDelete(false);
    navigate('/bem-vindo', { replace: true });
  }

  return (
    <Screen kicker="sua conta" title={profile.name} back="/">
      <Card shape="blob" className="flex items-center gap-3 p-4">
        <span className="grid size-24 shrink-0 place-items-end overflow-hidden rounded-blob bg-gold chunk">
          <Capi3D size={80} intro="AcenoLeve" speech={false} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-bold uppercase text-ink-soft">
            com {CAPI_NAME[look]} · trilha {TRAIL_LABEL[profile.trail]}
          </p>
          <XpBar
            compact
            xp={profile.wallet.xp}
            levelMinXp={level.minXp}
            nextLevelXp={next?.minXp ?? null}
            levelName={level.name}
            levelNumber={number}
          />
        </div>
      </Card>

      {eggs.length > 0 && (
        <Tag tone="gold" icon="sparkle" className="mt-3 self-start">
          Fuçador · {eggs.length} de {EGG_COUNT}
        </Tag>
      )}

      <SectionTitle>Os níveis</SectionTitle>
      <ol className="grid grid-cols-2 gap-1.5">
        {LEVELS.map((l, i) => (
          <li
            key={l.id}
            className={cx(
              'min-w-0 rounded-sm px-2 py-2 chunk-thin',
              l.id === level.id
                ? 'bg-accent text-on-accent'
                : profile.wallet.xp >= l.minXp
                  ? 'bg-surface-2'
                  : 'bg-surface',
            )}
          >
            <span className="block font-mono text-xs font-bold">NV {i + 1}</span>
            <span className="block font-display text-xs font-extrabold leading-tight">
              {l.name}
            </span>
            <span className="block font-mono text-xs">{l.minXp} XP</span>
          </li>
        ))}
      </ol>

      <SectionTitle>Trilha</SectionTitle>
      <FilterChips<Trail>
        label="Trocar trilha"
        value={profile.trail}
        onChange={(trail) => update({ trail })}
        options={(['kids', 'ela', 'ele', 'todos'] as const).map((t) => ({
          value: t,
          label: TRAIL_LABEL[t],
        }))}
      />
      {profile.trail === 'kids' && (
        <p className="text-xs text-ink-soft">Trilha Kids: sem ranking e sem localização exata.</p>
      )}

      <SectionTitle aside="mais recentes primeiro">Histórico de pontos</SectionTitle>
      <ul className="flex flex-col divide-y-2 divide-dashed divide-ink-soft/30 rounded-md bg-surface px-3 chunk-thin">
        {(events.data ?? []).slice(0, 12).map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{e.label}</span>
              <span className="block font-mono text-xs text-ink-soft">{formatDateTime(e.at)}</span>
            </span>
            <span className="shrink-0 text-right font-mono text-xs font-bold">
              {e.xp > 0 && <span className="block">+{e.xp} XP</span>}
              {e.coins !== 0 && (
                <span className="block">{e.coins > 0 ? `+${e.coins}` : e.coins} moedas</span>
              )}
              {e.tickets > 0 && <span className="block">+{e.tickets} bilhete</span>}
            </span>
          </li>
        ))}
        {events.data?.length === 0 && <li className="py-3 text-sm">Nada por aqui ainda.</li>}
      </ul>

      <SectionTitle>
        <span id="privacidade">Privacidade</span>
      </SectionTitle>
      <Card tone="muted" elevation="sm" className="p-4">
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
          <span className="text-sm font-semibold">Usar a localização no check-in</span>
          <input
            type="checkbox"
            className="size-6 accent-[var(--cde-primary)]"
            checked={profile.locationConsent}
            onChange={(e) => update({ locationConsent: e.target.checked })}
          />
        </label>
        <p className="mt-2 text-sm text-ink-soft">
          A localização é lida uma vez, quando você toca em "Cheguei!". Guardamos só se deu "dentro"
          ou "fora". Nada de trajeto, nada de ranking.
        </p>
        <Button
          variant="danger"
          icon="trash"
          className="mt-4"
          onClick={() => setConfirmDelete(true)}
        >
          Apagar meus dados
        </Button>
      </Card>

      <SectionTitle>Sobre o projeto</SectionTitle>
      <AboutProject />

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/album"
          className="font-display font-bold underline decoration-2 underline-offset-4 focus-ring"
        >
          Ver álbum
        </Link>
        <Link
          to="/catalogo"
          className="font-display font-bold underline decoration-2 underline-offset-4 focus-ring"
        >
          Catálogo de componentes
        </Link>
      </div>

      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Apagar tudo?"
        description="Some o perfil, os pontos, os cupons e as figurinhas. Não dá para desfazer."
        footer={
          <>
            <Button block variant="danger" loading={deleting} onClick={remove}>
              Apagar meus dados
            </Button>
            <Button block variant="secondary" onClick={() => setConfirmDelete(false)}>
              Manter
            </Button>
          </>
        }
      />
    </Screen>
  );
}
