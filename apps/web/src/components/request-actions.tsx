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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

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

  const showError = mutation.isError && mutation.error.status !== 409;
  const showActions = request.allowedActions.length > 0 || showError;
  if (!showActions && mode === null) return null;

  return (
    <>
      {showActions && (
        <Card
          role="region"
          aria-labelledby="request-actions"
          className="order-1 min-w-0"
        >
          <CardHeader>
            <CardTitle id="request-actions">
              {t('requestDetail.actions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
            {showError && (
              <p role="alert" className="text-sm text-destructive">
                {t(errorMessageKey(mutation.error.code ?? 'INTERNAL_ERROR'))}
              </p>
            )}
          </CardContent>
        </Card>
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
    </>
  );
}
