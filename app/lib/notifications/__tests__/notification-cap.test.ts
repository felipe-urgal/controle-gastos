import { describe, expect, it } from "vitest";

import { applyDailyCap, filterNewCandidates } from "@/app/lib/notifications/notification-cap";
import type { NotificationCandidate } from "@/app/lib/notifications/notification-model";
import { resolveChannels, isTypeEnabled } from "@/app/lib/notifications/notification-preferences";

const today = { year: 2026, month: 11, day: 10 };

function candidate(index: number, overrides: Partial<NotificationCandidate> = {}): NotificationCandidate {
  return {
    type: "COMMITMENT_DUE",
    dedupeKey: `K${index}`,
    severity: "WARNING",
    title: `Aviso ${index}`,
    body: "corpo",
    href: "/dashboard",
    date: { year: 2026, month: 11, day: 10 + index },
    ...overrides,
  };
}

describe("filterNewCandidates", () => {
  it("remove o que já foi avisado e duplicatas do próprio lote", () => {
    const result = filterNewCandidates(
      [candidate(1), candidate(2), candidate(2), candidate(3)],
      new Set(["K1"]),
    );
    expect(result.map((item) => item.dedupeKey)).toEqual(["K2", "K3"]);
  });
});

describe("applyDailyCap", () => {
  it("abaixo ou no limite, devolve tudo sem aviso-resumo", () => {
    const items = Array.from({ length: 5 }, (_, index) => candidate(index));
    expect(applyDailyCap(items, today)).toHaveLength(5);
    expect(applyDailyCap(items, today).some((item) => item.type === "SUMMARY")).toBe(false);
  });

  it("acima do limite, mantém os mais urgentes e junta o resto num resumo", () => {
    const items = [
      ...Array.from({ length: 4 }, (_, index) => candidate(index + 1, { severity: "INFO" })),
      candidate(9, { severity: "URGENT" }),
      candidate(8, { severity: "WARNING" }),
      candidate(7, { severity: "URGENT", date: { year: 2026, month: 11, day: 9 } }),
    ];
    const result = applyDailyCap(items, today);

    expect(result).toHaveLength(5);
    expect(result.slice(0, 4).map((item) => item.dedupeKey)).toEqual(["K7", "K9", "K8", "K1"]);
    const summary = result[4];
    expect(summary).toMatchObject({
      type: "SUMMARY",
      href: "/dashboard",
      dedupeKey: "SUMMARY:20261110",
      title: "Mais 3 itens pedem atenção",
    });
  });

  it("com um item acima do limite, o resumo cobre o excedente mais o que cedeu lugar a ele", () => {
    const items = Array.from({ length: 6 }, (_, index) => candidate(index));
    const result = applyDailyCap(items, today, 5);

    expect(result).toHaveLength(5);
    expect(result.at(-1)).toMatchObject({ type: "SUMMARY", title: "Mais 2 itens pedem atenção" });
  });

  it("nunca devolve mais do que o limite", () => {
    const items = Array.from({ length: 40 }, (_, index) => candidate(index));
    expect(applyDailyCap(items, today, 3)).toHaveLength(3);
  });
});

describe("preferências", () => {
  it("sem escolha gravada usa o padrão do tipo", () => {
    expect(resolveChannels("COMMITMENT_DUE", [])).toEqual({ inApp: true, email: false, push: false });
    expect(isTypeEnabled("INCOME_OVERDUE", [])).toBe(false);
  });

  it("a escolha do usuário vence o padrão", () => {
    const rows = [{ type: "INCOME_OVERDUE" as const, inApp: true, email: true, push: false }];
    expect(isTypeEnabled("INCOME_OVERDUE", rows)).toBe(true);
    expect(resolveChannels("INCOME_OVERDUE", rows).email).toBe(true);
  });

  it("desligar todos os canais desliga o tipo", () => {
    const rows = [{ type: "COMMITMENT_DUE" as const, inApp: false, email: false, push: false }];
    expect(isTypeEnabled("COMMITMENT_DUE", rows)).toBe(false);
  });
});
