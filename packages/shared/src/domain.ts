export const REQUEST_STATUSES = [
  'pending_approval',
  'rejected',
  'approved',
  'in_progress',
  'completed',
] as const;
export const ACCESS_LEVELS = ['read', 'edit', 'admin', 'other'] as const;
export const ROLES = ['requester', 'approver', 'it_agent'] as const;
export const DEMO_IDENTITIES = ['employee', 'approver', 'it_agent'] as const;
export const LOCALES = ['es', 'en'] as const;
export const REQUEST_ACTIONS = [
  'approve',
  'reject',
  'assign',
  'release',
  'complete',
] as const;
export const EVENT_TYPES = [
  'created',
  'approved',
  'rejected',
  'assigned',
  'released',
  'completed',
] as const;
export const LIST_VIEWS = [
  'mine',
  'approvals_pending',
  'approvals_decided',
  'queue',
  'assigned',
  'completed',
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type AccessLevel = (typeof ACCESS_LEVELS)[number];
export type Role = (typeof ROLES)[number];
export type DemoIdentity = (typeof DEMO_IDENTITIES)[number];
export type Locale = (typeof LOCALES)[number];
export type RequestAction = (typeof REQUEST_ACTIONS)[number];
export type EventType = (typeof EVENT_TYPES)[number];
export type ListView = (typeof LIST_VIEWS)[number];

export const TERMINAL_STATUSES: readonly RequestStatus[] = [
  'rejected',
  'completed',
];
