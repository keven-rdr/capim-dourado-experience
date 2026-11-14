import { POINT_RULES, TRAIL_LABEL, type Trail } from '@cde/shared';
import { Button, CAPI_LOOKS, Capi, type CapiLook, cx, SpeechBubble } from '@cde/ui';
import { AnimatePresence, motion } from 'motion/react';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { friendlyError } from '../data/errors';
import { useGame } from '../data/GameProvider';
import { Capi3D } from '../layout/Capi3D';
import { TRAIL_HINT } from '../lib/content';
import { requestLocationPermission } from '../lib/geo';

const TRAILS: Array<{ id: Trail; tilt: string; tone: string }> = [
  { id: 'kids', tilt: '-rotate-2', tone: 'bg-gold text-on-gold' },
  { id: 'ela', tilt: 'rotate-1', tone: 'bg-primary text-on-primary' },
  { id: 'ele', tilt: '-rotate-1', tone: 'bg-accent text-on-accent' },
  { id: 'todos', tilt: 'rotate-2', tone: 'bg-secondary text-on-secondary' },
];

const WELCOME_LINES = [
  'Eu sou a Capi. Bora caçar?',
  'Tem presente escondido em cada andar.',
  'Leia os QR codes e junte Capicoins.',
  'Às 12h, 18h e 20h tem oferta relâmpago.',
  'Salve o que gostou: eu aviso quando baixar.',
];

/** Capi parada no centro, com o balão ao lado trocando de mensagem a cada 4 s. */
function WelcomeCapi() {
  const [line, setLine] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setLine((i) => (i + 1) % WELCOME_LINES.length), 4000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <Capi3D size={150} still />
      <SpeechBubble className="max-w-44">{WELCOME_LINES[line]}</SpeechBubble>
    </div>
  );
}

export function Onboarding() {
  const { api, mode, refresh, notify } = useGame();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [trail, setTrail] = useState<Trail | null>(null);
  const [consent, setConsent] = useState(false);
  const [asking, setAsking] = useState(false);
  const [look, setLook] = useState<CapiLook>('capi');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();

  async function allowLocation() {
    setAsking(true);
    const ok = await requestLocationPermission(mode === 'local');
    setConsent(ok);
    setAsking(false);
    setStep(3);
  }

  async function finish(event: FormEvent) {
    event.preventDefault();
    if (!trail || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createProfile({
        name: name.trim(),
        trail,
        character: look,
        locationConsent: consent,
      });
      await api.dailyOpen();
      await refresh();
      notify({
        variant: 'success',
        title: 'Boas-vindas à turma!',
        reward: `+${POINT_RULES.welcome.xp} XP só por chegar`,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(friendlyError(err).message);
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold">por Capim Dourado Shopping</p>
        {step > 0 && (
          <ol className="flex gap-1.5" aria-label={`Passo ${step} de 3`}>
            {[1, 2, 3].map((n) => (
              <li
                key={n}
                className={cx(
                  'h-2.5 w-7 rounded-full chunk-thin',
                  n <= step ? 'bg-primary' : 'bg-surface',
                )}
              />
            ))}
          </ol>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="flex flex-1 flex-col"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.22 }}
        >
          {step === 0 && (
            <>
              <div className="relative mt-6 flex-1">
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink-soft">
                  Capim Dourado Experience
                </p>
                <h1 className="mt-2 font-display text-[3.4rem] font-extrabold leading-[0.88] tracking-tight">
                  O shopping
                  <br />
                  virou um
                  <br />
                  <span className="inline-block -rotate-2 rounded-md bg-primary px-2 text-on-primary chunk shadow-hard">
                    jogo.
                  </span>
                </h1>
                <WelcomeCapi />
              </div>
              <Button size="lg" block iconRight="arrowRight" onClick={() => setStep(1)}>
                Começar a caça
              </Button>
              <p className="mt-3 text-center text-xs text-ink-soft">
                Sem baixar nada. Funciona no navegador.
              </p>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="mt-6 font-display text-4xl font-extrabold leading-[0.95]">
                Qual é a sua trilha?
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                Ela só muda quais cupons aparecem primeiro. Dá pra trocar depois.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {TRAILS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={trail === t.id}
                    onClick={() => setTrail(t.id)}
                    className={cx(
                      'flex min-h-36 cursor-pointer flex-col justify-between rounded-lg p-3 text-left chunk focus-ring pressable',
                      t.tilt,
                      trail === t.id
                        ? `${t.tone} shadow-hard-lg`
                        : 'bg-surface text-ink shadow-hard-sm',
                    )}
                  >
                    <span className="font-display text-2xl font-extrabold">
                      {TRAIL_LABEL[t.id]}
                    </span>
                    <span className="text-xs font-semibold leading-snug">{TRAIL_HINT[t.id]}</span>
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <Button size="lg" block className="mt-6" disabled={!trail} onClick={() => setStep(2)}>
                {trail ? 'Essa é a minha' : 'Escolha uma trilha'}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mt-6 flex items-end gap-2">
                <Capi3D size={110} intro="AcenoLeve" />
                <SpeechBubble className="mb-12 flex-1">
                  Posso ver onde você está? Só um pouquinho.
                </SpeechBubble>
              </div>
              <h1 className="mt-6 font-display text-3xl font-extrabold leading-tight">
                Localização, só para saber que você chegou.
              </h1>
              <ul className="mt-4 flex flex-col gap-3 text-base">
                <li className="rounded-md bg-surface p-3 chunk-thin">
                  <strong>O que fazemos:</strong> conferimos uma vez, quando você toca em
                  "Cheguei!".
                </li>
                <li className="rounded-md bg-surface p-3 chunk-thin">
                  <strong>O que não fazemos:</strong> não seguimos você pelo shopping e não
                  guardamos o trajeto.
                </li>
              </ul>
              <p className="mt-3 text-sm text-ink-soft">
                Sem localização, o app funciona com o QR da entrada.
              </p>
              <div className="flex-1" />
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  size="lg"
                  block
                  icon="location"
                  loading={asking}
                  loadingLabel="Pedindo permissão"
                  onClick={allowLocation}
                >
                  Permitir
                </Button>
                <Button
                  block
                  variant="secondary"
                  onClick={() => {
                    setConsent(false);
                    setStep(3);
                  }}
                >
                  Agora não
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <form onSubmit={finish} className="flex flex-1 flex-col">
              <h1 className="mt-6 font-display text-4xl font-extrabold leading-[0.95]">
                Quem vai com você?
              </h1>
              <p className="mt-2 text-sm text-ink-soft">Escolha alguém da turma das capivaras.</p>
              <div
                className="mt-5 grid grid-cols-2 gap-3"
                role="radiogroup"
                aria-label="Personagem"
              >
                {CAPI_LOOKS.map((l, i) => (
                  // biome-ignore lint/a11y/useSemanticElements: cartão de escolha com desenho
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={look === l.id}
                    onClick={() => setLook(l.id)}
                    className={cx(
                      'flex cursor-pointer flex-col items-center rounded-lg px-2 pb-3 pt-1 chunk focus-ring',
                      i % 2 ? 'rotate-1' : '-rotate-1',
                      look === l.id ? 'bg-gold text-on-gold shadow-hard' : 'bg-surface text-ink',
                    )}
                  >
                    <Capi
                      size={84}
                      look={l.id}
                      expression={look === l.id ? 'comemorando' : 'animada'}
                      illustrated
                    />
                    <span className="font-display text-lg font-extrabold">{l.name}</span>
                    <span className="text-center text-xs leading-snug">{l.bio}</span>
                  </button>
                ))}
              </div>
              <label htmlFor={nameId} className="mt-6 font-display text-base font-bold">
                Como a Capi te chama?
              </label>
              <input
                id={nameId}
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome ou apelido"
                autoComplete="given-name"
                className="mt-1 min-h-12 rounded-md bg-surface px-3 text-base text-ink chunk focus-ring placeholder:text-ink-soft"
              />
              {error && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}
              <div className="flex-1" />
              <Button
                type="submit"
                size="lg"
                block
                className="mt-6"
                loading={saving}
                disabled={!name.trim()}
              >
                Entrar no jogo
              </Button>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
