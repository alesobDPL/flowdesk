'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { SessionInfo } from '@flowdesk/shared';
import { usePathname, useRouter } from '../i18n/navigation';
import { apiFetch, ApiClientError } from '../lib/api-client';
import { homePathFor } from '../lib/app-routing';

export function QueryErrorHandler() {
  const client = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('app');
  useEffect(() => {
    let active = true;
    let recovering = false;
    const handle = (error: unknown) => {
      // A session 401 is expected on the public welcome page.
      if (
        !(error instanceof ApiClientError) ||
        !(pathname === '/app' || pathname.startsWith('/app/'))
      )
        return;
      if (error.status === 401) {
        router.replace('/demo-expired');
        return;
      }
      if (
        (error.status !== 403 && error.status !== 404) ||
        pathname !== '/app/requests/[id]' ||
        recovering
      )
        return;
      recovering = true;
      // Another tab may have changed identity: refresh before choosing its list.
      void client
        .fetchQuery({
          queryKey: ['session'],
          queryFn: () => apiFetch<SessionInfo>('/session'),
          staleTime: 0,
          retry: false,
        })
        .then((session) => {
          if (!active) return;
          toast.info(t('requestUnavailable'), { id: 'request-unavailable' });
          router.replace(homePathFor(session.activeIdentity));
        })
        .catch((sessionError: unknown) => {
          if (!active) return;
          if (
            sessionError instanceof ApiClientError &&
            sessionError.status === 401
          )
            router.replace('/demo-expired');
          else {
            toast.info(t('requestUnavailable'), { id: 'request-unavailable' });
            router.replace('/app');
          }
        })
        .finally(() => {
          recovering = false;
        });
    };
    const unsubscribeQueries = client.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error')
        handle(event.query.state.error);
    });
    const unsubscribeMutations = client
      .getMutationCache()
      .subscribe((event) => {
        if (event.type === 'updated' && event.action.type === 'error')
          handle(event.mutation.state.error);
      });
    return () => {
      active = false;
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [client, pathname, router, t]);
  return null;
}
