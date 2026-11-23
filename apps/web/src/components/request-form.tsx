'use client';

import { useId, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { ZodType } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ACCESS_LEVELS,
  APP_TIME_ZONE,
  buildCreateRequestSchema,
  todayIn,
  type CreateRequestInput,
  type ErrorCode,
} from '@flowdesk/shared';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from '../i18n/navigation';
import { useCreateRequest } from '../lib/queries';
import { ApiClientError } from '../lib/api-client';
import { errorMessageKey, fieldErrorKey } from '../lib/error-messages';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardFooter } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const fields = [
  'softwareName',
  'accessLevel',
  'accessDetail',
  'justification',
  'neededBy',
  'comments',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function RequestForm() {
  const id = useId();
  const t = useTranslations();
  const router = useRouter();
  const create = useCreateRequest();
  const submitting = useRef(false);
  const [formError, setFormError] = useState<ErrorCode | null>(null);
  const today = todayIn(APP_TIME_ZONE, new Date());
  const form = useForm<CreateRequestInput>({
    // The shared schema accepts unknown input; the form supplies these six fields.
    resolver: zodResolver(
      buildCreateRequestSchema(today) as ZodType<
        CreateRequestInput,
        CreateRequestInput
      >,
    ),
    defaultValues: {
      softwareName: '',
      accessLevel: 'read',
      accessDetail: null,
      justification: '',
      neededBy: null,
      comments: null,
    },
  });
  const accessLevel = useWatch({ control: form.control, name: 'accessLevel' });
  const errors = form.formState.errors;
  const busy = create.isPending || form.formState.isSubmitting;
  const fieldId = (field: keyof CreateRequestInput) => `${id}-${field}`;
  const errorId = (field: keyof CreateRequestInput) =>
    errors[field] ? `${fieldId(field)}-error` : undefined;
  const error = (field: keyof CreateRequestInput) =>
    errors[field] && (
      <p id={errorId(field)} className="text-sm text-destructive">
        {t(fieldErrorKey(errors[field].message ?? 'required'))}
      </p>
    );

  const submit = async (input: CreateRequestInput) => {
    if (submitting.current) return;
    submitting.current = true;
    setFormError(null);
    try {
      const request = await create.mutateAsync(input);
      toast.success(t('requestForm.success', { code: request.code }));
      router.push({
        pathname: '/app/requests/[id]',
        params: { id: request.id },
      });
    } catch (cause: unknown) {
      let mapped = false;
      if (
        cause instanceof ApiClientError &&
        cause.status === 400 &&
        isRecord(cause.details.fields)
      ) {
        const serverFields = cause.details.fields;
        for (const field of fields) {
          const codes = serverFields[field];
          if (Array.isArray(codes) && typeof codes[0] === 'string') {
            form.setError(
              field,
              { type: 'server', message: codes[0] },
              { shouldFocus: !mapped },
            );
            mapped = true;
          }
        }
      }
      if (!mapped)
        setFormError(
          cause instanceof ApiClientError ? cause.code : 'INTERNAL_ERROR',
        );
    } finally {
      submitting.current = false;
    }
  };

  return (
    <Card className="w-full max-w-[640px]">
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(submit)(event);
        }}
      >
        <CardContent className="space-y-6 pt-6 text-base">
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
            {t('requestForm.credentialsNotice')}
          </p>
          <div className="space-y-2">
            <Label htmlFor={fieldId('softwareName')} className="font-semibold">
              {t('requestForm.softwareName')}
            </Label>
            <Input
              id={fieldId('softwareName')}
              {...form.register('softwareName')}
              aria-required="true"
              aria-invalid={!!errors.softwareName}
              aria-describedby={errorId('softwareName')}
            />
            {error('softwareName')}
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('accessLevel')} className="font-semibold">
              {t('requestForm.accessLevel')}
            </Label>
            <Controller
              control={form.control}
              name="accessLevel"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id={fieldId('accessLevel')}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-required="true"
                    aria-invalid={!!errors.accessLevel}
                    aria-describedby={errorId('accessLevel')}
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {t(`accessLevels.${level}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {error('accessLevel')}
          </div>
          {accessLevel === 'other' && (
            <div className="space-y-2">
              <Label
                htmlFor={fieldId('accessDetail')}
                className="font-semibold"
              >
                {t('requestForm.accessDetail')}
              </Label>
              <Input
                id={fieldId('accessDetail')}
                {...form.register('accessDetail')}
                aria-required="true"
                aria-invalid={!!errors.accessDetail}
                aria-describedby={errorId('accessDetail')}
              />
              {error('accessDetail')}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor={fieldId('justification')} className="font-semibold">
              {t('requestForm.justification')}
            </Label>
            <Textarea
              id={fieldId('justification')}
              {...form.register('justification')}
              aria-required="true"
              aria-invalid={!!errors.justification}
              aria-describedby={errorId('justification')}
            />
            <p className="text-sm text-muted-foreground">
              {t('requestForm.justificationHint')}
            </p>
            {error('justification')}
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('neededBy')} className="font-semibold">
              {t('requestForm.neededBy')}
            </Label>
            <Input
              id={fieldId('neededBy')}
              type="date"
              min={today}
              {...form.register('neededBy')}
              aria-invalid={!!errors.neededBy}
              aria-describedby={errorId('neededBy')}
            />
            {error('neededBy')}
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId('comments')} className="font-semibold">
              {t('requestForm.comments')}
            </Label>
            <Textarea
              id={fieldId('comments')}
              {...form.register('comments')}
              aria-invalid={!!errors.comments}
              aria-describedby={errorId('comments')}
            />
            {error('comments')}
          </div>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {t(errorMessageKey(formError))}
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={busy || create.isSuccess}
            aria-busy={busy}
          >
            {t(busy ? 'requestForm.submitting' : 'requestForm.submit')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
