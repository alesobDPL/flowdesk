'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import type { Locale } from '@flowdesk/shared';
import { useRequest } from '../../../../../lib/queries';
import { errorMessageKey } from '../../../../../lib/error-messages';
import { formatDate, formatDateTime } from '../../../../../lib/format';
import { StatusBadge } from '../../../../../components/status-badge';
import { RequestActions } from '../../../../../components/request-actions';
import { RequestTimeline } from '../../../../../components/request-timeline';
import { Button } from '../../../../../components/ui/button';

export default function RequestDetailPage() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const { id } = useParams<{ id: string }>();
  const detail = useRequest(id);
  if (detail.isPending) return <p role="status">{t('common.loading')}</p>;
  if (detail.isError) {
    if ([401, 403, 404].includes(detail.error.status))
      return <p role="status">{t('app.redirecting')}</p>;
    return (
      <div role="alert" className="space-y-4">
        <p className="text-destructive">
          {t(errorMessageKey(detail.error.code ?? 'INTERNAL_ERROR'))}
        </p>
        <Button
          onClick={() => {
            void detail.refetch();
          }}
        >
          {t('app.retry')}
        </Button>
      </div>
    );
  }
  const request = detail.data;
  const people = [
    { key: 'requester', user: request.requester },
    { key: 'approver', user: request.approver },
    { key: 'assignee', user: request.assignee },
    { key: 'completedBy', user: request.completedBy },
  ] as const;
  const fields = [
    { label: t('requestForm.softwareName'), value: request.softwareName },
    {
      label: t('requestForm.accessLevel'),
      value: t(`accessLevels.${request.accessLevel}`),
    },
    ...(request.accessDetail
      ? [{ label: t('requestForm.accessDetail'), value: request.accessDetail }]
      : []),
    { label: t('requestForm.justification'), value: request.justification },
    {
      label: t('requestForm.neededBy'),
      value: request.neededBy ? formatDate(request.neededBy, locale) : null,
    },
    { label: t('requestForm.comments'), value: request.comments },
    {
      label: t('requestDetail.createdAt'),
      value: formatDateTime(request.createdAt, locale),
    },
    {
      label: t('requestDetail.decidedAt'),
      value: request.decidedAt
        ? formatDateTime(request.decidedAt, locale)
        : null,
    },
    {
      label: t('requestDetail.decisionComment'),
      value: request.decisionComment,
    },
    {
      label: t('requestDetail.completedAt'),
      value: request.completedAt
        ? formatDateTime(request.completedAt, locale)
        : null,
    },
    { label: t('requestDetail.completionNote'), value: request.completionNote },
  ];
  return (
    <div className="max-w-5xl space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight break-words">
          {t('requestDetail.title', {
            code: request.code,
            software: request.softwareName,
          })}
        </h1>
        <StatusBadge status={request.status} />
      </header>
      <section aria-labelledby="request-actions" className="space-y-4">
        <h2 id="request-actions" className="text-xl font-semibold">
          {t('requestDetail.actions')}
        </h2>
        <RequestActions request={request} />
      </section>
      <section aria-labelledby="request-people" className="space-y-4">
        <h2 id="request-people" className="text-xl font-semibold">
          {t('requestDetail.people')}
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          {people.map(({ key, user }) => (
            <div key={key} className="rounded-xl border bg-card p-4">
              <dt className="mb-2 text-sm text-muted-foreground">
                {t(`requestDetail.${key}`)}
              </dt>
              <dd>
                {user ? (
                  <>
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.jobTitle}
                    </p>
                  </>
                ) : (
                  t(
                    key === 'completedBy'
                      ? 'requestDetail.notCompleted'
                      : 'requestDetail.notAssigned',
                  )
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="request-data" className="space-y-4">
        <h2 id="request-data" className="text-xl font-semibold">
          {t('requestDetail.data')}
        </h2>
        <dl className="grid gap-x-8 gap-y-5 rounded-xl border bg-card p-5 sm:grid-cols-2">
          {fields.map(({ label, value }) => (
            <div key={label} className="min-w-0 space-y-1">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="break-words whitespace-pre-wrap">
                {value ?? t('requestDetail.notSpecified')}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="request-history" className="space-y-4">
        <h2 id="request-history" className="text-xl font-semibold">
          {t('timeline.title')}
        </h2>
        <RequestTimeline events={request.events} />
      </section>
    </div>
  );
}
