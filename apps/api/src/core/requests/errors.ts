export type DomainErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_TRANSITION'
  | 'APPROVER_NOT_CONFIGURED'
  | 'SELF_APPROVAL_CONFLICT'
  | 'QUOTA_EXCEEDED';

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
