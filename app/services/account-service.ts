import { apiClient, dedupeInFlightRead } from "@/app/services/api-client";
import { createBaseService, type ApiResponse } from "@/app/services/base-service";
import { downloadServerFile } from "@/app/services/download-file";
import { AccountModel } from "@/app/types/account";

const baseAccountService = createBaseService<AccountModel>("accounts");

/** Resposta da prévia de conciliação; a conferência de saldo usa só o saldo realizado até a data. */
export type AccountBalancePreview = {
  cutoff: { year: number; month: number; day: number };
  statementBalance: number;
  /** Soma dos lançamentos concluídos da conta até a data de corte (centavos). */
  realizedBalance: number;
};

export const accountService = {
  ...baseAccountService,
  /** Baixa o extrato da conta (concluídos do período, com saldo corrente) em CSV. Datas no formato AAAA-MM-DD. */
  downloadStatement(id: string, from: string, to: string) {
    const query = new URLSearchParams({ from, to });
    return downloadServerFile(
      `/api/accounts/${id}/statement?${query}`,
      `extrato-${from}-a-${to}.csv`,
      "Não foi possível exportar o extrato.",
    );
  },
  // Várias partes da tela pedem as contas juntas; pedidos simultâneos idênticos viram um só.
  getAll: (query?: Parameters<typeof baseAccountService.getAll>[0]) =>
    dedupeInFlightRead(`accounts:${JSON.stringify(query ?? {})}`, () => baseAccountService.getAll(query)),

  /** Saldo do app até a data, para comparar com o saldo do extrato (só leitura). */
  balancePreview(
    accountId: string,
    cutoff: { year: number; month: number; day: number },
    statementBalance: number,
  ) {
    return apiClient<ApiResponse<AccountBalancePreview>>(`/api/accounts/${accountId}/reconciliation`, {
      queryParams: { ...cutoff, statementBalance },
    });
  },
};
