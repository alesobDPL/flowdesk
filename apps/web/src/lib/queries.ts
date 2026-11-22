'use client';

import {
  useMutation,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import type {
  DemoIdentity,
  Locale,
  SessionInfo,
  TourProgress,
  CreateRequestInput,
  Page,
  RequestSummary,
  RequestDetail,
  RequestAction,
  listQuerySchema,
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

export type ListQuery = ReturnType<typeof listQuerySchema.parse>;

export function useRequestList(
  query: ListQuery,
): UseInfiniteQueryResult<Page<RequestSummary>, ApiClientError> {
  return useInfiniteQuery<
    Page<RequestSummary>,
    ApiClientError,
    Page<RequestSummary>,
    readonly unknown[],
    string | null
  >({
    queryKey: ['requests', 'list', query],
    initialPageParam: query.cursor ?? null,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ view: query.view });
      if (query.status) params.set('status', query.status);
      if (query.q) params.set('q', query.q);
      if (pageParam) params.set('cursor', pageParam);
      return apiFetch<Page<RequestSummary>>(`/requests?${params.toString()}`);
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    // The public interface exposes accumulated items; TanStack retains each page.
    select: (data) => ({
      items: data.pages.flatMap((page) => page.items),
      nextCursor: data.pages.at(-1)?.nextCursor ?? null,
    }),
    retry: false,
  });
}

export function useCreateRequest(): UseMutationResult<
  RequestDetail,
  ApiClientError,
  CreateRequestInput
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRequestInput) =>
      apiFetch<RequestDetail>('/requests', { method: 'POST', body: input }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['requests'] }),
        client.invalidateQueries({ queryKey: ['tour'] }),
      ]);
    },
    retry: false,
  });
}

export function useRequest(
  id: string,
): UseQueryResult<RequestDetail, ApiClientError> {
  return useQuery({
    queryKey: ['requests', 'detail', id],
    queryFn: () =>
      apiFetch<RequestDetail>(`/requests/${encodeURIComponent(id)}`),
    retry: false,
  });
}

export function useRequestAction(
  id: string,
): UseMutationResult<
  RequestDetail,
  ApiClientError,
  { action: RequestAction; body: Record<string, string | null> }
> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ action, body }) =>
      apiFetch<RequestDetail>(`/requests/${encodeURIComponent(id)}/${action}`, {
        method: 'POST',
        body,
      }),
    onSuccess: async (request) => {
      await client.cancelQueries({ queryKey: ['requests', 'detail', id] });
      client.setQueryData(['requests', 'detail', id], request);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['requests'] }),
        client.invalidateQueries({ queryKey: ['tour'] }),
      ]);
    },
    onError: async (error) => {
      if (error.status === 409)
        await client.invalidateQueries({
          queryKey: ['requests', 'detail', id],
          refetchType: 'all',
        });
    },
    retry: false,
  });
}
