import type { CreditCardStatus } from "@/app/lib/cards/credit-card-status";
import type { LogicalDate } from "@/app/lib/date/logical-date";
import type { AccountType } from "@/app/types/account";

export type AccountAttentionKind =
  | "CARD_OVERDUE"
  | "CARD_DUE_SOON"
  | "NEGATIVE_BALANCE"
  | "CARD_NEAR_LIMIT";

export type AccountAttentionItem = {
  kind: AccountAttentionKind;
  accountId: string;
  name: string;
  currency: string;
  /** Fatura, saldo negativo ou limite usado, em centavos. */
  amount: number;
  dueDate: LogicalDate | null;
  /** Dias até o vencimento; negativo quando vencida. */
  daysUntilDue: number | null;
  /** Percentual do limite usado (só em CARD_NEAR_LIMIT). */
  limitUsedPercent: number | null;
};

export type AccountAttentionInput = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  isActive: boolean;
  /** Saldo de conta (centavos). Ignorado para cartões e investimentos. */
  balance: number;
  creditLimit: number | null;
};

/** Faturas que vencem nesta janela (dias) entram na lista. */
export const ACCOUNT_DUE_WINDOW_DAYS = 7;
/** Vencimento a este ponto ou menos conta como urgente. */
export const ACCOUNT_URGENT_DUE_DAYS = 3;
/** Fração do limite usada a partir da qual o cartão pede atenção. */
export const ACCOUNT_NEAR_LIMIT_RATIO = 0.9;
export const MAX_ACCOUNT_ATTENTION_ITEMS = 5;

function dayDistance(from: LogicalDate, to: LogicalDate) {
  return Math.round(
    (Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / 86_400_000,
  );
}

const rank: Record<AccountAttentionKind, number> = {
  CARD_OVERDUE: 0,
  NEGATIVE_BALANCE: 2,
  CARD_NEAR_LIMIT: 3,
  CARD_DUE_SOON: 1,
};

/** Itens que pedem ação, considerando só contas ativas. Mais graves primeiro. */
export function buildAccountAttention(args: {
  accounts: AccountAttentionInput[];
  cardStatuses: ReadonlyMap<string, CreditCardStatus>;
  asOf: LogicalDate;
}): AccountAttentionItem[] {
  const items: AccountAttentionItem[] = [];

  for (const account of args.accounts) {
    if (!account.isActive) continue;

    if (account.type === "CREDIT_CARD") {
      const status = args.cardStatuses.get(account.id);
      if (!status) continue;

      for (const statement of status.overdueStatements) {
        if (statement.amount <= 0) continue;
        items.push({
          kind: "CARD_OVERDUE",
          accountId: account.id,
          name: account.name,
          currency: account.currency,
          amount: statement.amount,
          dueDate: statement.dueDate,
          daysUntilDue: dayDistance(args.asOf, statement.dueDate),
          limitUsedPercent: null,
        });
      }

      const next = status.nextStatement;
      if (next && next.amount > 0) {
        const days = dayDistance(args.asOf, next.dueDate);
        if (days <= ACCOUNT_DUE_WINDOW_DAYS) {
          items.push({
            kind: "CARD_DUE_SOON",
            accountId: account.id,
            name: account.name,
            currency: account.currency,
            amount: next.amount,
            dueDate: next.dueDate,
            daysUntilDue: days,
            limitUsedPercent: null,
          });
        }
      }

      if (account.creditLimit !== null && account.creditLimit > 0 && status.usedLimit >= account.creditLimit * ACCOUNT_NEAR_LIMIT_RATIO) {
        items.push({
          kind: "CARD_NEAR_LIMIT",
          accountId: account.id,
          name: account.name,
          currency: account.currency,
          amount: status.usedLimit,
          dueDate: null,
          daysUntilDue: null,
          limitUsedPercent: Math.round((status.usedLimit / account.creditLimit) * 100),
        });
      }
      continue;
    }

    if (account.type === "CREDIT_DEBIT" && account.balance < 0) {
      items.push({
        kind: "NEGATIVE_BALANCE",
        accountId: account.id,
        name: account.name,
        currency: account.currency,
        amount: account.balance,
        dueDate: null,
        daysUntilDue: null,
        limitUsedPercent: null,
      });
    }
  }

  // Urgência: vencida, vence em até 3 dias, saldo negativo, cartão no limite, vence em até 7 dias.
  const weight = (item: AccountAttentionItem) =>
    item.kind === "CARD_DUE_SOON" && (item.daysUntilDue ?? 0) > ACCOUNT_URGENT_DUE_DAYS ? 4 : rank[item.kind];

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => weight(a.item) - weight(b.item) || (a.item.daysUntilDue ?? 0) - (b.item.daysUntilDue ?? 0) || a.index - b.index)
    .map(({ item }) => item)
    .slice(0, MAX_ACCOUNT_ATTENTION_ITEMS);
}
