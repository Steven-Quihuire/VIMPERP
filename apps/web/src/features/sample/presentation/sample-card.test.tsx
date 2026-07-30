import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../../../app/app';

describe('App', () => {
  it('renders login by default', async () => {
    render(<App initialEntries={['/login']} />);

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
});
