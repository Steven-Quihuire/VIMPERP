import { BadgeCheck, CircleAlert } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

import type { DocumentFieldState } from '../../domain/employees';

export const DocumentDetectionBadge = ({
  state,
  className,
}: {
  state: DocumentFieldState;
  className?: string;
}) => {
  if (state.status === 'empty') {
    return null;
  }

  if (state.status === 'valid') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-emerald-600/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-400/25 dark:text-emerald-300',
          className,
        )}
      >
        <BadgeCheck className="size-3.5 shrink-0" />
        {state.label}
      </span>
    );
  }

  if (state.status === 'pending') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground',
          className,
        )}
      >
        {state.hint}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-destructive/25 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive',
        className,
      )}
    >
      <CircleAlert className="size-3.5 shrink-0" />
      Inválido
    </span>
  );
};
