'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@flowdesk/shared';
import { Clock3Icon } from 'lucide-react';
import { formatRemaining } from '../lib/format';

export function Countdown({ expiresAt }: { expiresAt: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('countdown');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = new Date(expiresAt).getTime() - now;
  return (
    <span
      role="timer"
      aria-label={t('label')}
      className="inline-flex min-w-0 items-center gap-2 text-xs leading-4 text-muted-foreground tabular-nums"
    >
      <Clock3Icon className="size-4 shrink-0" aria-hidden="true" />
      {remaining <= 0
        ? t('expired')
        : t('expiresIn', { remaining: formatRemaining(remaining, locale) })}
    </span>
  );
}
