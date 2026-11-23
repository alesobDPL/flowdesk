'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import type { TourProgress } from '@flowdesk/shared';
import { useTour } from '../lib/queries';
import { errorMessageKey } from '../lib/error-messages';
import { Button } from './ui/button';

const progressKeys: Partial<Record<number, keyof TourProgress>> = {
  2: 'created',
  5: 'decided',
  7: 'assigned',
  8: 'completed',
};

export function TourPanel() {
  const id = useId();
  const t = useTranslations('tour');
  const messages = useTranslations();
  const tour = useTour();
  return (
    <details className="rounded-lg border bg-table-head p-3 text-foreground-secondary">
      <summary className="cursor-pointer rounded-sm text-sm font-semibold text-foreground outline-none ring-ring ring-offset-2 focus-visible:ring-2">
        {t('title')}
      </summary>
      <p
        id={`${id}-description`}
        className="mt-3 text-sm leading-relaxed text-muted-foreground"
      >
        {t('description')}
      </p>
      {tour.isPending && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {messages('common.loading')}
        </p>
      )}
      {tour.isError && (
        <div role="alert" className="mt-3 text-sm text-destructive">
          <p>
            {messages(errorMessageKey(tour.error.code ?? 'INTERNAL_ERROR'))}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              void tour.refetch();
            }}
          >
            {messages('app.retry')}
          </Button>
        </div>
      )}
      <ol
        aria-describedby={`${id}-description`}
        className="mt-4 list-decimal space-y-4 pl-5 text-sm leading-relaxed"
      >
        {Array.from({ length: 9 }, (_, index) => {
          const step = index + 1;
          const key = progressKeys[step];
          return (
            <li key={step} className="pl-1">
              {key ? (
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={tour.data?.[key] ?? false}
                    disabled
                    aria-readonly="true"
                    aria-labelledby={`${id}-step-${step}`}
                    aria-busy={tour.isFetching}
                    className="mt-1 size-4 shrink-0 accent-primary"
                  />
                  <span id={`${id}-step-${step}`}>{t(`steps.${step}`)}</span>
                </label>
              ) : (
                t(`steps.${step}`)
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
