'use client';

import { useTranslations } from 'next-intl';
import { LanguageSelector } from './language-selector';
import { BrandMark } from './brand-mark';

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
      <header className="border-b bg-card/80">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4 sm:px-10">
          <span className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
            <BrandMark />
            {t('brand')}
          </span>
          <LanguageSelector href={href} />
        </div>
      </header>
    </>
  );
}
