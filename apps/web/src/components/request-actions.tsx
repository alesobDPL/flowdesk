'use client';

import { useEffect, useRef, useState } from 'react';
import type { RequestAction, RequestDetail } from '@flowdesk/shared';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRequestAction } from '../lib/queries';
import { ApiClientError } from '../lib/api-client';
import { errorMessageKey } from '../lib/error-messages';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { ReasonDialog } from './reason-dialog';

export function RequestActions({ request }: { request: RequestDetail }) {
  const t = useTranslations();
  const mutation = useRequestAction(request.id);
  const [mode, setMode] = useState<Exclude<RequestAction, 'assign'> | null>(
    null,
  );
  const trigger = useRef<HTMLButtonElement | null>(null);
  const running = useRef(false);
  useEffect(() => {
    if (mode === null) trigger.current?.focus();
  }, [mode]);

  const perform = async (
    action: RequestAction,
    body: Record<string, string | null>,
  ) => {
    if (running.current) return;
    running.current = true;
    try {
      await mutation.mutateAsync({ action, body });
      setMode(null);
    } catch (error: unknown) {
      setMode(null);
      if (error instanceof ApiClientError && error.status === 409)
        toast.info(t('actions.changed'));
    } finally {
      running.current = false;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {request.allowedActions.map((action) => (
          <Button
            key={action}
            variant={action === 'reject' ? 'destructive' : 'default'}
            disabled={mutation.isPending}
            aria-busy={mutation.isPending}
            onClick={(event) => {
              if (action === 'assign') {
                void perform('assign', {});
                return;
              }
              trigger.current = event.currentTarget;
              mutation.reset();
              setMode(action);
            }}
          >
            {t(`actions.${action}`)}
          </Button>
        ))}
      </div>
      {request.allowedActions.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('actions.none')}</p>
      )}
      {mutation.isError && mutation.error.status !== 409 && (
        <p role="alert" className="text-sm text-destructive">
          {t(errorMessageKey(mutation.error.code ?? 'INTERNAL_ERROR'))}
        </p>
      )}
      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setMode(null);
        }}
      >
        {mode && (
          <ReasonDialog
            key={mode}
            mode={mode}
            pending={mutation.isPending}
            onConfirm={(text) => {
              const body: Record<string, string | null> =
                mode === 'reject' || mode === 'release'
                  ? { reason: text }
                  : mode === 'approve'
                    ? { comment: text }
                    : { note: text };
              void perform(mode, body);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
