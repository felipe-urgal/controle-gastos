import { HttpError } from "@/app/lib/http-error";

type AccountForTransaction = {
  type: "CREDIT_DEBIT" | "INVESTMENT" | "CREDIT_CARD";
};

type CategoryForTransaction = {
  type: "INCOME" | "EXPENSE";
};

export function assertAccountCategoryCompatibility(
  account: AccountForTransaction,
  category: CategoryForTransaction,
) {
  if (account.type === "CREDIT_CARD" && category.type !== "EXPENSE") {
    throw new HttpError(
      "Cartão de crédito aceita apenas categorias de despesa",
      400,
      "CREDIT_CARD_EXPENSE_ONLY",
    );
  }
}
