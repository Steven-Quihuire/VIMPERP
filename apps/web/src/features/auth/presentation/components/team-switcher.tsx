import { useId, useState } from 'react';
import { Building2, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/ui/sidebar';

import type { CompanyLifecycle } from '../../domain/auth';

export type TeamSwitcherOption = {
  companyId: string;
  name: string;
  roleLabel: string;
  status: CompanyLifecycle;
  isActive: boolean;
};

const companyStatusLabels: Record<CompanyLifecycle, string> = {
  active: 'Activa',
  suspended: 'Suspendida',
  provisioning_failed: 'Pendiente de soporte',
};

export const TeamSwitcher = ({
  teams,
  isPending = false,
  onSelect,
}: {
  teams: TeamSwitcherOption[];
  isPending?: boolean;
  onSelect: (companyId: string) => void;
}) => {
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const activeTeam = teams.find((team) => team.isActive) ?? null;

  if (teams.length === 0) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="relative">
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            aria-label={
              activeTeam
                ? `${activeTeam.name} ${activeTeam.roleLabel}`
                : 'Seleccionar empresa'
            }
            aria-expanded={isOpen}
            aria-haspopup="menu"
            aria-controls={menuId}
            onClick={() => setIsOpen((current) => !current)}
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {activeTeam?.name ?? 'Seleccionar empresa'}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {activeTeam?.roleLabel ?? 'Elige una empresa para continuar'}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto" />
          </SidebarMenuButton>

          {isOpen ? (
            <div
              id={menuId}
              role="menu"
              className="absolute left-0 top-[calc(100%+0.25rem)] z-50 min-w-56 rounded-lg border bg-popover p-2 text-popover-foreground shadow-md"
            >
              <p className="px-2 pb-2 text-xs text-muted-foreground">
              Empresas
              </p>
              <div className="mb-2 border-b" />
              {teams.map((team) => (
                <button
                  key={team.companyId}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsOpen(false);
                    onSelect(team.companyId);
                  }}
                  disabled={isPending || team.isActive}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Building2 className="size-3.5 shrink-0" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate">{team.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {team.roleLabel}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {companyStatusLabels[team.status]}
                </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
