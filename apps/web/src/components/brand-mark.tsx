import { LayersIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-[7px] bg-linear-to-br from-accent-cyan to-primary text-primary-foreground',
        className,
      )}
    >
      <LayersIcon className="size-5" />
    </span>
  );
}
