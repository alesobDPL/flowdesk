import type { RequestDetail } from '@flowdesk/shared';

export const employee = {
  id: 'employee',
  displayName: 'Laura Méndez',
  jobTitle: 'Marketing',
};
export const approver = {
  id: 'approver',
  displayName: 'Diego Rojas',
  jobTitle: 'Jefe de TI',
};
export const technician = {
  id: 'it',
  displayName: 'Ana Torres',
  jobTitle: 'Soporte TI',
};
export const request: RequestDetail = {
  id: 'request-id',
  code: 'FD-0006',
  softwareName: 'Figma',
  accessLevel: 'read',
  status: 'approved',
  requester: employee,
  createdAt: '2026-11-22T15:00:00Z',
  accessDetail: null,
  justification: 'Necesito acceso para preparar la campaña.',
  neededBy: null,
  comments: null,
  approver,
  assignee: null,
  decisionComment: null,
  decidedAt: '2026-11-22T15:10:00Z',
  completionNote: null,
  completedBy: null,
  completedAt: null,
  isSample: false,
  events: [
    {
      id: 2,
      type: 'approved',
      actor: approver,
      fromStatus: 'pending_approval',
      toStatus: 'approved',
      note: 'Acceso revisado.',
      createdAt: '2026-11-22T15:10:00Z',
    },
    {
      id: 1,
      type: 'created',
      actor: employee,
      fromStatus: null,
      toStatus: 'pending_approval',
      note: null,
      createdAt: '2026-11-22T15:00:00Z',
    },
  ],
  allowedActions: ['assign'],
};
