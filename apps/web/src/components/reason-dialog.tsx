'use client';

import { useId, useState } from 'react';
import {
  approveSchema,
  completeSchema,
  rejectSchema,
  releaseSchema,
} from '@flowdesk/shared';
import { useTranslations } from 'next-intl';
import { fieldErrorKey } from '../lib/error-messages';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

type Mode = 'reject' | 'release' | 'approve' | 'complete';

export function ReasonDialog({
  mode,
  onConfirm,
  pending,
}: {
  mode: Mode;
  onConfirm: (text: string | null) => void;
  pending: boolean;
}) {
  const id = useId();
  const t = useTranslations();
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const required = mode === 'reject' || mode === 'release';
  const result =
    mode === 'reject'
      ? rejectSchema.safeParse({ reason: text })
      : mode === 'release'
        ? releaseSchema.safeParse({ reason: text })
        : mode === 'approve'
          ? approveSchema.safeParse({ comment: text })
          : completeSchema.safeParse({ note: text });
  const invalid = touched && !result.success;
  return (
    <DialogContent
      showCloseButton={!pending}
      onEscapeKeyDown={(event) => {
        if (pending) event.preventDefault();
      }}
      onPointerDownOutside={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle>{t(`actions.${mode}`)}</DialogTitle>
        <DialogDescription>
          {t(`actionDialog.descriptions.${mode}`)}
        </DialogDescription>
      </DialogHeader>
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!pending && result.success) {
            const data = result.data;
            onConfirm(
              'reason' in data
                ? data.reason
                : 'comment' in data
                  ? data.comment
                  : data.note,
            );
          }
        }}
      >
        <div className="space-y-2">
          <Label htmlFor={id}>{t(`actionDialog.labels.${mode}`)}</Label>
          <Textarea
            id={id}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setTouched(true);
            }}
            onBlur={() => setTouched(true)}
            disabled={pending}
            aria-required={required}
            aria-invalid={invalid}
            aria-describedby={`${id}-hint${invalid ? ` ${id}-error` : ''}`}
          />
          <p id={`${id}-hint`} className="text-sm text-muted-foreground">
            {t(
              required
                ? 'actionDialog.requiredHint'
                : 'actionDialog.optionalHint',
            )}
          </p>
          {invalid && !result.success && (
            <p id={`${id}-error`} className="text-sm text-destructive">
              {t(fieldErrorKey(result.error.issues[0]?.message ?? 'required'))}
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              {t('app.cancel')}
            </Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={pending || !result.success}
            aria-busy={pending}
          >
            {t(pending ? 'actions.saving' : `actions.${mode}`)}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
