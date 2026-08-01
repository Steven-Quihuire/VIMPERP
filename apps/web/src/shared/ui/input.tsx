import * as React from 'react';

import { cn } from '@/shared/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-12 w-full bg-transparent px-3 border-b border-b-black outline-none',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
