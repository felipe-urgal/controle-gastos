import type { TransactionTemplateDTO, TransactionTemplateInput } from '@/app/types/transaction-template';

export type TemplateTagTone = 'filled' | 'todo' | 'warn';
export type TemplateTag = { label: string; tone: TemplateTagTone };

type Reference = { name: string; isActive: boolean } | null;

function referenceTag(reference: Reference, missing: string, inactive: string): TemplateTag {
  if (!reference) return { label: missing, tone: 'todo' };
  if (!reference.isActive) return { label: inactive, tone: 'warn' };
  return { label: reference.name, tone: 'filled' };
}

/** Conta e categoria do modelo: o que preenche, o que fica para a hora de usar e o que está inativo. */
export function templateTags(item: Pick<TransactionTemplateDTO, 'account' | 'category'>): TemplateTag[] {
  return [
    referenceTag(item.account, 'Conta ao usar', 'Conta inativa · escolha outra'),
    referenceTag(item.category, 'Categoria ao usar', 'Categoria inativa · escolha outra'),
  ];
}

export function groupTemplates(items: TransactionTemplateDTO[]) {
  return {
    favorites: items.filter((item) => item.isFavorite),
    others: items.filter((item) => !item.isFavorite),
  };
}

/** O que o modelo ainda deixa para o usuário escolher ao usar, em ordem de preenchimento. */
export function missingFields(input: Pick<TransactionTemplateInput, 'amount' | 'accountId' | 'categoryId'>) {
  const missing: string[] = [];
  if (!input.amount) missing.push('valor');
  if (!input.accountId) missing.push('conta');
  if (!input.categoryId) missing.push('categoria');
  return missing;
}

export function formPreview({
  form,
  accountName,
  money,
}: {
  form: TransactionTemplateInput;
  accountName: string | null;
  money: (cents: number) => string;
}) {
  const parts = [form.type === 'INCOME' ? 'Receita' : 'Despesa', form.name.trim() || 'Sem nome'];
  if (form.amount) parts.push(money(form.amount));
  if (accountName) parts.push(accountName);

  const missing = missingFields(form);
  return {
    summary: parts.join(' · '),
    missing: missing.length === 0 ? null : `Falta escolher: ${missing.join(', ')}`,
  };
}
