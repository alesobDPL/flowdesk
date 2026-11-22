import type { RequestAction, RequestStatus } from '@flowdesk/shared';
import { describe, expect, it } from 'vitest';
import { nextStatus } from '../../src/core/requests/state-machine.js';

describe('nextStatus', () => {
  it.each<[RequestStatus, RequestAction, RequestStatus | null]>([
    ['pending_approval', 'approve', 'approved'],
    ['pending_approval', 'reject', 'rejected'],
    ['pending_approval', 'assign', null],
    ['pending_approval', 'release', null],
    ['pending_approval', 'complete', null],
    ['rejected', 'approve', null],
    ['rejected', 'reject', null],
    ['rejected', 'assign', null],
    ['rejected', 'release', null],
    ['rejected', 'complete', null],
    ['approved', 'approve', null],
    ['approved', 'reject', null],
    ['approved', 'assign', 'in_progress'],
    ['approved', 'release', null],
    ['approved', 'complete', null],
    ['in_progress', 'approve', null],
    ['in_progress', 'reject', null],
    ['in_progress', 'assign', null],
    ['in_progress', 'release', 'approved'],
    ['in_progress', 'complete', 'completed'],
    ['completed', 'approve', null],
    ['completed', 'reject', null],
    ['completed', 'assign', null],
    ['completed', 'release', null],
    ['completed', 'complete', null],
  ])('%s + %s → %s', (from, action, expected) => {
    expect(nextStatus(from, action)).toBe(expected);
  });
});
