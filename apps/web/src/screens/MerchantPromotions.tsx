import {
  COUPONS,
  type MerchantApi,
  type Promotion,
  type PromotionInput,
  type Store,
} from '@cde/shared';
import { Button, Card, Tag } from '@cde/ui';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../data/GameProvider';
import { Screen } from '../layout/Screen';

function localInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function MerchantPromotions() {
  const { api, mode } = useGame();
  const merchant = api as typeof api & MerchantApi;
  const [stores, setStores] = useState<Store[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [storeId, setStoreId] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [terms, setTerms] = useState('');
  const [startsAt, setStartsAt] = useState(() => localInput(new Date()));
  const [endsAt, setEndsAt] = useState(() => localInput(new Date(Date.now() + 7 * 86400000)));
  const [status, setStatus] = useState<PromotionInput['status']>('published');
  const [couponId, setCouponId] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const available = await merchant.listManagedStores();
    setStores(available);
    const selected = storeId || available[0]?.id || '';
    setStoreId(selected);
    if (selected) setPromotions(await merchant.listManagedPromotions(selected));
  }, [merchant, storeId]);

  useEffect(() => {
    void refresh().catch(() => setError('Não foi possível carregar as promoções.'));
  }, [refresh]);

  function edit(promotion: Promotion) {
    setEditing(promotion.id);
    setTitle(promotion.title);
    setDescription(promotion.description);
    setTerms(promotion.terms);
    setStartsAt(localInput(new Date(promotion.startsAt)));
    setEndsAt(localInput(new Date(promotion.endsAt)));
    setStatus(promotion.status);
    setCouponId(promotion.couponId ?? '');
    setStoreId(promotion.storeId);
  }

  function clearForm() {
    setEditing(null);
    setTitle('');
    setDescription('');
    setTerms('');
    setCouponId('');
    setStatus('published');
    setStartsAt(localInput(new Date()));
    setEndsAt(localInput(new Date(Date.now() + 7 * 86400000)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const input: PromotionInput = {
        storeId,
        title,
        description,
        terms,
        status,
        example: true,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        ...(couponId ? { couponId } : {}),
      };
      if (editing) await merchant.updatePromotion(editing, input);
      else await merchant.createPromotion(input);
      clearForm();
      await refresh();
    } catch {
      setError('Confira os campos e as datas. A data final precisa ser posterior à inicial.');
    }
  }

  async function pause(promotion: Promotion) {
    try {
      await merchant.updatePromotion(promotion.id, {
        storeId: promotion.storeId,
        title: promotion.title,
        description: promotion.description,
        terms: promotion.terms,
        startsAt: promotion.startsAt,
        endsAt: promotion.endsAt,
        status: promotion.status === 'paused' ? 'published' : 'paused',
        example: true,
        ...(promotion.couponId ? { couponId: promotion.couponId } : {}),
      });
      await refresh();
    } catch {
      setError('Não foi possível alterar o status da promoção.');
    }
  }

  return (
    <Screen title="Promoções da loja" kicker="Painel demonstrativo" back="/chat">
      <Card tone="gold" className="mb-4">
        <Tag tone="example">Somente demonstração</Tag>
        <p className="mt-2 text-sm">
          Os dados ficam neste navegador. Escolher uma loja aqui simula o acesso do lojista.
        </p>
      </Card>
      {mode !== 'local' && (
        <p className="mb-3 text-sm">O painel HTTP depende das rotas de lojista da API.</p>
      )}
      <label className="mb-3 block font-bold" htmlFor="merchant-store">
        Loja
      </label>
      <select
        id="merchant-store"
        className="mb-4 min-h-12 w-full rounded-md border-2 border-line bg-surface px-3 focus-ring"
        value={storeId}
        onChange={(event) => {
          setStoreId(event.target.value);
          void merchant.listManagedPromotions(event.target.value).then(setPromotions);
        }}
      >
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
      <form
        className="grid gap-3 rounded-md border-2 border-line bg-surface p-3"
        onSubmit={(event) => void submit(event)}
      >
        <h2 className="font-display text-xl font-extrabold">
          {editing ? 'Editar promoção' : 'Cadastrar promoção'}
        </h2>
        <label className="grid gap-1 font-bold">
          Título
          <input
            className="min-h-11 rounded border-2 border-line px-2"
            required
            maxLength={80}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="grid gap-1 font-bold">
          Descrição
          <input
            className="min-h-11 rounded border-2 border-line px-2"
            required
            maxLength={300}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="grid gap-1 font-bold">
          Condições
          <input
            className="min-h-11 rounded border-2 border-line px-2"
            maxLength={500}
            value={terms}
            onChange={(event) => setTerms(event.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-sm font-bold">
            Início
            <input
              type="datetime-local"
              className="min-h-11 min-w-0 rounded border-2 border-line px-1"
              required
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Fim
            <input
              type="datetime-local"
              className="min-h-11 min-w-0 rounded border-2 border-line px-1"
              required
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </label>
        </div>
        <label className="grid gap-1 font-bold">
          Cupom associado (opcional)
          <select
            className="min-h-11 rounded border-2 border-line px-2"
            value={couponId}
            onChange={(event) => setCouponId(event.target.value)}
          >
            <option value="">Sem cupom</option>
            {COUPONS.filter((coupon) => coupon.storeId === storeId).map((coupon) => (
              <option key={coupon.id} value={coupon.id}>
                {coupon.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 font-bold">
          Status
          <select
            className="min-h-11 rounded border-2 border-line px-2"
            value={status}
            onChange={(event) => setStatus(event.target.value as PromotionInput['status'])}
          >
            <option value="draft">Rascunho</option>
            <option value="published">Publicada</option>
            <option value="paused">Pausada</option>
          </select>
        </label>
        {error && (
          <p role="alert" className="text-sm font-bold text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit">{editing ? 'Salvar alterações' : 'Cadastrar'}</Button>
          {editing && (
            <Button variant="secondary" onClick={clearForm}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
      <h2 className="mb-2 mt-6 font-display text-xl font-extrabold">Ofertas cadastradas</h2>
      <div className="grid gap-3">
        {promotions.map((promotion) => (
          <Card key={promotion.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display font-extrabold">{promotion.title}</h3>
              <Tag tone={promotion.status === 'published' ? 'gold' : 'outline'}>
                {promotion.status}
              </Tag>
            </div>
            <p className="mt-1 text-sm">{promotion.description}</p>
            <p className="mt-1 text-xs text-ink-soft">
              {new Date(promotion.startsAt).toLocaleDateString('pt-BR')} até{' '}
              {new Date(promotion.endsAt).toLocaleDateString('pt-BR')}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => edit(promotion)}>
                Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void pause(promotion)}>
                {promotion.status === 'paused' ? 'Reativar' : 'Pausar'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Link className="mt-5 text-center font-bold underline focus-ring" to="/chat">
        Testar no chat
      </Link>
    </Screen>
  );
}
