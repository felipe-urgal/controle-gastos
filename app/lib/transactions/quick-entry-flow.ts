import { compareLogicalDates, type LogicalDate } from "@/app/lib/date/logical-date";
import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_DESCRIPTION_MIN_LENGTH,
  TRANSACTION_MAX_AMOUNT_CENTS,
} from "@/app/lib/transactions/transaction-field-contract";
import type { QuickEntryType } from "@/app/lib/transactions/quick-entry";

/** Regras puras do que acontece entre "entendi a frase" e "gravar": escolha de conta, status e payload. */

export type QuickAccountOption = { id: string; name: string; isActive: boolean };
export type QuickCategoryOption = { id: string; name: string; type: string; isActive: boolean };

function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Conta citada na frase ("na conta Itaú"): casa pelo nome sem diferenciar acento ou caixa, entre as
 * contas ativas. Só devolve quando há uma única candidata (ou uma de nome exato); na dúvida
 * devolve `null` e a prévia pede a escolha, nunca assume.
 */
export function matchAccountByHint(hint: string | null, accounts: readonly QuickAccountOption[]) {
  const needle = hint ? fold(hint) : "";
  if (needle.length < 2) return null;

  const active = accounts.filter((account) => account.isActive);
  const exact = active.filter((account) => fold(account.name) === needle);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;

  const partial = active.filter((account) => {
    const name = fold(account.name);
    return name.length >= 2 && (name.includes(needle) || needle.includes(name));
  });
  return partial.length === 1 ? partial[0] : null;
}

/**
 * Conta que a prévia já traz marcada: a da frase, depois a sugerida pelo histórico, depois a única
 * conta ativa. Com mais de uma opção e nenhuma pista, fica vazia para o usuário escolher.
 */
export function pickInitialAccount(args: {
  hint: string | null;
  accounts: readonly QuickAccountOption[];
  suggestedAccountId: string | null;
}) {
  const fromHint = matchAccountByHint(args.hint, args.accounts);
  if (fromHint) return fromHint.id;

  const active = args.accounts.filter((account) => account.isActive);
  const suggested = active.find((account) => account.id === args.suggestedAccountId);
  if (suggested) return suggested.id;

  return active.length === 1 ? active[0].id : null;
}

/** Categorias ativas do tipo escolhido, em ordem alfabética. */
export function categoriesForType(categories: readonly QuickCategoryOption[], type: QuickEntryType) {
  return categories
    .filter((category) => category.isActive && category.type === type)
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

/** Data futura vira pendente (ainda não aconteceu); hoje ou passado, concluída. */
export function quickEntryStatus(date: LogicalDate, today: LogicalDate) {
  return compareLogicalDates(date, today) > 0 ? ("PENDING" as const) : ("COMPLETED" as const);
}

export type QuickEntryPayload = {
  amount: number;
  year: number;
  month: number;
  day: number;
  description: string;
  status: "COMPLETED" | "PENDING";
  accountId: string;
  categoryId: string;
  merchantId: string | null;
  allocations: [];
  tagIds: [];
  type: QuickEntryType;
};

/**
 * Monta o corpo do lançamento, ou diz o que falta. Confere o que o servidor também confere para
 * a prévia explicar antes do envio; o tipo vem da categoria escolhida, como no formulário.
 */
export function buildQuickEntryPayload(args: {
  amountCents: number;
  date: LogicalDate;
  today: LogicalDate;
  description: string;
  accountId: string | null;
  category: QuickCategoryOption | null;
  merchantId: string | null;
}): { ok: true; payload: QuickEntryPayload } | { ok: false; message: string } {
  const description = args.description.trim();

  if (!Number.isSafeInteger(args.amountCents) || args.amountCents <= 0 || args.amountCents > TRANSACTION_MAX_AMOUNT_CENTS) {
    return { ok: false, message: "Valor inválido" };
  }
  if (description.length < TRANSACTION_DESCRIPTION_MIN_LENGTH) {
    return { ok: false, message: "Informe uma descrição" };
  }
  if (description.length > TRANSACTION_DESCRIPTION_MAX_LENGTH) {
    return { ok: false, message: `A descrição pode ter até ${TRANSACTION_DESCRIPTION_MAX_LENGTH} caracteres` };
  }
  if (!args.accountId) return { ok: false, message: "Escolha a conta" };
  if (!args.category) return { ok: false, message: "Escolha a categoria" };
  if (args.category.type !== "EXPENSE" && args.category.type !== "INCOME") {
    return { ok: false, message: "Categoria inválida" };
  }

  return {
    ok: true,
    payload: {
      amount: args.amountCents,
      year: args.date.year,
      month: args.date.month,
      day: args.date.day,
      description,
      status: quickEntryStatus(args.date, args.today),
      accountId: args.accountId,
      categoryId: args.category.id,
      merchantId: args.merchantId,
      allocations: [],
      tagIds: [],
      type: args.category.type,
    },
  };
}
