import { describe, expect, it } from "vitest";

import { moneyAfterLabel, moneyCellToCents, splitCells, valueBelowLabel } from "@/app/lib/documents/layout-text";

describe("layout-text", () => {
  it("divide colunas por 3 ou mais espaços", () => {
    expect(splitCells("Nr. Nota   Folha   Data pregão")).toEqual(["Nr. Nota", "Folha", "Data pregão"]);
    expect(splitCells("Rua Alfa, 10 - Centro")).toEqual(["Rua Alfa, 10 - Centro"]);
  });

  it("lê o valor abaixo do rótulo pela posição da coluna", () => {
    const text = ["NOTA DE CORRETAGEM", "Nr. Nota   Folha   Data pregão", "12345   1   21/10/2026"].join("\n");
    expect(valueBelowLabel(text, /^Data\s+preg[aã]o$/i)).toBe("21/10/2026");
    expect(valueBelowLabel(text, /^Nr\.?\s*Nota$/i)).toBe("12345");
    expect(valueBelowLabel(text, /^Inexistente$/)).toBeNull();
  });

  it("alinha pelo fim quando a linha de valores tem menos colunas", () => {
    const text = ["Empresa   Data Pregão   Folha", "21/10/2026   1 / 1"].join("\n");
    expect(valueBelowLabel(text, /^Folha$/)).toBe("1 / 1");
  });

  it("converte células de dinheiro em centavos absolutos", () => {
    expect(moneyCellToCents("R$ 1.234,56")).toBe(123_456);
    expect(moneyCellToCents("-R$ 9,99")).toBe(999);
    expect(moneyCellToCents("0,50 D")).toBe(50);
    expect(moneyCellToCents("sem valor")).toBeNull();
    expect(moneyCellToCents(undefined)).toBeNull();
  });

  it("acha o dinheiro depois do rótulo, mesmo com outra coluna colada na mesma célula", () => {
    const text = [
      "Debêntures   9,99   Clearing",
      "Compras à vista   100,00 Taxa de liquidação/CCP   0,06 D",
      "Compras à vista   R$ 100,00   Taxa de Liquidação/CCP   -R$ 2,50",
      "Clearing   0,10 D",
      "Execução   0,20 D",
      "Execução casa   0,30 D",
    ].join("\n");
    expect(moneyAfterLabel(text, "Taxa de Liquida[cç][aã]o(?:\\s*\\/\\s*CCP)?")).toEqual([6, 250]);
    expect(moneyAfterLabel(text, "Clearing")).toEqual([10]);
    expect(moneyAfterLabel(text, "Execu[cç][aã]o casa|Execu[cç][aã]o")).toEqual([20, 30]);
    expect(moneyAfterLabel(text, "Inexistente")).toEqual([]);
  });
});
