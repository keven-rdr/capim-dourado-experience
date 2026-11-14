import {
  Button,
  CoinRain,
  CouponTicket,
  MissionCard,
  RouletteWheel,
  rotationFor,
  SeasonScope,
  StickerCard,
  sliceCenter,
} from '@cde/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('componentes da @cde/ui', () => {
  it('Button mostra carregando e bloqueia o clique', () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Cheguei!</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Cheguei!' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} loading loadingLabel="Verificando">
        Cheguei!
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status', { name: 'Verificando' })).toBeInTheDocument();
  });

  it('CouponTicket tem os estados disponível, resgatado e sem saldo, sem o selo "exemplo"', () => {
    const onRedeem = vi.fn();
    const { rerender } = render(
      <CouponTicket
        title="Pipoca média"
        storeName="Cinemark"
        cost={120}
        validDays={7}
        onRedeem={onRedeem}
      />,
    );
    expect(screen.queryByText('exemplo')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resgatar' }));
    expect(onRedeem).toHaveBeenCalled();

    rerender(
      <CouponTicket
        title="Pipoca média"
        storeName="Cinemark"
        cost={120}
        validDays={7}
        state="redeemed"
        code="CDE-ABCD-12"
      />,
    );
    expect(screen.getByText('CDE-ABCD-12')).toBeInTheDocument();
    expect(screen.getByText('Resgatado')).toBeInTheDocument();

    rerender(
      <CouponTicket
        title="Pipoca média"
        storeName="Cinemark"
        cost={120}
        validDays={7}
        state="insufficient"
        missingCoins={30}
      />,
    );
    expect(screen.getByText('faltam 30 moedas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resgatar' })).not.toBeInTheDocument();
  });

  it('MissionCard mostra progresso e o estado concluída', () => {
    const { rerender } = render(
      <MissionCard
        kind="season"
        title="A Fábrica de Presentes"
        current={2}
        target={5}
        reward={{ xp: 100, coins: 40 }}
      />,
    );
    expect(screen.getByText('Da temporada')).toBeInTheDocument();
    expect(screen.getByText('Progresso: 2 de 5.')).toBeInTheDocument();
    rerender(
      <MissionCard
        kind="daily"
        title="Cheguei!"
        current={1}
        target={1}
        reward={{ xp: 30, coins: 10 }}
      />,
    );
    expect(screen.getByText('Missão concluída.')).toBeInTheDocument();
  });

  it('RouletteWheel descreve as fatias, gira para o valor dado e só gira para a frente', () => {
    const slices = ['Cinemark', 'Centauro', 'Ri Happy', 'Hering'].map((label) => ({ label }));
    const { container, rerender } = render(<RouletteWheel slices={slices} rotation={0} />);
    expect(
      screen.getByRole('img', { name: /4 prêmios: Cinemark, Centauro, Ri Happy, Hering/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Centauro')).toHaveLength(1);

    rerender(<RouletteWheel slices={slices} rotation={1080} durationMs={0} />);
    const wheel = container.querySelector<HTMLElement>('[style*="rotate(1080deg)"]');
    expect(wheel).not.toBeNull();
    expect(wheel?.style.transition).toBe('none');
  });

  it('RouletteWheel: o miolo só é tocável quando há onHubPress e fica fora do teclado', () => {
    const slices = ['A', 'B', 'C'].map((label) => ({ label }));
    const { rerender } = render(<RouletteWheel slices={slices} />);
    expect(screen.queryByRole('button', { name: 'Miolo da roleta' })).toBeNull();

    const onHubPress = vi.fn();
    rerender(<RouletteWheel slices={slices} onHubPress={onHubPress} />);
    const hub = screen.getByRole('button', { name: 'Miolo da roleta' });
    expect(hub).toHaveAttribute('tabindex', '-1');
    fireEvent.click(hub);
    fireEvent.click(hub);
    expect(onHubPress).toHaveBeenCalledTimes(2);
    // a roda continua descrita como imagem, sem o botão dentro dela
    expect(screen.getByRole('img', { name: /3 prêmios/ })).not.toContainElement(hub);
  });

  it('rotationFor leva o centro da fatia ao ponteiro, sempre para a frente', () => {
    // 4 fatias de 90°: o centro da fatia 1 fica em 135°; o ponteiro está em 0°.
    expect(sliceCenter(1, 4)).toBe(135);
    let rotation = 0;
    for (const index of [1, 3, 0, 1, 2]) {
      const next = rotationFor(rotation, index, 4);
      expect(next).toBeGreaterThan(rotation + 5 * 360 - 1);
      expect((((next + sliceCenter(index, 4)) % 360) + 360) % 360).toBeCloseTo(0, 6);
      rotation = next;
    }
  });

  it('a mesma figurinha muda só de tema dentro de um SeasonScope', () => {
    const { container } = render(
      <SeasonScope season="halloween">
        <StickerCard name="Capi bruxa" rarity="comum" motif="capi" locked hint="Volta em outubro" />
      </SeasonScope>,
    );
    expect(container.querySelector('[data-season="halloween"]')).not.toBeNull();
    expect(screen.getByLabelText(/trancada/)).toBeInTheDocument();
    expect(screen.getByText('Volta em outubro')).toBeInTheDocument();
  });

  describe('CoinRain', () => {
    afterEach(() => vi.useRealTimers());

    it('é decoração: escondida de leitor de tela, sem toque, com o número de moedas pedido', () => {
      const { baseElement } = render(<CoinRain count={7} />);
      const rain = baseElement.querySelector('[aria-hidden="true"].fixed');
      expect(rain).not.toBeNull();
      expect(rain?.className).toContain('pointer-events-none');
      expect(rain?.querySelectorAll('svg')).toHaveLength(7);
    });

    it('avisa quando acaba e não avisa se sair da tela antes', () => {
      vi.useFakeTimers();
      const onDone = vi.fn();
      const { unmount } = render(<CoinRain durationMs={3000} onDone={onDone} />);
      vi.advanceTimersByTime(2999);
      expect(onDone).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onDone).toHaveBeenCalledTimes(1);

      const early = vi.fn();
      const second = render(<CoinRain durationMs={3000} onDone={early} />);
      second.unmount();
      vi.advanceTimersByTime(5000);
      expect(early).not.toHaveBeenCalled();
      unmount();
    });
  });
});
