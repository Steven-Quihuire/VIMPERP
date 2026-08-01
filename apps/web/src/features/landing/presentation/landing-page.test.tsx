import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  it('renders the hero headline and subhead', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Tu empresa en un solo sistema.',
    );
    expect(
      screen.getByText('Ventas, inventario y clientes en un solo lugar, sin fricción.'),
    ).toBeInTheDocument();
  });

  it('links the primary CTA and register button to /register', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link', { name: 'Comenzar gratis' })).not.toHaveLength(0);
    for (const link of screen.getAllByRole('link', { name: 'Comenzar gratis' })) {
      expect(link).toHaveAttribute('href', '/register');
    }
    expect(screen.getByRole('link', { name: 'Registrarse' })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('renders the navbar anchor links', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Producto' })).toHaveAttribute(
      'href',
      '#producto',
    );
    expect(screen.getByRole('link', { name: 'Funciones' })).toHaveAttribute(
      'href',
      '#funciones',
    );
    expect(screen.getByRole('link', { name: 'Precios' })).toHaveAttribute('href', '#precios');
  });

  it('renders the module cards', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Ventas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Inventario' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CRM' })).toBeInTheDocument();
  });

  it('renders the closing CTA band', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Prueba Vimcore gratis.' })).toBeInTheDocument();
  });

  it('renders the product mock dashboard', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('38 artículos activos')).toBeInTheDocument();
    expect(screen.getByText('SKU-1042')).toBeInTheDocument();
  });
});
