import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider } from '@/shared/ui/sidebar';
import type { AuthSession } from '../../auth/domain/auth';
import type { OrgTreeNode } from '../domain/org-tree';
import { ActiveScopeSwitcher } from './active-scope-switcher';
type OrgTreeQueryResult = { data?: OrgTreeNode[]; isLoading: boolean; isError: boolean; error: Error | null };
type SwitchActiveScopeMutation = { mutateAsync: (input: { scope: { scopeType: string; scopeId: string } | null }) => Promise<void>; isPending: boolean };
const useOrgTreeMock = vi.fn<() => OrgTreeQueryResult>(), useSwitchActiveScopeMock = vi.fn<() => SwitchActiveScopeMutation>();
const renderSwitcher = (sessionOverride?: Partial<AuthSession>) => render(<SidebarProvider><ActiveScopeSwitcher session={{ ...session, ...sessionOverride }} /></SidebarProvider>);

vi.mock('../application/org-tree-queries', () => ({
  useOrgTree: () => useOrgTreeMock(),
}));
vi.mock('@/shared/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div role="menu">{children}</div>,
  DropdownMenuItem: ({ children, disabled, onSelect }: { children: ReactNode; disabled?: boolean; onSelect?: () => void }) => <button type="button" role="menuitem" aria-disabled={disabled ? 'true' : 'false'} disabled={disabled} onClick={() => onSelect?.()}>{children}</button>,
  DropdownMenuSeparator: () => <hr />,
}));
vi.mock('../../auth/presentation/use-auth', () => ({
  useSwitchActiveScope: () => useSwitchActiveScopeMock(),
}));
const session: AuthSession = { user: { id: 'user-1', email: 'owner@vimcore.test', username: 'owner' }, memberships: [{ companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null }], activeCompany: { companyId: 'company-1', status: 'active' }, activeScope: { scopeType: 'local', scopeId: 'local-1' }, activeLocalId: 'local-1', capabilities: ['catalog.read', 'catalog.write', 'catalog.delete'] };
const orgTree: OrgTreeNode[] = [
  { ref: { scopeType: 'division', scopeId: 'division-1' }, parentRef: { scopeType: 'company', scopeId: 'company-1' }, companyId: 'company-1', name: 'North Division' },
  { ref: { scopeType: 'local', scopeId: 'local-1' }, parentRef: { scopeType: 'division', scopeId: 'division-1' }, companyId: 'company-1', name: 'Central Store' },
  { ref: { scopeType: 'area', scopeId: 'area-1' }, parentRef: { scopeType: 'local', scopeId: 'local-1' }, companyId: 'company-1', name: 'Area A' },
  { ref: { scopeType: 'warehouse', scopeId: 'warehouse-1' }, parentRef: { scopeType: 'area', scopeId: 'area-1' }, companyId: 'company-1', name: 'Warehouse East' },
  { ref: { scopeType: 'point-of-sale', scopeId: 'pos-1' }, parentRef: { scopeType: 'area', scopeId: 'area-1' }, companyId: 'company-1', name: 'POS 01' },
];

describe('ActiveScopeSwitcher', () => {
  beforeEach(() => {
    useOrgTreeMock.mockReturnValue({ data: orgTree, isLoading: false, isError: false, error: null });
    useSwitchActiveScopeMock.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false });
  });
  afterEach(() => vi.clearAllMocks());

  it('renders the company sentinel and the full six-type subtree for the authorized branch', async () => {
    renderSwitcher();
    expect(await screen.findByText('Nivel empresa')).toBeInTheDocument();
    expect(screen.getByText('North Division')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Central Store/i })).toBeInTheDocument();
    expect(screen.getByText('Area A')).toBeInTheDocument();
    expect(screen.getByText('Warehouse East')).toBeInTheDocument();
    expect(screen.getByText('POS 01')).toBeInTheDocument();
  });

  it('allows switching across the authorized subtree with the active-scope mutation', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    useSwitchActiveScopeMock.mockReturnValue({ mutateAsync, isPending: false });
    renderSwitcher({ activeScope: { scopeType: 'company', scopeId: 'company-1' }, activeLocalId: null });
    fireEvent.click(await screen.findByRole('menuitem', { name: /Nivel empresa/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ scope: { scopeType: 'company', scopeId: 'company-1' } }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Central Store/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ scope: { scopeType: 'local', scopeId: 'local-1' } }));
    const warehouseOption = await screen.findByRole('menuitem', { name: /Warehouse East/i });
    fireEvent.click(warehouseOption);
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ scope: { scopeType: 'warehouse', scopeId: 'warehouse-1' } }));
  });
});
