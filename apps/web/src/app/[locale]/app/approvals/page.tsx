'use client';

import { useTranslations } from 'next-intl';
import { RequestTable } from '../../../../components/request-table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../../components/ui/tabs';

export default function ApprovalsPage() {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {t('app.nav.approvals')}
      </h1>
      <Tabs defaultValue="approvals_pending">
        <TabsList
          aria-label={t('app.nav.approvals')}
          className="h-auto w-full flex-wrap justify-start gap-1 sm:w-fit"
        >
          <TabsTrigger value="approvals_pending">
            {t('inbox.pending')}
          </TabsTrigger>
          <TabsTrigger value="approvals_decided">
            {t('inbox.decided')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="approvals_pending" className="pt-4">
          <RequestTable
            query={{ view: 'approvals_pending' }}
            emptyMessageKey="inbox.emptyPending"
          />
        </TabsContent>
        <TabsContent value="approvals_decided" className="pt-4">
          <RequestTable
            query={{ view: 'approvals_decided' }}
            emptyMessageKey="inbox.emptyDecided"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
