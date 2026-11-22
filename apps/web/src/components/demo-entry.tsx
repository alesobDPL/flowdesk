'use client';

import { useLocale, useTranslations } from 'next-intl';
import { LoaderCircleIcon } from 'lucide-react';
import type { Locale } from '@flowdesk/shared';
import { useRouter } from '../i18n/navigation';
import { useCreateSpace } from '../lib/queries';
import { ApiClientError } from '../lib/api-client';
import { errorMessageKey } from '../lib/error-messages';
import { Button } from './ui/button';

export function DemoEntry({
  canContinue = false,
  checking = false,
  expired = false,
}: {
  canContinue?: boolean;
  checking?: boolean;
  expired?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const create = useCreateSpace();
  const busy = checking || create.isPending;
  const label = checking
    ? 'welcome.checking'
    : create.isPending
      ? 'welcome.starting'
      : canContinue
        ? 'welcome.continueDemo'
        : expired
          ? 'expired.start'
          : 'welcome.tryDemo';
  const errorCode =
    create.error instanceof ApiClientError
      ? create.error.status === 429
        ? 'RATE_LIMITED'
        : create.error.code
      : 'INTERNAL_ERROR';
  return (
    <div className="flex max-w-lg flex-col items-start gap-4">
      <Button
        size="lg"
        disabled={busy}
        aria-busy={busy}
        onClick={() => {
          if (canContinue) {
            router.push('/app');
            return;
          }
          create.mutate(locale, { onSuccess: () => router.push('/app') });
        }}
      >
        {busy && (
          <LoaderCircleIcon
            className="animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        )}
        {t(label)}
      </Button>
      {create.isError && (
        <p role="alert" className="text-base text-destructive">
          {t(errorMessageKey(errorCode))}
        </p>
      )}
    </div>
  );
}
