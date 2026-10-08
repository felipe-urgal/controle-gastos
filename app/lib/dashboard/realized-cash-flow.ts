/**
 * Fluxo realizado canônico, em centavos, compartilhado pelo Dashboard e pelo
 * snapshot periódico. Pagamentos de cartão/transferências são excluídos na query.
 */
export function realizedCashFlow(transaction: {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  accountType: 'CREDIT_DEBIT' | 'CREDIT_CARD' | 'INVESTMENT';
}) {
  if (transaction.accountType === 'CREDIT_CARD' && transaction.type === 'INCOME') {
    return { income: 0, expense: -transaction.amount };
  }

  return transaction.type === 'INCOME'
    ? { income: transaction.amount, expense: 0 }
    : { income: 0, expense: transaction.amount };
}
