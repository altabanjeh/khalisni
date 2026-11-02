/**
 * Paged admin lists: pure helpers shared by usePagedList and LoadMoreFooter.
 *
 * DRF PageNumberPagination answers {count, next, previous, results}; a list
 * endpoint without pagination answers a plain array (one "page", no next).
 * A screen must never show only page 1 silently: it either loads more on
 * demand (load-more footer) or reads every page (fetchAllPages).
 */
import { fetchPage, pageFromNextLink, type PageResult } from '../api/client';
import type { ApiListParams } from '../types/common';

export const FIRST_PAGE = 1;

/** The page to request after `lastPage`, or undefined when there is none. */
export function nextPageParam<T>(lastPage: PageResult<T> | undefined): number | undefined {
  return pageFromNextLink(lastPage?.next) ?? undefined;
}

/** Every loaded row, in page order. */
export function flattenPages<T>(pages: ReadonlyArray<PageResult<T>> | undefined): T[] {
  return (pages ?? []).flatMap((page) => page.results);
}

/** The server's total, falling back to what is loaded for unpaginated lists. */
export function pagedTotal<T>(pages: ReadonlyArray<PageResult<T>> | undefined): number {
  const first = pages?.[0];
  const loaded = flattenPages(pages).length;
  return first ? Math.max(first.count, loaded) : 0;
}

/** «معروض ٢٠ من ٤٥» — what the footer says about the list. */
export function pageSummary(shown: number, total: number): string {
  if (total <= shown) return `تم عرض كل السجلات (${total})`;
  return `معروض ${shown} من ${total}`;
}

/**
 * The infinite-query options of one paged list (used by usePagedList; kept free
 * of React so the paging rule can be exercised outside a component).
 */
export function pagedListQueryOptions<T>(queryKey: ReadonlyArray<unknown>, url: string, params: ApiListParams = {}) {
  return {
    queryKey: [...queryKey, 'paged', params],
    initialPageParam: FIRST_PAGE,
    queryFn: ({ pageParam }: { pageParam: number }) => fetchPage<T>(url, { ...params, page: pageParam }),
    getNextPageParam: (lastPage: PageResult<T>) => nextPageParam(lastPage),
  };
}
