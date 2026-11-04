import { dedupeInFlightRead } from "@/app/services/api-client";
import { createBaseService } from "@/app/services/base-service";
import { AccountModel } from "@/app/types/account";

const baseAccountService = createBaseService<AccountModel>("accounts");

export const accountService = {
  ...baseAccountService,
  // Várias partes da tela pedem as contas juntas; pedidos simultâneos idênticos viram um só.
  getAll: (query?: Parameters<typeof baseAccountService.getAll>[0]) =>
    dedupeInFlightRead(`accounts:${JSON.stringify(query ?? {})}`, () => baseAccountService.getAll(query)),
};
