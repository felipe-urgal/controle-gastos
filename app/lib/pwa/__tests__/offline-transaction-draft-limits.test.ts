import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OFFLINE_TRANSACTION_DRAFT_PREFIX,
  getOfflineDraftIssues,
  readOfflineTransactionDraft,
  type OfflineTransactionDraft,
} from "@/app/lib/pwa/offline-transaction-draft";
import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_DESCRIPTION_MIN_LENGTH,
  TRANSACTION_MAX_AMOUNT_CENTS,
  TRANSACTION_MAX_YEAR,
  TRANSACTION_MIN_YEAR,
} from "@/app/lib/transactions/transaction-field-contract";
import { createTransactionSchema } from "@/app/lib/transactions/transaction-schema";

const owner = "user-a";

function draft(overrides: Partial<OfflineTransactionDraft> = {}): OfflineTransactionDraft {
  return {
    version: 1,
    id: "draft-1",
    ownerUserId: owner,
    type: "EXPENSE",
    amount: 12_345,
    description: "Mercado offline",
    year: 2026,
    month: 9,
    day: 30,
    createdAt: "2026-09-30T12:00:00.000Z",
    updatedAt: "2026-09-30T12:00:00.000Z",
    ...overrides,
  };
}

function installLocalStorage(initial?: unknown) {
  const values = new Map<string, string>();
  const key = `${OFFLINE_TRANSACTION_DRAFT_PREFIX}${owner}`;
  if (initial !== undefined) values.set(key, JSON.stringify(initial));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => void values.set(k, String(v)),
      removeItem: (k: string) => void values.delete(k),
    },
  });
  return { values, key };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getOfflineDraftIssues", () => {
  it.each([
    [0, 1],
    [1, 0],
    [TRANSACTION_MAX_AMOUNT_CENTS, 0],
    [TRANSACTION_MAX_AMOUNT_CENTS + 1, 1],
  ])("amount %i produces %i issue(s)", (amount, count) => {
    expect(getOfflineDraftIssues(draft({ amount }))).toHaveLength(count);
  });

  it.each([
    ["a", 1],
    [" a ", 1],
    ["ab", 0],
    ["x".repeat(TRANSACTION_DESCRIPTION_MAX_LENGTH), 0],
    ["x".repeat(TRANSACTION_DESCRIPTION_MAX_LENGTH + 1), 1],
    [` ${"x".repeat(TRANSACTION_DESCRIPTION_MAX_LENGTH)} `, 0],
  ])("description %j produces %i issue(s)", (description, count) => {
    expect(getOfflineDraftIssues(draft({ description }))).toHaveLength(count);
  });

  it.each([
    [TRANSACTION_MIN_YEAR - 1, 1],
    [TRANSACTION_MIN_YEAR, 0],
    [TRANSACTION_MAX_YEAR, 0],
    [TRANSACTION_MAX_YEAR + 1, 1],
  ])("year %i produces %i issue(s)", (year, count) => {
    expect(getOfflineDraftIssues(draft({ year, month: 1, day: 1 }))).toHaveLength(count);
  });

  it("agrees with the online schema on the boundaries", () => {
    const base = {
      categoryId: "00000000-0000-4000-8000-000000000001",
      accountId: "00000000-0000-4000-8000-000000000002",
      type: "EXPENSE" as const,
    };
    const cases = [
      { amount: 0, description: "ab", year: 2026 },
      { amount: TRANSACTION_MAX_AMOUNT_CENTS, description: "ab", year: 2026 },
      { amount: TRANSACTION_MAX_AMOUNT_CENTS + 1, description: "ab", year: 2026 },
      { amount: 100, description: "a", year: 2026 },
      { amount: 100, description: "x".repeat(101), year: 2026 },
      { amount: 100, description: "ab", year: 1999 },
      { amount: 100, description: "ab", year: 2101 },
    ];
    for (const c of cases) {
      const online = createTransactionSchema.safeParse({
        ...base, ...c, month: 1, day: 1,
      }).success;
      const offline = getOfflineDraftIssues(draft({ ...c, month: 1, day: 1 })).length === 0;
      expect(offline, JSON.stringify(c)).toBe(online);
    }
  });
});

describe("legacy offline drafts", () => {
  it("keeps a legacy draft with 255-character description and flags it", () => {
    const legacy = draft({ description: "x".repeat(255) });
    const { values, key } = installLocalStorage(legacy);

    const read = readOfflineTransactionDraft(owner);

    expect(read).toEqual(legacy);
    expect(read?.description).toHaveLength(255);
    expect(getOfflineDraftIssues(read!)).toHaveLength(1);
    expect(values.has(key)).toBe(true);
  });

  it("keeps a legacy draft above the amount cap or with zero amount", () => {
    for (const amount of [TRANSACTION_MAX_AMOUNT_CENTS + 1, 0]) {
      const { values, key } = installLocalStorage(draft({ amount }));
      const read = readOfflineTransactionDraft(owner);
      expect(read?.amount).toBe(amount);
      expect(getOfflineDraftIssues(read!)).toHaveLength(1);
      expect(values.has(key)).toBe(true);
    }
  });

  it.each([
    ["non-integer amount", { amount: 1.5 }],
    ["missing description", { description: undefined }],
    ["impossible date", { month: 2, day: 31 }],
    ["invalid type", { type: "TRANSFER" }],
  ])("still discards structurally corrupted drafts (%s)", (_name, patch) => {
    const { values, key } = installLocalStorage({ ...draft(), ...patch });
    expect(readOfflineTransactionDraft(owner)).toBeNull();
    expect(values.has(key)).toBe(false);
  });
});

describe("offline-transacao.html limits contract", () => {
  const html = readFileSync(join(process.cwd(), "public/offline-transacao.html"), "utf8");
  const read = (name: string) => {
    const match = html.match(new RegExp(`const ${name} = ([0-9_]+);`));
    expect(match, `${name} missing in offline-transacao.html`).not.toBeNull();
    return Number(match![1].replaceAll("_", ""));
  };

  it("mirrors the canonical transaction limits", () => {
    expect(read("DESCRIPTION_MIN_LENGTH")).toBe(TRANSACTION_DESCRIPTION_MIN_LENGTH);
    expect(read("DESCRIPTION_MAX_LENGTH")).toBe(TRANSACTION_DESCRIPTION_MAX_LENGTH);
    expect(read("MAX_AMOUNT_CENTS")).toBe(TRANSACTION_MAX_AMOUNT_CENTS);
    expect(read("MIN_YEAR")).toBe(TRANSACTION_MIN_YEAR);
    expect(read("MAX_YEAR")).toBe(TRANSACTION_MAX_YEAR);
  });

  it("does not hardcode the legacy 255 limit and stays free of imports", () => {
    expect(html).not.toMatch(/maxlength="255"/i);
    expect(html).not.toMatch(/\bimport\s|<script[^>]+src=/);
  });
});
