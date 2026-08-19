import { CalendarDays } from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Calendar } from '@/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

const DATE_FORMAT = 'yyyy-MM-dd';

const parseDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = parse(value, DATE_FORMAT, new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const DatePickerField = ({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) => {
  const selectedDate = parseDate(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 w-full cursor-pointer justify-between rounded-xl px-3 text-left font-normal',
            !selectedDate && 'text-muted-foreground',
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            {selectedDate
              ? format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: es })
              : 'Seleccioná una fecha'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => onChange(date ? format(date, DATE_FORMAT) : '')}
        />
        <div className="flex justify-between border-t p-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
          >
            Limpiar
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onChange(format(new Date(), DATE_FORMAT))}
          >
            Hoy
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
