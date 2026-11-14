import { Button, SystemNote } from '@cde/ui';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capi3D } from '../layout/Capi3D';
import { Screen } from '../layout/Screen';
import { useDiscover } from '../lib/useEggs';

/** Rota que não existe: no lugar do redirecionamento mudo, a Capi dormindo e uma provocação. */
export function NotFound() {
  const navigate = useNavigate();
  const discover = useDiscover();

  // biome-ignore lint/correctness/useExhaustiveDependencies: marca o ovo uma vez, ao entrar
  useEffect(() => {
    discover('perdido');
  }, []);

  return (
    <Screen kicker="erro 404" title="Você se perdeu">
      <div className="flex flex-col items-center gap-4 text-center">
        <Capi3D size={150} intro={null} rest="Dormindo" />
        <p className="font-display text-2xl font-extrabold leading-tight">
          Essa página não existe. Nem a vaga perto da entrada no sábado.
        </p>
        <p className="text-sm text-ink-soft">A Capi cochilou esperando você achar o caminho.</p>
        <Button size="lg" iconRight="arrowRight" onClick={() => navigate('/')}>
          Voltar pro shopping
        </Button>
      </div>
      <SystemNote className="mt-6">
        rota desconhecida: em vez de mandar a pessoa para a Home sem explicar, o app avisa.
      </SystemNote>
    </Screen>
  );
}
