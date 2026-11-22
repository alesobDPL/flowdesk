import { expect, it } from 'vitest';
import {
  approveSchema,
  buildCreateRequestSchema,
  completeSchema,
  createSpaceSchema,
  listQuerySchema,
  rejectSchema,
  releaseSchema,
  switchIdentitySchema,
} from '../src/schemas.js';

const schema = buildCreateRequestSchema('2026-11-22');
const validRequest = {
  softwareName: 'Figma',
  accessLevel: 'edit',
  justification: 'Necesito editar diseños',
  neededBy: null,
};

it('accepts a valid request', () => {
  expect(schema.parse(validRequest)).toEqual({
    ...validRequest,
    accessDetail: null,
    comments: null,
  });
});

it('trims and rejects whitespace-only justification', () => {
  const result = schema.safeParse({
    ...validRequest,
    justification: '          ',
  });
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['justification'],
          message: 'too_short',
        }),
      ]),
    );
  }
});

it('counts emojis as visible characters', () => {
  expect(
    schema.safeParse({ ...validRequest, justification: '🚀'.repeat(10) })
      .success,
  ).toBe(true);
  expect(
    schema.safeParse({ ...validRequest, justification: '🚀'.repeat(9) })
      .success,
  ).toBe(false);
  expect(
    schema.safeParse({ ...validRequest, justification: '🚀'.repeat(1000) })
      .success,
  ).toBe(true);
});

it('requires accessDetail only for other', () => {
  for (const accessDetail of [undefined, null, '', '   ']) {
    const result = schema.safeParse({
      ...validRequest,
      accessLevel: 'other',
      accessDetail,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['accessDetail'],
            message: 'required',
          }),
        ]),
      );
    }
  }
  for (const accessLevel of ['read', 'edit', 'admin']) {
    expect(
      schema.parse({
        ...validRequest,
        accessLevel,
        accessDetail: 'x'.repeat(101),
      }).accessDetail,
    ).toBeNull();
  }
  expect(
    schema.parse({
      ...validRequest,
      accessLevel: 'other',
      accessDetail: '  Custom role  ',
    }).accessDetail,
  ).toBe('Custom role');
});

it('rejects past neededBy', () => {
  const result = schema.safeParse({ ...validRequest, neededBy: '2026-11-21' });
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['neededBy'],
          message: 'date_in_past',
        }),
      ]),
    );
  }
  expect(
    schema.parse({ ...validRequest, neededBy: '2026-11-22' }).neededBy,
  ).toBe('2026-11-22');
  expect(
    schema.parse({ ...validRequest, neededBy: '2026-11-23' }).neededBy,
  ).toBe('2026-11-23');
});

it('bounds', () => {
  for (const softwareName of ['x', 'x'.repeat(101)]) {
    expect(schema.safeParse({ ...validRequest, softwareName }).success).toBe(
      false,
    );
  }
  expect(
    schema.safeParse({ ...validRequest, justification: 'x'.repeat(1001) })
      .success,
  ).toBe(false);
  expect(rejectSchema.safeParse({ reason: 'x'.repeat(9) }).success).toBe(false);
  expect(rejectSchema.safeParse({ reason: 'x'.repeat(10) }).success).toBe(true);
  expect(approveSchema.safeParse({ comment: 'x'.repeat(501) }).success).toBe(
    false,
  );
});

it.each([
  ['softwareName', 2, 100],
  ['justification', 10, 1000],
  ['comments', 0, 1000],
] as const)('enforces trimmed bounds for %s', (field, min, max) => {
  for (const length of [min, max]) {
    const value = '🚀'.repeat(length);
    expect(
      schema.parse({ ...validRequest, [field]: `  ${value}  ` })[field],
    ).toBe(value || null);
  }
  const result = schema.safeParse({
    ...validRequest,
    [field]: '🚀'.repeat(max + 1),
  });
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: [field], message: 'too_long' }),
      ]),
    );
  }
});

it.each([1, 101])('rejects accessDetail of length %i for other', (length) => {
  const result = schema.safeParse({
    ...validRequest,
    accessLevel: 'other',
    accessDetail: 'x'.repeat(length),
  });
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['accessDetail'],
          message: length < 2 ? 'too_short' : 'too_long',
        }),
      ]),
    );
  }
});

it.each([2, 100])('accepts accessDetail of length %i for other', (length) => {
  expect(
    schema.parse({
      ...validRequest,
      accessLevel: 'other',
      accessDetail: `  ${'🚀'.repeat(length)}  `,
    }).accessDetail,
  ).toBe('🚀'.repeat(length));
});

it.each([undefined, null, '', '   '])(
  'normalizes empty optional texts (%s)',
  (empty) => {
    expect(
      schema.parse({ ...validRequest, comments: empty, neededBy: empty }),
    ).toEqual({ ...validRequest, accessDetail: null, comments: null });
    expect(approveSchema.parse({ comment: empty })).toEqual({ comment: null });
    expect(completeSchema.parse({ note: empty })).toEqual({ note: null });
  },
);

it.each(['2026-02-30', '2026-13-01', '22/11/2026', '2026-11-22T00:00:00Z'])(
  'rejects an invalid calendar date: %s',
  (neededBy) => {
    const result = schema.safeParse({ ...validRequest, neededBy });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ['neededBy'], message: 'required' }),
      ]);
    }
  },
);

it('uses the supplied today rather than the system date', () => {
  expect(
    buildCreateRequestSchema('2026-11-23').safeParse({
      ...validRequest,
      neededBy: '2026-11-22',
    }).success,
  ).toBe(false);
  expect(
    schema.parse({ ...validRequest, neededBy: ' 2026-11-22 ' }).neededBy,
  ).toBe('2026-11-22');
});

it.each([
  ['approve', approveSchema, 'comment'],
  ['complete', completeSchema, 'note'],
] as const)(
  'bounds optional %s text after trimming',
  (_action, actionSchema, field) => {
    expect(actionSchema.parse({ [field]: `  ${'🚀'.repeat(500)}  ` })).toEqual({
      [field]: '🚀'.repeat(500),
    });
    const result = actionSchema.safeParse({ [field]: '🚀'.repeat(501) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: [field], message: 'too_long' }),
      ]);
    }
  },
);

it.each([
  ['reject', rejectSchema],
  ['release', releaseSchema],
] as const)(
  'requires and bounds the %s reason after trimming',
  (_action, actionSchema) => {
    for (const length of [10, 500]) {
      expect(
        actionSchema.parse({ reason: `  ${'🚀'.repeat(length)}  ` }),
      ).toEqual({
        reason: '🚀'.repeat(length),
      });
    }
    for (const [reason, message] of [
      [undefined, 'required'],
      ['          ', 'too_short'],
      ['🚀'.repeat(9), 'too_short'],
      ['🚀'.repeat(501), 'too_long'],
    ]) {
      const result = actionSchema.safeParse({ reason });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual([
          expect.objectContaining({ path: ['reason'], message }),
        ]);
      }
    }
  },
);

it('accepts only the design identities and locales', () => {
  for (const identity of ['employee', 'approver', 'it_agent']) {
    expect(switchIdentitySchema.parse({ identity })).toEqual({ identity });
  }
  for (const locale of ['es', 'en']) {
    expect(createSpaceSchema.parse({ locale })).toEqual({ locale });
  }
  expect(
    switchIdentitySchema.safeParse({ identity: 'requester' }).success,
  ).toBe(false);
  expect(createSpaceSchema.safeParse({ locale: 'fr' }).success).toBe(false);
});

it('validates list views, statuses and trimmed search bounds', () => {
  for (const view of [
    'mine',
    'approvals_pending',
    'approvals_decided',
    'queue',
    'assigned',
    'completed',
  ]) {
    expect(listQuerySchema.parse({ view })).toEqual({ view });
  }
  for (const status of [
    'pending_approval',
    'rejected',
    'approved',
    'in_progress',
    'completed',
  ]) {
    expect(listQuerySchema.parse({ view: 'mine', status })).toEqual({
      view: 'mine',
      status,
    });
  }
  expect(
    listQuerySchema.parse({
      view: 'queue',
      status: 'approved',
      q: '  Figma%_  ',
      cursor: 'next-page',
    }),
  ).toEqual({
    view: 'queue',
    status: 'approved',
    q: 'Figma%_',
    cursor: 'next-page',
  });
  expect(
    listQuerySchema.parse({ view: 'mine', q: ` ${'🚀'.repeat(100)} ` }).q,
  ).toBe('🚀'.repeat(100));
  const result = listQuerySchema.safeParse({
    view: 'mine',
    q: '🚀'.repeat(101),
  });
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toEqual([
      expect.objectContaining({ path: ['q'], message: 'too_long' }),
    ]);
  }
  expect(listQuerySchema.safeParse({ view: 'unknown' }).success).toBe(false);
  expect(
    listQuerySchema.safeParse({ view: 'mine', status: 'unknown' }).success,
  ).toBe(false);
});

it('returns stable required codes for missing or invalid required fields', () => {
  for (const [requiredSchema, input, field] of [
    [schema, { ...validRequest, softwareName: undefined }, 'softwareName'],
    [schema, { ...validRequest, justification: null }, 'justification'],
    [schema, { ...validRequest, accessLevel: 'unknown' }, 'accessLevel'],
    [switchIdentitySchema, {}, 'identity'],
    [createSpaceSchema, {}, 'locale'],
    [listQuerySchema, {}, 'view'],
  ] as const) {
    const result = requiredSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: [field], message: 'required' }),
      ]);
    }
  }
});
