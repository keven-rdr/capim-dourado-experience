import { Card, cx } from '@cde/ui';

const REPO_URL = 'https://github.com/keven-rdr/capim-dourado-experience';
export const CONTRIBUTORS_URL = `${REPO_URL}/graphs/contributors`;

/** Quem contribuiu no repositório. Os avatares são cópias locais (96 px), para o app funcionar offline. */
export const CONTRIBUTORS = [
  { login: 'keven-rdr', avatar: '/brand/contributors/keven-rdr.jpg' },
  { login: 'DevGuilherme-cpu', avatar: '/brand/contributors/DevGuilherme-cpu.jpg' },
  { login: 'EduardoCampos123', avatar: '/brand/contributors/EduardoCampos123.jpg' },
] as const;

const LINK_PROPS = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** Logo do shopping num quadro branco: as letras marrons somem no tema escuro sem ele. */
function LogoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cx('inline-flex shrink-0 rounded-md bg-white px-3 py-1.5 chunk-thin', className)}
    >
      <img
        src="/brand/capim-dourado-logo.webp"
        alt="Capim Dourado Shopping"
        width={1080}
        height={678}
        className="h-16 w-auto"
      />
    </span>
  );
}

function ContributorAvatars() {
  return (
    <ul className="flex items-center gap-1.5" aria-label="Contribuintes do projeto no GitHub">
      {CONTRIBUTORS.map((person) => (
        <li key={person.login}>
          <a
            href={`https://github.com/${person.login}`}
            aria-label={`${person.login} no GitHub`}
            title={person.login}
            className="grid size-11 place-items-center rounded-full focus-ring"
            {...LINK_PROPS}
          >
            <img
              src={person.avatar}
              alt=""
              width={96}
              height={96}
              className="size-10 rounded-full bg-surface object-cover chunk-thin"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

function SeeAll() {
  return (
    <a
      href={CONTRIBUTORS_URL}
      className="inline-flex min-h-11 items-center font-display text-sm font-bold underline decoration-2 underline-offset-4 focus-ring"
      {...LINK_PROPS}
    >
      Ver todos no GitHub
    </a>
  );
}

/** Rodapé da versão de navegador (a partir de 960 px): logo à esquerda, contribuintes à direita. */
export function SiteFooter() {
  return (
    <footer className="relative mx-auto hidden w-full max-w-4xl items-center justify-between gap-6 border-t-2 border-ink-soft/30 px-10 pb-8 pt-5 min-[960px]:flex">
      <LogoBadge />
      <div className="flex items-center gap-3">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink-soft">
          Contribuintes
        </p>
        <ContributorAvatars />
        <SeeAll />
      </div>
    </footer>
  );
}

/** Crédito do projeto para dentro do celular, onde o rodapé não existe. */
export function AboutProject() {
  return (
    <Card elevation="sm" className="flex flex-col items-start gap-3 p-4">
      <LogoBadge />
      <p className="text-sm text-ink-soft">
        Protótipo feito em um hackathon para o Capim Dourado Shopping.
      </p>
      <div className="flex flex-wrap items-center gap-x-4">
        <ContributorAvatars />
        <SeeAll />
      </div>
    </Card>
  );
}
