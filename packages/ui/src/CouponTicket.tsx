import { Button } from './Button';
import { cx } from './cx';
import { Icon } from './Icon';
import { ExampleTag } from './Tag';

export type CouponState = 'available' | 'redeemed' | 'expired' | 'insufficient';

export interface CouponTicketProps {
  title: string;
  storeName: string;
  /** Custo em moedas. */
  cost: number;
  /** Dias de validade depois do resgate. */
  validDays: number;
  /** Estado do cupom. */
  state?: CouponState;
  /** Quantas moedas faltam (estado `insufficient`). */
  missingCoins?: number;
  /** Código do cupom resgatado. */
  code?: string;
  /** Texto do prazo (ex.: "vence em 6 dias e 4 h"). */
  deadlineLabel?: string;
  /** Rótulo da trilha (ex.: "Kids"). */
  trailLabel?: string;
  /** Marca o cupom como exemplo. Padrão: true (todas as ofertas do protótipo são exemplos). */
  example?: boolean;
  /** Ação de resgatar (estado `available`). */
  onRedeem?: () => void;
  /** Ação de mostrar o código no caixa (estado `redeemed`). */
  onShow?: () => void;
  /** Ação de buscar moedas (estado `insufficient`). */
  onEarn?: () => void;
  /** Resgate em andamento. */
  loading?: boolean;
  className?: string;
}

const STAMP: Partial<Record<CouponState, string>> = {
  redeemed: 'Resgatado',
  expired: 'Expirou',
};

/** Cupom em formato de ingresso, com picote. Estados: disponível, resgatado, expirado e sem saldo. */
export function CouponTicket({
  title,
  storeName,
  cost,
  validDays,
  state = 'available',
  missingCoins,
  code,
  deadlineLabel,
  trailLabel,
  example = true,
  onRedeem,
  onShow,
  onEarn,
  loading,
  className,
}: CouponTicketProps) {
  const muted = state === 'expired';
  const stamp = STAMP[state];

  return (
    <div className={cx('cde-ticket-shadow', className)}>
      <article
        aria-label={`Cupom ${title}, ${storeName}`}
        className={cx(
          'cde-ticket relative flex min-h-36 rounded-md chunk',
          muted
            ? 'bg-surface-2 text-ink-soft'
            : state === 'redeemed'
              ? 'bg-paper text-on-paper'
              : 'bg-surface text-ink',
        )}
      >
        <span aria-hidden="true" className="cde-ticket-notch" data-edge="top" />
        <span aria-hidden="true" className="cde-ticket-notch" data-edge="bottom" />
        <span aria-hidden="true" className="cde-ticket-perforation" />

        <div className="flex min-w-0 flex-1 flex-col gap-1 py-3.5 pl-4 pr-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs font-bold uppercase tracking-wide">{storeName}</span>
            {trailLabel && <span className="text-xs text-ink-soft">· {trailLabel}</span>}
            {example && <ExampleTag className="ml-auto" />}
          </div>
          <h3 className="font-display text-xl font-extrabold leading-tight">{title}</h3>

          {state === 'redeemed' && code ? (
            <div className="mt-1">
              <p className="font-mono text-2xl font-extrabold tracking-[0.12em]">{code}</p>
              {deadlineLabel && (
                <p className="flex items-center gap-1 text-xs font-semibold">
                  <Icon name="clock" size={14} /> {deadlineLabel}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-ink-soft">
              {state === 'expired'
                ? 'O prazo deste cupom passou. Tem outros esperando por você.'
                : `Vale por ${validDays} dias depois do resgate. Uso único.`}
            </p>
          )}

          <div className="mt-auto pt-2">
            {state === 'available' && onRedeem && (
              <Button size="sm" onClick={onRedeem} loading={loading} loadingLabel="Resgatando">
                Resgatar
              </Button>
            )}
            {state === 'redeemed' && onShow && (
              <Button size="sm" variant="secondary" icon="qr" onClick={onShow}>
                Mostrar no caixa
              </Button>
            )}
            {state === 'insufficient' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-xs bg-surface-2 px-2 py-1 font-mono text-xs font-bold chunk-thin">
                  faltam {missingCoins ?? cost} moedas
                </span>
                {onEarn && (
                  <Button size="sm" variant="ghost" iconRight="arrowRight" onClick={onEarn}>
                    Ganhar moedas
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="cde-ticket-stub relative flex shrink-0 flex-col items-center justify-center gap-0.5 px-2 text-center">
          <Icon name="coin" size={22} className={muted ? '' : 'text-gold-deep'} />
          <span className="font-mono text-3xl font-extrabold leading-none tabular-nums">
            {cost}
          </span>
          <span className="font-mono text-xs font-bold uppercase">moedas</span>
          {stamp && (
            <span
              className={cx(
                'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[18deg] rounded-xs border-[3px] px-1.5 py-0.5 font-display text-sm font-extrabold uppercase',
                state === 'redeemed'
                  ? 'border-success bg-paper text-success'
                  : 'border-danger bg-surface-2 text-danger',
              )}
            >
              {stamp}
            </span>
          )}
        </div>
      </article>
    </div>
  );
}
