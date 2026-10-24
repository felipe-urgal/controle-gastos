'use client';

import { ModalShell } from '@/app/components/overlays/modal-shell';
import { ReactNode } from 'react';
import { FaCheck } from 'react-icons/fa';
import { Button, Select } from '@/app/components/ui';
import { MerchantAliasOperator } from '@/app/types/merchant-alias';

export interface TransactionReviewModalProps {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  operationLabel: string;
  amount: string;
  account: string;
  category: string;
  merchant: string;
  title: string;
  description: string;
  confirmLabel: string;
  children?: ReactNode;
}

export function TransactionReviewModal({
  isOpen,
  isLoading,
  onClose,
  onConfirm,
  operationLabel,
  amount,
  account,
  category,
  merchant,
  title,
  description,
  confirmLabel,
  children,
}: TransactionReviewModalProps) {
  if (!isOpen) return null;

  return (
    <ModalShell
      title={title}
      description={description}
      closeLabel="Fechar revisão"
      onClose={onClose}
      closeDisabled={isLoading}
      maxWidthClass="max-w-[520px]"
      sectionClassName="[--focus:var(--orbit-focus)] [--on-primary:var(--orbit-on-primary)] [--primary-hover:var(--orbit-primary-hover)] [--primary:var(--orbit-primary)]"
      footer={
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
          Voltar
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          isLoading={isLoading}
          disabled={isLoading}
          icon={<FaCheck />}
        >
          {confirmLabel}
        </Button>
      </div>
      }
    >
      <dl className="grid gap-2">
        <ReviewRow label="Tipo" value={operationLabel} />
        <ReviewRow label="Valor" value={amount} />
        <ReviewRow label="Conta" value={account} />
        <ReviewRow label="Categoria" value={category} />
        <ReviewRow label="Estabelecimento" value={merchant} />
      </dl>
      {children}
    </ModalShell>
  );
}

export function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] bg-[var(--surface-raised)] px-3.5 py-3">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="max-w-[65%] break-words text-right font-semibold text-[var(--foreground)]">
        {value}
      </dd>
    </div>
  );
}

export function LearningOption({
  checked,
  onCheckedChange,
  label,
  pattern,
  operator,
  onOperatorChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  pattern: string;
  operator: MerchantAliasOperator;
  onOperatorChange: (operator: MerchantAliasOperator) => void;
}) {
  return (
    <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3">
      <label className="flex items-start gap-2 text-sm font-medium text-[var(--foreground)]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="mt-1"
        />
        <span>{label}</span>
      </label>
      {checked ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
          <Select
            ariaLabel={"Operador para " + label}
            value={operator}
            onChange={(value) => onOperatorChange(value as MerchantAliasOperator)}
            options={[
              { value: 'EQUALS', label: 'Igual a' },
              { value: 'STARTS_WITH', label: 'Começa com' },
              { value: 'CONTAINS', label: 'Contém' },
            ]}
          />
          <div className="min-w-0 rounded-[var(--radius-sm)] bg-[var(--surface-raised)] px-2.5 py-2 text-xs text-[var(--text-muted)]">
            <span className="block text-xs font-semibold uppercase tracking-wide">Padrão</span>
            <span className="mt-0.5 block break-all font-mono text-[var(--foreground)]">{pattern}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
