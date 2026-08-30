'use client';

import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import { Button, Select } from '@/app/components/ui';

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

    for (let current = startPage; current <= endPage; current += 1) {
      pages.push(current);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <nav
      className="ds-panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Paginação"
    >
      <div className="flex items-center gap-3">
        <p className="text-sm text-[var(--text-muted)]">
          {start}–{end} de {total}
        </p>

        <div className="hidden items-center gap-2 lg:flex">
          <span className="text-sm text-[var(--text-muted)]">Por página</span>
          <div className="w-24">
            <Select
              ariaLabel="Itens por página"
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

      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          disabled={page === 1 || loading}
          onClick={() => onPageChange(page - 1)}
          icon={<FaChevronLeft />}
          aria-label="Página anterior"
        />

        {visiblePages.map((visiblePage) => (
          <Button
            key={visiblePage}
            size="sm"
            variant={visiblePage === page ? 'primary' : 'ghost'}
            onClick={() => onPageChange(visiblePage)}
            disabled={loading}
            aria-label={`Página ${visiblePage}`}
            aria-current={visiblePage === page ? 'page' : undefined}
          >
            {visiblePage}
          </Button>
        ))}

        <Button
          size="sm"
          variant="ghost"
          disabled={page === totalPages || loading}
          onClick={() => onPageChange(page + 1)}
          icon={<FaChevronRight />}
          aria-label="Próxima página"
        />
      </div>
    </nav>
  );
}
