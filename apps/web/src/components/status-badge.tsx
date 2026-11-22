'use client';

import type { RequestStatus } from '@flowdesk/shared';
import { useTranslations } from 'next-intl';
import { Badge } from './ui/badge';

const styles: Record<RequestStatus, string> = {
  pending_approval: 'border-amber-200 bg-amber-50 text-amber-950',
  rejected: 'border-rose-200 bg-rose-50 text-rose-950',
  approved: 'border-sky-200 bg-sky-50 text-sky-950',
  in_progress: 'border-violet-200 bg-violet-50 text-violet-950',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-950',
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const t = useTranslations('statuses');
  return (
    <Badge variant="outline" className={`whitespace-normal ${styles[status]}`}>
      {t(status)}
    </Badge>
  );
}
