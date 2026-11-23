import type * as React from 'react';
import { cn } from '../../lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-base text-foreground shadow-card outline-none transition-[color,background-color,border-color,box-shadow,transform] duration-150 placeholder:text-muted-foreground ring-ring ring-offset-2 focus-visible:border-ring focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}
export { Textarea };
