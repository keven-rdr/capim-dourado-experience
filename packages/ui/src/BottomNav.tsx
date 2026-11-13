import type { ComponentType, ReactNode } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  /** Item central em destaque (ex.: ler QR). */
  emphasis?: boolean;
}

export interface NavLinkLikeProps {
  href: string;
  className?: string;
  'aria-current'?: 'page';
  'aria-label'?: string;
  children: ReactNode;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  /** Id do item ativo. */
  activeId?: string;
  /** Componente de link (ex.: adaptador do roteador). Padrão: `<a>`. */
  linkAs?: ComponentType<NavLinkLikeProps>;
  className?: string;
}

function PlainLink({ href, children, ...rest }: NavLinkLikeProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

/** Navegação inferior com cinco itens; o item central pode ganhar destaque. */
export function BottomNav({
  items,
  activeId,
  linkAs: Link = PlainLink,
  className,
}: BottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className={cx(
        'sticky bottom-0 z-30 border-t-[3px] border-line bg-surface px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5',
        className,
      )}
    >
      <ul className="flex items-end justify-between">
        {items.map((item) => {
          const active = item.id === activeId;
          if (item.emphasis) {
            return (
              <li key={item.id} className="-mt-7 flex flex-1 justify-center">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className="flex flex-col items-center gap-0.5 focus-ring rounded-md"
                >
                  <span className="grid size-16 -rotate-6 place-items-center rounded-blob bg-primary text-on-primary chunk shadow-hard pressable">
                    <Icon name={item.icon} size={30} />
                  </span>
                  <span className="font-display text-xs font-bold">{item.label}</span>
                </Link>
              </li>
            );
          }
          return (
            <li key={item.id} className="flex flex-1 justify-center">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-sm px-1 focus-ring',
                  active ? 'text-ink' : 'text-ink-soft',
                )}
              >
                <span
                  className={cx(
                    'grid h-8 w-12 place-items-center rounded-sm transition-colors',
                    active && 'bg-gold text-on-gold chunk-thin',
                  )}
                >
                  <Icon name={item.icon} size={22} />
                </span>
                <span
                  className={cx(
                    'font-display text-xs',
                    active ? 'font-extrabold' : 'font-semibold',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
