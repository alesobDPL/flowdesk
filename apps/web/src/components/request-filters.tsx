'use client';

import { useId } from 'react';
import { REQUEST_STATUSES, type RequestStatus } from '@flowdesk/shared';
import { useTranslations } from 'next-intl';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

type Filters = { status?: RequestStatus; q?: string };

export function RequestFilters({
  value,
  onChange,
}: {
  value: Filters;
  onChange: (value: Filters) => void;
}) {
  const id = useId();
  const t = useTranslations();
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 shadow-card sm:flex-row sm:items-end">
      <div className="min-w-0 space-y-2 sm:w-60 sm:shrink-0">
        <Label htmlFor={`${id}-status`}>{t('requests.statusFilter')}</Label>
        <Select
          value={value.status ?? 'all'}
          onValueChange={(selected) => {
            const status = REQUEST_STATUSES.find(
              (status) => status === selected,
            );
            onChange({ ...value, status });
          }}
        >
          <SelectTrigger
            id={`${id}-status`}
            className="w-full min-w-0 [&>span]:truncate [&>svg]:shrink-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('requests.allStatuses')}</SelectItem>
            {REQUEST_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {t(`statuses.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor={`${id}-search`}>{t('requests.search')}</Label>
        <Input
          id={`${id}-search`}
          value={value.q ?? ''}
          placeholder={t('requests.searchPlaceholder')}
          onChange={(event) => onChange({ ...value, q: event.target.value })}
        />
      </div>
    </div>
  );
}
