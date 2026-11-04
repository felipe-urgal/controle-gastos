import type { TransactionDTO } from '@/app/types/transaction';

/** Tempo que o "Desfazer" fica disponível depois de excluir. */
export const UNDO_DELETE_WINDOW_MS = 10_000;
const STORAGE_KEY = 'controle-gastos:undo-delete';

export type RestoreTransactionPayload = {
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  year: number;
  month: number;
  day: number;
  accountId: string;
  categoryId: string;
  merchantId?: string;
  tagIds?: string[];
  allocations?: Array<{ categoryId: string; amount: number }>;
};

export type DeletedTransactionNotice = {
  description: string;
  payload: RestoreTransactionPayload;
};

type Stored = DeletedTransactionNotice & { deletedAt: number };

/**
 * Monta o que é preciso para recriar um lançamento excluído. Só vale para lançamento comum e avulso:
 * parcelas e recorrências (a série seria alterada) e transferências ficam de fora, sem "Desfazer".
 */
export function buildRestorePayload(transaction: TransactionDTO): RestoreTransactionPayload | null {
  if (transaction.kind !== 'NORMAL' || transaction.transferId) return null;
  if (transaction.series || transaction.seriesIndex != null) return null;
  if (transaction.type !== 'INCOME' && transaction.type !== 'EXPENSE') return null;
  if (!transaction.category) return null;

  const tagIds = transaction.tags?.map((tag) => tag.id) ?? [];
  const allocations = transaction.allocations?.map((allocation) => ({
    categoryId: allocation.category.id,
    amount: allocation.amount,
  })) ?? [];

  return {
    amount: transaction.amount,
    type: transaction.type,
    description: transaction.description,
    status: transaction.status,
    year: transaction.year,
    month: transaction.month,
    day: transaction.day,
    accountId: transaction.account.id,
    categoryId: transaction.category.id,
    ...(transaction.merchant ? { merchantId: transaction.merchant.id } : {}),
    ...(tagIds.length > 0 ? { tagIds } : {}),
    ...(allocations.length > 0 ? { allocations } : {}),
  };
}

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Guarda o lançamento recém-excluído na aba, para a tela seguinte oferecer o "Desfazer". */
export function rememberDeletedTransaction(
  transaction: TransactionDTO,
  now: number = Date.now(),
  storage: KeyValueStorage | null = defaultStorage(),
) {
  if (!storage) return;
  const payload = buildRestorePayload(transaction);
  try {
    if (!payload) {
      storage.removeItem(STORAGE_KEY);
      return;
    }
    const stored: Stored = { description: transaction.description, payload, deletedAt: now };
    storage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Sem armazenamento da aba, simplesmente não há "Desfazer".
  }
}

/** Lê e apaga o aviso guardado (uma vez só); devolve null se não há, se expirou ou se está corrompido. */
export function takeDeletedTransaction(
  now: number = Date.now(),
  storage: KeyValueStorage | null = defaultStorage(),
): { notice: DeletedTransactionNotice; remainingMs: number } | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    storage.removeItem(STORAGE_KEY);

    const stored = JSON.parse(raw) as Partial<Stored>;
    if (
      typeof stored.deletedAt !== 'number' ||
      typeof stored.description !== 'string' ||
      !stored.payload ||
      typeof stored.payload.amount !== 'number'
    ) {
      return null;
    }
    const remainingMs = stored.deletedAt + UNDO_DELETE_WINDOW_MS - now;
    if (remainingMs <= 0 || remainingMs > UNDO_DELETE_WINDOW_MS) return null;
    return { notice: { description: stored.description, payload: stored.payload }, remainingMs };
  } catch {
    return null;
  }
}
