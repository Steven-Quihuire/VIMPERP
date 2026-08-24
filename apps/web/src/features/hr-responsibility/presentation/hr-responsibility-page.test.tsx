import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type { AuthSession } from '@/features/auth/domain/auth';

import type {
  CreatedHrResponsibilityInvitation,
  HrResponsibleUser,
  HrResponsibilityState,
} from '../domain/hr-responsibility';
import type * as hrResponsibilityQueries from '../application/hr-responsibility-queries';

import { HrResponsibilityPage } from './hr-responsibility-page';

const useHrResponsibilityMock = vi.fn<typeof hrResponsibilityQueries.useHrResponsibility>();

/** Resolves to the real hook return when the first mock call returned, else undefined. */
type ReturnedValue<A> = A extends { type: 'return'; value: infer V } ? V : undefined;

/** Narrows vitest's union-typed mock results so the returned value keeps its real type. */
function firstReturnValue<A extends { type: unknown; value: unknown }>(
  results: readonly A[],
): ReturnedValue<A> {
  const first = results.at(0);
  return first?.type === 'return'
    ? (first.value as ReturnedValue<A>)
    : (undefined as ReturnedValue<A>);
}

/** Builds a fully-typed successful TanStack Query result for a fixture payload. */
function queryOk<TData>(data: TData): UseQueryResult<TData> {
  return {
    data,
    dataUpdatedAt: 0,
    error: null,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isError: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isLoading: false,
    isLoadingError: false,
    isInitialLoading: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: true,
    isSuccess: true,
    isEnabled: true,
    refetch: () => Promise.resolve(queryOk(data)),
    status: 'success',
    fetchStatus: 'idle',
    promise: Promise.resolve(data),
  };
}

/** Builds a fully-typed idle TanStack Mutation result resolving with a fixture value or implementation. */
function mutationOk<TData, TVariables = void>(
  resolveWith?: TData | ((variables: TVariables) => Promise<TData>),
): UseMutationResult<TData, Error, TVariables> {
  const asImpl = resolveWith as
    | ((variables: TVariables) => Promise<TData>)
    | undefined;
  return {
    context: undefined,
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    isError: false,
    isIdle: true,
    isPending: false,
    isSuccess: false,
    status: 'idle',
    submittedAt: 0,
    variables: undefined,
    mutate: () => {},
    reset: () => {},
    mutateAsync:
      typeof asImpl === 'function'
        ? vi.fn(asImpl)
        : vi.fn(() => Promise.resolve(resolveWith as TData)),
  };
}

vi.mock('../application/hr-responsibility-queries', () => ({
  useHrResponsibility:
    (...args: Parameters<typeof hrResponsibilityQueries.useHrResponsibility>) =>
    useHrResponsibilityMock(...args),
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
      stateQuery: queryOk<HrResponsibilityState>({
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
      }),
      assignMutation: mutationOk<HrResponsibleUser, { targetCompanyId: string; userId: string }>(),
      inviteMutation: mutationOk<
        CreatedHrResponsibilityInvitation,
        { targetCompanyId: string; inviteeEmail: string }
      >((input) =>
        Promise.resolve({
          invitationId: 'invitation-1',
          invitationToken: 'token-1',
          companyId: input.targetCompanyId,
          inviteeEmail: input.inviteeEmail,
          expiresAt: '2026-08-20T12:00:00.000Z',
          delivery: { status: 'sent' },
        }),
      ),
    });
  });

  it('opens the invite dialog and sends an external HR invitation scoped to the company', async () => {
    render(<HrResponsibilityPage session={session} />);

    fireEvent.click(screen.getByRole('button', { name: 'Invitar por correo' }));

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'external@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    await waitFor(() => {
      expect(
        firstReturnValue(useHrResponsibilityMock.mock.results)?.inviteMutation
          .mutateAsync,
      ).toHaveBeenCalledWith({
        targetCompanyId: 'company-1',
        inviteeEmail: 'external@example.com',
      });
    });
  });
});
