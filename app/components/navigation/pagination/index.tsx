"use client";

// importing icons
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

// importing components
import { Button, Select } from "@/app/components/ui";

interface PaginationProps {
  page: number;
  pageSize: number;
  total?: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  loading?: boolean;
  pageSizeOptions?: number[];
};

export default function Pagination({
  page,
  pageSize,
  total,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
  loading = false,
  pageSizeOptions = [5, 10, 20, 50, 100],
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
    <div className="flex gap-4 flex-row items-center justify-between p-4 rounded-xl backdrop-blur-sm border bg-white/5 border-white/10">
      <div className="flex flex-row lg:items-center gap-3 w-auto ">
        <div className="text-xs text-slate-400">
          {start} – {end} de {total}
        </div>

        <div className="items-center gap-2 hidden lg:flex">
          <span className="text-xs text-slate-400 hidden lg:inline">
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
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 w-auto flex-wrap">
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
    </div>
  );
};
