import {
  ACCESS_LEVELS,
  DEMO_IDENTITIES,
  EVENT_TYPES,
  REQUEST_STATUSES,
  ROLES,
} from '@flowdesk/shared';
import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

export const demoSpaces = pgTable(
  'demo_spaces',
  {
    id: uuid('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    hardExpiresAt: timestamp('hard_expires_at', {
      withTimezone: true,
    }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
    status: text('status', { enum: ['active', 'ended'] }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    requestSeq: integer('request_seq').notNull(),
    requestsCreated: integer('requests_created').notNull(),
  },
  (table) => [
    check(
      'demo_spaces_status_check',
      sql`${table.status} in ('active', 'ended')`,
    ),
    index('demo_spaces_hard_expires_at_idx').on(table.hardExpiresAt),
    index('demo_spaces_last_seen_at_idx').on(table.lastSeenAt),
  ],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    demoSpaceId: uuid('demo_space_id')
      .notNull()
      .references(() => demoSpaces.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    jobTitle: text('job_title').notNull(),
    demoIdentity: text('demo_identity', { enum: DEMO_IDENTITIES }),
  },
  (table) => [
    unique('users_space_id_unique').on(table.demoSpaceId, table.id),
    unique('users_space_identity_unique').on(
      table.demoSpaceId,
      table.demoIdentity,
    ),
    check(
      'users_demo_identity_check',
      sql`${table.demoIdentity} in ('employee', 'approver', 'it_agent')`,
    ),
  ],
);

export const userRoles = pgTable(
  'user_roles',
  {
    demoSpaceId: uuid('demo_space_id')
      .notNull()
      .references(() => demoSpaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: text('role', { enum: ROLES }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.role] }),
    foreignKey({
      name: 'user_roles_space_user_fk',
      columns: [table.demoSpaceId, table.userId],
      foreignColumns: [users.demoSpaceId, users.id],
    }).onDelete('no action'),
    check(
      'user_roles_role_check',
      sql`${table.role} in ('requester', 'approver', 'it_agent')`,
    ),
  ],
);

export const requestTypes = pgTable('request_types', {
  id: smallint('id').primaryKey(),
  key: text('key').notNull(),
  name: text('name').notNull(),
});

export const approverAssignments = pgTable(
  'approver_assignments',
  {
    demoSpaceId: uuid('demo_space_id')
      .notNull()
      .references(() => demoSpaces.id, { onDelete: 'cascade' }),
    requestTypeId: smallint('request_type_id')
      .notNull()
      .references(() => requestTypes.id),
    approverId: uuid('approver_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.demoSpaceId, table.requestTypeId] }),
    foreignKey({
      name: 'approver_assignments_space_approver_fk',
      columns: [table.demoSpaceId, table.approverId],
      foreignColumns: [users.demoSpaceId, users.id],
    }).onDelete('no action'),
  ],
);

export const requests = pgTable(
  'requests',
  {
    id: uuid('id').primaryKey(),
    demoSpaceId: uuid('demo_space_id')
      .notNull()
      .references(() => demoSpaces.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    requestTypeId: smallint('request_type_id')
      .notNull()
      .references(() => requestTypes.id),
    requesterId: uuid('requester_id').notNull(),
    approverId: uuid('approver_id').notNull(),
    assigneeId: uuid('assignee_id'),
    softwareName: text('software_name').notNull(),
    accessLevel: text('access_level', { enum: ACCESS_LEVELS }).notNull(),
    accessDetail: text('access_detail'),
    justification: text('justification').notNull(),
    neededBy: date('needed_by', { mode: 'string' }),
    comments: text('comments'),
    status: text('status', { enum: REQUEST_STATUSES }).notNull(),
    decisionComment: text('decision_comment'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    completionNote: text('completion_note'),
    completedBy: uuid('completed_by'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    isSample: boolean('is_sample').notNull(),
    version: integer('version').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    unique('requests_space_code_unique').on(table.demoSpaceId, table.code),
    unique('requests_space_id_unique').on(table.demoSpaceId, table.id),
    foreignKey({
      name: 'requests_space_requester_fk',
      columns: [table.demoSpaceId, table.requesterId],
      foreignColumns: [users.demoSpaceId, users.id],
    }).onDelete('no action'),
    foreignKey({
      name: 'requests_space_approver_fk',
      columns: [table.demoSpaceId, table.approverId],
      foreignColumns: [users.demoSpaceId, users.id],
    }).onDelete('no action'),
    foreignKey({
      name: 'requests_space_assignee_fk',
      columns: [table.demoSpaceId, table.assigneeId],
      foreignColumns: [users.demoSpaceId, users.id],
    }).onDelete('no action'),
    foreignKey({
      name: 'requests_space_completed_by_fk',
      columns: [table.demoSpaceId, table.completedBy],
      foreignColumns: [users.demoSpaceId, users.id],
    }).onDelete('no action'),
    check(
      'requests_access_level_check',
      sql`${table.accessLevel} in ('read', 'edit', 'admin', 'other')`,
    ),
    check(
      'requests_status_check',
      sql`${table.status} in ('pending_approval', 'rejected', 'approved', 'in_progress', 'completed')`,
    ),
    check(
      'requests_status_assignee_check',
      sql`(${table.status} = 'in_progress') = (${table.assigneeId} is not null)`,
    ),
    index('requests_space_status_idx').on(table.demoSpaceId, table.status),
    index('requests_space_requester_idx').on(
      table.demoSpaceId,
      table.requesterId,
    ),
    index('requests_space_approver_idx').on(
      table.demoSpaceId,
      table.approverId,
    ),
  ],
);

export const requestEvents = pgTable(
  'request_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    demoSpaceId: uuid('demo_space_id')
      .notNull()
      .references(() => demoSpaces.id, { onDelete: 'cascade' }),
    requestId: uuid('request_id').notNull(),
    type: text('type', { enum: EVENT_TYPES }).notNull(),
    actorId: uuid('actor_id').notNull(),
    fromStatus: text('from_status', { enum: REQUEST_STATUSES }),
    toStatus: text('to_status', { enum: REQUEST_STATUSES }).notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: 'request_events_space_request_fk',
      columns: [table.demoSpaceId, table.requestId],
      foreignColumns: [requests.demoSpaceId, requests.id],
    }).onDelete('no action'),
    foreignKey({
      name: 'request_events_space_actor_fk',
      columns: [table.demoSpaceId, table.actorId],
      foreignColumns: [users.demoSpaceId, users.id],
    }).onDelete('no action'),
    check(
      'request_events_type_check',
      sql`${table.type} in ('created', 'approved', 'rejected', 'assigned', 'released', 'completed')`,
    ),
    check(
      'request_events_from_status_check',
      sql`${table.fromStatus} in ('pending_approval', 'rejected', 'approved', 'in_progress', 'completed')`,
    ),
    check(
      'request_events_to_status_check',
      sql`${table.toStatus} in ('pending_approval', 'rejected', 'approved', 'in_progress', 'completed')`,
    ),
    index('request_events_request_created_idx').on(
      table.requestId,
      table.createdAt,
    ),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey(),
    tokenHash: bytea('token_hash').notNull().unique(),
    demoSpaceId: uuid('demo_space_id')
      .notNull()
      .references(() => demoSpaces.id, { onDelete: 'cascade' }),
    activeUserId: uuid('active_user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    foreignKey({
      name: 'sessions_space_active_user_fk',
      columns: [table.demoSpaceId, table.activeUserId],
      foreignColumns: [users.demoSpaceId, users.id],
    }).onDelete('no action'),
  ],
);
