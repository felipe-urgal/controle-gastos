import { buildCreditCardCommitments, type CreditCardCommitment } from "@/app/lib/cards/credit-card-commitments";
import { compareLogicalDates, type LogicalDate } from "@/app/lib/date/logical-date";
import { prisma } from "@/app/lib/prisma";

export type CreditCardStatusInput = {
  id: string;
  name: string;
  statementClosingDay: number | null;
  statementDueDay: number | null;
};

export type CreditCardStatus = {
  /** Compras ainda não quitadas por pagamento de fatura (centavos, nunca negativo). */
  usedLimit: number;
  /** Próxima fatura com vencimento de hoje em diante; null sem ciclo configurado ou sem fatura aberta. */
  nextStatement: CreditCardCommitment | null;
  /** Faturas vencidas e ainda não pagas, da mais antiga para a mais recente. */
  overdueStatements: CreditCardCommitment[];
};

function shiftPeriod(date: LogicalDate, offset: number) {
  const absoluteMonth = date.year * 12 + (date.month - 1) + offset;
  return { year: Math.floor(absoluteMonth / 12), month: (((absoluteMonth % 12) + 12) % 12) + 1 };
}

/**
 * Limite usado e próxima fatura de cada cartão. Fonte única do Dashboard e da lista de Contas.
 * Compras de cartão não alteram saldo de conta; só viram saída quando a fatura é paga.
 */
export async function getCreditCardStatuses(args: {
  userId: string;
  cards: CreditCardStatusInput[];
  asOf: LogicalDate;
}): Promise<Map<string, CreditCardStatus>> {
  const { userId, cards, asOf } = args;
  const result = new Map<string, CreditCardStatus>();
  if (cards.length === 0) return result;

  const cardIds = cards.map((card) => card.id);
  const statementPeriods = Array.from({ length: 5 }, (_, index) => shiftPeriod(asOf, index - 1));

  const [cardFlowRows, cardPaymentRows, cardTransactions, cardPayments] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId, accountId: { in: cardIds }, kind: "NORMAL", status: { not: "CANCELLED" } },
      _sum: { amount: true },
    }),
    prisma.creditCardPayment.groupBy({
      by: ["cardAccountId"],
      where: { userId, cardAccountId: { in: cardIds } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        accountId: { in: cardIds },
        kind: "NORMAL",
        status: { not: "CANCELLED" },
        OR: statementPeriods,
      },
      select: {
        id: true,
        accountId: true,
        amount: true,
        year: true,
        month: true,
        day: true,
        type: true,
        status: true,
        description: true,
        seriesId: true,
        seriesIndex: true,
      },
      orderBy: [{ year: "asc" }, { month: "asc" }, { day: "asc" }, { id: "asc" }],
    }),
    prisma.creditCardPayment.findMany({
      where: {
        userId,
        cardAccountId: { in: cardIds },
        OR: statementPeriods.map(({ year, month }) => ({ closingYear: year, closingMonth: month })),
      },
      select: { cardAccountId: true, closingYear: true, closingMonth: true, closingDay: true },
    }),
  ]);

  const netTotals = new Map<string, number>();
  for (const row of cardFlowRows) {
    const amount = row._sum.amount ?? 0;
    netTotals.set(row.accountId, (netTotals.get(row.accountId) ?? 0) + (row.type === "INCOME" ? -amount : amount));
  }
  const paymentTotals = new Map<string, number>(
    cardPaymentRows.map((row) => [row.cardAccountId, row._sum.amount ?? 0] as const),
  );
  const transactionsByCard = new Map<string, typeof cardTransactions>();
  for (const transaction of cardTransactions) {
    const list = transactionsByCard.get(transaction.accountId) ?? [];
    list.push(transaction);
    transactionsByCard.set(transaction.accountId, list);
  }

  const commitments = buildCreditCardCommitments({
    asOf,
    historyLimit: 2,
    cards: cards.flatMap((card) =>
      card.statementClosingDay !== null && card.statementDueDay !== null
        ? [{
            id: card.id,
            name: card.name,
            statementClosingDay: card.statementClosingDay,
            statementDueDay: card.statementDueDay,
          }]
        : [],
    ),
    transactionsByCard,
    payments: cardPayments,
  });

  const nextByCard = new Map<string, CreditCardCommitment>();
  const overdueByCard = new Map<string, CreditCardCommitment[]>();
  for (const commitment of commitments) {
    if (compareLogicalDates(commitment.dueDate, asOf) < 0) {
      overdueByCard.set(commitment.cardId, [...(overdueByCard.get(commitment.cardId) ?? []), commitment]);
      continue;
    }
    if (!nextByCard.has(commitment.cardId)) nextByCard.set(commitment.cardId, commitment);
  }

  for (const card of cards) {
    result.set(card.id, {
      usedLimit: Math.max(0, (netTotals.get(card.id) ?? 0) - (paymentTotals.get(card.id) ?? 0)),
      nextStatement: nextByCard.get(card.id) ?? null,
      overdueStatements: overdueByCard.get(card.id) ?? [],
    });
  }

  return result;
}
