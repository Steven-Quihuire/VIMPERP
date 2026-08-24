import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type { AuthSession } from '@/features/auth/domain/auth';
import type { OrgTreeNode } from '@/features/org-tree/domain/org-tree';

import type {
  ApprovalPolicy,
  CreateApprovalPolicyInput,
  UpdateApprovalPolicyInput,
} from '../../domain/approval-policy';
import type {
  ApprovalPolicyPage,
  DeactivateApprovalPolicyInput,
} from '../../infrastructure/create-approval-policy-api';

import type * as approvalPolicyQueries from '../../application/approval-policy-queries';
import type * as orgTreeQueries from '@/features/org-tree/application/org-tree-queries';

import { PoliciesListPage } from './policies-list';
import { PolicyFormPage } from './policy-form';

const useApprovalPoliciesMock = vi.fn<typeof approvalPolicyQueries.useApprovalPolicies>();
const useApprovalPoliciesPageMock = vi.fn<typeof approvalPolicyQueries.useApprovalPoliciesPage>();
const useOrgTreeMock = vi.fn<typeof orgTreeQueries.useOrgTree>();

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

vi.mock('../../application/approval-policy-queries', () => ({
  useApprovalPolicies:
    (...args: Parameters<typeof approvalPolicyQueries.useApprovalPolicies>) =>
    useApprovalPoliciesMock(...args),
  useApprovalPoliciesPage:
    (...args: Parameters<typeof approvalPolicyQueries.useApprovalPoliciesPage>) =>
    useApprovalPoliciesPageMock(...args),
}));

vi.mock('@/features/org-tree/application/org-tree-queries', () => ({
  useOrgTree:
    (...args: Parameters<typeof orgTreeQueries.useOrgTree>) =>
    useOrgTreeMock(...args),
}));

const session: AuthSession = {
  user: { id: 'user-1', email: 'owner@vimcore.test', username: 'owner' },
  memberships: [{ companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null }],
  activeCompany: { companyId: 'company-1', status: 'active' },
  activeScope: null,
  activeLocalId: null,
  capabilities: ['catalog.read'],
};

const companyPolicy: ApprovalPolicy = {
  id: 'policy-1',
  companyId: 'company-1',
  scopeType: 'company',
  scopeNodeId: null,
  name: 'Company approvals',
  definition: { steps: ['manager'] },
  isActive: true,
  createdAt: '2026-08-13T12:00:00.000Z',
  updatedAt: '2026-08-13T12:00:00.000Z',
};

const createdPolicy: ApprovalPolicy = {
  ...companyPolicy,
  id: 'policy-2',
};

describe('approval-policy pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const sharedMutations = {
      createPolicyMutation:
        mutationOk<ApprovalPolicy, CreateApprovalPolicyInput>(createdPolicy),
      updatePolicyMutation:
        mutationOk<ApprovalPolicy, UpdateApprovalPolicyInput>(companyPolicy),
      deactivatePolicyMutation: mutationOk<ApprovalPolicy, DeactivateApprovalPolicyInput>({
        ...companyPolicy,
        isActive: false,
      }),
    };
    useApprovalPoliciesMock.mockReturnValue({
      policiesQuery: queryOk<ApprovalPolicy[]>([companyPolicy]),
      ...sharedMutations,
    });
    useApprovalPoliciesPageMock.mockReturnValue({
      policiesQuery: queryOk<ApprovalPolicyPage>({
        items: [companyPolicy],
        total: 1,
        page: 1,
        pageSize: 10,
      }),
      ...sharedMutations,
    });
    useOrgTreeMock.mockReturnValue(
      queryOk<OrgTreeNode[]>([
        {
          ref: { scopeType: 'company', scopeId: 'company-1' },
          parentRef: null,
          companyId: 'company-1',
          name: 'Vimcore',
        },
        {
          ref: { scopeType: 'area', scopeId: 'area-1' },
          parentRef: { scopeType: 'company', scopeId: 'company-1' },
          companyId: 'company-1',
          name: 'Area 1',
        },
      ]),
    );
  });

  it('renders policies, deactivates one, and opens the edit dialog', async () => {
    render(<PoliciesListPage session={session} />);

    expect(screen.getByText('Company approvals')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar política policy-1' }));

    await waitFor(() => {
      expect(
        firstReturnValue(useApprovalPoliciesPageMock.mock.results)
          ?.deactivatePolicyMutation.mutateAsync,
      ).toHaveBeenCalledWith({
        companyId: 'company-1',
        policyId: 'policy-1',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Abrir política policy-1' }));
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Actualizar política' }),
      ).toBeInTheDocument();
    });
  });

  it('creates a company policy from the form', async () => {
    const onSaved = vi.fn();

    render(<PolicyFormPage session={session} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText('Nombre de la política'), {
      target: { value: 'Company approvals' },
    });
    fireEvent.change(screen.getByLabelText('¿Quién debe aprobar?'), {
      target: { value: 'Jefe directo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar aprobador' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear política' }));

    await waitFor(() => {
      expect(
        firstReturnValue(useApprovalPoliciesMock.mock.results)?.createPolicyMutation
          .mutateAsync,
      ).toHaveBeenCalledWith({
        companyId: 'company-1',
        scopeType: 'company',
        scopeNodeId: null,
        name: 'Company approvals',
        definition: { steps: ['Jefe directo'] },
        isActive: true,
      });
    });

    expect(onSaved).toHaveBeenCalledWith('policy-2');
  });

  it('updates a node-scoped policy from the form', async () => {
    const onSaved = vi.fn();

    render(
      <PolicyFormPage
        session={session}
        policy={{
          id: 'policy-1',
          companyId: 'company-1',
          scopeType: 'area',
          scopeNodeId: 'area:area-1',
          name: 'Area approvals',
          definition: { steps: ['director'] },
          isActive: true,
          createdAt: '2026-08-13T12:00:00.000Z',
          updatedAt: '2026-08-13T12:00:00.000Z',
        }}
        onSaved={onSaved}
      />,
    );

    fireEvent.change(screen.getByLabelText('Nombre de la política'), {
      target: { value: 'Updated area approvals' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar política' }));

    await waitFor(() => {
      expect(
        firstReturnValue(useApprovalPoliciesMock.mock.results)?.updatePolicyMutation
          .mutateAsync,
      ).toHaveBeenCalledWith({
        companyId: 'company-1',
        policyId: 'policy-1',
        scopeType: 'area',
        scopeNodeId: 'area:area-1',
        name: 'Updated area approvals',
        definition: { steps: ['director'] },
        isActive: true,
      });
    });

    expect(onSaved).toHaveBeenCalledWith('policy-1');
  });
});
