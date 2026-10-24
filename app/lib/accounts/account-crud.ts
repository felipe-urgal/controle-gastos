import { Prisma } from "@prisma/client";

import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import {
  createAccountSchema,
  updateAccountSchema,
  validateAccountUpdateState,
} from "@/app/lib/accounts/account-schema";
import { toAccountDTO } from "@/app/lib/accounts/account-dto";
import { getAccountActivity } from "@/app/lib/accounts/account-activity";
import { buildAccountAttention } from "@/app/lib/accounts/account-attention";
import type { AccountCardStatusDTO } from "@/app/lib/accounts/account-dto";
import { buildAccountPortfolioSummary } from "@/app/lib/accounts/account-summary";
import {
  withDerivedAccountBalance,
  withDerivedAccountBalances,
} from "@/app/lib/accounts/account-balance";
import {
  getAccountFinancialUsage,
  assertAccountStructuralChangeAllowed,
  assertAccountDeletable,
  isAccountDeletable,
  lockOwnedAccountForMutation,
} from "@/app/lib/accounts/account-structure";
import { getCreditCardStatuses, type CreditCardStatus } from "@/app/lib/cards/credit-card-status";
import { logicalDateFromUtcInstant } from "@/app/lib/date/logical-date";
import { HttpError } from "@/app/lib/http-error";
import { getInvestmentAccountValuesForUser } from "@/app/lib/investments/investment-account-valuation";
import { prisma } from "@/app/lib/prisma";

function accountNameConflict(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new HttpError(
      "Já existe uma conta com este nome",
      409,
      "ACCOUNT_NAME_CONFLICT",
    );
  }
  throw error;
}

const recentTransactionAccountSelect = {
  id: true,
  name: true,
  currency: true,
  type: true,
  color: true,
  icon: true,
} as const;

function toCardStatusDTO(status: CreditCardStatus, creditLimit: number | null): AccountCardStatusDTO {
  const next = status.nextStatement;
  return {
    usedLimit: status.usedLimit,
    availableLimit: creditLimit === null ? null : Math.max(0, creditLimit - status.usedLimit),
    overLimit: creditLimit === null ? 0 : Math.max(0, status.usedLimit - creditLimit),
    nextStatement: next
      ? {
          amount: next.amount,
          closingDate: next.closingDate,
          dueDate: next.dueDate,
          transactionCount: next.transactionCount,
        }
      : null,
    overdueCount: status.overdueStatements.length,
  };
}

/** Na lista cada conta traz poucas movimentações; a página da conta traz mais. */
const RECENT_TRANSACTIONS_IN_LIST = 5;
const RECENT_TRANSACTIONS_IN_DETAIL = 12;

const recentTransactionsQuery = {
  orderBy: [
    { year: "desc" },
    { month: "desc" },
    { day: "desc" },
    { createdAt: "desc" },
    { id: "desc" },
  ],
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
} satisfies Prisma.TransactionFindManyArgs;

export const accountCrud = baseCrudHandler({
  model: (db) => db.account,
  entityName: "Conta",
  createSchema: createAccountSchema,
  updateSchema: updateAccountSchema,
  filterableFields: ["isActive", "type", "currency"],
  searchableFields: ["name", "description"],
  limit: true,
  orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  beforeCreate: async (data, userId) => {
    const { openingBalance, ...accountData } = data;
    try {
      return await prisma.$transaction(async (tx) => {
        const account = await tx.account.create({
          data: { ...accountData, userId },
        });
        if (openingBalance) {
          const today = logicalDateFromUtcInstant(new Date());
          await tx.transaction.create({
            data: {
              amount: Math.abs(openingBalance),
              type: openingBalance > 0 ? "INCOME" : "EXPENSE",
              kind: "OPENING_BALANCE",
              status: "COMPLETED",
              description: "Saldo inicial",
              year: today.year,
              month: today.month,
              day: today.day,
              accountId: account.id,
              userId,
            },
          });
        }
        return account;
      });
    } catch (error) {
      return accountNameConflict(error);
    }
  },
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

      try {
        return await tx.account.update({
          where: { id: current.id },
          data,
          include,
        });
      } catch (error) {
        return accountNameConflict(error);
      }
    }),
  include: {
    _count: {
      select: {
        transactions: true,
        investmentOperations: true,
      },
    },
    transactions: { ...recentTransactionsQuery, take: RECENT_TRANSACTIONS_IN_LIST },
  },
  customDelete: async (account, userId) => {
    try {
      await prisma.$transaction(async (tx) => {
        await lockOwnedAccountForMutation(tx, userId, account.id);
        const usage = await getAccountFinancialUsage(tx, userId, account.id);
        assertAccountDeletable(usage);
        // O saldo inicial sai junto com a conta; qualquer outra movimentação já bloqueou acima.
        await tx.transaction.deleteMany({
          where: { userId, accountId: account.id, kind: "OPENING_BALANCE" },
        });
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
    // Tipo, moeda e ciclo do cartão travam com qualquer histórico financeiro; a tela de edição avisa antes de salvar.
    const usage = await getAccountFinancialUsage(prisma, userId, account.id);
    const hasFinancialHistory = Object.values(usage).some((count) => count > 0);
    const isDeletable = isAccountDeletable(usage);
    // Pendentes futuras não podem ocupar a vaga das realizadas: cada grupo tem o seu limite.
    const [completedTransactions, pendingTransactions] = await Promise.all(
      (["COMPLETED", "PENDING"] as const).map((status) =>
        prisma.transaction.findMany({
          where: { userId, accountId: account.id, status },
          ...recentTransactionsQuery,
          take: RECENT_TRANSACTIONS_IN_DETAIL,
        }),
      ),
    );
    const transactions = [...completedTransactions, ...pendingTransactions];
    const activity =
      account.type === "CREDIT_DEBIT"
        ? await getAccountActivity({
            userId,
            accountId: account.id,
            currentBalance: enriched.balance,
            asOf: logicalDateFromUtcInstant(new Date()),
          })
        : null;
    if (account.type !== "INVESTMENT") {
      return {
        ...enriched,
        transactions,
        activity,
        hasFinancialHistory,
        isDeletable,
        investmentValueCents: null,
        investmentValueSource: null,
        investmentPositionCount: 0,
      };
    }
    const values = await getInvestmentAccountValuesForUser(userId, [account.id]);
    const value = values.get(account.id);
    return {
      ...enriched,
      transactions,
      activity,
      hasFinancialHistory,
      isDeletable,
      investmentValueCents: value?.valueCents ?? 0,
      investmentValueSource: value?.source ?? null,
      investmentPositionCount: value?.positionCount ?? 0,
    };
  },
  afterList: async ({ items, userId }) => {
    const enriched = await withDerivedAccountBalances(items, userId);
    const investmentAccountIds = items
      .filter((account) => account.type === "INVESTMENT")
      .map((account) => account.id);
    const values = await getInvestmentAccountValuesForUser(
      userId,
      investmentAccountIds,
    );
    const cardStatuses = await getCreditCardStatuses({
      userId,
      cards: items.filter((account) => account.type === "CREDIT_CARD"),
      asOf: logicalDateFromUtcInstant(new Date()),
    });
    return enriched.map((account) => {
      const value = values.get(account.id);
      const cardStatus = cardStatuses.get(account.id);
      return {
        ...account,
        cardStatus: cardStatus ? toCardStatusDTO(cardStatus, account.creditLimit) : null,
        investmentValueCents:
          account.type === "INVESTMENT" ? value?.valueCents ?? 0 : null,
        investmentValueSource:
          account.type === "INVESTMENT" ? value?.source ?? null : null,
        investmentPositionCount:
          account.type === "INVESTMENT" ? value?.positionCount ?? 0 : 0,
      };
    });
  },
  summary: async ({ where, userId }) => {
    const accounts = await prisma.account.findMany({
      where,
      select: {
        id: true,
        type: true,
        currency: true,
        isActive: true,
      },
    });
    const nonCardAccounts = accounts.filter(
      (account) => account.type !== "CREDIT_CARD",
    );
    const withBalances = await withDerivedAccountBalances(nonCardAccounts, userId);
    const investmentAccountIds = accounts
      .filter((account) => account.type === "INVESTMENT")
      .map((account) => account.id);
    const values = await getInvestmentAccountValuesForUser(
      userId,
      investmentAccountIds,
    );

    const portfolio = buildAccountPortfolioSummary(
      accounts.map((account) => {
        const balance =
          withBalances.find((candidate) => candidate.id === account.id)?.balance ?? 0;
        const value = values.get(account.id);
        return {
          ...account,
          balance,
          investmentValueCents:
            account.type === "INVESTMENT" ? value?.valueCents ?? 0 : null,
        };
      }),
    );

    // Faturas e avisos olham a carteira inteira: filtro ou busca não escondem um vencimento.
    const asOf = logicalDateFromUtcInstant(new Date());
    const active = await prisma.account.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        currency: true,
        isActive: true,
        creditLimit: true,
        statementClosingDay: true,
        statementDueDay: true,
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    const activeCards = active.filter((account) => account.type === "CREDIT_CARD");
    const cardStatuses = await getCreditCardStatuses({ userId, cards: activeCards, asOf });
    const activeBalances = await withDerivedAccountBalances(
      active.filter((account) => account.type === "CREDIT_DEBIT"),
      userId,
    );
    const balanceById = new Map(activeBalances.map((account) => [account.id, account.balance] as const));

    const openStatements = new Map<string, number>();
    for (const card of activeCards) {
      const amount = cardStatuses.get(card.id)?.nextStatement?.amount ?? 0;
      if (amount > 0) openStatements.set(card.currency, (openStatements.get(card.currency) ?? 0) + amount);
    }

    return {
      ...portfolio,
      openStatementsByCurrency: [...openStatements.entries()].map(([currency, value]) => ({ currency, value })),
      attention: buildAccountAttention({
        asOf,
        cardStatuses,
        accounts: active.map((account) => ({
          id: account.id,
          name: account.name,
          type: account.type,
          currency: account.currency,
          isActive: account.isActive,
          balance: balanceById.get(account.id) ?? 0,
          creditLimit: account.creditLimit,
        })),
      }),
    };
  },
  mapper: toAccountDTO,
});
