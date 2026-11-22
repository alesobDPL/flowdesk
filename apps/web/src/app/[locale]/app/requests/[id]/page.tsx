'use client';

import { useTranslations } from 'next-intl';

export default function RequestDetailPage() {
  const t = useTranslations('requests');
  return (
    <h1 className="text-3xl font-semibold tracking-tight">
      {t('detailTitle')}
    </h1>
  );
}
