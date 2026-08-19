import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';

import { cn } from '@/shared/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export const Calendar = ({
  className,
  classNames,
  ...props
}: CalendarProps) => (
  <DayPicker
    locale={es}
    showOutsideDays
    className={cn('p-3', className)}
    classNames={{
      months: 'flex flex-col sm:flex-row gap-4',
      month: 'space-y-4',
      month_caption: 'flex items-center justify-center pt-1 relative',
      caption_label: 'text-sm font-semibold capitalize',
      nav: 'flex items-center gap-1 absolute inset-x-0 top-0 justify-between',
      button_previous:
        'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      button_next:
        'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      month_grid: 'w-full border-collapse space-y-1',
      weekdays: 'flex',
      weekday: 'w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground',
      week: 'mt-2 flex w-full',
      day: 'relative size-9 p-0 text-center text-sm',
      day_button:
        'inline-flex size-9 items-center justify-center rounded-md font-normal hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      selected:
        '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
      today: '[&>button]:bg-accent [&>button]:font-semibold',
      outside: 'text-muted-foreground opacity-50',
      disabled: 'text-muted-foreground opacity-50',
      hidden: 'invisible',
      ...classNames,
    }}
    components={{
      Chevron: ({ orientation }) =>
        orientation === 'left' ? (
          <ChevronLeft className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        ),
    }}
    {...props}
  />
);
