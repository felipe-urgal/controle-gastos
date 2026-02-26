import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { createAccountSchema, updateAccountSchema } from "@/app/schemas/account.schema";
import { toAccountDTO } from "@/app/lib/mappers/account.mapper";

export const accountCrud = baseCrudHandler({
  model: (db) => db.account,
  entityName: "Conta",
  createSchema: createAccountSchema,
  updateSchema: updateAccountSchema,
  searchableFields: ["name", "description"],
  orderBy: { createdAt: "desc" },
  include: {
    _count: {
      select: {
        transactions: true,
        investments: true,
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

    if (account._count.investments > 0)
      return "Conta possui investimentos vinculados";

    return null;
  },
  mapper: toAccountDTO,
});
