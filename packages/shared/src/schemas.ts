import { z } from 'zod';
import {
  ACCESS_LEVELS,
  DEMO_IDENTITIES,
  LIST_VIEWS,
  LOCALES,
  REQUEST_STATUSES,
} from './domain.js';
import type {
  AccessLevel,
  DemoIdentity,
  ListView,
  Locale,
  RequestStatus,
} from './domain.js';

export type CreateRequestInput = {
  softwareName: string;
  accessLevel: AccessLevel;
  accessDetail: string | null;
  justification: string;
  neededBy: string | null;
  comments: string | null;
};

function text(min: number, max: number) {
  return z
    .string({ error: 'required' })
    .trim()
    .refine((value) => [...value].length >= min, { error: 'too_short' })
    .refine((value) => [...value].length <= max, { error: 'too_long' });
}

function optionalText(max: number, min = 0) {
  return z
    .string({ error: 'required' })
    .nullish()
    .transform((value) => value?.trim() || null)
    .refine((value) => value === null || [...value].length >= min, {
      error: 'too_short',
    })
    .refine((value) => value === null || [...value].length <= max, {
      error: 'too_long',
    });
}

export function buildCreateRequestSchema(
  today: string,
): z.ZodType<CreateRequestInput> {
  const neededBy = z
    .string({ error: 'required' })
    .nullish()
    .transform((value) => value?.trim() || null)
    .superRefine((value, ctx) => {
      if (value === null) return;
      if (!z.iso.date().safeParse(value).success) {
        ctx.addIssue({ code: 'custom', message: 'required' });
      } else if (value < today) {
        ctx.addIssue({ code: 'custom', message: 'date_in_past' });
      }
    });

  const request = z
    .object(
      {
        softwareName: text(2, 100),
        accessLevel: z.enum(ACCESS_LEVELS, { error: 'required' }),
        accessDetail: optionalText(100, 2),
        justification: text(10, 1000),
        neededBy,
        comments: optionalText(1000),
      },
      { error: 'required' },
    )
    .superRefine((value, ctx) => {
      if (value.accessLevel === 'other' && value.accessDetail === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['accessDetail'],
          message: 'required',
        });
      }
    });

  return z.preprocess((value) => {
    if (
      typeof value === 'object' &&
      value !== null &&
      'accessLevel' in value &&
      value.accessLevel !== 'other'
    ) {
      return { ...value, accessDetail: null };
    }
    return value;
  }, request);
}

export const approveSchema: z.ZodType<{ comment: string | null }> = z.object(
  { comment: optionalText(500) },
  { error: 'required' },
);

export const rejectSchema: z.ZodType<{ reason: string }> = z.object(
  { reason: text(10, 500) },
  { error: 'required' },
);

export const releaseSchema: z.ZodType<{ reason: string }> = z.object(
  { reason: text(10, 500) },
  { error: 'required' },
);

export const completeSchema: z.ZodType<{ note: string | null }> = z.object(
  { note: optionalText(500) },
  { error: 'required' },
);

export const switchIdentitySchema: z.ZodType<{ identity: DemoIdentity }> =
  z.object(
    { identity: z.enum(DEMO_IDENTITIES, { error: 'required' }) },
    { error: 'required' },
  );

export const createSpaceSchema: z.ZodType<{ locale: Locale }> = z.object(
  { locale: z.enum(LOCALES, { error: 'required' }) },
  { error: 'required' },
);

export const listQuerySchema: z.ZodType<{
  view: ListView;
  status?: RequestStatus;
  q?: string;
  cursor?: string;
}> = z.object(
  {
    view: z.enum(LIST_VIEWS, { error: 'required' }),
    status: z.enum(REQUEST_STATUSES, { error: 'required' }).optional(),
    q: text(0, 100).optional(),
    cursor: z.string({ error: 'required' }).trim().optional(),
  },
  { error: 'required' },
);
