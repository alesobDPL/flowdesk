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
    <ol aria-label={t('timeline.title')} className="space-y-6 border-l-2 pl-5">
      {ordered.map((event) => (
        <li key={event.id} className="space-y-2">
          <h3 className="font-medium">{t(`events.${event.type}`)}</h3>
          <p className="text-sm">{event.actor.displayName}</p>
          <time
            dateTime={event.createdAt}
            className="block text-sm text-muted-foreground"
          >
            {formatDateTime(event.createdAt, locale)}
          </time>
          {event.note && (
            <p className="rounded-md bg-muted p-3 text-sm break-words whitespace-pre-wrap">
              {event.note}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
