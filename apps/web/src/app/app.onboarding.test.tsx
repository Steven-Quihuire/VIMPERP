import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from './app';

const createJsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const readUrl = (input: RequestInfo | URL) =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

const completeRequiredOnboardingFields = () => {
  fireEvent.change(screen.getByLabelText('Company name'), {
    target: { value: 'Vimcore Labs' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.change(screen.getByLabelText('Legal or tax identifier'), {
    target: { value: 'RFC-123456' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.change(screen.getByLabelText('Services'), {
    target: { value: 'Implementation, Support' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'Mexico' } });
  fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Monterrey' } });
  fireEvent.change(screen.getByLabelText('Exact location'), {
    target: { value: 'San Pedro 123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.change(screen.getByLabelText('Contact phone'), {
    target: { value: '+52 81 5555 0000' },
  });
  fireEvent.change(screen.getByLabelText('Contact email'), {
    target: { value: 'ops@vimcore.test' },
  });
};

describe('App onboarding flow', () => {
  it('blocks step progression when required onboarding fields are missing', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(
            {
              user: {
                id: 'user-1',
                email: 'owner@vimcore.test',
                username: '',
              },
              memberships: [],
            },
            200,
          ),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'ocean' }, 200));
      }

      if (url.endsWith('/me/company')) {
        return Promise.resolve(
          createJsonResponse({ companyId: 'company-1', name: 'Vimcore Labs' }, 200),
        );
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard']} />);

    expect(await screen.findByRole('heading', { name: 'Company onboarding' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(
      await screen.findByText('Complete the account step before continuing.'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/companies',
      expect.anything(),
    );
  });

  it('submits the authenticated onboarding flow and reaches the dashboard', async () => {
    let authCalls = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        authCalls += 1;

        if (authCalls === 1) {
          return Promise.resolve(
            createJsonResponse(
              {
                user: {
                  id: 'user-1',
                  email: 'owner@vimcore.test',
                  username: 'owner',
                },
                memberships: [],
              },
              200,
            ),
          );
        }

        return Promise.resolve(
          createJsonResponse(
            {
              user: {
                id: 'user-1',
                email: 'owner@vimcore.test',
                username: 'owner',
              },
              memberships: [{ companyId: 'company-1', role: 'company-owner' }],
            },
            200,
          ),
        );
      }

      if (url.endsWith('/companies')) {
        expect(init?.method).toBe('POST');
        return Promise.resolve(
          createJsonResponse({ companyId: 'company-1', paletteId: 'ocean' }, 201),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'ocean' }, 200));
      }

      if (url.endsWith('/me/company')) {
        return Promise.resolve(
          createJsonResponse({ companyId: 'company-1', name: 'Vimcore Labs' }, 200),
        );
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/onboarding']} />);

    expect(await screen.findByRole('heading', { name: 'Company onboarding' })).toBeInTheDocument();

    completeRequiredOnboardingFields();
    fireEvent.change(screen.getByLabelText('Palette'), {
      target: { value: 'ocean' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create company' }));

    expect(await screen.findByRole('heading', { name: 'ERP dashboard' })).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
      '/api/companies',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('disables company creation while submission is pending', async () => {
    let resolveCreateCompany: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(
            {
              user: {
                id: 'user-1',
                email: 'owner@vimcore.test',
                username: 'owner',
              },
              memberships: [],
            },
            200,
          ),
        );
      }

      if (url.endsWith('/companies')) {
        expect(init?.method).toBe('POST');
        return new Promise<Response>((resolve) => {
          resolveCreateCompany = resolve;
        });
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/onboarding']} />);

    expect(await screen.findByRole('heading', { name: 'Company onboarding' })).toBeInTheDocument();

    completeRequiredOnboardingFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create company' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create company' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Creating company...' })).toBeDisabled();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(resolveCreateCompany).toBeDefined();
  });

  it('updates palette preferences from the theme settings page', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(
            {
              user: {
                id: 'user-1',
                email: 'owner@vimcore.test',
                username: 'owner',
              },
              memberships: [{ companyId: 'company-1', role: 'company-owner' }],
            },
            200,
          ),
        );
      }

      if (url.endsWith('/me/preferences') && init?.method === 'PATCH') {
        return Promise.resolve(createJsonResponse({ paletteId: 'forest' }, 200));
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'ocean' }, 200));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard/settings/theme']} />);

    expect(await screen.findByRole('heading', { name: 'Paleta de colores' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Soft Graphite/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/me/preferences',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });
});
