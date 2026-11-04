import { describe, expect, it } from "vitest";

import {
  buildRestorePayload,
  rememberDeletedTransaction,
  takeDeletedTransaction,
  UNDO_DELETE_WINDOW_MS,
} from "@/app/lib/transactions/undo-delete";
import type { TransactionDTO } from "@/app/types/transaction";

const NOW = 1_800_000_000_000;

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    map,
  };
}

function transaction(overrides: Partial<TransactionDTO> = {}): TransactionDTO {
  return {
    id: "t1",
    amount: 4590,
    type: "EXPENSE",
    kind: "NORMAL",
    description: "Mercado",
    status: "COMPLETED",
    reconciliationStatus: "UNCLEARED",
    reconciledAt: null,
    year: 2026,
    month: 11,
    day: 3,
    account: { id: "acc1", name: "Nubank", currency: "BRL", type: "CREDIT_DEBIT", color: null, icon: null },
    category: { id: "cat1", name: "Mercado", type: "EXPENSE", color: "#000", icon: "x" },
    ...overrides,
  } as TransactionDTO;
}

describe("buildRestorePayload", () => {
  it("recria os dados do lançamento, sem id nem campos derivados", () => {
    expect(buildRestorePayload(transaction())).toEqual({
      amount: 4590,
      type: "EXPENSE",
      description: "Mercado",
      status: "COMPLETED",
      year: 2026,
      month: 11,
      day: 3,
      accountId: "acc1",
      categoryId: "cat1",
    });
  });

  it("leva estabelecimento, tags e divisões quando existem", () => {
    const payload = buildRestorePayload(
      transaction({
        merchant: { id: "m1", name: "Padaria", isActive: true },
        tags: [{ id: "tag1", name: "a", isActive: true }],
        allocations: [{ id: "al1", amount: 1000, category: { id: "cat2", name: "x", type: "EXPENSE", color: "#000", icon: "x" } }],
      }),
    );
    expect(payload).toMatchObject({
      merchantId: "m1",
      tagIds: ["tag1"],
      allocations: [{ categoryId: "cat2", amount: 1000 }],
    });
  });

  it("não oferece desfazer para parcela, recorrência, transferência ou sem categoria", () => {
    expect(buildRestorePayload(transaction({ seriesIndex: 2 }))).toBeNull();
    expect(buildRestorePayload(transaction({ series: { id: "s1" } as TransactionDTO["series"] }))).toBeNull();
    expect(buildRestorePayload(transaction({ kind: "TRANSFER" as TransactionDTO["kind"] }))).toBeNull();
    expect(buildRestorePayload(transaction({ transferId: "tr1" }))).toBeNull();
    expect(buildRestorePayload(transaction({ category: null }))).toBeNull();
  });
});

describe("guardar e ler o aviso de exclusão", () => {
  it("guarda, lê uma só vez e informa o tempo restante", () => {
    const storage = memoryStorage();
    rememberDeletedTransaction(transaction(), NOW, storage);

    const first = takeDeletedTransaction(NOW + 2_000, storage);
    expect(first?.notice.description).toBe("Mercado");
    expect(first?.notice.payload.amount).toBe(4590);
    expect(first?.remainingMs).toBe(UNDO_DELETE_WINDOW_MS - 2_000);
    expect(takeDeletedTransaction(NOW + 2_000, storage)).toBeNull();
  });

  it("expirado, no futuro, corrompido ou sem payload vira null (e é apagado)", () => {
    const expired = memoryStorage();
    rememberDeletedTransaction(transaction(), NOW, expired);
    expect(takeDeletedTransaction(NOW + UNDO_DELETE_WINDOW_MS, expired)).toBeNull();
    expect(expired.map.size).toBe(0);

    const future = memoryStorage();
    rememberDeletedTransaction(transaction(), NOW + 60_000, future);
    expect(takeDeletedTransaction(NOW, future)).toBeNull();

    const broken = memoryStorage();
    broken.setItem("controle-gastos:undo-delete", "{nao e json");
    expect(takeDeletedTransaction(NOW, broken)).toBeNull();

    const partial = memoryStorage();
    partial.setItem("controle-gastos:undo-delete", JSON.stringify({ deletedAt: NOW, description: "x" }));
    expect(takeDeletedTransaction(NOW, partial)).toBeNull();
  });

  it("excluir algo sem desfazer limpa um aviso anterior; sem armazenamento não quebra", () => {
    const storage = memoryStorage();
    rememberDeletedTransaction(transaction(), NOW, storage);
    rememberDeletedTransaction(transaction({ seriesIndex: 1 }), NOW, storage);
    expect(takeDeletedTransaction(NOW, storage)).toBeNull();

    expect(() => rememberDeletedTransaction(transaction(), NOW, null)).not.toThrow();
    expect(takeDeletedTransaction(NOW, null)).toBeNull();
  });
});
