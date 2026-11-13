import { Button, CouponTicket, MissionCard, SeasonScope, StickerCard } from '@cde/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

  it('CouponTicket tem os estados disponível, resgatado e sem saldo, sempre com "exemplo"', () => {
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
    expect(screen.getByText('exemplo')).toBeInTheDocument();
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
});
