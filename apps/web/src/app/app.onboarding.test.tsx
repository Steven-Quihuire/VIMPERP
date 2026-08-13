import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { useAuthStore } from '../features/auth/infrastructure/auth-store';

afterEach(() => {
  cleanup();
  useAuthStore.getState().clearSession();
  vi.unstubAllGlobals();
});

const createSessionResponse = (overrides?: Record<string, unknown>) => ({
  user: {
    id: 'user-1',
    email: 'owner@vimcore.test',
    username: 'owner',
  },
  memberships: [],
  activeCompany: null,
  activeLocalId: null,
  capabilities: [],
  ...overrides,
});

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

const setDesktopBrowser = () => {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0',
  });

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(pointer: coarse)' ? false : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const completeRequiredOnboardingFields = () => {
  fireEvent.change(screen.getByLabelText('Company name'), {
    target: { value: 'Vimcore Labs' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.change(screen.getByLabelText('Legal or tax identifier'), {
    target: { value: '1710034065001' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  const servicesInput = screen.getByLabelText('Services');
  fireEvent.change(servicesInput, { target: { value: 'Implementation' } });
  fireEvent.keyDown(servicesInput, { key: 'Enter', code: 'Enter' });
  fireEvent.change(servicesInput, { target: { value: 'Support' } });
  fireEvent.keyDown(servicesInput, { key: 'Enter', code: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.change(screen.getByLabelText('Country'), {
    target: { value: 'Mexico' },
  });
  fireEvent.change(screen.getByLabelText('City'), {
    target: { value: 'Monterrey' },
  });
  fireEvent.change(screen.getByLabelText('Exact location'), {
    target: { value: 'San Pedro 123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.change(screen.getByLabelText('Teléfono celular ecuatoriano'), {
    target: { value: '0991234567' },
  });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'ops@vimcore.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.click(screen.getByRole('button', { name: /Ocean/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  fireEvent.click(screen.getByRole('button', { name: /Inventario/ }));
};

describe('App onboarding flow', () => {
  it('blocks step progression when required onboarding fields are missing', async () => {
    setDesktopBrowser();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(
            createSessionResponse({
              user: { id: 'user-1', email: 'owner@vimcore.test', username: '' },
            }),
            200,
          ),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'ocean' }, 200));
      }

      if (url.endsWith('/me/company')) {
        return Promise.resolve(
          createJsonResponse(
            { companyId: 'company-1', name: 'Vimcore Labs' },
            200,
          ),
        );
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard']} />);

    expect(
      await screen.findByRole('heading', {
        name: 'Registro de información de a la empresa',
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(
      await screen.findByText('Nombre de empresa incompleto'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/companies',
      expect.anything(),
    );
  });

  it('prefills the company name from the registered username', async () => {
    setDesktopBrowser();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(
            createSessionResponse({
              user: {
                id: 'user-1',
                email: 'owner@vimcore.test',
                username: 'vimcore_labs',
              },
            }),
            200,
          ),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'ocean' }, 200));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/onboarding']} />);

    expect(
      await screen.findByRole('heading', {
        name: 'Registro de información de a la empresa',
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Company name')).toHaveValue('vimcore_labs');
  });

  it('hides the service input at five services and restores it after removal', async () => {
    setDesktopBrowser();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(createSessionResponse(), 200),
        );
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/onboarding']} />);

    expect(
      await screen.findByRole('heading', {
        name: 'Registro de información de a la empresa',
      }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Company name'), {
      target: { value: 'Vimcore Labs' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.change(screen.getByLabelText('Legal or tax identifier'), {
      target: { value: '1710034065001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    for (const service of [
      'Ventas',
      'Consultoría',
      'Desarrollo',
      'Soporte',
      'Auditoría',
    ]) {
      const input = screen.getByLabelText('Services');
      fireEvent.change(input, { target: { value: service } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    }

    expect(screen.queryByLabelText('Services')).not.toBeInTheDocument();
    expect(
      screen.getByText('Has llegado al máximo de 5 servicios.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Ventas' }));

    expect(screen.getByLabelText('Services')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Escribe un servicio y presiona Enter para agregarlo (máximo 5).',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Quito' },
    });
    fireEvent.change(screen.getByLabelText('Exact location'), {
      target: { value: 'Av. República 123' },
    });

    expect(screen.getByLabelText('Preview company location')).toHaveTextContent(
      'Quito, Ecuador',
    );
    expect(screen.getByLabelText('Preview company location')).toHaveTextContent(
      'Av. República 123',
    );
  });

  it('restores the saved onboarding draft and step after the user logs back in', async () => {
    setDesktopBrowser();
    globalThis.localStorage.setItem(
      'vimcore:onboarding:user-1',
      JSON.stringify({
        draft: {
          companyName: 'Vimcore Labs',
          legalIdentifier: '1710034065001',
          servicesInput: 'Implementation, Support',
          country: 'Mexico',
          city: 'Monterrey',
          exactLocation: 'San Pedro 123',
          contactPhone: '',
          contactEmail: 'owner@vimcore.test',
          paletteId: 'ocean',
        },
        currentStepIndex: 4,
      }),
    );

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(
            createSessionResponse({
              user: {
                id: 'user-1',
                email: 'owner@vimcore.test',
                username: 'vimcore_labs',
              },
            }),
            200,
          ),
        );
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/onboarding']} />);

    expect(
      await screen.findByRole('heading', {
        name: 'Registro de información de a la empresa',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Vimcore Labs')).toBeInTheDocument();
    expect(screen.getByText('Paso 5')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue(
      'owner@vimcore.test',
    );
  });

  it('submits the authenticated onboarding flow and reaches the dashboard', async () => {
    setDesktopBrowser();
    let authCalls = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        authCalls += 1;

        if (authCalls === 1) {
          return Promise.resolve(
            createJsonResponse(createSessionResponse(), 200),
          );
        }

        return Promise.resolve(
          createJsonResponse(
            createSessionResponse({
              memberships: [{ companyId: 'company-1', role: 'company-owner' }],
              activeCompany: {
                companyId: 'company-1',
                status: 'active',
              },
              capabilities: ['catalog.read', 'catalog.write', 'catalog.delete'],
            }),
            200,
          ),
        );
      }

      if (url.endsWith('/companies')) {
        expect(init?.method).toBe('POST');
        return Promise.resolve(
          createJsonResponse(
            { companyId: 'company-1', paletteId: 'ocean' },
            201,
          ),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'ocean' }, 200));
      }

      if (url.endsWith('/me/privacy-consent')) {
        expect(init?.method).toBe('POST');
        expect(init?.body).toEqual(
          expect.stringContaining('"policyVersion":"2025-07-09"'),
        );
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      if (url.endsWith('/me/company')) {
        return Promise.resolve(
          createJsonResponse(
            { companyId: 'company-1', name: 'Vimcore Labs' },
            200,
          ),
        );
      }

      if (url.includes('/companies/') && url.endsWith('/locals')) {
        return Promise.resolve(createJsonResponse([], 200));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/onboarding']} />);

    expect(
      await screen.findByRole('heading', {
        name: 'Registro de información de a la empresa',
      }),
    ).toBeInTheDocument();

    completeRequiredOnboardingFields();
    expect(screen.getByLabelText('Preview company contact')).toHaveTextContent(
      '0991234567',
    );
    expect(screen.getByLabelText('Preview company contact')).toHaveTextContent(
      'ops@vimcore.test',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Revisar y registrar' }),
    );
    expect(
      fetchMock.mock.calls.some(([input]) =>
        readUrl(input).endsWith('/companies'),
      ),
    ).toBe(false);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        readUrl(input).endsWith('/me/privacy-consent'),
      ),
    ).toBe(false);
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Acepto la política de privacidad y cookies de LunaSol.',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Aceptar y registrar' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Bienvenido a Vimcore Labs' }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/companies',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('disables company creation while submission is pending', async () => {
    setDesktopBrowser();
    let resolveCreateCompany: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(createSessionResponse(), 200),
        );
      }

      if (url.endsWith('/me/privacy-consent')) {
        expect(init?.method).toBe('POST');
        return Promise.resolve(new Response(null, { status: 204 }));
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

    expect(
      await screen.findByRole('heading', {
        name: 'Registro de información de a la empresa',
      }),
    ).toBeInTheDocument();

    completeRequiredOnboardingFields();
    fireEvent.click(
      screen.getByRole('button', { name: 'Revisar y registrar' }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Acepto la política de privacidad y cookies de LunaSol.',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Aceptar y registrar' }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Creando empresa...' }),
      ).toBeDisabled();
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(resolveCreateCompany).toBeDefined();
  });

  it('updates palette preferences from the theme settings page', async () => {
    setDesktopBrowser();
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(
            createSessionResponse({
              memberships: [{ companyId: 'company-1', role: 'company-owner' }],
              activeCompany: {
                companyId: 'company-1',
                status: 'active',
              },
              capabilities: ['catalog.read', 'catalog.write', 'catalog.delete'],
            }),
            200,
          ),
        );
      }

      if (url.endsWith('/me/preferences') && init?.method === 'PATCH') {
        return Promise.resolve(
          createJsonResponse({ paletteId: 'forest' }, 200),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'ocean' }, 200));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/dashboard/settings/theme']} />);

    expect(
      await screen.findByRole('heading', { name: 'Paleta de colores' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Soft Graphite/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/me/preferences',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  it('redirects authenticated users with memberships but no active company back to the dashboard selector', async () => {
    setDesktopBrowser();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = readUrl(input);

      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          createJsonResponse(
            createSessionResponse({
              memberships: [
                { companyId: 'company-1', role: 'company-owner' },
                { companyId: 'company-2', role: 'company-owner' },
              ],
            }),
            200,
          ),
        );
      }

      if (url.endsWith('/me/preferences')) {
        return Promise.resolve(createJsonResponse({ paletteId: 'ocean' }, 200));
      }

      throw new Error(`unexpected request: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App initialEntries={['/onboarding']} />);

    expect(
      await screen.findByRole('heading', { name: 'Selecciona una empresa' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: 'Registro de información de a la empresa',
      }),
    ).not.toBeInTheDocument();
  });
});
