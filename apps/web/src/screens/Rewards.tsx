import { type Coupon, type Redemption, TICKET_COST, TRAIL_LABEL, type Trail } from '@cde/shared';
import {
  Button,
  Card,
  CouponTicket,
  FilterChips,
  type FilterOption,
  Sheet,
  SystemNote,
  WalletBadge,
} from '@cde/ui';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { friendlyError } from '../data/errors';
import { useGame, useGameQuery } from '../data/GameProvider';
import { demoNow } from '../demo/demoStore';
import { Capi3D } from '../layout/Capi3D';
import { Screen, SectionTitle } from '../layout/Screen';
import { deadlineLabel } from '../lib/time';

type Filter = Trail | 'tudo';

export function Rewards() {
  const { api, profile, refresh, notify } = useGame();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>(profile?.trail ?? 'tudo');
  const [confirm, setConfirm] = useState<Coupon | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [showing, setShowing] = useState<Redemption | null>(null);
  const [buying, setBuying] = useState(false);
  const coupons = useGameQuery((a) => a.listCoupons());
  const redemptions = useGameQuery((a) => a.listRedemptions());

  const coins = profile?.wallet.coins ?? 0;
  const all = coupons.data ?? [];
  const options: Array<FilterOption<Filter>> = [
    { value: 'tudo', label: 'Tudo', count: all.length },
    ...(['kids', 'ela', 'ele', 'todos'] as const).map((t) => ({
      value: t,
      label: TRAIL_LABEL[t],
      count: all.filter((c) => c.trail === t).length,
    })),
  ];
  const visible = useMemo(() => {
    const list = filter === 'tudo' ? [...all] : all.filter((c) => c.trail === filter);
    return list.sort(
      (a, b) =>
        Number(b.trail === profile?.trail) - Number(a.trail === profile?.trail) || a.cost - b.cost,
    );
  }, [all, filter, profile?.trail]);

  async function redeem() {
    if (!confirm) return;
    setRedeeming(true);
    setRedeemError(null);
    try {
      const { redemption } = await api.redeemCoupon({ couponId: confirm.id });
      setConfirm(null);
      setShowing(redemption);
      await refresh();
    } catch (error) {
      setRedeemError(friendlyError(error).message);
    } finally {
      setRedeeming(false);
    }
  }

  async function buyTicket() {
    setBuying(true);
    try {
      await api.buyTicket();
      notify({
        variant: 'success',
        title: 'Bilhete garantido!',
        description: 'Mais uma chance no sorteio.',
      });
      await refresh();
    } catch (error) {
      const f = friendlyError(error);
      notify({ variant: 'warning', title: f.title, description: f.message });
    } finally {
      setBuying(false);
    }
  }

  const now = demoNow();
  const mine = redemptions.data ?? [];

  return (
    <Screen kicker="carteira e cupons" title="Prêmios">
      {profile && (
        <section aria-label="Carteira" className="grid grid-cols-3 gap-2">
          <WalletBadge
            kind="coins"
            value={profile.wallet.coins}
            variant="tile"
            hint="Você troca por cupons."
          />
          <WalletBadge
            kind="xp"
            value={profile.wallet.xp}
            variant="tile"
            hint="Mede seu nível. Nunca diminui."
          />
          <WalletBadge
            kind="tickets"
            value={profile.wallet.tickets}
            variant="tile"
            hint="Chances no sorteio."
          />
        </section>
      )}

      <Button
        block
        variant="gold"
        icon="gift"
        iconRight="arrowRight"
        className="mt-4"
        onClick={() => navigate('/roleta')}
      >
        Roleta de cupons
      </Button>

      <SectionTitle>Troque suas moedas</SectionTitle>
      <FilterChips
        label="Filtrar por trilha"
        options={options}
        value={filter}
        onChange={setFilter}
      />
      {profile && filter === 'tudo' && (
        <p className="mb-2 text-xs text-ink-soft">
          Cupons da trilha {TRAIL_LABEL[profile.trail]} aparecem primeiro.
        </p>
      )}

      <div className="mt-2 flex flex-col gap-5">
        {visible.map((coupon) => (
          <CouponTicket
            key={coupon.id}
            title={coupon.title}
            storeName={coupon.storeName}
            cost={coupon.cost}
            validDays={coupon.validDays}
            trailLabel={TRAIL_LABEL[coupon.trail]}
            state={coins >= coupon.cost ? 'available' : 'insufficient'}
            missingCoins={coupon.cost - coins}
            onRedeem={() => {
              setRedeemError(null);
              setConfirm(coupon);
            }}
            onEarn={() => navigate('/missoes')}
          />
        ))}
        {!coupons.loading && visible.length === 0 && (
          <Card tone="muted" className="flex items-center gap-3 p-4">
            <Capi3D size={80} intro={null} rest="Dormindo" />
            <p className="text-sm font-semibold">
              Nenhum cupom nesta trilha por enquanto. Os lojistas estão preparando novidades.
            </p>
          </Card>
        )}
      </div>

      <SectionTitle aside="uso único">Meus cupons</SectionTitle>
      {mine.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Os cupons que você resgatar ficam aqui, com o código e o prazo.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {mine.map((r) => {
            const expired = Date.parse(r.expiresAt) <= now.getTime();
            const validDays = all.find((c) => c.id === r.couponId)?.validDays ?? 0;
            return (
              <CouponTicket
                key={r.id}
                title={r.title}
                storeName={r.storeName}
                validDays={validDays}
                state={r.usedAt ? 'used' : expired ? 'expired' : 'redeemed'}
                code={r.code}
                deadlineLabel={deadlineLabel(r.expiresAt, now)}
                onShow={() => setShowing(r)}
              />
            );
          })}
        </div>
      )}

      <SectionTitle aside="sorteio ilustrativo">Sorteio do mês</SectionTitle>
      <Card tone="primary" tilt="right" shape="blob" className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-xs font-bold uppercase">prêmio de Natal</p>
            <p className="font-display text-2xl font-extrabold leading-tight">
              Vale-compras no shopping
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm">
          Sorteio em 20/12 (data de exemplo). Cada bilhete é uma chance.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-lg font-extrabold">
            {profile?.wallet.tickets ?? 0} {profile?.wallet.tickets === 1 ? 'bilhete' : 'bilhetes'}
          </span>
          <Button
            variant="gold"
            icon="ticket"
            loading={buying}
            disabled={coins < TICKET_COST}
            onClick={buyTicket}
          >
            Trocar {TICKET_COST} moedas
          </Button>
        </div>
        {coins < TICKET_COST && (
          <p className="mt-2 text-xs font-semibold">
            Faltam {TICKET_COST - coins} moedas para um bilhete.
          </p>
        )}
        <p className="mt-3 rounded-xs border-2 border-dashed border-current px-2 py-1 font-mono text-xs font-bold">
          Sorteio ilustrativo no protótipo
        </p>
      </Card>

      <SystemNote className="mt-6">
        resgatar desconta moedas e gera um código de uso único com prazo (RN07). XP não se gasta.
      </SystemNote>

      <Sheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm ? `Resgatar ${confirm.title.toLowerCase()}?` : ''}
        description={confirm ? `${confirm.storeName} · cupom de exemplo` : undefined}
        footer={
          <>
            <Button block size="lg" loading={redeeming} loadingLabel="Resgatando" onClick={redeem}>
              Resgatar por {confirm?.cost} moedas
            </Button>
            <Button block variant="secondary" onClick={() => setConfirm(null)}>
              Agora não
            </Button>
          </>
        }
      >
        {confirm && (
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex justify-between border-b-2 border-dashed border-ink-soft/30 pb-2">
              <span>Saldo depois do resgate</span>
              <strong className="font-mono">{coins - confirm.cost} moedas</strong>
            </li>
            <li className="flex justify-between border-b-2 border-dashed border-ink-soft/30 pb-2">
              <span>Validade</span>
              <strong className="font-mono">{confirm.validDays} dias</strong>
            </li>
            <li>Uso único. Mostre o código no caixa e a loja marca como usado.</li>
            <li className="text-ink-soft">Oferta ilustrativa: nada foi combinado com a loja.</li>
          </ul>
        )}
        {redeemError && <p className="mt-3 font-semibold text-danger">{redeemError}</p>}
      </Sheet>

      <CodeSheet redemption={showing} onClose={() => setShowing(null)} />
    </Screen>
  );
}

function CodeSheet({
  redemption,
  onClose,
}: {
  redemption: Redemption | null;
  onClose: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!redemption) return;
    QRCode.toDataURL(redemption.code, { margin: 1, width: 220 })
      .then(setQr)
      .catch(() => setQr(null));
    const id = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [redemption]);

  return (
    <Sheet
      open={!!redemption}
      onClose={onClose}
      title="Mostre no caixa"
      description={redemption ? `${redemption.title} · ${redemption.storeName}` : undefined}
      footer={
        <Button block variant="secondary" onClick={onClose}>
          Pronto
        </Button>
      }
    >
      {redemption && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="w-full rounded-md bg-paper px-3 py-4 font-mono text-3xl font-extrabold tracking-[0.14em] text-on-paper chunk">
            {redemption.code}
          </p>
          {qr && (
            <img
              src={qr}
              alt={`QR do código ${redemption.code}`}
              className="size-40 rounded-sm bg-white p-1 chunk-thin"
            />
          )}
          <p className="font-mono text-sm font-bold">
            {deadlineLabel(redemption.expiresAt, demoNow())}
          </p>
        </div>
      )}
    </Sheet>
  );
}
