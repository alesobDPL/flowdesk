'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from '../../../lib/queries';
import { homePathFor } from '../../../lib/app-routing';
import { useRouter } from '../../../i18n/navigation';

export default function AppPage() {
  const session = useSession();
  const router = useRouter();
  const t = useTranslations('app');
  useEffect(() => {
    if (session.data) router.replace(homePathFor(session.data.activeIdentity));
  }, [session.data, router]);
  return <p role="status">{t('redirecting')}</p>;
}
