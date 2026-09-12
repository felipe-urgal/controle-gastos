import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { createAccountSchema, updateAccountSchema } from "@/app/lib/accounts/account-schema";
import { toAccountDTO } from "@/app/lib/accounts/account-dto";
import {
  withDerivedAccountBalance,
  withDerivedAccountBalances,
} from "@/app/lib/accounts/account-balance";

const recentTransactionAccountSelect = {
  id: true,
  name: true,
  currency: true,
  type: true,
  color: true,
  icon: true,
} as const;

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
      include: {
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true,
            icon: true,
          },
        },
        transfer: {
          select: {
            transactions: {
              select: {
                id: true,
                userId: true,
                transferRole: true,
                account: {
                  select: recentTransactionAccountSelect,
                },
              },
            },
          },
        },
      },
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
