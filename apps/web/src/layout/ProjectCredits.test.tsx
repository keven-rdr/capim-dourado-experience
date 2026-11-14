import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AboutProject,
  avatarUrl,
  CONTRIBUTORS,
  CONTRIBUTORS_URL,
  SiteFooter,
} from './ProjectCredits';

describe.each([
  ['SiteFooter', <SiteFooter key="footer" />],
  ['AboutProject', <AboutProject key="about" />],
])('%s', (_name, ui) => {
  it('mostra o logo do shopping com texto alternativo', () => {
    render(ui);
    expect(screen.getByRole('img', { name: 'Capim Dourado Shopping' })).toHaveAttribute(
      'src',
      '/brand/capim-dourado-logo.webp',
    );
  });

  it('liga cada contribuinte ao perfil no GitHub, em nova aba e sem vazar o referrer', () => {
    render(ui);
    const list = screen.getByRole('list', { name: 'Contribuintes do projeto no GitHub' });
    const links = within(list).getAllByRole('link');
    expect(links).toHaveLength(CONTRIBUTORS.length);
    CONTRIBUTORS.forEach((person, index) => {
      expect(links[index]).toHaveAttribute('href', `https://github.com/${person.login}`);
      expect(links[index]).toHaveAttribute('target', '_blank');
      expect(links[index]).toHaveAttribute('rel', 'noopener noreferrer');
      expect(links[index]).toHaveAccessibleName(`${person.login} no GitHub`);
    });
  });

  it('busca a foto de cada contribuinte no GitHub, sem enviar o referrer', () => {
    render(ui);
    const list = screen.getByRole('list', { name: 'Contribuintes do projeto no GitHub' });
    const images = list.querySelectorAll('img');
    expect(images).toHaveLength(CONTRIBUTORS.length);
    CONTRIBUTORS.forEach((person, index) => {
      expect(images[index]).toHaveAttribute('src', avatarUrl(person.login));
      expect(images[index]).toHaveAttribute('referrerpolicy', 'no-referrer');
    });
  });

  it('mostra a inicial do login quando a foto não carrega', () => {
    render(ui);
    const list = screen.getByRole('list', { name: 'Contribuintes do projeto no GitHub' });
    const first = list.querySelector('img');
    expect(first).not.toBeNull();
    if (first) fireEvent.error(first);
    expect(list.querySelectorAll('img')).toHaveLength(CONTRIBUTORS.length - 1);
    expect(within(list).getByText(CONTRIBUTORS[0].login.charAt(0))).toBeInTheDocument();
  });

  it('tem o link para todos os contribuintes do repositório', () => {
    render(ui);
    const all = screen.getByRole('link', { name: 'Ver todos no GitHub' });
    expect(all).toHaveAttribute('href', CONTRIBUTORS_URL);
    expect(all).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
