'use client';

import type { Locale, RequestEventDto } from '@flowdesk/shared';
import { useLocale, useTranslations } from 'next-intl';
import { formatDateTime } from '../lib/format';

export function RequestTimeline({ events }: { events: RequestEventDto[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const ordered = [...events].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id,
  );
  if (ordered.length === 0)
    return <p className="text-muted-foreground">{t('timeline.empty')}</p>;
  return (
    <div className="relative min-w-0 [overflow-wrap:anywhere]">
      <span
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-1.5 w-px bg-border"
      />
      <ol aria-label={t('timeline.title')} className="space-y-6">
        {ordered.map((event) => (
          <li key={event.id} className="relative min-w-0 space-y-2 pl-7">
            <span
              aria-hidden="true"
              className="absolute top-1 left-0 size-3 rounded-full border-2 border-primary bg-card"
            />
            <h3 className="font-semibold text-foreground">
              {t(`events.${event.type}`)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {event.actor.displayName}
            </p>
            <time
              dateTime={event.createdAt}
              className="block text-sm text-muted-foreground tabular-nums"
            >
              {formatDateTime(event.createdAt, locale)}
            </time>
            {event.note && (
              <p className="rounded-md bg-primary-soft p-3 text-sm whitespace-pre-wrap text-foreground-secondary">
                {event.note}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
