'use client';

import { Clock3Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PublicHeader } from '../../../components/public-header';
import { DemoEntry } from '../../../components/demo-entry';

export default function ExpiredPage() {
  const t = useTranslations('expired');
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader href="/demo-expired" />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-16 outline-none sm:px-10"
      >
        <section className="max-w-xl">
          <span className="mb-8 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Clock3Icon className="size-7" aria-hidden="true" />
          </span>
          <p className="mb-3 text-sm font-semibold text-primary">
            {t('eyebrow')}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-6 mb-8 text-lg leading-relaxed text-muted-foreground">
            {t('description')}
          </p>
          <DemoEntry expired />
        </section>
      </main>
    </div>
  );
}
