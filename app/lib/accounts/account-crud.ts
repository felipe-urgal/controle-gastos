import { Prisma } from "@prisma/client";

import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import {
  createAccountSchema,
  updateAccountSchema,
  validateAccountUpdateState,
} from "@/app/lib/accounts/account-schema";
import { toAccountDTO } from "@/app/lib/accounts/account-dto";
import {
  withDerivedAccountBalance,
  withDerivedAccountBalances,
} from "@/app/lib/accounts/account-balance";
import {
  getAccountFinancialUsage,
  assertAccountStructuralChangeAllowed,
  assertAccountDeletable,
  lockOwnedAccountForMutation,
} from "@/app/lib/accounts/account-structure";
import { HttpError } from "@/app/lib/http-error";
import { getInvestmentAccountValuesForUser } from "@/app/lib/investments/investment-account-valuation";
import { prisma } from "@/app/lib/prisma";

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
  limit: true,
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  beforeUpdate: async (data, entity) => {
    validateAccountUpdateState(data, entity);
    return data;
  },
  customUpdate: async ({ data, entity, userId, include }) =>
    prisma.$transaction(async (tx) => {
      await lockOwnedAccountForMutation(tx, userId, entity.id);
      const current = await tx.account.findFirst({
        where: { id: entity.id, userId },
      });
      if (!current) throw new HttpError("Conta não encontrada", 404);

      validateAccountUpdateState(data, current);
      const usage = await getAccountFinancialUsage(tx, userId, current.id);
      assertAccountStructuralChangeAllowed(data, current, usage);

      return tx.account.update({
        where: { id: current.id },
        data,
        include,
      });
    }),
  include: {
    _count: {
      select: {
        transactions: true,
        investmentOperations: true,
      },
    },
    transactions: {
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
    if (account._count.investmentOperations > 0)
      return "Conta possui operações de investimento vinculadas";

    return null;
  },
  customDelete: async (account, userId) => {
    try {
      await prisma.$transaction(async (tx) => {
        await lockOwnedAccountForMutation(tx, userId, account.id);
        const usage = await getAccountFinancialUsage(tx, userId, account.id);
        assertAccountDeletable(usage);
        await tx.account.delete({ where: { id: account.id } });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new HttpError(
          "Conta possui dados financeiros vinculados",
          409,
          "ACCOUNT_HAS_LINKED_DATA",
        );
      }
      throw error;
    }
  },
  afterRead: async (account, userId) => {
    const enriched = await withDerivedAccountBalance(account, userId);
    if (account.type !== "INVESTMENT") {
      return {
        ...enriched,
        investmentValueCents: null,
        investmentValueSource: null,
        investmentPositionCount: 0,
      };
    }
    const values = await getInvestmentAccountValuesForUser(userId);
    const value = values.get(account.id);
    return {
      ...enriched,
      investmentValueCents: value?.valueCents ?? 0,
      investmentValueSource: value?.source ?? null,
      investmentPositionCount: value?.positionCount ?? 0,
    };
  },
  afterList: async ({ items, userId }) => {
    const enriched = await withDerivedAccountBalances(items, userId);
    const values = await getInvestmentAccountValuesForUser(userId);
    return enriched.map((account) => {
      const value = values.get(account.id);
      return {
        ...account,
        investmentValueCents:
          account.type === "INVESTMENT" ? value?.valueCents ?? 0 : null,
        investmentValueSource:
          account.type === "INVESTMENT" ? value?.source ?? null : null,
        investmentPositionCount:
          account.type === "INVESTMENT" ? value?.positionCount ?? 0 : 0,
      };
    });
  },
  mapper: toAccountDTO,
});
