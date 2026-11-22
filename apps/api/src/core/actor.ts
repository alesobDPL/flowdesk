import type { Role } from '@flowdesk/shared';

export type Actor = {
  userId: string;
  roles: readonly Role[];
  scopeId: string;
};
