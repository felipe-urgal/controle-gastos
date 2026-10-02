import { describe, expect, it, vi } from "vitest";

import {
  explainFinancialContext,
  type LocalAssistantGenerator,
} from "@/app/lib/local-ai/local-assistant-runtime";
import type { FinancialContext } from "@/app/types/local-financial-assistant";

const context: FinancialContext = {
  period: { year: 2026, month: 10 },
  currency: "BRL",
  summary: { income: 100, expense: 80, balance: 20 },
  comparison: {
    previousPeriod: { year: 2026, month: 9 },
    incomePercentage: null,
    expensePercentage: null,
    balancePercentage: null,
  },
  planning: {
    budget: 0,
    realized: 0,
    committed: 0,
    available: 0,
    expectedIncome: 0,
    overBudgetCategories: 0,
  },
  topCategories: [],
  insights: [],
  forecast: null,
  goals: [],
};

describe("local assistant runtime", () => {
  it("falha de forma explícita quando o dispositivo não suporta IA local", async () => {
    const generator: LocalAssistantGenerator = {
      isSupported: vi.fn().mockResolvedValue(false),
      generate: vi.fn(),
    };

    await expect(explainFinancialContext(context, generator)).rejects.toThrow(
      "LOCAL_AI_UNSUPPORTED",
    );
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it("usa modelo mockado sem qualquer fetch ou API externa no fluxo de teste", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const generator: LocalAssistantGenerator = {
      isSupported: vi.fn().mockResolvedValue(true),
      generate: vi.fn().mockResolvedValue("  Explicação local.  "),
    };

    await expect(explainFinancialContext(context, generator)).resolves.toBe(
      "Explicação local.",
    );
    expect(generator.generate).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("respeita cancelamento antes de iniciar a geração", async () => {
    const controller = new AbortController();
    controller.abort();

    const generator: LocalAssistantGenerator = {
      isSupported: vi.fn().mockResolvedValue(true),
      generate: vi.fn(),
    };

    await expect(
      explainFinancialContext(context, generator, undefined, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(generator.generate).not.toHaveBeenCalled();
  });

  it("rejeita resposta vazia em vez de mostrar sucesso enganoso", async () => {
    const generator: LocalAssistantGenerator = {
      isSupported: vi.fn().mockResolvedValue(true),
      generate: vi.fn().mockResolvedValue("   "),
    };

    await expect(explainFinancialContext(context, generator)).rejects.toThrow(
      "LOCAL_AI_EMPTY_RESPONSE",
    );
  });
});
