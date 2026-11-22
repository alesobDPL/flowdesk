import type {
  AccessLevel,
  DemoIdentity,
  Locale,
  RequestStatus,
} from '@flowdesk/shared';

export type SampleRequest = {
  code: string;
  softwareName: string;
  accessLevel: AccessLevel;
  justification: string;
  status: RequestStatus;
  daysAgo: number;
  decisionComment: string | null;
  completionNote: string | null;
};

export function seedContent(locale: Locale): {
  users: Record<DemoIdentity, { displayName: string; jobTitle: string }>;
  samples: SampleRequest[];
} {
  const en = locale === 'en';
  return {
    users: {
      employee: {
        displayName: en ? 'Demo Employee' : 'Empleado de ejemplo',
        jobTitle: en ? 'Marketing employee' : 'Empleado de marketing',
      },
      approver: {
        displayName: en ? 'Demo Approver' : 'Aprobador de ejemplo',
        jobTitle: en ? 'IT lead' : 'Responsable de TI',
      },
      it_agent: {
        displayName: en ? 'Demo Technician' : 'Técnico de ejemplo',
        jobTitle: en ? 'IT support specialist' : 'Especialista de soporte TI',
      },
    },
    samples: [
      {
        code: 'FD-0001',
        softwareName: 'Salesforce',
        accessLevel: 'read',
        justification: en
          ? 'I need to consult customer records to prepare the campaign report.'
          : 'Necesito consultar los registros de clientes para preparar el informe de campaña.',
        status: 'completed',
        daysAgo: 10,
        decisionComment: en
          ? 'Read access approved for campaign reporting.'
          : 'Acceso de lectura aprobado para los informes de campaña.',
        completionNote: en
          ? 'Access granted and verified with the employee.'
          : 'Acceso concedido y verificado con el empleado.',
      },
      {
        code: 'FD-0002',
        softwareName: 'Adobe Acrobat Pro',
        accessLevel: 'edit',
        justification: en
          ? 'I need to edit PDF documents for the internal campaign guide.'
          : 'Necesito editar documentos PDF para la guía interna de la campaña.',
        status: 'rejected',
        daysAgo: 8,
        decisionComment: en
          ? 'Please use the existing document editor; an additional license is not required.'
          : 'Utiliza el editor de documentos disponible; no se requiere una licencia adicional.',
        completionNote: null,
      },
      {
        code: 'FD-0003',
        softwareName: 'Jira',
        accessLevel: 'edit',
        justification: en
          ? 'I need to track the tasks and dependencies of the next campaign.'
          : 'Necesito seguir las tareas y dependencias de la próxima campaña.',
        status: 'in_progress',
        daysAgo: 6,
        decisionComment: en
          ? 'Approved for the campaign planning project.'
          : 'Aprobado para el proyecto de planificación de campañas.',
        completionNote: null,
      },
      {
        code: 'FD-0004',
        softwareName: 'Tableau',
        accessLevel: 'read',
        justification: en
          ? 'I need to review the campaign performance dashboards each week.'
          : 'Necesito revisar cada semana los paneles de rendimiento de las campañas.',
        status: 'approved',
        daysAgo: 4,
        decisionComment: en
          ? 'Approved to consult the marketing dashboards.'
          : 'Aprobado para consultar los paneles de marketing.',
        completionNote: null,
      },
      {
        code: 'FD-0005',
        softwareName: 'Notion',
        accessLevel: 'edit',
        justification: en
          ? 'I need to maintain the shared campaign planning documentation.'
          : 'Necesito mantener la documentación compartida de planificación de campañas.',
        status: 'pending_approval',
        daysAgo: 2,
        decisionComment: null,
        completionNote: null,
      },
    ],
  };
}
