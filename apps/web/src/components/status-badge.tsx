'use client';

import type { RequestStatus } from '@flowdesk/shared';
import { useTranslations } from 'next-intl';
import { cn } from '../lib/utils';

const styles: Record<
  RequestStatus,
  { dot: string; text: string; background: string }
> = {
  pending_approval: {
    dot: 'bg-amber-500',
    text: 'text-amber-800',
    background: 'bg-amber-50',
  },
  approved: {
    dot: 'bg-blue-500',
    text: 'text-blue-800',
    background: 'bg-blue-50',
  },
  in_progress: {
    dot: 'bg-violet-500',
    text: 'text-violet-800',
    background: 'bg-violet-50',
  },
  completed: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-800',
    background: 'bg-emerald-50',
  },
  rejected: {
    dot: 'bg-rose-500',
    text: 'text-rose-800',
    background: 'bg-rose-50',
  },
};

export function StatusBadge({
  status,
  variant = 'inline',
}: {
  status: RequestStatus;
  variant?: 'inline' | 'badge';
}) {
  const t = useTranslations('statuses');
  const style = styles[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm font-medium whitespace-nowrap',
        variant === 'badge' && ['rounded-md px-2 py-1', style.background],
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-2 shrink-0 rounded-full', style.dot)}
      />
      <span className={cn('whitespace-nowrap', style.text)}>{t(status)}</span>
    </span>
  );
}
