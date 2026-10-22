import type { AccountModel, AccountType } from '@/app/types/account';

export type CardCycle = {
  closingDay: number;
  dueDay: number;
  /** O vencimento cai no mês seguinte ao do fechamento (vencimento antes ou no dia do fechamento). */
  dueNextMonth: boolean;
};

function clampDay(value: string | number) {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1) return null;
  return Math.min(day, 31);
}

/** Lê os dias digitados; null enquanto algum deles não for um dia de 1 a 31. */
export function readCardCycle(closing: string | number, due: string | number): CardCycle | null {
  const closingDay = clampDay(closing);
  const dueDay = clampDay(due);
  if (closingDay === null || dueDay === null) return null;
  return { closingDay, dueDay, dueNextMonth: dueDay <= closingDay };
}

/** Frase do ciclo do cartão para o formulário. Sem dias válidos, pede para preencher. */
export function describeCardCycle(closing: string | number, due: string | number) {
  const cycle = readCardCycle(closing, due);
  if (!cycle) return 'Informe o dia em que a fatura fecha e o dia em que você paga.';

  const dueText = cycle.dueNextMonth ? `no dia ${cycle.dueDay} do mês seguinte` : `no dia ${cycle.dueDay}`;
  return `Compras feitas até o dia ${cycle.closingDay} entram na fatura que vence ${dueText}. Depois do dia ${cycle.closingDay}, entram na fatura seguinte.`;
}

const nameSuggestions: Record<AccountType, string[]> = {
  CREDIT_DEBIT: ['Conta principal', 'Salário', 'Carteira'],
  CREDIT_CARD: ['Cartão principal', 'Cartão do trabalho'],
  INVESTMENT: ['Reserva de emergência', 'Corretora'],
};

export function accountNameSuggestions(type: AccountType) {
  return nameSuggestions[type];
}

/**
 * Tipo, moeda e ciclo do cartão não mudam depois que a conta tem movimentações (a API recusa).
 * Antes de saber (leitura sem a informação), nada é travado: a API continua sendo a palavra final.
 */
export function accountStructureLock(isEditing: boolean, account?: Pick<AccountModel, 'hasFinancialHistory'>) {
  const locked = isEditing && account?.hasFinancialHistory === true;
  return { typeAndCurrency: locked, cardCycle: locked };
}

export const accountTypeCards: Array<{ value: AccountType; label: string; short: string; description: string }> = [
  { value: 'CREDIT_DEBIT', label: 'Conta corrente', short: 'Conta', description: 'Salário, contas do dia a dia e Pix.' },
  { value: 'CREDIT_CARD', label: 'Cartão de crédito', short: 'Cartão', description: 'Compras no crédito, com limite e fatura.' },
  { value: 'INVESTMENT', label: 'Investimento', short: 'Investimento', description: 'Corretora, reserva ou algo que rende.' },
];
