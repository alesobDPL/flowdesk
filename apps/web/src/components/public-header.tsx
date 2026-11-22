'use client';

import { LayersIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageSelector } from './language-selector';

export function PublicHeader({ href }: { href: '/' | '/demo-expired' }) {
  const t = useTranslations('common');
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        {t('skipToContent')}
      </a>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6 sm:px-10">
        <span className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LayersIcon className="size-5" aria-hidden="true" />
          </span>
          {t('brand')}
        </span>
        <LanguageSelector href={href} />
      </header>
    </>
  );
}
