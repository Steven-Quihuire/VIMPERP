import { Funnel, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';

export type ApprovalPolicyStatusFilter = 'active' | 'inactive';

const statusOptions: { value: ApprovalPolicyStatusFilter; label: string }[] = [
  { value: 'active', label: 'Activas' },
  { value: 'inactive', label: 'Inactivas' },
];

export type ApprovalPolicyFiltersValue = {
  status: Set<ApprovalPolicyStatusFilter>;
};

export const ApprovalPolicyFilters = ({
  value,
  onChange,
  onClear,
}: {
  value: ApprovalPolicyFiltersValue;
  onChange: (next: ApprovalPolicyFiltersValue) => void;
  onClear: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const activeCount = value.status.size;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 cursor-pointer rounded-2xl"
        >
          <Funnel className="size-4" color="#000" />
          Filtros
          {activeCount > 0 ? (
            <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 rounded-2xl p-0"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-medium">Filtros</p>
          {activeCount > 0 ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={onClear}
            >
              <X className="size-3" />
              Limpiar
            </button>
          ) : null}
        </div>
        <div className="max-h-72 overflow-y-auto px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-black/45">
            Estado
          </p>
          <div className="space-y-1">
            {statusOptions.map((option) => {
              const checked = value.status.has(option.value);
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-muted/60"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) => {
                      const status = new Set(value.status);
                      if (next) {
                        status.add(option.value);
                      } else {
                        status.delete(option.value);
                      }
                      onChange({ ...value, status });
                    }}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
