import type { ChatMessageInput, ChatReply } from '@cde/shared';
import { Icon, type IconName } from '@cde/ui';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../data/GameProvider';
import './Chat.css';

type Message = { id: number; from: 'capi' | 'visitor'; text: string; reply?: ChatReply };
const OPTIONS: Array<{
  label: string;
  intent?: ChatMessageInput['intent'];
  icon: IconName;
  href?: string;
}> = [
  { label: 'Ver promoções', intent: 'promotions', icon: 'ticket' },
  { label: 'Encontrar loja', intent: 'store_location', icon: 'home' },
  { label: 'Meus pontos', icon: 'star', href: '/perfil' },
  { label: 'Como ganhar moedas', intent: 'earn_coins', icon: 'coin' },
  { label: 'Eventos', icon: 'calendar', href: '/missoes' },
  { label: 'Escanear QR', icon: 'qr', href: '/scanner' },
];

export function Chat() {
  const { api } = useGame();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const conversationRef = useRef<HTMLElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
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

  async function send(text: string, intent?: ChatMessageInput['intent']) {
    if (busy) return;
    setBusy(true);
    const id = Date.now();
    const sentText = text || OPTIONS.find((item) => item.intent === intent)?.label || '';
    setDraft('');
    setMessages((current) => [
      ...current,
      {
        id,
        from: 'visitor',
        text: sentText,
      },
    ]);
    setTyping(true);
    try {
      const reply = await api.sendChatMessage({ text, ...(intent ? { intent } : {}) });
      await new Promise((resolve) =>
        window.setTimeout(resolve, 850 + Math.min(reply.text.length * 8, 700)),
      );
      setTyping(false);
      setMessages((current) => [...current, { id: id + 1, from: 'capi', text: reply.text, reply }]);
    } catch {
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      setTyping(false);
      setMessages((current) => [
        ...current,
        {
          id: id + 1,
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
    <div className="capi-chat">
      <header className="chat-hero">
        <p className="chat-kicker">Ajuda do shopping</p>
        <h1>
          Fale com a<br />
          Capi
        </h1>
        <Link to="/" className="chat-back focus-ring" aria-label="Voltar">
          <Icon name="chevronLeft" size={20} />
        </Link>
        <span className="chat-sparkle spark-one" aria-hidden="true">
          ✦
        </span>
        <span className="chat-sparkle spark-two" aria-hidden="true">
          ✦
        </span>
        <img
          className="chat-hero-img"
          src="/chat/capi-hero.webp"
          alt="Capi acenando com boné e moletom vinho"
        />
      </header>
      <div className="chat-intro">
        <svg width="27" height="27" viewBox="0 0 28 28" aria-hidden="true">
          <path
            d="M3 12.5 5 5.5h18l2 7"
            fill="#D98A86"
            stroke="#8C3A4B"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M3 12.5a3.4 3.4 0 0 0 6.6.8 3.4 3.4 0 0 0 4.9 0 3.4 3.4 0 0 0 4.9 0 3.4 3.4 0 0 0 4.9 0A3.4 3.4 0 0 0 25 12.5"
            fill="#F3D5CF"
            stroke="#8C3A4B"
            strokeWidth="1.6"
          />
          <path d="M5.5 15.5V23h17v-7.5" fill="#FFF3E8" stroke="#8C3A4B" strokeWidth="1.6" />
          <path d="M11.5 23v-5h5v5" fill="#8C3A4B" />
        </svg>
        <p>Respostas rápidas sobre lojas e promoções cadastradas.</p>
      </div>
      <section
        ref={conversationRef}
        aria-label="Conversa com a Capi"
        aria-live="polite"
        className="chat-conversation"
      >
        {messages.map((message) => (
          <div key={message.id} className={`chat-row ${message.from}`}>
            {message.from === 'capi' && (
              <span className="chat-avatar">
                <img src="/chat/capi-avatar.webp" alt="" />
              </span>
            )}
            <div className={`chat-bubble ${message.reply?.promotions.length ? 'has-offers' : ''}`}>
              {message.id === 0 ? (
                <p>
                  Oi! Sou a <b>Capi</b>. Posso ajudar com <b>promoções</b>, <b>lojas</b> e{' '}
                  <b>recompensas</b>.
                </p>
              ) : (
                <p>{message.text}</p>
              )}
              {!!message.reply?.promotions.length && (
                <div className="chat-offers">
                  {message.reply.promotions.map((promotion, index) => (
                    <Link
                      to={promotion.couponId ? '/recompensas' : '/mapa'}
                      className={`chat-offer offer-${index % 3} focus-ring`}
                      key={promotion.id}
                    >
                      <span className="offer-category">
                        <Icon name="gift" size={13} />
                        Oferta
                      </span>
                      <span className="offer-line" />
                      <strong>{promotion.title}</strong>
                      <span className="offer-description">{promotion.description}</span>
                      <small>Exemplo</small>
                    </Link>
                  ))}
                </div>
              )}
              <span className="chat-time">
                {new Date(message.id || Date.now()).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {message.from === 'visitor' ? ' ✓✓' : ''}
              </span>
            </div>
          </div>
        ))}
        {messages.length === 1 && !typing && (
          <>
            <div className="chat-row visitor">
              <div className="chat-bubble">
                <p>Quais promoções tem hoje?</p>
                <span className="chat-time">Exemplo ✓✓</span>
              </div>
            </div>
            <div className="chat-row capi">
              <span className="chat-avatar">
                <img src="/chat/capi-avatar.webp" alt="" />
              </span>
              <div className="chat-bubble has-offers">
                <p className="promo-title">
                  Aqui estão as promoções de hoje! <Icon name="gift" size={15} />
                </p>
                <div className="chat-offers sample-offers">
                  {[
                    { name: 'Moda', text: 'Até 40% OFF', icon: 'ticket' },
                    { name: 'Cinema', text: 'Combo com 20% OFF', icon: 'gift' },
                    { name: 'Alimentação', text: '2 por 1 em lanches', icon: 'star' },
                  ].map((item, index) => (
                    <button
                      type="button"
                      key={item.name}
                      className={`chat-offer offer-${index}`}
                      onClick={() => void send('', 'promotions')}
                    >
                      <span className="offer-category">
                        <Icon name={item.icon as IconName} size={13} />
                        {item.name}
                      </span>
                      <span className="offer-line" />
                      <strong>{item.text}</strong>
                      <img
                        src={`/chat/${['moda', 'cinema', 'alimentacao'][index]}.svg`}
                        className="offer-art"
                        alt=""
                      />
                      <small>Exemplo</small>
                    </button>
                  ))}
                </div>
                <span className="chat-time">Ofertas ilustrativas</span>
              </div>
            </div>
          </>
        )}
        {typing && (
          <div className="chat-row capi">
            <span className="chat-avatar">
              <img src="/chat/capi-avatar.webp" alt="" />
            </span>
            <div className="chat-bubble typing-dots">
              <i />
              <i />
              <i />
              <span>A Capi está digitando</span>
            </div>
          </div>
        )}
      </section>
      <h2 className="chat-help-title">
        <span aria-hidden="true">✦</span> Como posso te ajudar?
      </h2>
      <div className="chat-actions">
        {OPTIONS.map((option) =>
          option.href ? (
            <Link className="focus-ring" to={option.href} key={option.label}>
              <Icon name={option.icon} size={19} />
              {option.label}
            </Link>
          ) : (
            <button
              className="focus-ring"
              type="button"
              key={option.label}
              disabled={busy}
              onClick={() => void send('', option.intent)}
            >
              <Icon name={option.icon} size={19} />
              {option.label}
            </button>
          ),
        )}
      </div>
      <form className="chat-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="chat-input">
          Escreva uma pergunta
        </label>
        <div className="chat-field">
          <Icon name="keyboard" size={17} />
          <input
            id="chat-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={240}
            placeholder="Digite sua mensagem..."
          />
        </div>
        <button type="submit" disabled={busy || !draft.trim()} className="focus-ring">
          Enviar
        </button>
      </form>
    </div>
  );
}
