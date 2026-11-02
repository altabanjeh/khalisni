import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';

import type { ApiListParams } from '../types/common';
import { flattenPages, pagedListQueryOptions, pagedTotal } from '../utils/pagination';

interface UsePagedListOptions<T> {
  queryKey: QueryKey;
  url: string;
  params?: ApiListParams;
  // Applied to every loaded row (e.g. the soft-delete status safety net).
  select?: (rows: T[]) => T[];
}

/**
 * One admin list read page by page (DRF `next` links). `items` holds every page
 * loaded so far; LoadMoreFooter offers the next page while one exists.
 */
export function usePagedList<T>({ queryKey, url, params = {}, select }: UsePagedListOptions<T>) {
  const query = useInfiniteQuery(pagedListQueryOptions<T>(queryKey, url, params));
  const loaded = flattenPages(query.data?.pages);
  return {
    ...query,
    items: select ? select(loaded) : loaded,
    loadedCount: loaded.length,
    total: pagedTotal(query.data?.pages),
  };
}
