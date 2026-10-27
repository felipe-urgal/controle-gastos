'use client';

import { motion } from 'framer-motion';

import { Button } from '@/app/components/ui';
import { PopBox } from '@/app/components/ui/motion';

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
      <Button variant="outline" disabled={page <= 1} onClick={onPrevious}>
        Anterior
      </Button>
      <span className="text-xs text-[var(--text-muted)]">Página {page}</span>
      <Button variant="outline" disabled={!hasMore} onClick={onNext}>
        Próxima
      </Button>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <PopBox whileHover="hover" className="min-w-0 rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-3">
      <span className="block text-xs text-[var(--text-muted)]">{label}</span>
      <motion.strong className="mt-1 block origin-left break-words text-sm text-[var(--foreground)]" variants={{ hover: { scale: 1.07, transition: { type: 'spring', stiffness: 400, damping: 16 } } }}>
        {value}
      </motion.strong>
    </PopBox>
  );
}
