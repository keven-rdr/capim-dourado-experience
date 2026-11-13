import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { Icon } from './Icon';
import { usePortalTarget } from './PhoneFrame';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Texto curto abaixo do título. */
  description?: string;
  /** Ações no rodapé (ex.: confirmar e cancelar). */
  footer?: ReactNode;
  /** Esconde o botão de fechar (para confirmações obrigatórias). */
  hideClose?: boolean;
  className?: string;
  children?: ReactNode;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Folha que sobe da base da tela. Fecha com Esc, com o fundo ou com o botão. */
export function Sheet({
  open,
  onClose,
  title,
  description,
  footer,
  hideClose,
  className,
  children,
}: SheetProps) {
  const target = usePortalTarget();
  const titleId = useId();
  const descId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel.current)?.focus();
    });
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!target) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end">
          <motion.button
            type="button"
            aria-label="Fechar"
            tabIndex={-1}
            className="absolute inset-0 cursor-default bg-[var(--cde-scrim)]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={cx(
              'relative max-h-[88%] w-full overflow-y-auto rounded-t-xl border-x-[3px] border-t-[3px] border-line bg-surface px-5 pb-6 pt-3 text-ink outline-none',
              className,
            )}
          >
            <span
              aria-hidden="true"
              className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-ink/30"
            />
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="font-display text-2xl font-extrabold leading-tight">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-sm text-ink-soft">
                    {description}
                  </p>
                )}
              </div>
              {!hideClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm chunk-thin focus-ring"
                >
                  <Icon name="close" size={20} />
                </button>
              )}
            </div>
            {children}
            {footer && <div className="mt-5 flex flex-col gap-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    target,
  );
}
