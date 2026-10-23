'use client';

import { Button } from '@/app/components/ui';

export function typeLabel(type: 'PAYROLL_ADVANCE' | 'MONTHLY_PAYSLIP') {
  return type === 'PAYROLL_ADVANCE'
    ? 'Adiantamento salarial'
    : 'Folha / pagamento';
}

export function Pagination({
  page,
  hasMore,
  onPrevious,
  onNext,
}: {
  page: number;
  hasMore: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <Button variant="outline" pill disabled={page <= 1} onClick={onPrevious}>
        Anterior
      </Button>
      <span className="text-xs text-[var(--text-muted)]">Página {page}</span>
      <Button variant="outline" pill disabled={!hasMore} onClick={onNext}>
        Próxima
      </Button>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-[var(--surface-raised)] p-3">
      <span className="block text-xs text-[var(--text-muted)]">{label}</span>
      <strong className="mt-1 block break-words text-sm text-[var(--foreground)]">
        {value}
      </strong>
    </div>
  );
}
