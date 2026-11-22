'use client';

import {
  ClipboardListIcon,
  ShieldCheckIcon,
  CheckCheckIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSession } from '../../lib/queries';
import { PublicHeader } from '../../components/public-header';
import { DemoEntry } from '../../components/demo-entry';
import { Badge } from '../../components/ui/badge';

export default function WelcomePage() {
  const t = useTranslations('welcome');
  const session = useSession();
  const steps = [
    {
      icon: ClipboardListIcon,
      title: 'requestTitle',
      description: 'requestDescription',
    },
    {
      icon: ShieldCheckIcon,
      title: 'approveTitle',
      description: 'approveDescription',
    },
    {
      icon: CheckCheckIcon,
      title: 'completeTitle',
      description: 'completeDescription',
    },
  ] as const;
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader href="/" />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-14 px-6 py-12 outline-none sm:px-10 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:gap-16"
      >
        <section className="flex flex-col items-start">
          <Badge variant="secondary" className="mb-6">
            {t('demoLabel')}
          </Badge>
          <p className="mb-4 text-sm font-semibold text-primary">
            {t('eyebrow')}
          </p>
          <h1 className="max-w-xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance whitespace-pre-line sm:text-5xl lg:text-6xl">
            {t('title')}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {t('description')}
          </p>
          <div className="mt-9">
            <DemoEntry
              canContinue={session.isSuccess}
              checking={session.isPending}
            />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {t('note')}
          </p>
        </section>
        <section
          aria-labelledby="flow-title"
          className="rounded-3xl border border-primary/10 bg-secondary/50 p-6 sm:p-8"
        >
          <h2 id="flow-title" className="mb-6 text-lg font-semibold">
            {t('flowLabel')}
          </h2>
          <ol className="space-y-4">
            {steps.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="flex items-start gap-4 rounded-xl border bg-card p-5 shadow-xs"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold">{t(title)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {t(description)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="mx-auto w-full max-w-6xl border-t px-6 py-6 text-sm text-muted-foreground sm:px-10">
        {t('footer')}
      </footer>
    </div>
  );
}
