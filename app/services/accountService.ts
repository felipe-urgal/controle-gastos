import { createBaseService } from "@/app/services/base-service";
import { AccountModel } from "@/app/types/account";

export const accountService =
  createBaseService<AccountModel>("accounts");