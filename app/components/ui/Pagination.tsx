"use client";

import { motion } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Button from "@/app/components/ui/Button";
import Select from "@/app/components/ui/Select";

interface PaginationProps {
  page: number;
  pageSize: number;
  total?: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  loading?: boolean;
  pageSizeOptions?: number[];
}

export function Pagination({
  page,
  pageSize,
  total,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
  loading = false,
  pageSizeOptions = [6, 10, 20, 50, 100],
}: PaginationProps) {
  if (!total || total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const getVisiblePages = () => {
    const pages: number[] = [];

    let startPage = Math.max(1, page - 1);
    let endPage = Math.min(totalPages, page + 1);

    if (page === 1) endPage = Math.min(3, totalPages);
    if (page === totalPages) startPage = Math.max(1, totalPages - 2);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="
        flex flex-col gap-4
        sm:flex-row sm:items-center sm:justify-between
        p-4 rounded-xl
        backdrop-blur-sm border
        bg-white/5 border-white/10
      "
    >
      {/* Info + Page Size */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto hidden sm:inline">
        <div className="text-xs text-slate-400">
          {start} – {end} de {total}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Por página
          </span>

          <div className="w-20">
            <Select
              options={pageSizeOptions.map((size) => ({
                value: size,
                label: String(size),
              }))}
              value={pageSize}
              onChange={(value) => {
                onPageSizeChange(Number(value));
                onPageChange(1);
              }}
              size="sm"
              variant="outlined"
            />
          </div>
        </div>
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-center gap-2 w-full sm:w-auto flex-wrap">
        <Button
          size="sm"
          variant="ghost"
          disabled={page === 1 || loading}
          onClick={() => onPageChange(page - 1)}
          icon={<FaChevronLeft />}
        />

        {visiblePages.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === page ? "primary" : "ghost"}
            onClick={() => onPageChange(p)}
            disabled={loading}
          >
            {p}
          </Button>
        ))}

        <Button
          size="sm"
          variant="ghost"
          disabled={page === totalPages || loading}
          onClick={() => onPageChange(page + 1)}
          icon={<FaChevronRight />}
        />
      </div>
    </motion.div>
  );
};
