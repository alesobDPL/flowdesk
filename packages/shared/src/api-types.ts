import type {
  AccessLevel,
  DemoIdentity,
  EventType,
  RequestAction,
  RequestStatus,
  Role,
} from './domain.js';
import type { ErrorCode } from './error-codes.js';

export type UserRef = {
  id: string;
  displayName: string;
  jobTitle: string;
};

export type RequestSummary = {
  id: string;
  code: string;
  softwareName: string;
  accessLevel: AccessLevel;
  status: RequestStatus;
  requester: UserRef;
  createdAt: string;
};

export type RequestEventDto = {
  id: number;
  type: EventType;
  actor: UserRef;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  note: string | null;
  createdAt: string;
};

export type RequestDetail = RequestSummary & {
  accessDetail: string | null;
  justification: string;
  neededBy: string | null;
  comments: string | null;
  approver: UserRef;
  assignee: UserRef | null;
  decisionComment: string | null;
  decidedAt: string | null;
  completionNote: string | null;
  completedBy: UserRef | null;
  completedAt: string | null;
  isSample: boolean;
  events: RequestEventDto[];
  allowedActions: RequestAction[];
};

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
};

export type SessionInfo = {
  activeIdentity: DemoIdentity;
  user: UserRef;
  roles: Role[];
  identities: { identity: DemoIdentity; user: UserRef }[];
  expiresAt: string;
};

export type TourProgress = {
  created: boolean;
  decided: boolean;
  assigned: boolean;
  completed: boolean;
};

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    details: Record<string, unknown>;
  };
};
