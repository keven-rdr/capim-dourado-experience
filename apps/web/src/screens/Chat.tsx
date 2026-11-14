import type { ChatMessageInput, ChatReply, Store } from '@cde/shared';
import { Button, cx, ExampleTag, Icon, type IconName } from '@cde/ui';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../data/GameProvider';
import { Screen } from '../layout/Screen';

type Message = {
  id: number;
  /** Hora de envio (ms), estável entre renderizações. */
  at: number;
  from: 'capi' | 'visitor';
  text: string;
  reply?: ChatReply;
  stores?: Store[];
};
const OPTIONS: Array<{
  label: string;
  intent?: ChatMessageInput['intent'];
  icon: IconName;
  href?: string;
}> = [
  { label: 'Ver promoções', intent: 'promotions', icon: 'ticket' },
  { label: 'Encontrar loja', intent: 'store_location', icon: 'home' },
  { label: 'Meus pontos', intent: 'points_help', icon: 'star' },
  { label: 'Como ganhar moedas', intent: 'earn_coins', icon: 'coin' },
  { label: 'Eventos', intent: 'events', icon: 'calendar' },
  { label: 'Escanear QR', icon: 'qr', href: '/scanner' },
];

/** Tons das ofertas: saem dos tokens, então mudam com a temporada. */
const OFFER_TONE = [
  'bg-primary text-on-primary',
  'bg-secondary text-on-secondary',
  'bg-gold text-on-gold',
];

/** Atalho rápido: mesma receita do Chip da @cde/ui, mas sem o estado de seleção. */
const QUICK_ACTION =
  'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-surface px-3.5 font-display text-sm font-bold text-ink chunk-thin shadow-hard-sm hover:bg-surface-2 focus-ring pressable disabled:cursor-not-allowed disabled:opacity-50';

export function Chat() {
  const { api } = useGame();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [waitingForStore, setWaitingForStore] = useState(false);
  const conversationRef = useRef<HTMLElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      at: Date.now(),
      from: 'capi',
      text: 'Oi! Sou a Capi. Posso ajudar com promoções, lojas e recompensas.',
    },
  ]);

  // Atualiza a posição quando chegam mensagens ou o indicador de digitação muda.
  // biome-ignore lint/correctness/useExhaustiveDependencies: dependências acionam a rolagem
  useEffect(() => {
    conversationRef.current?.scrollTo({
      top: conversationRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, typing]);

  async function send(text: string, intent?: ChatMessageInput['intent'], storeId?: string) {
    if (busy) return;
    setBusy(true);
    const id = Date.now();
    const sentText = text || OPTIONS.find((item) => item.intent === intent)?.label || '';
    setDraft('');
    setMessages((current) => [
      ...current,
      {
        id,
        at: id,
        from: 'visitor',
        text: sentText,
      },
    ]);
    setTyping(true);
    try {
      const otherQuestion =
        /promo[cç][aã]o|oferta|desconto|moedas?|pontos?|resgat|cupom|recompensa|evento|programa[cç][aã]o/i.test(
          text,
        );
      const resolvedIntent =
        intent ?? (waitingForStore && !otherQuestion ? 'store_location' : undefined);
      const reply = await api.sendChatMessage({
        text,
        ...(resolvedIntent ? { intent: resolvedIntent } : {}),
        ...(storeId ? { storeId } : {}),
      });
      const needsStore = resolvedIntent === 'store_location' && !reply.store;
      const stores = needsStore ? await api.listStores().catch(() => []) : undefined;
      setWaitingForStore(needsStore);
      await new Promise((resolve) =>
        window.setTimeout(resolve, 850 + Math.min(reply.text.length * 8, 700)),
      );
      setTyping(false);
      setMessages((current) => [
        ...current,
        {
          id: id + 1,
          at: Date.now(),
          from: 'capi',
          text: reply.text,
          reply,
          ...(stores?.length ? { stores } : {}),
        },
      ]);
    } catch {
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      setTyping(false);
      setMessages((current) => [
        ...current,
        {
          id: id + 1,
          at: Date.now(),
          from: 'capi',
          text: 'Não consegui consultar agora. Tente novamente em instantes.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (text) void send(text);
  }

  return (
    <Screen
      kicker="Ajuda do shopping"
      title="Fale com a Capi"
      back="/"
      right={
        <img
          src="/chat/capi-hero.webp"
          alt="Capi acenando com boné e moletom vinho"
          className="-mb-4 h-32 w-auto shrink-0 animate-bob"
        />
      }
    >
      <div className="flex flex-1 flex-col gap-4">
        <p className="flex items-center gap-2.5 rounded-md bg-surface px-3.5 py-2.5 text-sm font-semibold chunk-thin shadow-hard-sm">
          <Icon name="pin" size={20} className="shrink-0 text-primary" />
          Respostas rápidas sobre lojas e promoções cadastradas.
        </p>

        <section
          ref={conversationRef}
          aria-label="Conversa com a Capi"
          aria-live="polite"
          className="flex min-h-48 flex-1 flex-col gap-3 overflow-y-auto pb-1 pr-1 [scrollbar-width:thin]"
        >
          {messages.map((message) => {
            const mine = message.from === 'visitor';
            return (
              <div
                key={message.id}
                className={cx('flex min-w-0 items-end gap-2', mine && 'justify-end')}
              >
                {!mine && <CapiAvatar />}
                <div
                  className={cx(
                    'min-w-0 text-sm font-semibold leading-snug chunk-thin [overflow-wrap:anywhere]',
                    mine
                      ? 'max-w-[80%] rounded-md rounded-br-xs bg-primary px-3.5 py-2.5 text-on-primary shadow-hard-sm'
                      : 'max-w-[calc(100%-3rem)] rounded-md rounded-bl-xs bg-surface px-3.5 py-2.5 text-ink shadow-hard-sm',
                  )}
                >
                  {message.id === 0 ? (
                    <p>
                      Oi! Sou a <b>Capi</b>. Posso ajudar com <b>promoções</b>, <b>lojas</b> e{' '}
                      <b>recompensas</b>.
                    </p>
                  ) : (
                    <p>{message.text}</p>
                  )}
                  {message.reply?.intent === 'points_help' && (
                    <Link
                      to="/perfil"
                      className="mt-2 inline-flex min-h-11 items-center rounded-sm bg-gold px-3 font-display font-bold text-on-gold chunk-thin focus-ring"
                    >
                      Ver meu perfil
                    </Link>
                  )}
                  {!!message.reply?.promotions.length && (
                    <div className="-mx-1 mt-2.5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1.5 [scrollbar-width:none]">
                      {message.reply.promotions.map((promotion, index) => (
                        <Link
                          to={promotion.couponId ? '/recompensas' : '/mapa'}
                          className={cx(
                            'flex min-h-28 w-36 shrink-0 snap-start flex-col gap-1 rounded-md p-2.5 text-left chunk-thin shadow-hard-sm focus-ring pressable',
                            OFFER_TONE[index % OFFER_TONE.length],
                          )}
                          key={promotion.id}
                        >
                          <span className="flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wide">
                            <Icon name="gift" size={14} />
                            Oferta
                          </span>
                          <strong className="font-display text-base font-extrabold leading-tight">
                            {promotion.title}
                          </strong>
                          <span className="text-xs leading-snug">{promotion.description}</span>
                          <ExampleTag className="mt-auto self-start" />
                        </Link>
                      ))}
                    </div>
                  )}
                  {!!message.stores?.length && message.id === messages[messages.length - 1]?.id && (
                    <label className="mt-2.5 flex flex-col gap-1">
                      <span className="font-mono text-xs font-bold uppercase tracking-wide text-ink-soft">
                        Escolha uma loja
                      </span>
                      <select
                        value=""
                        disabled={busy}
                        className="min-h-11 w-full rounded-sm bg-surface px-2 font-body text-sm font-semibold text-ink chunk-thin focus-ring"
                        onChange={(event) => {
                          const store = message.stores?.find(
                            (item) => item.id === event.target.value,
                          );
                          if (store) void send(store.name, 'store_location', store.id);
                        }}
                      >
                        <option value="">Selecione uma loja</option>
                        {message.stores.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <span
                    className={cx(
                      'mt-1 block text-right font-mono text-xs',
                      mine ? 'text-on-primary/80' : 'text-ink-soft',
                    )}
                  >
                    {new Date(message.at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
          {typing && (
            <div className="flex min-w-0 items-end gap-2">
              <CapiAvatar />
              <div className="flex min-h-11 items-center gap-1.5 rounded-md rounded-bl-xs bg-surface px-3.5 text-sm font-semibold text-ink-soft chunk-thin shadow-hard-sm">
                {[0, 1, 2].map((dot) => (
                  <i
                    key={dot}
                    aria-hidden="true"
                    className="size-2 animate-bounce rounded-full bg-primary"
                    style={{ animationDelay: `${dot * 150}ms` }}
                  />
                ))}
                <span className="ml-1">A Capi está digitando</span>
              </div>
            </div>
          )}
        </section>

        <div>
          <h2 className="mb-2.5 flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
            <Icon name="sparkle" size={22} className="text-gold-deep" />
            Como posso te ajudar?
          </h2>
          <div className="flex flex-wrap gap-2">
            {OPTIONS.map((option) =>
              option.href ? (
                <Link className={QUICK_ACTION} to={option.href} key={option.label}>
                  <Icon name={option.icon} size={18} />
                  {option.label}
                </Link>
              ) : (
                <button
                  className={QUICK_ACTION}
                  type="button"
                  key={option.label}
                  disabled={busy}
                  onClick={() => void send('', option.intent)}
                >
                  <Icon name={option.icon} size={18} />
                  {option.label}
                </button>
              ),
            )}
          </div>
        </div>

        <form className="flex items-center gap-2.5 border-t-2 border-line pt-4" onSubmit={submit}>
          <label className="sr-only" htmlFor="chat-input">
            Escreva uma pergunta
          </label>
          <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-md bg-surface px-3 text-ink-soft chunk-thin focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-(--cde-focus)">
            <Icon name="keyboard" size={20} className="shrink-0" />
            <input
              id="chat-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={240}
              placeholder="Digite sua mensagem..."
              className="w-full min-w-0 bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-ink-soft"
            />
          </div>
          <Button type="submit" size="sm" disabled={busy || !draft.trim()}>
            Enviar
          </Button>
        </form>
      </div>
    </Screen>
  );
}

function CapiAvatar() {
  return (
    <span className="grid size-10 shrink-0 place-items-end overflow-hidden rounded-blob bg-gold chunk-thin">
      <img src="/chat/capi-avatar.webp" alt="" className="size-full object-cover" />
    </span>
  );
}
