/**
 * Itens da fila de revisão que o usuário marcou como "ignorar". Ficam no aparelho (por usuário), para não
 * voltarem a cada recarga; não há tabela nem sincronização entre aparelhos de propósito.
 */

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

export function ignoredStorageKey(userId: string) {
  return `controle-gastos:recurrences:ignored:${userId}`;
}

export function readIgnored(storage: ReadableStorage, key: string): Set<string> {
  try {
    const raw = storage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set();
  }
}

export function writeIgnored(storage: WritableStorage, key: string, ids: ReadonlySet<string>) {
  try {
    storage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // Armazenamento cheio ou bloqueado: o item continua ignorado nesta sessão, só não persiste.
  }
}
