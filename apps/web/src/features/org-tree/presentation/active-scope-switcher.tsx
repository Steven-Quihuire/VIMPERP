import { cn } from '@/shared/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/ui/sidebar';
import { Building2, ChevronsUpDown, MapPin, Users } from 'lucide-react';
import { useState } from 'react';
import type { AuthSession } from '../../auth/domain/auth';
import { useSwitchActiveScope } from '../../auth/presentation/use-auth';
import { useOrgTree } from '../application/org-tree-queries';
import type {
  OrgTreeNode,
  OrgTreeScopeRef,
  OrgTreeScopeType,
} from '../domain/org-tree';
type ActiveScopeSwitcherProps = { session: AuthSession; apiBaseUrl?: string };

const scopeTypeLabels: Record<OrgTreeScopeType, string> = {
  company: 'Empresa',
  division: 'División',
  local: 'Local',
  area: 'Área',
  warehouse: 'Almacén',
  'point-of-sale': 'Punto de venta',
};

const scopeRefKey = (scope: OrgTreeScopeRef) =>
  `${scope.scopeType}:${scope.scopeId}`;

const toTreeOptions = (nodes: OrgTreeNode[]) => {
  const nodeKeys = new Set(nodes.map((node) => scopeRefKey(node.ref)));
  const children = new Map<string, OrgTreeNode[]>();
  const order = {
    company: 0,
    division: 1,
    local: 2,
    area: 3,
    warehouse: 4,
    'point-of-sale': 5,
  } as const;
  const sortNodes = (left: OrgTreeNode, right: OrgTreeNode) =>
    order[left.ref.scopeType] - order[right.ref.scopeType] ||
    left.name.localeCompare(right.name);

  for (const node of nodes) {
    if (!node.parentRef) continue;
    const key = scopeRefKey(node.parentRef);
    children.set(key, [...(children.get(key) ?? []), node].sort(sortNodes));
  }

  const visit = (
    node: OrgTreeNode,
    depth: number,
  ): { node: OrgTreeNode; depth: number }[] => [
    { node, depth },
    ...(children.get(scopeRefKey(node.ref)) ?? []).flatMap((child) =>
      visit(child, depth + 1),
    ),
  ];

  return nodes
    .filter(
      (node) => !node.parentRef || !nodeKeys.has(scopeRefKey(node.parentRef)),
    )
    .sort(sortNodes)
    .flatMap((root) => visit(root, 0));
};

export const ActiveScopeSwitcher = ({
  session,
  apiBaseUrl,
}: ActiveScopeSwitcherProps) => {
  const companyId = session.activeCompany?.companyId;
  const hasActiveScope = session.activeScope !== null;
  const orgTreeQuery = useOrgTree(companyId, apiBaseUrl, hasActiveScope);
  const switchActiveScope = useSwitchActiveScope(apiBaseUrl);
  const [isOpen, setIsOpen] = useState(false);
  const options = hasActiveScope
    ? toTreeOptions(orgTreeQuery.data ?? []).filter(
        ({ node }) =>
          !(node.ref.scopeType === 'company' && node.ref.scopeId === companyId),
      )
    : [];
  if (!companyId) return null;
  const activeNode =
    session.activeScope === null
      ? null
      : (options.find(
          ({ node }) =>
            scopeRefKey(node.ref) === scopeRefKey(session.activeScope!),
        )?.node ?? null);
  const isCompanyScope =
    session.activeScope?.scopeType === 'company' &&
    session.activeScope.scopeId === companyId;
  const label = activeNode ? activeNode.name : 'Empresarial';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="default"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              aria-label={`Cambiar alcance: ${label}`}
              aria-expanded={isOpen}
              aria-haspopup="menu"
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
                <Users className="size-4" />
              </span>
              <span className="flex-1 truncate text-left text-sm leading-tight">
                <span className="block truncate text-xs">Alcance</span>
                <span className="block truncate text-xs font-medium">
                  {label}
                </span>
              </span>
              <ChevronsUpDown className="size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            className="w-[--radix-dropdown-menu-trigger-width]"
          >
            <DropdownMenuItem
              onSelect={() => {
                void switchActiveScope.mutateAsync({
                  scope: { scopeType: 'company', scopeId: companyId },
                });
              }}
              disabled={switchActiveScope.isPending}
              className={cn('gap-2', isCompanyScope)}
            >
              <Building2 className="size-4" />
              <div className="flex flex-col">
                <span className="text-xs text-gray-800 font-normal">
                  Nivel empresa
                </span>
                <span className="text-xs text-gray-600 font-normal">
                  Items y categorías a nivel compañía
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {options.map(({ node, depth }) => {
              const isActive =
                session.activeScope !== null &&
                scopeRefKey(session.activeScope) === scopeRefKey(node.ref);
              return (
                <DropdownMenuItem
                  key={`${node.ref.scopeType}:${node.ref.scopeId}`}
                  onSelect={() => {
                    void switchActiveScope.mutateAsync({ scope: node.ref });
                  }}
                  disabled={switchActiveScope.isPending}
                  className={cn('gap-2', isActive && 'font-semibold')}
                >
                  <MapPin className="size-4" />
                  <div
                    className="flex min-w-0 flex-1 flex-col"
                    style={{ paddingLeft: `${depth * 12}px` }}
                  >
                    <span className="truncate">{node.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {scopeTypeLabels[node.ref.scopeType]} ·{' '}
                      {node.employeeCount ?? 0} empleados
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
