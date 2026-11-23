'use client';

import { useState } from 'react';
import {
  CheckIcon,
  ClipboardListIcon,
  ShieldCheckIcon,
  CheckCheckIcon,
  RotateCcwIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { StatusBadge } from './status-badge';

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

export function FlowPanel() {
  const t = useTranslations('welcome');
  const [sequence, setSequence] = useState(0);

  return (
    <section aria-labelledby="flow-title" className="min-w-0">
      <Card className="rounded-xl p-5 shadow-hero sm:p-6">
        <h2 id="flow-title" className="mb-6 text-base font-semibold">
          {t('flowLabel')}
        </h2>
        <div key={sequence} className="flow-sequence">
          <ol className="relative space-y-4">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <li
                key={title}
                className="flow-step relative ml-10 rounded-lg border p-3"
              >
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-7 -bottom-11 -left-6 w-0.5 bg-border"
                  >
                    <span className="flow-rail absolute inset-0 origin-top bg-primary" />
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className="flow-node absolute top-3 -left-10 grid size-8 place-items-center rounded-full"
                >
                  <Icon className="flow-node-icon col-start-1 row-start-1 size-4" />
                  <CheckIcon className="flow-node-check col-start-1 row-start-1 size-4" />
                </span>
                <h3 className="text-base font-semibold">{t(title)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t(description)}
                </p>
              </li>
            ))}
          </ol>
          <div
            aria-hidden="true"
            className="mt-6 rounded-lg border bg-background p-3"
          >
            <p className="mb-2 text-sm font-semibold text-foreground-secondary tabular-nums">
              {t('sampleRequest')}
            </p>
            <div className="grid justify-items-start">
              {(['pending_approval', 'approved', 'completed'] as const).map(
                (status) => (
                  <span
                    key={status}
                    className={`flow-status flow-status-${status} col-start-1 row-start-1`}
                  >
                    <StatusBadge status={status} variant="badge" />
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSequence((value) => value + 1)}
          >
            <RotateCcwIcon aria-hidden="true" />
            {t('replay')}
          </Button>
        </div>
      </Card>
    </section>
  );
}
