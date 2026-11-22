import { expect, it } from 'vitest';
import { homePathFor } from '../src/lib/app-routing';

it.each([
  ['employee', '/app/requests'],
  ['approver', '/app/approvals'],
  ['it_agent', '/app/queue'],
] as const)('routes %s to its role list', (identity, path) => {
  expect(homePathFor(identity)).toBe(path);
});
