import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { AuthSession } from '@/features/auth/domain/auth';

import { AcceptErpAccessInvitationPage } from './accept-invitation';
import { InvitationsListPage } from './invitations-list';

const useInvitationsMock = vi.fn();
const useAcceptInvitationMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../../application/hr-erp-access-queries', () => ({
  useInvitations: (...args: unknown[]) => useInvitationsMock(...args),
  useAcceptInvitation: (...args: unknown[]) => useAcceptInvitationMock(...args),
}));

vi.mock('@/features/auth/presentation/use-auth', () => ({
  useAuth: (...args: unknown[]) => useAuthMock(...args),
  authQueryKey: ['auth', 'me'],
}));

const session: AuthSession = {
  user: { id: 'user-1', email: 'owner@vimcore.test', username: 'owner' },
  memberships: [
    { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
  ],
  activeCompany: { companyId: 'company-1', status: 'active' },
  activeScope: null,
  activeLocalId: null,
  capabilities: ['catalog.read'],
};

const createAcceptWrapper = (initialEntries: string[]) => {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/hr-erp-access/accept/:token" element={children} />
        <Route path="/dashboard" element={<div>Dashboard home</div>} />
        <Route path="/dashboard/organization" element={<div>Organization landing</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('hr-erp-access pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInvitationsMock.mockReturnValue({
      invitationsQuery: {
        data: [
          {
            id: 'invitation-1',
            companyId: 'company-1',
            employeeId: 'employee-1',
            inviteeEmail: 'person@vimcore.test',
            createdAt: '2026-08-13T12:00:00.000Z',
            expiresAt: '2026-08-14T12:00:00.000Z',
          },
        ],
        isLoading: false,
        isError: false,
        error: null,
      },
      createInvitationMutation: {
        mutateAsync: vi.fn().mockResolvedValue({ invitationId: 'invitation-2' }),
        isPending: false,
        error: null,
      },
      revokeAccessMutation: {
        mutateAsync: vi.fn().mockResolvedValue(undefined),
        isPending: false,
        error: null,
      },
    });
    useAcceptInvitationMock.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
      error: null,
    });
    useAuthMock.mockReturnValue({
      isLoading: false,
      refetch: vi.fn().mockResolvedValue({
        data: { ...session, activeCompany: { companyId: 'company-1', status: 'active' } },
      }),
    });
  });

  it('renders invitations and submits invite and revoke actions', async () => {
    render(<InvitationsListPage session={session} />);

    expect(screen.getByText('person@vimcore.test')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Employee id'), {
      target: { value: ' employee-2 ' },
    });
    fireEvent.change(screen.getByLabelText('Invitee email'), {
      target: { value: ' PERSON-2@VIMCORE.TEST ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Invite ERP access' }));

    await waitFor(() => {
      expect(
        useInvitationsMock.mock.results[0]?.value.createInvitationMutation.mutateAsync,
      ).toHaveBeenCalledWith({
        companyId: 'company-1',
        employeeId: 'employee-2',
        inviteeEmail: 'person-2@vimcore.test',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Revoke ERP access for employee-1' }));

    await waitFor(() => {
      expect(
        useInvitationsMock.mock.results[0]?.value.revokeAccessMutation.mutateAsync,
      ).toHaveBeenCalledWith({
        companyId: 'company-1',
        employeeId: 'employee-1',
      });
    });
  });

  it('accepts the invitation and redirects after refreshing auth', async () => {
    render(<AcceptErpAccessInvitationPage />, {
      wrapper: createAcceptWrapper(['/hr-erp-access/accept/token-1']),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Activate ERP access' }));

    expect(await screen.findByText('Organization landing')).toBeInTheDocument();
  });

  it('blocks mismatched passwords for a new account activation', async () => {
    render(<AcceptErpAccessInvitationPage />, {
      wrapper: createAcceptWrapper(['/hr-erp-access/accept/token-2']),
    });

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'secret999' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Activate ERP access' }));

    expect(await screen.findByText('Passwords must match.')).toBeInTheDocument();
  });
});
