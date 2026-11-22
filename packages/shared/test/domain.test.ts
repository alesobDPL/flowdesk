import { expect, it } from 'vitest';
import {
  ERROR_CODES,
  REQUEST_STATUSES,
  TERMINAL_STATUSES,
} from '../src/index.js';

it('declares the five statuses of the design', () => {
  expect(REQUEST_STATUSES).toEqual([
    'pending_approval',
    'rejected',
    'approved',
    'in_progress',
    'completed',
  ]);
  expect(TERMINAL_STATUSES).toEqual(['rejected', 'completed']);
});

it('declares the error codes of design section 8', () => {
  expect(ERROR_CODES).toHaveLength(12);
});
