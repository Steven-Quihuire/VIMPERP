import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSession } from '@/features/auth/domain/auth';

import { HrResponsibilityPage } from './hr-responsibility-page';

const useHrResponsibilityMock = vi.fn();

vi.mock('../application/hr-responsibility-queries', () => ({
  useHrResponsibility: (...args: unknown[]) => useHrResponsibilityMock(...args),
}));

const session: AuthSession = {
  user: { id: 'owner-1', email: 'owner@example.com', username: 'owner' },
  memberships: [
    {
      companyId: 'company-1',
      role: 'company-owner',
      divisionId: null,
      localId: null,
    },
  ],
  activeCompany: { companyId: 'company-1', status: 'active' },
  activeScope: null,
  activeLocalId: null,
  capabilities: [],
};

describe('HrResponsibilityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useHrResponsibilityMock.mockReturnValue({
      stateQuery: {
        isLoading: false,
        isError: false,
        data: {
          companyId: 'company-1',
          hasResponsibles: false,
          responsibles: [],
          availableUsers: [
            {
              userId: 'user-1',
              email: 'erp@example.com',
              username: 'erp-user',
            },
          ],
          pendingInvitations: [],
        },
      },
      assignMutation: {
        isPending: false,
        isError: false,
        mutateAsync: vi.fn(),
      },
      inviteMutation: {
        isPending: false,
        isError: false,
        mutateAsync: vi
          .fn()
          .mockResolvedValue({ delivery: { status: 'sent' } }),
      },
    });
  });

  it('keeps ERP selection and sends an external HR invitation scoped to the company', async () => {
    render(<HrResponsibilityPage session={session} />);
    expect(
      screen.getByRole('heading', { name: 'Responsables de RRHH' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Invitar responsable por correo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /erp-user/ }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'external@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    await waitFor(() => {
      expect(
        useHrResponsibilityMock.mock.results[0]?.value.inviteMutation
          .mutateAsync,
      ).toHaveBeenCalledWith({
        targetCompanyId: 'company-1',
        inviteeEmail: 'external@example.com',
      });
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Invitación enviada',
    );
  });
});
