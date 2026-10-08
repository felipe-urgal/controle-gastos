import { afterEach, describe, expect, it, vi } from "vitest";

import { PWA_EVENT, emitPwaEvent, type PwaEventDetail } from "@/app/lib/pwa/pwa-events";

afterEach(() => vi.unstubAllGlobals());

function capture() {
  const received: PwaEventDetail[] = [];
  vi.stubGlobal("CustomEvent", class { type: string; detail: unknown; constructor(type: string, init: { detail: unknown }) { this.type = type; this.detail = init.detail; } });
  vi.stubGlobal("window", {
    dispatchEvent: (event: { type: string; detail: PwaEventDetail }) => {
      if (event.type === PWA_EVENT) received.push(event.detail);
      return true;
    },
  });
  return received;
}

describe("pwa events", () => {
  it("keeps only non-sensitive allowlisted fields", () => {
    const received = capture();
    emitPwaEvent({
      name: "sync_failure",
      queueLength: 2,
      failureKind: "business_conflict",
      errorCode: "CREDIT_CARD_STATEMENT_ALREADY_PAID",
      amount: 1234,
      description: "Mercado",
      accountId: "acc",
    } as PwaEventDetail);

    expect(received).toEqual([
      {
        name: "sync_failure",
        queueLength: 2,
        failureKind: "business_conflict",
        errorCode: "CREDIT_CARD_STATEMENT_ALREADY_PAID",
      },
    ]);
  });

  it("drops free-text values that are not safe tokens", () => {
    const received = capture();
    emitPwaEvent({ name: "sync_failure", failureKind: "Mercado do João R$ 10,00" });
    expect(received).toEqual([{ name: "sync_failure" }]);
  });
});
