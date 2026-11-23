'use client';

import { Clock3Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PublicHeader } from '../../../components/public-header';
import { DemoEntry } from '../../../components/demo-entry';
import { Card } from '../../../components/ui/card';

export default function ExpiredPage() {
  const t = useTranslations('expired');
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader href="/demo-expired" />
      <main
        id="main"
        tabIndex={-1}
        className="relative isolate flex flex-1 items-center justify-center px-6 py-16 outline-none sm:px-10"
      >
        <div
          aria-hidden="true"
          className="public-dot-grid pointer-events-none absolute inset-0 -z-10"
        />
        <Card className="w-full max-w-xl rounded-xl p-6 shadow-hero sm:p-10">
          <section aria-labelledby="expired-title">
            <span className="mb-8 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
              <Clock3Icon className="size-7" aria-hidden="true" />
            </span>
            <p className="mb-3 text-sm font-semibold text-primary">
              {t('eyebrow')}
            </p>
            <h1
              id="expired-title"
              className="text-2xl leading-8 font-bold tracking-[-0.01em]"
            >
              {t('title')}
            </h1>
            <p className="mt-6 mb-8 text-lg leading-relaxed text-muted-foreground">
              {t('description')}
            </p>
            <DemoEntry expired />
          </section>
        </Card>
      </main>
    </div>
  );
}
