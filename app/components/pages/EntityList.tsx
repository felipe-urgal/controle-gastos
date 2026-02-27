"use client";

// importing components
import { PageLoading, PageEmpty } from "@/app/components/feedback";
import { Pagination } from "@/app/components/navigation";

interface EntityListProps<T> {
  items: T[];
  loading: boolean;
  viewMode: "grid" | "list";
  emptyTitle: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  pagination?: {
    page: number;
    pageSize: number;
    total?: number;
    totalPages?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
};

export default function EntityList<T>({
  items,
  loading,
  viewMode,
  emptyTitle,
  renderItem,
  pagination,
}: EntityListProps<T>) {
  const isGrid = viewMode === "grid";
  const isEmpty = !loading && items.length === 0;

  return (
    <>
      {pagination && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          loading={loading}
        />
      )}

      {loading ? (
        <PageLoading type="list" />
      ) : isEmpty ? (
        <PageEmpty title={emptyTitle} />
      ) : (
        <>
          <div className={
              isGrid
                ? "grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                : "flex flex-col gap-3"
            }
          >
            {items.map((item, index) => renderItem(item, index))}
          </div>
        </>
      )}
    </>
  );
};
