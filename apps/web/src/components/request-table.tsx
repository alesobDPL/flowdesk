'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@flowdesk/shared';
import { Link } from '../i18n/navigation';
import { useRequestList, useSession, type ListQuery } from '../lib/queries';
import { formatDate } from '../lib/format';
import { errorMessageKey } from '../lib/error-messages';
import { Button } from './ui/button';
import { StatusBadge } from './status-badge';

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
      <div className="space-y-4 rounded-xl border bg-card p-8">
        {error}
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
      </div>
    );
  return (
    <div className="space-y-4">
      {error}
      <div
        role="region"
        aria-label={t('requests.caption')}
        tabIndex={0}
        className="overflow-x-auto rounded-xl border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <table className="w-full min-w-2xl text-left text-sm">
          <caption className="sr-only">{t('requests.caption')}</caption>
          <thead className="border-b bg-muted/50">
            <tr>
              {(['code', 'software', 'access', 'status', 'date'] as const).map(
                (column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-4 py-3 font-medium text-muted-foreground"
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
                className="border-b last:border-0 hover:bg-muted/30"
              >
                <th scope="row" className="px-4 py-4 font-medium">
                  <Link
                    href={{
                      pathname: '/app/requests/[id]',
                      params: { id: request.id },
                    }}
                    aria-label={t('requests.open', { code: request.code })}
                    className="rounded-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {request.code}
                  </Link>
                </th>
                <td className="max-w-64 px-4 py-4 break-words">
                  {request.softwareName}
                </td>
                <td className="px-4 py-4">
                  {t(`accessLevels.${request.accessLevel}`)}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={request.status} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <time dateTime={request.createdAt}>
                    {formatDate(request.createdAt, locale)}
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
