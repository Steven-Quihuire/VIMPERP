import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

import type { Position } from '../../domain/positions';

export const PositionRowActions = ({
  position,
  onView,
}: {
  position: Position;
  onView: (positionId: string) => void;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Acciones de ${position.name}`}
          className="size-8 rounded-full"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl">
        <DropdownMenuItem onClick={() => onView(position.id)}>
          Ver detalles
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
