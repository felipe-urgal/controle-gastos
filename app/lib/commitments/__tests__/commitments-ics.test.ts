import { describe, expect, it } from "vitest";

import { commitmentsToIcs, escapeIcsText, foldIcsLine } from "@/app/lib/commitments/commitments-ics";
import type { FinancialCommitment, FinancialCommitmentsData } from "@/app/types/financial-commitment";

const NOW = new Date("2026-11-04T12:30:45Z");

function item(partial: Partial<FinancialCommitment> & { id: string }): FinancialCommitment {
  return {
    type: "PENDING",
    direction: "PAYABLE",
    state: "UPCOMING",
    title: "Internet",
    amount: 15_000,
    currency: "BRL",
    date: { year: 2026, month: 11, day: 8 },
    href: "/x",
    accountName: "Itaú",
    source: { kind: "TRANSACTION", id: partial.id },
    ...partial,
  };
}

function data(items: FinancialCommitment[]): FinancialCommitmentsData {
  return {
    asOf: { year: 2026, month: 11, day: 4 },
    through: { year: 2026, month: 12, day: 4 },
    currency: "BRL",
    days: 30,
    items,
    totals: { payable: { count: 0, amount: 0 }, receivable: { count: 0, amount: 0 }, milestoneCount: 0, overdueCount: 0 },
  };
}

describe("escapeIcsText", () => {
  it("escapa barra, ponto e vírgula, vírgula e quebras de linha", () => {
    expect(escapeIcsText("a;b,c\\d\ne\r\nf")).toBe("a\;b\\,c\\\\d\\ne\\nf");
  });
});

describe("foldIcsLine", () => {
  it("não mexe em linha curta", () => {
    expect(foldIcsLine("SUMMARY:curta")).toBe("SUMMARY:curta");
  });

  it("dobra em 75 octetos com continuação iniciada por espaço e sem quebrar caractere UTF-8", () => {
    const line = "SUMMARY:" + "ação ".repeat(40);
    const folded = foldIcsLine(line);
    const physical = folded.split("\r\n");

    expect(physical.length).toBeGreaterThan(1);
    for (const piece of physical) expect(new TextEncoder().encode(piece).length).toBeLessThanOrEqual(75);
    expect(physical.slice(1).every((piece) => piece.startsWith(" "))).toBe(true);
    // Desdobrar devolve a linha original.
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });
});

describe("commitmentsToIcs", () => {
  it("gera um calendário válido com evento de dia inteiro, UID estável e CRLF", () => {
    const ics = commitmentsToIcs(data([item({ id: "t1" })]), { now: NOW });

    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).not.toMatch(/(?<!\r)\n/);
    expect(ics).toContain("UID:transaction-t1@controle-gastos\r\n");
    expect(ics).toContain("DTSTAMP:20261104T123045Z\r\n");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261108\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20261109\r\n");
    expect(ics).toContain("SUMMARY:Pagar: Internet\r\n");
    expect(ics).toContain("TRANSP:TRANSPARENT\r\n");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(1);
  });

  it("o dia seguinte vira o mês e o ano", () => {
    const ics = commitmentsToIcs(data([item({ id: "t1", date: { year: 2026, month: 12, day: 31 } })]), { now: NOW });
    expect(ics).toContain("DTSTART;VALUE=DATE:20261231\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20270101\r\n");
  });

  it("o valor fica só na descrição (nunca no título) e some quando o usuário oculta valores", () => {
    const shown = commitmentsToIcs(data([item({ id: "t1" })]), { now: NOW });
    // A vírgula do valor é escapada, como manda o formato.
    expect(shown).toMatch(/DESCRIPTION:Valor: R\$\s150\\,00\\nConta: Itaú/);
    expect(shown.split("\r\n").find((line) => line.startsWith("SUMMARY:"))).not.toMatch(/150/);

    const hidden = commitmentsToIcs(data([item({ id: "t1" })]), { now: NOW, showValues: false });
    expect(hidden).not.toMatch(/150/);
    expect(hidden).toContain("Conta: Itaú");
  });

  it("item sem valor não imprime valor; vencido é sinalizado e não ganha lembrete", () => {
    const ics = commitmentsToIcs(
      data([item({ id: "t1", amount: null, state: "OVERDUE", date: { year: 2026, month: 11, day: 1 } })]),
      { now: NOW },
    );
    expect(ics).not.toContain("Valor:");
    expect(ics).toContain("Já vencido e ainda pendente.");
    expect(ics).not.toContain("BEGIN:VALARM");
  });

  it("a pagar futuro tem lembrete às 9h do dia anterior; a receber e meta, não", () => {
    const ics = commitmentsToIcs(
      data([
        item({ id: "pagar" }),
        item({ id: "receber", direction: "RECEIVABLE", title: "Freela" }),
        item({ id: "meta", direction: "MILESTONE", title: "Viagem", amount: null, source: { kind: "GOAL", id: "meta" } }),
      ]),
      { now: NOW },
    );
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(1);
    expect(ics).toContain("TRIGGER:-PT15H\r\n");
    expect(ics).toContain("SUMMARY:Receber: Freela\r\n");
    expect(ics).toContain("SUMMARY:Meta: Viagem\r\n");
    expect(ics).toContain("UID:goal-meta@controle-gastos\r\n");
  });

  it("título com vírgula, ponto e vírgula e quebra de linha não quebra o arquivo", () => {
    const ics = commitmentsToIcs(data([item({ id: "t1", title: "Luz; água, gás\nBLOCO" })]), { now: NOW });
    expect(ics).toContain("SUMMARY:Pagar: Luz\; água\\, gás\\nBLOCO\r\n");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("sem compromissos, devolve um calendário vazio válido", () => {
    const ics = commitmentsToIcs(data([]), { now: NOW });
    expect(ics).not.toContain("BEGIN:VEVENT");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
