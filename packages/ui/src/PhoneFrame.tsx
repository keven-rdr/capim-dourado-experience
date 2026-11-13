import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useState,
} from 'react';
import { cx } from './cx';

const PortalContext = createContext<HTMLElement | null>(null);
const ScrollerContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

/** Elemento onde sobreposições (folhas, avisos) devem ser renderizadas: a tela do celular. */
export function usePortalTarget(): HTMLElement | null {
  const el = useContext(PortalContext);
  if (el) return el;
  return typeof document === 'undefined' ? null : document.body;
}

/** Elemento que rola o conteúdo da tela (útil para voltar ao topo ao trocar de rota). */
export function usePhoneScroller(): RefObject<HTMLDivElement | null> | null {
  return useContext(ScrollerContext);
}

export interface PhoneFrameProps {
  /** Conteúdo ao lado do celular, só em telas largas (ex.: explicação para a banca). */
  aside?: ReactNode;
  /** Conteúdo fixo da tela (fora da área que rola), como a navegação inferior. */
  scrollerRef?: RefObject<HTMLDivElement | null>;
  className?: string;
  children: ReactNode;
}

/**
 * Moldura de celular para projetar o app em telas largas.
 * Abaixo de 960 px de largura, a moldura some e o app ocupa a tela inteira.
 */
export function PhoneFrame({ aside, scrollerRef, className, children }: PhoneFrameProps) {
  const [screen, setScreen] = useState<HTMLElement | null>(null);
  return (
    <div
      className={cx(
        'min-[960px]:flex min-[960px]:min-h-dvh min-[960px]:items-center min-[960px]:justify-center min-[960px]:gap-14 min-[960px]:px-10 min-[960px]:py-8',
        className,
      )}
    >
      {aside && <aside className="hidden max-w-sm min-[960px]:block">{aside}</aside>}
      <div className="cde-phone-device">
        <div ref={setScreen} className="cde-phone-screen">
          <PortalContext.Provider value={screen}>
            <ScrollerContext.Provider value={scrollerRef ?? null}>
              <div ref={scrollerRef} className="cde-phone-scroller">
                {children}
              </div>
            </ScrollerContext.Provider>
          </PortalContext.Provider>
        </div>
      </div>
    </div>
  );
}
