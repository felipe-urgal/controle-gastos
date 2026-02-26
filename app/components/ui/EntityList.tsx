"use client";

import { motion, AnimatePresence } from "framer-motion";
import PageLoading from "./PageLoading";
import PageEmpty from "./PageEmpty";
import { Pagination } from "./Pagination";

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
}

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
    <AnimatePresence mode="wait">
      <motion.div
        key={`${viewMode}-${items.length}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        {loading ? (
          <PageLoading type="list" />
        ) : isEmpty ? (
          <PageEmpty title={emptyTitle} />
        ) : (
          <>
            <motion.div
              layout
              className={
                isGrid
                  ? "grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                  : "flex flex-col gap-3"
              }
            >
              <AnimatePresence mode="popLayout">
                {items.map((item, index) => renderItem(item, index))}
              </AnimatePresence>
            </motion.div>
          </>
        )}

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
      </motion.div>
    </AnimatePresence>
  );
};
