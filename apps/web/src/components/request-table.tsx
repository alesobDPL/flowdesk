'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@flowdesk/shared';
import { InboxIcon } from 'lucide-react';
import { Link } from '../i18n/navigation';
import { useRequestList, useSession, type ListQuery } from '../lib/queries';
import { formatDate } from '../lib/format';
import { errorMessageKey } from '../lib/error-messages';
import { Button } from './ui/button';
import { StatusBadge } from './status-badge';
import { Card, CardContent } from './ui/card';

export function RequestTable({
  query,
  emptyMessageKey,
}: {
  query: ListQuery;
  emptyMessageKey: string;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const requests = useRequestList(query);
  const session = useSession();
  const canCreate =
    session.data?.activeIdentity === 'employee' &&
    session.data.roles.includes('requester');
  if (requests.isPending) return <p role="status">{t('common.loading')}</p>;
  const error = requests.isError && (
    <div role="alert" className="space-y-3 text-sm text-destructive">
      <p>{t(errorMessageKey(requests.error.code ?? 'INTERNAL_ERROR'))}</p>
      <Button
        variant="outline"
        onClick={() => {
          void requests.refetch();
        }}
      >
        {t('app.retry')}
      </Button>
    </div>
  );
  if (!requests.data)
    return error || <p role="status">{t('common.loading')}</p>;
  if (requests.data.items.length === 0)
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {error}
          <InboxIcon
            className="size-8 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-muted-foreground">
            {t(
              query.q || query.status
                ? 'requests.emptyFiltered'
                : emptyMessageKey,
            )}
          </p>
          {canCreate && query.view === 'mine' && (
            <Button asChild variant="outline">
              <Link href="/app/requests/new">{t('requests.createFirst')}</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  return (
    <div className="min-w-0 space-y-4">
      {error}
      <Card
        role="region"
        aria-label={t('requests.caption')}
        tabIndex={0}
        className="min-w-0 overflow-x-auto outline-none ring-ring ring-offset-2 focus-visible:ring-2"
      >
        <table className="w-full min-w-[54rem] table-fixed text-left text-sm text-foreground-secondary">
          <caption className="sr-only">{t('requests.caption')}</caption>
          <colgroup>
            <col className="w-28" />
            <col className="w-56" />
            <col className="w-40" />
            <col className="w-60" />
            <col className="w-32" />
          </colgroup>
          <thead className="border-b bg-table-head">
            <tr>
              {(['code', 'software', 'access', 'status', 'date'] as const).map(
                (column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-4 py-3 text-xs leading-4 font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    {t(`requests.columns.${column}`)}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {requests.data.items.map((request) => (
              <tr
                key={request.id}
                className="h-12 border-b border-row-divider transition-colors duration-150 last:border-0 hover:bg-row-hover"
              >
                <th scope="row" className="px-4 py-3 font-medium">
                  <Link
                    href={{
                      pathname: '/app/requests/[id]',
                      params: { id: request.id },
                    }}
                    aria-label={t('requests.open', { code: request.code })}
                    className="rounded-sm text-primary-strong tabular-nums underline-offset-4 outline-none ring-ring ring-offset-2 hover:underline focus-visible:ring-2"
                  >
                    {request.code}
                  </Link>
                </th>
                <td className="truncate px-4 py-3" title={request.softwareName}>
                  {request.softwareName}
                </td>
                <td className="px-4 py-3 break-words">
                  {t(`accessLevels.${request.accessLevel}`)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={request.status} variant="inline" />
                </td>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                  <time dateTime={request.createdAt}>
                    {formatDate(request.createdAt, locale)}
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {requests.hasNextPage && (
        <Button
          variant="outline"
          disabled={requests.isFetching}
          aria-busy={requests.isFetchingNextPage}
          onClick={() => {
            if (!requests.isFetching) void requests.fetchNextPage();
          }}
        >
          {t(
            requests.isFetchingNextPage
              ? 'requests.loadingMore'
              : 'requests.loadMore',
          )}
        </Button>
      )}
    </div>
  );
}
