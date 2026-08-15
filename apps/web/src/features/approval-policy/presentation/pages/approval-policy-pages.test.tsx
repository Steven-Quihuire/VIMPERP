import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSession } from '@/features/auth/domain/auth';

import { PoliciesListPage } from './policies-list';
import { PolicyFormPage } from './policy-form';

const useApprovalPoliciesMock = vi.fn();
const useOrgTreeMock = vi.fn();

vi.mock('../../application/approval-policy-queries', () => ({
  useApprovalPolicies: (...args: unknown[]) => useApprovalPoliciesMock(...args),
}));

vi.mock('@/features/org-tree/application/org-tree-queries', () => ({
  useOrgTree: (...args: unknown[]) => useOrgTreeMock(...args),
}));

const session: AuthSession = {
  user: { id: 'user-1', email: 'owner@vimcore.test', username: 'owner' },
  memberships: [{ companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null }],
  activeCompany: { companyId: 'company-1', status: 'active' },
  activeScope: null,
  activeLocalId: null,
  capabilities: ['catalog.read'],
};

describe('approval-policy pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useApprovalPoliciesMock.mockReturnValue({
      policiesQuery: {
        data: [
          {
            id: 'policy-1',
            companyId: 'company-1',
            scopeType: 'company',
            scopeNodeId: null,
            name: 'Company approvals',
            definition: { steps: ['manager'] },
            isActive: true,
            createdAt: '2026-08-13T12:00:00.000Z',
            updatedAt: '2026-08-13T12:00:00.000Z',
          },
        ],
        isLoading: false,
        isError: false,
        error: null,
      },
      createPolicyMutation: {
        mutateAsync: vi.fn().mockResolvedValue({ id: 'policy-2' }),
        isPending: false,
        error: null,
      },
      updatePolicyMutation: {
        mutateAsync: vi.fn().mockResolvedValue({ id: 'policy-1' }),
        isPending: false,
        error: null,
      },
      deactivatePolicyMutation: {
        mutateAsync: vi.fn().mockResolvedValue({ id: 'policy-1', isActive: false }),
        isPending: false,
        error: null,
      },
    });
    useOrgTreeMock.mockReturnValue({
      data: [
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
      ],
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('renders policies and allows selecting and deactivating one', async () => {
    const onSelectPolicy = vi.fn();

    render(
      <PoliciesListPage
        session={session}
        selectedPolicyId={null}
        onSelectPolicy={onSelectPolicy}
      />,
    );

    expect(screen.getByText('Company approvals')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir política policy-1' }));
    expect(onSelectPolicy).toHaveBeenCalledWith('policy-1');

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar política policy-1' }));

    await waitFor(() => {
      expect(
        useApprovalPoliciesMock.mock.results[0]?.value.deactivatePolicyMutation.mutateAsync,
      ).toHaveBeenCalledWith({
        companyId: 'company-1',
        policyId: 'policy-1',
      });
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
        useApprovalPoliciesMock.mock.results[0]?.value.createPolicyMutation.mutateAsync,
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
        useApprovalPoliciesMock.mock.results[0]?.value.updatePolicyMutation.mutateAsync,
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
