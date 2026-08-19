import { BriefcaseBusiness, Network, Users, X } from 'lucide-react';

import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/ui/drawer';

import type { Position } from '../../domain/positions';

export const PositionDetailDrawer = ({
  position,
  positions,
  open,
  onOpenChange,
}: {
  position: Position;
  positions: Position[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const parent = positions.find((item) => item.id === position.reportsToPositionId);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="gap-0 p-0">
        <DrawerHeader className="border-b p-5">
          <DrawerTitle className="text-lg font-medium tracking-tight">
            {position.name}
          </DrawerTitle>
          <DrawerClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cerrar detalle"
              className="absolute right-4 top-4 rounded-full"
            >
              <X className="size-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="space-y-5 overflow-y-auto p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-black/45">Estado</span>
            <Badge
              variant="outline"
              className={
                position.isActive
                  ? 'rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'rounded-2xl border-gray-200 bg-gray-50 text-gray-600'
              }
            >
              {position.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border bg-muted/10 p-3 text-center">
              <Users className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-1 text-lg font-semibold">{position.headcount}</p>
              <p className="text-xs text-black/45">Dotación</p>
            </div>
            <div className="rounded-xl border bg-muted/10 p-3 text-center">
              <Network className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-1 text-lg font-semibold">
                {position.occupiedHeadcount}
              </p>
              <p className="text-xs text-black/45">Ocupadas</p>
            </div>
            <div className="rounded-xl border bg-muted/10 p-3 text-center">
              <BriefcaseBusiness className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-1 text-lg font-semibold">
                {position.remainingVacancies}
              </p>
              <p className="text-xs text-black/45">Vacantes</p>
            </div>
          </div>

          <div className="py-2">
            <p className="text-xs text-black/45">Reporta a</p>
            <p className="mt-1 text-sm text-black/80">
              {parent?.name ?? 'No reporta a otro puesto'}
            </p>
          </div>

          <div className="py-2">
            <p className="text-xs text-black/45">ID del puesto</p>
            <p className="mt-1 wrap-break-words text-sm text-black/80">
              {position.id}
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
