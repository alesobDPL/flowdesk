'use client';

import { useEffect, useRef } from 'react';
import { useIsMutating } from '@tanstack/react-query';
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../../../components/ui/card';

export default function RequestDetailPage() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const { id } = useParams<{ id: string }>();
  const detail = useRequest(id);
  const pendingMutations = useIsMutating();
  const heading = useRef<HTMLHeadingElement>(null);
  const previous = useRef<{ id: string; hadActions: boolean } | null>(null);
  const allowedActions = detail.data?.allowedActions;
  useEffect(() => {
    if (!allowedActions) return;
    if (
      previous.current?.id === id &&
      previous.current.hadActions &&
      allowedActions.length === 0
    ) {
      // The successful response can arrive before the dialog's pending work ends.
      if (pendingMutations > 0) return;
      heading.current?.focus();
    }
    previous.current = { id, hadActions: allowedActions.length > 0 };
  }, [id, allowedActions, pendingMutations]);
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
    <div className="min-w-0 space-y-6 [overflow-wrap:anywhere]">
      <header className="space-y-3">
        <h1
          id="request-title"
          ref={heading}
          tabIndex={-1}
          className="rounded-md text-2xl leading-8 font-bold tracking-[-0.01em] text-foreground ring-ring ring-offset-2 focus-visible:ring-2 focus-visible:outline-none"
        >
          {t('requestDetail.title', {
            code: request.code,
            software: request.softwareName,
          })}
        </h1>
        <div className="space-y-2">
          <StatusBadge status={request.status} variant="badge" />
          <p className="text-sm text-muted-foreground">
            {t('requestDetail.createdAt')}
            {': '}
            <time dateTime={request.createdAt} className="tabular-nums">
              {formatDateTime(request.createdAt, locale)}
            </time>
          </p>
        </div>
      </header>
      <div className="flex min-w-0 flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="contents lg:col-start-2 lg:row-start-1 lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <RequestActions request={request} />
          <Card
            role="region"
            aria-labelledby="request-people"
            className="order-3 min-w-0"
          >
            <CardHeader>
              <CardTitle id="request-people">
                {t('requestDetail.people')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                {people.map(({ key, user }) => (
                  <div key={key} className="space-y-1">
                    <dt className="text-xs text-muted-foreground">
                      {t(`requestDetail.${key}`)}
                    </dt>
                    <dd>
                      {user ? (
                        <>
                          <p className="font-semibold">{user.displayName}</p>
                          <p className="text-muted-foreground">
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
            </CardContent>
          </Card>
        </div>
        <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <Card
            role="region"
            aria-labelledby="request-data"
            className="order-2 min-w-0"
          >
            <CardHeader>
              <CardTitle id="request-data">{t('requestDetail.data')}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {fields.map(({ label, value }) => (
                  <div key={label} className="min-w-0 space-y-1">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="whitespace-pre-wrap">
                      {value ?? t('requestDetail.notSpecified')}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card
            role="region"
            aria-labelledby="request-history"
            className="order-4 min-w-0"
          >
            <CardHeader>
              <CardTitle id="request-history">{t('timeline.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <RequestTimeline events={request.events} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
