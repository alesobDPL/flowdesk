import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'en',
  localePrefix: 'always',
  localeDetection: false,
  pathnames: {
    '/': '/',
    '/app': '/app',
    '/app/requests': { es: '/app/solicitudes', en: '/app/requests' },
    '/app/requests/new': {
      es: '/app/solicitudes/nueva',
      en: '/app/requests/new',
    },
    '/app/requests/[id]': {
      es: '/app/solicitudes/[id]',
      en: '/app/requests/[id]',
    },
    '/app/approvals': { es: '/app/aprobaciones', en: '/app/approvals' },
    '/app/queue': { es: '/app/cola', en: '/app/queue' },
    '/demo-expired': { es: '/demo-caducada', en: '/demo-expired' },
  },
});
