"use client";

import { motion, AnimatePresence } from "framer-motion";
import PageLoading from "./PageLoading";
import PageEmpty from "./PageEmpty";

interface EntityListProps<T> {
  items: T[];
  loading: boolean;
  viewMode: "grid" | "list";
  search?: string;
  emptyTitle: string;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export default function EntityList<T>({
  items,
  loading,
  viewMode,
  search = "",
  emptyTitle,
  renderItem,
}: EntityListProps<T>) {
  const isGrid = viewMode === "grid";
  const isEmpty = !loading && items.length === 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${viewMode}-${items.length}-${search}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        {loading ? (
          <PageLoading type="list" />
        ) : isEmpty ? (
          <PageEmpty title={emptyTitle} />
        ) : (
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
        )}
      </motion.div>
    </AnimatePresence>
  );
}