'use client';

import { ExternalLinkIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSession } from '../../lib/queries';
import { PublicHeader } from '../../components/public-header';
import { DemoEntry } from '../../components/demo-entry';
import { FlowPanel } from '../../components/flow-panel';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';

export default function WelcomePage() {
  const t = useTranslations('welcome');
  const session = useSession();
  const titleLines = t('title').split('\n');
  return (
    <div className="flex min-h-svh flex-col">
      <PublicHeader href="/" />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <div className="relative isolate">
          <div
            aria-hidden="true"
            className="public-dot-grid pointer-events-none absolute inset-0 -z-10"
          />
          <div className="hero-enter mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-12 sm:px-10 sm:py-20 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12">
            <section className="flex min-w-0 flex-col items-start">
              <Badge
                variant="secondary"
                className="mb-6 rounded-full border-primary/20 px-3"
              >
                {t('demoLabel')}
              </Badge>
              <p className="mb-4 text-sm font-semibold text-primary-strong">
                {t('eyebrow')}
              </p>
              <h1 className="max-w-full text-[38px] leading-[42px] font-extrabold tracking-[-0.03em] text-balance lg:text-[56px] lg:leading-[60px]">
                {titleLines.map((line, index) => (
                  <span
                    key={line}
                    className={index === 0 ? 'block' : 'block text-primary'}
                  >
                    {index > 0 && ' '}
                    {line}
                  </span>
                ))}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                {t('description')}
              </p>
              <div className="mt-8 [&_button]:h-11 [&_button]:shadow-[0_4px_12px_color-mix(in_srgb,var(--color-primary)_20%,transparent)]">
                <DemoEntry
                  canContinue={session.isSuccess}
                  checking={session.isPending}
                />
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {t('note')}
              </p>
            </section>
            <FlowPanel />
          </div>
        </div>
        <section
          aria-labelledby="perspectives-title"
          className="mx-auto w-full max-w-7xl px-6 pb-16 sm:px-10 sm:pb-20"
        >
          <h2 id="perspectives-title" className="mb-6 text-base font-semibold">
            {t('perspectivesTitle')}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {(['employee', 'approver', 'it'] as const).map((role) => (
              <Card
                key={role}
                className="p-6 transition-shadow duration-150 hover:shadow-overlay motion-safe:transition-[box-shadow,transform] motion-safe:hover:-translate-y-0.5"
              >
                <p className="mb-3 text-xs font-semibold tracking-wider text-primary-strong uppercase">
                  {t(`perspectives.${role}.eyebrow`)}
                </p>
                <h3 className="text-base font-semibold">
                  {t(`perspectives.${role}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`perspectives.${role}.description`)}
                </p>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 border-t px-6 py-6 text-sm text-muted-foreground sm:px-10">
        <p>{t('footer')}</p>
        <a
          href="https://github.com/alesobDPL/flowdesk"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t('sourceLink')} ${t('opensInNewTab')}`}
          className="inline-flex items-center gap-2 rounded-md text-primary-strong underline-offset-4 outline-none ring-ring ring-offset-2 hover:underline focus-visible:ring-2"
        >
          {t('sourceLink')}
          <ExternalLinkIcon aria-hidden="true" className="size-4" />
        </a>
      </footer>
    </div>
  );
}
