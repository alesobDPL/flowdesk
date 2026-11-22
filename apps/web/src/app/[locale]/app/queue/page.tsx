'use client';

import { useTranslations } from 'next-intl';

export default function QueuePage() {
  const t = useTranslations('app.nav');
  return (
    <h1 className="text-3xl font-semibold tracking-tight">{t('queue')}</h1>
  );
}
