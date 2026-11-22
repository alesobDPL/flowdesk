'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { Locale, SessionInfo } from '@flowdesk/shared';
import { apiFetch, type ApiClientError } from './api-client';

export function useSession(): UseQueryResult<SessionInfo, ApiClientError> {
  return useQuery({
    queryKey: ['session'],
    queryFn: () => apiFetch<SessionInfo>('/session'),
    retry: false,
  });
}

export function useCreateSpace(): UseMutationResult<
  SessionInfo,
  ApiClientError,
  Locale
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (locale: Locale) =>
      apiFetch<SessionInfo>('/demo/spaces', {
        method: 'POST',
        body: { locale },
      }),
    onSuccess: (session) => client.setQueryData(['session'], session),
    retry: false,
  });
}
