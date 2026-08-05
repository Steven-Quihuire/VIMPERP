import { ChevronsUpDown, MapPin } from 'lucide-react';
import { useState } from 'react';

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
import type { AuthSession } from '../../auth/domain/auth';
import { useSwitchActiveLocal } from '../../auth/presentation/use-auth';
import { useLocals } from '../application/org-hierarchy-queries';

type ActiveLocalSwitcherProps = {
  session: AuthSession;
  apiBaseUrl?: string;
};

export const ActiveLocalSwitcher = ({
  session,
  apiBaseUrl,
}: ActiveLocalSwitcherProps) => {
  const companyId = session.activeCompany?.companyId;
  const localsQuery = useLocals(companyId, apiBaseUrl);
  const switchActiveLocal = useSwitchActiveLocal(apiBaseUrl);
  const [isOpen, setIsOpen] = useState(false);

  const locals = localsQuery.data ?? [];

  if (locals.length === 0 || !companyId) {
    return null;
  }

  const activeLocal =
    session.activeLocalId !== null
      ? (locals.find((local) => local.id === session.activeLocalId) ?? null)
      : null;

  const label = activeLocal ? activeLocal.name : 'Nivel empresa';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="sm"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              aria-label={`Cambiar local: ${label}`}
              aria-expanded={isOpen}
              aria-haspopup="menu"
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
                <MapPin className="size-4" />
              </span>
              <span className="flex-1 truncate text-left text-sm leading-tight">
                <span className="block truncate text-xs text-muted-foreground">
                  Alcance
                </span>
                <span className="block truncate font-medium">{label}</span>
              </span>
              <ChevronsUpDown className="size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom" className="w-[--radix-dropdown-menu-trigger-width]">
            <DropdownMenuItem
              onSelect={() => {
                void switchActiveLocal.mutateAsync({ localId: null });
              }}
              disabled={switchActiveLocal.isPending}
              className={cn(
                'gap-2',
                session.activeLocalId === null && 'font-semibold',
              )}
            >
              <MapPin className="size-4" />
              <div className="flex flex-col">
                <span>Nivel empresa</span>
                <span className="text-xs text-muted-foreground">
                  Items y categorías a nivel compañía
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {locals.map((local) => (
              <DropdownMenuItem
                key={local.id}
                onSelect={() => {
                  void switchActiveLocal.mutateAsync({ localId: local.id });
                }}
                disabled={switchActiveLocal.isPending}
                className={cn(
                  'gap-2',
                  session.activeLocalId === local.id && 'font-semibold',
                )}
              >
                <MapPin className="size-4" />
                <span className="flex-1 truncate">{local.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
