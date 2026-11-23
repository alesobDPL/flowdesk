'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { RequestStatus } from '@flowdesk/shared';
import { Link } from '../../../../i18n/navigation';
import { useSession } from '../../../../lib/queries';
import { Button } from '../../../../components/ui/button';
import { RequestFilters } from '../../../../components/request-filters';
import { RequestTable } from '../../../../components/request-table';
import { PageHeader } from '../../../../components/page-header';

export default function RequestsPage() {
  const t = useTranslations();
  const session = useSession();
  const [filters, setFilters] = useState<{
    status?: RequestStatus;
    q?: string;
  }>({});
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(
      () => setSearch(filters.q?.trim() ?? ''),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [filters.q]);
  const canCreate =
    session.data?.activeIdentity === 'employee' &&
    session.data.roles.includes('requester');
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('app.nav.requests')}
        description={t('app.subtitles.requests')}
        actions={
          canCreate && (
            <Button asChild>
              <Link href="/app/requests/new">{t('requests.new')}</Link>
            </Button>
          )
        }
      />
      <RequestFilters value={filters} onChange={setFilters} />
      <RequestTable
        query={{ view: 'mine', status: filters.status, q: search || undefined }}
        emptyMessageKey="requests.emptyMine"
      />
    </div>
  );
}
