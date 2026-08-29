import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { createAccountSchema, updateAccountSchema } from "@/app/schemas/account.schema";
import { toAccountDTO } from "@/app/lib/mappers/account.mapper";
import {
  withDerivedAccountBalance,
  withDerivedAccountBalances,
} from "@/app/lib/accounts/account-balance";

export const accountCrud = baseCrudHandler({
  model: (db) => db.account,
  entityName: "Conta",
  createSchema: createAccountSchema,
  updateSchema: updateAccountSchema,
  filterableFields: ["isActive", "type", "currency"],
  searchableFields: ["name", "description"],
  orderBy: { createdAt: "desc" },
  include: {
    _count: {
      select: {
        transactions: true,
      },
    },
    transactions: {
      orderBy: { createdAt: "desc" },
      take: 5,
    },
  },
  checkBeforeDelete: (account) => {
    if (account._count.transactions > 0)
      return "Conta possui transações vinculadas";

    return null;
  },
  afterRead: (account, userId) => withDerivedAccountBalance(account, userId),
  afterList: ({ items, userId }) => withDerivedAccountBalances(items, userId),
  mapper: toAccountDTO,
});
