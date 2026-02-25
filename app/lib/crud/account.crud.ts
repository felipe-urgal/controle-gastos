import { prisma } from "@/app/lib/prisma";
import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { createAccountSchema, updateAccountSchema } from "@/app/schemas/account.schema";
import { toAccountDTO } from "@/app/lib/mappers/account.mapper";

export const accountCrud = baseCrudHandler({
  model: prisma.account,
  entityName: "Conta",
  createSchema: createAccountSchema,
  updateSchema: updateAccountSchema,
  orderBy: { createdAt: "desc" },
  include: {
    _count: {
      select: {
        transactions: true,
        investments: true,
      },
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
