import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import type { AuthSession } from '@/features/auth/domain/auth';
import { SidebarProvider } from '@/shared/ui/sidebar';

import { DashboardAppSidebar } from '../dashboard-app-sidebar';

vi.mock('@/features/auth/presentation/components/team-switcher', () => ({
  TeamSwitcher: () => <div>team-switcher</div>,
}));

vi.mock('@/features/auth/presentation/use-auth', () => ({
  useSwitchActiveCompany: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock('@/features/hr-responsibility/application/hr-responsibility-queries', () => ({
  useHrResponsibility: vi.fn(),
}));

vi.mock('@/features/org-tree/presentation/active-scope-switcher', () => ({
  ActiveScopeSwitcher: () => <div>active-scope-switcher</div>,
}));

const { useHrResponsibility } = await import('@/features/hr-responsibility/application/hr-responsibility-queries');

const createSession = (capabilities: AuthSession['capabilities']): AuthSession => ({
  user: {
    id: 'owner-1',
    email: 'owner@vimcore.test',
    username: 'owner',
  },
  memberships: [
    { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
  ],
  activeCompany: { companyId: 'company-1', status: 'active' },
  activeLocalId: null,
  activeScope: null,
  capabilities,
});

describe('DashboardAppSidebar', () => {
  it('shows Timesheets only when the session has timesheet read visibility', () => {
    vi.mocked(useHrResponsibility).mockReturnValue({
      stateQuery: { data: { hasResponsibles: true } },
      assignMutation: {},
      inviteMutation: {},
    } as never);

    const { rerender } = render(
      <SidebarProvider>
        <MemoryRouter>
          <DashboardAppSidebar
            session={createSession(['catalog.read', 'hr.timesheets.read'])}
            companyLabel="Northwind"
            companyDetail="Responsable de empresa"
          />
        </MemoryRouter>
      </SidebarProvider>,
    );

    expect(screen.getByRole('link', { name: 'Timesheets' })).toHaveAttribute(
      'href',
      '/dashboard/hr/timesheets',
    );

    rerender(
      <SidebarProvider>
        <MemoryRouter>
          <DashboardAppSidebar
            session={createSession(['catalog.read'])}
            companyLabel="Northwind"
            companyDetail="Responsable de empresa"
          />
        </MemoryRouter>
      </SidebarProvider>,
    );

    expect(screen.queryByRole('link', { name: 'Timesheets' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Empleados' })).toBeInTheDocument();
  });
});
