type AccountForTransaction = {
  type: "CREDIT_DEBIT" | "INVESTMENT" | "CREDIT_CARD";
};

type CategoryForTransaction = {
  type: "INCOME" | "EXPENSE";
};

/**
 * Mantém o ponto único de compatibilidade conta/categoria.
 *
 * Em cartão de crédito:
 * - EXPENSE representa compra/débito da fatura;
 * - INCOME representa crédito/estorno e reduz a fatura, sem virar receita
 *   operacional nos agregados financeiros.
 *
 * Os dois tipos, portanto, são válidos no domínio atual.
 */
export function assertAccountCategoryCompatibility(
  account: AccountForTransaction,
  category: CategoryForTransaction,
) {
  void account;
  void category;
}
