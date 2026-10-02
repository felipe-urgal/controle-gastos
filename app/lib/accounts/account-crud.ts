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
  beforeUpdate: async (data, entity, userId) => {
    validateAccountUpdateState(data, entity);

    const structuralCardChange =
      data.type !== undefined && data.type !== entity.type ||
      data.currency !== undefined && data.currency !== entity.currency ||
      data.statementClosingDay !== undefined &&
        data.statementClosingDay !== entity.statementClosingDay ||
      data.statementDueDay !== undefined &&
        data.statementDueDay !== entity.statementDueDay;

    const structuralInvestmentChange =
      (data.type !== undefined && data.type !== entity.type) ||
      (data.currency !== undefined && data.currency !== entity.currency);

    if (
      structuralInvestmentChange &&
      (entity.type === "INVESTMENT" || data.type === "INVESTMENT")
    ) {
      const operationCount = await prisma.investmentOperation.count({
        where: { userId, accountId: entity.id },
      });

      if (operationCount > 0) {
        throw new HttpError(
          "Tipo e moeda da conta de investimento não podem ser alterados após operações",
          409,
          "INVESTMENT_ACCOUNT_STRUCTURE_LOCKED",
        );
      }
    }

    if (
      structuralCardChange &&
      (entity.type === "CREDIT_CARD" || data.type === "CREDIT_CARD")
    ) {
      const [transactionCount, paymentCount] = await Promise.all([
        prisma.transaction.count({
          where: { userId, accountId: entity.id },
        }),
        prisma.creditCardPayment.count({
          where: {
            userId,
            OR: [
              { cardAccountId: entity.id },
              { sourceAccountId: entity.id },
            ],
          },
        }),
      ]);

      if (transactionCount > 0 || paymentCount > 0) {
        throw new HttpError(
          "Tipo, moeda e ciclo do cartão não podem ser alterados após movimentações",
          409,
          "CREDIT_CARD_STRUCTURE_LOCKED",
        );
      }
    }

    return data;
  },
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
