'use client';

import { useTranslations } from 'next-intl';
import { RequestTable } from '../../../../components/request-table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../../components/ui/tabs';

export default function QueuePage() {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {t('app.nav.queue')}
      </h1>
      <Tabs defaultValue="queue">
        <TabsList
          aria-label={t('app.nav.queue')}
          className="h-auto w-full flex-wrap justify-start gap-1 sm:w-fit"
        >
          <TabsTrigger value="queue">{t('queue.available')}</TabsTrigger>
          <TabsTrigger value="assigned">{t('queue.assigned')}</TabsTrigger>
          <TabsTrigger value="completed">{t('queue.completed')}</TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="pt-4">
          <RequestTable
            query={{ view: 'queue' }}
            emptyMessageKey="queue.emptyAvailable"
          />
        </TabsContent>
        <TabsContent value="assigned" className="pt-4">
          <RequestTable
            query={{ view: 'assigned' }}
            emptyMessageKey="queue.emptyAssigned"
          />
        </TabsContent>
        <TabsContent value="completed" className="pt-4">
          <RequestTable
            query={{ view: 'completed' }}
            emptyMessageKey="queue.emptyCompleted"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
