import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OFFLINE_DRAFT_OWNER_KEY,
  OFFLINE_TRANSACTION_DRAFT_PREFIX,
  clearOfflineTransactionLocalState,
  offlineDraftToFormData,
  readOfflineTransactionDraft,
  setOfflineDraftOwner,
} from "@/app/lib/pwa/offline-transaction-draft";

function installLocalStorage() {
  const values = new Map<string, string>();
  const localStorage = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, String(value));
    },
    removeItem(key: string) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };

  vi.stubGlobal("window", { localStorage });
  return { values, localStorage };
}

function draft(ownerUserId: string) {
  return {
    version: 1,
    id: "draft-1",
    ownerUserId,
    type: "EXPENSE",
    amount: 12_345,
    description: "Mercado offline",
    year: 2026,
    month: 9,
    day: 30,
    createdAt: "2026-09-30T12:00:00.000Z",
    updatedAt: "2026-09-30T12:00:00.000Z",
  } as const;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("offline transaction draft", () => {
  it("reads only a valid draft owned by the current user", () => {
    const { localStorage } = installLocalStorage();
    const owner = "user-a";

    localStorage.setItem(OFFLINE_DRAFT_OWNER_KEY, owner);
    localStorage.setItem(
      `${OFFLINE_TRANSACTION_DRAFT_PREFIX}${owner}`,
      JSON.stringify(draft(owner)),
    );

    expect(readOfflineTransactionDraft(owner)).toEqual(draft(owner));
    expect(readOfflineTransactionDraft("user-b")).toBeNull();
  });

  it("drops the previous user's draft when the local owner changes", () => {
    const { localStorage } = installLocalStorage();
    const previousOwner = "user-a";

    localStorage.setItem(OFFLINE_DRAFT_OWNER_KEY, previousOwner);
    localStorage.setItem(
      `${OFFLINE_TRANSACTION_DRAFT_PREFIX}${previousOwner}`,
      JSON.stringify(draft(previousOwner)),
    );

    setOfflineDraftOwner("user-b");

    expect(localStorage.getItem(OFFLINE_DRAFT_OWNER_KEY)).toBe("user-b");
    expect(
      localStorage.getItem(
        `${OFFLINE_TRANSACTION_DRAFT_PREFIX}${previousOwner}`,
      ),
    ).toBeNull();
  });

  it("clears owner and draft together on explicit local cleanup", () => {
    const { localStorage } = installLocalStorage();
    const owner = "user-a";

    localStorage.setItem(OFFLINE_DRAFT_OWNER_KEY, owner);
    localStorage.setItem(
      `${OFFLINE_TRANSACTION_DRAFT_PREFIX}${owner}`,
      JSON.stringify(draft(owner)),
    );

    clearOfflineTransactionLocalState();

    expect(localStorage.getItem(OFFLINE_DRAFT_OWNER_KEY)).toBeNull();
    expect(
      localStorage.getItem(`${OFFLINE_TRANSACTION_DRAFT_PREFIX}${owner}`),
    ).toBeNull();
  });

  it("converts the offline draft into an incomplete online form without account or category", () => {
    expect(offlineDraftToFormData(draft("user-a"))).toEqual({
      amount: 12_345,
      month: 9,
      year: 2026,
      day: 30,
      description: "Mercado offline",
      status: "COMPLETED",
      accountId: "",
      categoryId: "",
      allocations: [],
      tagIds: [],
    });
  });

  it("rejects malformed local data instead of loading it", () => {
    const { localStorage } = installLocalStorage();
    const owner = "user-a";
    const key = `${OFFLINE_TRANSACTION_DRAFT_PREFIX}${owner}`;

    localStorage.setItem(key, JSON.stringify({ ...draft(owner), day: 99 }));

    expect(readOfflineTransactionDraft(owner)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });
});
