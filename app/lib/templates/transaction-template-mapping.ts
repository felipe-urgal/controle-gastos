import type { TransactionTemplateInput } from "@/app/types/transaction-template";
import type { TransactionDTO } from "@/app/types/transaction";

export type TransactionTemplateSourceAnalysis = {
  input: TransactionTemplateInput;
  notices: string[];
};

function sourceContextNotices(transaction: TransactionDTO) {
  const notices: string[] = [];
  const hasMerchant = Boolean(transaction.merchant);
  const hasTags = Boolean(transaction.tags?.length);

  if (hasMerchant && hasTags) {
    notices.push(
      "Estabelecimento e tags não serão salvos no Modelo. Eles deverão ser escolhidos novamente ao usar.",
    );
  } else if (hasMerchant) {
    notices.push(
      "O estabelecimento não será salvo no Modelo. Ele deverá ser escolhido novamente ao usar.",
    );
  } else if (hasTags) {
    notices.push(
      "As tags não serão salvas no Modelo. Elas deverão ser escolhidas novamente ao usar.",
    );
  }

  if (transaction.series) {
    notices.push(
      "Será salvo apenas este lançamento como Modelo simples. Recorrência e parcelamento não serão copiados.",
    );
  }

  return notices;
}

export function analyzeTransactionTemplateSource(
  transaction: TransactionDTO,
): TransactionTemplateSourceAnalysis {
  if (transaction.kind !== "NORMAL" || !transaction.category) {
    throw new Error("Somente transações comuns podem originar modelos");
  }

  if (transaction.allocations?.length) {
    throw new Error(
      "Transações com divisão entre categorias ainda não podem ser salvas como Modelo. A divisão não será descartada silenciosamente.",
    );
  }

  return {
    input: {
      name: transaction.description.slice(0, 80),
      type: transaction.type,
      description: transaction.description,
      amount: transaction.amount,
      isFavorite: false,
      accountId: transaction.account.id,
      categoryId: transaction.category.id,
    },
    notices: sourceContextNotices(transaction),
  };
}

export function transactionToTemplateInput(
  transaction: TransactionDTO,
): TransactionTemplateInput {
  return analyzeTransactionTemplateSource(transaction).input;
}

export type TransactionTemplateUseResult = {
  values: {
    amount: number;
    month: number;
    year: number;
    day: number;
    description: string;
    status: "COMPLETED";
    accountId: string;
    categoryId: string;
    allocations: [];
  };
  warnings: string[];
};

export function templateToTransactionInitialValues(
  template: import("@/app/types/transaction-template").TransactionTemplateDTO,
  date: { year: number; month: number; day: number },
): TransactionTemplateUseResult {
  const warnings: string[] = [];

  if (template.account && !template.account.isActive) {
    warnings.push(
      `Conta inativa: ${template.account.name}. Escolha outra conta antes de confirmar.`,
    );
  }

  if (template.category && !template.category.isActive) {
    warnings.push(
      `Categoria inativa: ${template.category.name}. Escolha outra categoria antes de confirmar.`,
    );
  }

  return {
    values: {
      amount: template.amount ?? 0,
      month: date.month,
      year: date.year,
      day: date.day,
      description: template.description,
      status: "COMPLETED",
      accountId: template.account?.isActive ? template.account.id : "",
      categoryId: template.category?.isActive ? template.category.id : "",
      allocations: [],
    },
    warnings,
  };
}
