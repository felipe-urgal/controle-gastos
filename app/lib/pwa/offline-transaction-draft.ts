import { clearOfflineTransactionQueue } from "@/app/lib/pwa/offline-transaction-queue";
import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_DESCRIPTION_MIN_LENGTH,
  TRANSACTION_MAX_AMOUNT_CENTS,
  TRANSACTION_MAX_YEAR,
  TRANSACTION_MIN_YEAR,
} from "@/app/lib/transactions/transaction-field-contract";
import type { FormData } from "@/app/lib/interface/transaction.interface";
import type { TransactionType } from "@/app/types/transaction";

export const OFFLINE_DRAFT_OWNER_KEY =
  "controle-gastos:offline-draft-owner:v1";
export const OFFLINE_TRANSACTION_DRAFT_PREFIX =
  "controle-gastos:offline-transaction-draft:v1:";

export type OfflineTransactionDraft = {
  version: 1;
  id: string;
  ownerUserId: string;
  type: TransactionType;
  amount: number;
  description: string;
  year: number;
  month: number;
  day: number;
  createdAt: string;
  updatedAt: string;
};

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function draftKey(userId: string) {
  return `${OFFLINE_TRANSACTION_DRAFT_PREFIX}${userId}`;
}

/**
 * Verifica apenas a estrutura. Rascunhos legados que violam os limites atuais
 * continuam legíveis e são sinalizados por `getOfflineDraftIssues`.
 */
function isStructurallyValidDraft(value: unknown): value is OfflineTransactionDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<OfflineTransactionDraft>;

  if (
    draft.version !== 1 ||
    typeof draft.id !== "string" ||
    typeof draft.ownerUserId !== "string" ||
    (draft.type !== "INCOME" && draft.type !== "EXPENSE") ||
    !Number.isInteger(draft.amount) ||
    typeof draft.description !== "string" ||
    typeof draft.year !== "number" ||
    typeof draft.month !== "number" ||
    typeof draft.day !== "number" ||
    typeof draft.createdAt !== "string" ||
    typeof draft.updatedAt !== "string"
  ) {
    return false;
  }

  const date = new Date(Date.UTC(draft.year, draft.month - 1, draft.day));
  return (
    date.getUTCFullYear() === draft.year &&
    date.getUTCMonth() + 1 === draft.month &&
    date.getUTCDate() === draft.day
  );
}

export function getOfflineDraftIssues(draft: OfflineTransactionDraft) {
  const issues: string[] = [];
  const description = draft.description.trim();

  if (draft.amount <= 0) {
    issues.push("O valor deve ser maior que zero.");
  } else if (draft.amount > TRANSACTION_MAX_AMOUNT_CENTS) {
    issues.push("O valor excede o limite permitido para transações.");
  }

  if (description.length < TRANSACTION_DESCRIPTION_MIN_LENGTH) {
    issues.push(
      `A descrição deve ter pelo menos ${TRANSACTION_DESCRIPTION_MIN_LENGTH} caracteres.`,
    );
  } else if (description.length > TRANSACTION_DESCRIPTION_MAX_LENGTH) {
    issues.push(
      `A descrição não pode exceder ${TRANSACTION_DESCRIPTION_MAX_LENGTH} caracteres.`,
    );
  }

  if (draft.year < TRANSACTION_MIN_YEAR || draft.year > TRANSACTION_MAX_YEAR) {
    issues.push(
      `O ano deve estar entre ${TRANSACTION_MIN_YEAR} e ${TRANSACTION_MAX_YEAR}.`,
    );
  }

  return issues;
}

export function getOfflineDraftOwner() {
  if (!hasStorage()) return null;
  return window.localStorage.getItem(OFFLINE_DRAFT_OWNER_KEY);
}

export function setOfflineDraftOwner(userId: string) {
  if (!hasStorage()) return;

  const previousOwner = getOfflineDraftOwner();
  if (previousOwner && previousOwner !== userId) {
    window.localStorage.removeItem(draftKey(previousOwner));
    clearOfflineTransactionQueue(previousOwner);
  }

  window.localStorage.setItem(OFFLINE_DRAFT_OWNER_KEY, userId);
}

export function readOfflineTransactionDraft(userId: string) {
  if (!hasStorage()) return null;

  const raw = window.localStorage.getItem(draftKey(userId));
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isStructurallyValidDraft(parsed) || parsed.ownerUserId !== userId) {
      window.localStorage.removeItem(draftKey(userId));
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(draftKey(userId));
    return null;
  }
}

export function clearOfflineTransactionDraft(userId: string) {
  if (!hasStorage()) return;
  window.localStorage.removeItem(draftKey(userId));
}

export function clearOfflineTransactionLocalState() {
  if (!hasStorage()) return;

  const owner = getOfflineDraftOwner();
  if (owner) {
    clearOfflineTransactionDraft(owner);
    clearOfflineTransactionQueue(owner);
  }
  window.localStorage.removeItem(OFFLINE_DRAFT_OWNER_KEY);
}

export function offlineDraftToFormData(
  draft: OfflineTransactionDraft,
): FormData {
  return {
    amount: draft.amount,
    month: draft.month,
    year: draft.year,
    day: draft.day,
    description: draft.description,
    status: "COMPLETED",
    accountId: "",
    categoryId: "",
    allocations: [],
    tagIds: [],
  };
}
