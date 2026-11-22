'use client';

import { useTranslations } from 'next-intl';
import { RequestForm } from '../../../../../components/request-form';
import { useSession } from '../../../../../lib/queries';
import { Link } from '../../../../../i18n/navigation';
import { homePathFor } from '../../../../../lib/app-routing';

export default function NewRequestPage() {
  const t = useTranslations();
  const session = useSession();
  if (!session.data) return <p role="status">{t('common.loading')}</p>;
  if (
    session.data.activeIdentity !== 'employee' ||
    !session.data.roles.includes('requester')
  )
    return (
      <p role="alert">
        {t('errors.FORBIDDEN')}{' '}
        <Link
          href={homePathFor(session.data.activeIdentity)}
          className="text-primary underline"
        >
          {t('app.navigation')}
        </Link>
      </p>
    );
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {t('requestForm.title')}
      </h1>
      <RequestForm />
    </div>
  );
}
