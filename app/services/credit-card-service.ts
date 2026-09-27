import { apiClient } from "@/app/services/api-client";
import type { ApiResponse } from "@/app/services/base-service";
import type {
  CreditCardStatementsData,
  PayCreditCardStatementInput,
} from "@/app/types/credit-card";

export const creditCardService = {
  async getStatements(
    cardId: string,
    query?: { asOf?: string; history?: number },
  ): Promise<ApiResponse<CreditCardStatementsData>> {
    const params = new URLSearchParams();
    if (query?.asOf) params.set("asOf", query.asOf);
    if (query?.history !== undefined) params.set("history", String(query.history));
    const suffix = params.size ? `?${params.toString()}` : "";

    return apiClient<ApiResponse<CreditCardStatementsData>>(
      `/api/cards/${cardId}/statements${suffix}`,
      { method: "GET" },
    );
  },

  async payStatement(
    cardId: string,
    input: PayCreditCardStatementInput,
    idempotencyKey: string,
  ): Promise<ApiResponse<{
    id: string;
    amount: number;
    sourceAccountId: string;
    sourceTransactionId: string;
    statementClosingDate: { year: number; month: number; day: number };
    paymentDate: { year: number; month: number; day: number };
  }>> {
    return apiClient(
      `/api/cards/${cardId}/payments`,
      {
        method: "POST",
        body: input,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
      },
    );
  },
};
