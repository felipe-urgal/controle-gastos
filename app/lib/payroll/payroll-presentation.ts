import { formatCurrency } from '@/app/lib/currency/format-currency';
import type {
  ImportedDocumentStatus,
  PayrollAnnualStatus,
  PayrollPaymentType,
  PayrollReconciliationStatus,
} from '@/app/types/payroll';

export function payrollMoney(
  value: number | null,
  showValues: boolean,
  currency = 'BRL',
) {
  if (value === null) return 'Não informado';
  return showValues ? formatCurrency(value, currency) : '••••';
}

export function payrollSummaryMoney(
  value: number | null,
  complete: boolean,
  showValues: boolean,
) {
  return complete ? payrollMoney(value, showValues) : 'Incompleto';
}

export function payrollPaymentTypeLabel(type: PayrollPaymentType) {
  if (type === 'ADVANCE') return 'Adiantamento';
  if (type === 'REGULAR') return 'Folha regular';
  if (type === 'THIRTEENTH') return '13º salário';
  if (type === 'VACATION') return 'Férias';
  if (type === 'PLR') return 'PLR';
  return 'Outro';
}

export function importedDocumentStatusLabel(status: ImportedDocumentStatus) {
  if (status === 'ACTIVE') return 'Vigente';
  if (status === 'SUPERSEDED') return 'Substituído';
  return 'Arquivado';
}

export function payrollReconciliationStatusLabel(status: PayrollReconciliationStatus) {
  if (status === 'MATCHED') return 'Vinculado';
  if (status === 'SUGGESTED') return '1 candidato';
  if (status === 'UNMATCHED') return 'Sem crédito';
  return 'Revisar';
}

export function payrollAnnualStatusLabel(status: PayrollAnnualStatus) {
  if (status === 'MATCHED') return 'Conciliado';
  if (status === 'MISMATCH') return 'Divergente';
  if (status === 'INCOMPLETE') return 'Incompleto';
  return 'Não suportado';
}
