'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  DemoIdentity,
  Locale,
  SessionInfo,
  TourProgress,
} from '@flowdesk/shared';
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

export function useSwitchIdentity(): UseMutationResult<
  SessionInfo,
  ApiClientError,
  DemoIdentity
> {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['switch-identity'],
    mutationFn: (identity: DemoIdentity) =>
      apiFetch<SessionInfo>('/session/identity', {
        method: 'PUT',
        body: { identity },
      }),
    onSuccess: async (session) => {
      await client.cancelQueries();
      client.setQueryData(['session'], session);
      await client.invalidateQueries();
    },
    retry: false,
  });
}

export function useResetDemo(): UseMutationResult<
  SessionInfo,
  ApiClientError,
  Locale
> {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['reset-demo'],
    mutationFn: (locale: Locale) =>
      apiFetch<SessionInfo>('/demo/spaces/reset', {
        method: 'POST',
        body: { locale },
      }),
    onSuccess: async (session) => {
      await client.cancelQueries();
      client.setQueryData(['session'], session);
      await client.invalidateQueries();
    },
    retry: false,
  });
}

export function useTour(): UseQueryResult<TourProgress, ApiClientError> {
  return useQuery({
    queryKey: ['tour'],
    queryFn: () => apiFetch<TourProgress>('/demo/tour'),
    retry: false,
  });
}
