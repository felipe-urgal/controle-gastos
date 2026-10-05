"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type SetStateAction,
} from "react";
import { useDebounce } from "@/app/hooks/use-debounce";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { DEFAULT_PAGE_SIZE } from "@/app/lib/api/pagination-contract";

type PaginatedData<T> = {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  summary?: any;
};

type GetAllService<T> = (
  query?: Record<string, string | number>
) => Promise<{
  data?: PaginatedData<T>;
}>;

type UseIndexProps<T> = {
  service: {
    getAll: GetAllService<T>;
  };
  pagination?: boolean;
  appendPagination?: boolean;
  initialPageSize?: number;
  debounceMs?: number;
  syncWithUrl?: boolean;
  initialFilters?: Record<string, any>;
};

type RefetchOptions = {
  silent?: boolean;
};

export function useIndex<T>({
  service,
  pagination = false,
  appendPagination = false,
  initialPageSize = DEFAULT_PAGE_SIZE,
  debounceMs = 500,
  syncWithUrl = true,
  initialFilters = {},
}: UseIndexProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [summary, setSummary] = useState<any>();
  const isFirstRender = useRef(true);

  const [filters, setFiltersState] = useState<Record<string, any>>(() => {
    if (!syncWithUrl) return initialFilters;

    const entries = Object.fromEntries(searchParams.entries());

    delete entries.page;
    delete entries.pageSize;
    delete entries.viewMode;

    return {
      ...initialFilters,
      ...entries,
    };
  });

  const [page, setPage] = useState(() => {
    if (!syncWithUrl || appendPagination) return 1;
    return Number(searchParams.get("page")) || 1;
  });

  const [pageSize, setPageSize] = useState(() => {
    if (!syncWithUrl) return initialPageSize;

    const param = searchParams.get("pageSize");
    const parsed = param ? Number(param) : NaN;

    return !isNaN(parsed) && parsed > 0
      ? parsed
      : initialPageSize;
  });

  const [viewMode, setViewMode] = useState<"grid" | "list">(
    (searchParams.get("viewMode") as any) || "list"
  );

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState<number>();
  const [totalPages, setTotalPages] = useState<number>();
  const [error, setError] = useState<string | null>(null);

  const debouncedFilters = useDebounce(filters, debounceMs);

  const setFilters = useCallback(
    (next: SetStateAction<Record<string, any>>) => {
      setFiltersState(next);
      if (pagination) setPage(1);
    },
    [pagination],
  );

  useEffect(() => {
    if (!syncWithUrl) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const params = new URLSearchParams();

    params.set("viewMode", viewMode);

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });

    if (pagination && !appendPagination) {
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [
    filters,
    page,
    pageSize,
    pagination,
    appendPagination,
    pathname,
    router,
    syncWithUrl,
    viewMode,
  ]);

  const fetchItems = useCallback(async (options: RefetchOptions = {}) => {
    const silent = options.silent ?? false;

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const query: Record<string, any> = { ...debouncedFilters };

      if (pagination) {
        query.page = page;
        query.pageSize = pageSize;
      }

      const response = await service.getAll(query);
      const data = response.data;

      const nextItems = data?.items || [];
      setItems((previous) => {
        if (!appendPagination || page === 1) return nextItems;

        const seenIds = new Set(
          previous.flatMap((item) => {
            const id = (item as { id?: unknown })?.id;
            return typeof id === "string" ? [id] : [];
          }),
        );
        return [
          ...previous,
          ...nextItems.filter((item) => {
            const id = (item as { id?: unknown })?.id;
            return typeof id !== "string" || !seenIds.has(id);
          }),
        ];
      });

      if (pagination) {
        setTotal(data?.total);
        setTotalPages(data?.totalPages);
      }

      setSummary(data?.summary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar os dados");
      if (!silent && page === 1) {
        setItems([]);
        setSummary(undefined);
        setTotal(undefined);
        setTotalPages(undefined);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [appendPagination, debouncedFilters, page, pageSize, pagination, service]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchItems();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchItems]);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, [setFilters]);

  const hasMore = pagination && totalPages !== undefined && page < totalPages;
  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    if (appendPagination && error && page > 1) {
      void fetchItems();
      return;
    }
    setPage((current) => current + 1);
  }, [appendPagination, error, fetchItems, hasMore, loading, page]);

  return {
    loading,
    error,
    items,
    filters,
    setFilters,
    clearFilters,
    viewMode,
    setViewMode,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    hasMore,
    loadMore,
    hasPagination: pagination,
    refetch: fetchItems,
    summary,
  };
};
