import { describe, expect, it } from "vitest";

import { parseAmountToken, parseQuickEntry } from "@/app/lib/transactions/quick-entry";

const today = { year: 2026, month: 11, day: 4 };

function ok(input: string, now = today) {
  const result = parseQuickEntry(input, now);
  if (!result.ok) throw new Error(`esperava sucesso para "${input}", veio ${result.reason}`);
  return result;
}

function fails(input: string, reason: string, now = today) {
  const result = parseQuickEntry(input, now);
  expect(result).toMatchObject({ ok: false, reason });
}

describe("parseAmountToken", () => {
  it.each([
    ["45,90", 4_590],
    ["45.90", 4_590],
    ["45", 4_500],
    ["0,50", 50],
    ["1.234,56", 123_456],
    ["1.234", 123_400],
    ["12.345.678", 1_234_567_800 > 1_000_000_000 ? null : 1_234_567_800],
    ["1,234.56", 123_456],
    ["R$ 45,90", 4_590],
    ["r$45,9", 4_590],
    ["45,9", 4_590],
    ["5000", 500_000],
  ])("%s", (token, cents) => {
    expect(parseAmountToken(token)).toBe(cents);
  });

  it.each(["", "abc", "0", "0,00", "45,909", "1,234", "1.23.4", "12,34,56", "1.2345", "99999999999"])(
    "recusa %s",
    (token) => {
      expect(parseAmountToken(token)).toBeNull();
    },
  );

  it("respeita o teto de valor das transações", () => {
    expect(parseAmountToken("10.000.000,00")).toBe(1_000_000_000);
    expect(parseAmountToken("10.000.000,01")).toBeNull();
  });
});

describe("parseQuickEntry: valor, descrição e tipo", () => {
  it.each([
    ["mercado 45,90", 4_590, "mercado"],
    ["uber 18", 1_800, "uber"],
    ["45,90 mercado", 4_590, "mercado"],
    ["R$ 32,50 almoço", 3_250, "almoço"],
    ["almoço R$32,50", 3_250, "almoço"],
    ["farmácia 1.234,56", 123_456, "farmácia"],
    ["gasolina 250.00", 25_000, "gasolina"],
    ["  mercado    45,90  ", 4_590, "mercado"],
    ["Supermercado Extra 87,35", 8_735, "Supermercado Extra"],
  ])("%s", (input, amountCents, description) => {
    expect(ok(input)).toMatchObject({ amountCents, description, type: "EXPENSE", typeInferred: false });
  });

  it("é despesa por padrão, com data de hoje e sem conta", () => {
    expect(ok("mercado 45,90")).toMatchObject({
      type: "EXPENSE",
      date: today,
      dateSource: "default",
      accountHint: null,
    });
  });

  it.each([
    ["salário 5000", "salário"],
    ["recebi 1200 freela", "recebi freela"],
    ["freela 800", "freela"],
    ["reembolso 90,50 plano", "reembolso plano"],
    ["rendimentos 12,34", "rendimentos"],
    ["+500 pix do João", "pix do João"],
    ["Salario 3000", "Salario"],
  ])("%s é receita", (input, description) => {
    expect(ok(input)).toMatchObject({ type: "INCOME", typeInferred: true, description });
  });

  it("sinal de menos reforça despesa e não confunde o valor", () => {
    expect(ok("-45,90 mercado")).toMatchObject({ amountCents: 4_590, type: "EXPENSE" });
  });

  it("palavra de receita dentro de outra palavra não conta", () => {
    expect(ok("receitas culinárias livro 59,90")).toMatchObject({ type: "EXPENSE" });
    expect(ok("preço da venda de garagem 20")).toMatchObject({ type: "INCOME" });
    expect(ok("salários atrasados 100")).toMatchObject({ type: "EXPENSE" });
  });

  it("frase só com valor devolve descrição vazia, para a interface pedir", () => {
    expect(ok("45,90")).toMatchObject({ amountCents: 4_590, description: "" });
  });

  it("tira palavras de ligação soltas nas pontas", () => {
    expect(ok("almoço de hoje 32,50")).toMatchObject({ description: "almoço" });
    expect(ok("45 para o Pedro hoje")).toMatchObject({ description: "Pedro" });
  });

  it("limita a descrição ao tamanho aceito pelas transações", () => {
    const result = ok(`${"a".repeat(300)} 10`);
    expect(result.description.length).toBeLessThanOrEqual(100);
  });
});

describe("parseQuickEntry: data", () => {
  it.each([
    ["uber 18 ontem", { year: 2026, month: 11, day: 3 }, "relative"],
    ["uber 18 anteontem", { year: 2026, month: 11, day: 2 }, "relative"],
    ["uber 18 amanhã", { year: 2026, month: 11, day: 5 }, "relative"],
    ["uber 18 amanha", { year: 2026, month: 11, day: 5 }, "relative"],
    ["uber 18 hoje", { year: 2026, month: 11, day: 4 }, "default"],
    ["ONTEM uber 18", { year: 2026, month: 11, day: 3 }, "relative"],
    ["uber 18 dia 2", { year: 2026, month: 11, day: 2 }, "day"],
    ["uber 18 dia 30", { year: 2026, month: 11, day: 30 }, "day"],
    ["uber 18 15/10", { year: 2026, month: 10, day: 15 }, "day"],
    ["uber 18 15/10/2025", { year: 2025, month: 10, day: 15 }, "full"],
    ["uber 18 15/10/25", { year: 2025, month: 10, day: 15 }, "full"],
    ["uber 18 1/2", { year: 2026, month: 2, day: 1 }, "day"],
  ])("%s", (input, date, dateSource) => {
    expect(ok(input)).toMatchObject({ amountCents: 1_800, date, dateSource });
  });

  it("ontem e amanhã atravessam o mês e o ano", () => {
    expect(ok("pão 5 ontem", { year: 2026, month: 3, day: 1 }).date).toEqual({ year: 2026, month: 2, day: 28 });
    expect(ok("pão 5 ontem", { year: 2024, month: 3, day: 1 }).date).toEqual({ year: 2024, month: 2, day: 29 });
    expect(ok("pão 5 amanhã", { year: 2026, month: 12, day: 31 }).date).toEqual({ year: 2027, month: 1, day: 1 });
  });

  it("o dia da data não vira valor", () => {
    expect(ok("salário 5000 dia 5")).toMatchObject({ amountCents: 500_000, date: { year: 2026, month: 11, day: 5 } });
    expect(ok("luz 180,40 10/11")).toMatchObject({ amountCents: 18_040, date: { year: 2026, month: 11, day: 10 } });
  });

  it("data impossível é erro, não ajuste", () => {
    fails("uber 18 dia 31", "INVALID_DATE");
    fails("uber 18 31/11", "INVALID_DATE");
    fails("uber 18 30/02", "INVALID_DATE");
    fails("uber 18 29/02/2026", "INVALID_DATE");
    fails("uber 18 32/01", "INVALID_DATE");
    fails("uber 18 10/13", "INVALID_DATE");
    fails("uber 18 dia 0", "INVALID_DATE");
    fails("uber 18 01/01/1999", "INVALID_DATE");
  });

  it("29/02 vale em ano bissexto", () => {
    expect(ok("uber 18 29/02/2028").date).toEqual({ year: 2028, month: 2, day: 29 });
  });

  it("a palavra 'dia' sem número não é data", () => {
    expect(ok("dia dos namorados presente 120")).toMatchObject({ amountCents: 12_000, dateSource: "default" });
  });
});

describe("parseQuickEntry: conta", () => {
  it.each([
    ["salário 5000 dia 5 na conta Itaú", "Itaú", "salário"],
    ["mercado 45,90 no cartão Nubank", "Nubank", "mercado"],
    ["mercado 45,90 no cartao nubank roxinho", "nubank roxinho", "mercado"],
    ["pix 100 na carteira", null, "pix"],
    ["almoço 32 pela conta Inter ontem", "Inter", "almoço"],
  ])("%s", (input, accountHint, description) => {
    expect(ok(input)).toMatchObject({ accountHint, description });
  });

  it("a conta vai no fim da frase: tudo depois de 'na conta' é a dica de conta", () => {
    expect(ok("na conta Itaú salário 5000")).toMatchObject({ accountHint: "Itaú salário", description: "" });
  });

  it("'no' sem 'conta' ou 'cartão' faz parte da descrição", () => {
    expect(ok("almoço no restaurante 40")).toMatchObject({ accountHint: null, description: "almoço no restaurante" });
  });
});

describe("parseQuickEntry: erros em vez de palpite", () => {
  it.each(["", "   ", "\n\t"])("frase vazia %j", (input) => {
    fails(input, "EMPTY");
  });

  it("sem valor", () => {
    fails("mercado", "NO_AMOUNT");
    fails("ontem", "NO_AMOUNT");
    fails("dia 5", "NO_AMOUNT");
    fails("mercado 3x", "NO_AMOUNT");
    fails("arroz 5kg", "NO_AMOUNT");
  });

  it("valor inválido", () => {
    fails("mercado 0", "INVALID_AMOUNT");
    fails("mercado 0,00", "INVALID_AMOUNT");
    fails("mercado 99999999,99", "INVALID_AMOUNT");
    fails("mercado 1,234", "INVALID_AMOUNT");
  });

  it("dois valores sem como escolher", () => {
    fails("2 pizzas 40", "AMBIGUOUS_AMOUNT");
    fails("mercado 45 e 30", "AMBIGUOUS_AMOUNT");
  });

  it("com dois números, o que tem R$ ou centavos vence", () => {
    expect(ok("2 pizzas 40,50")).toMatchObject({ amountCents: 4_050, description: "2 pizzas" });
    expect(ok("2 pizzas R$ 40")).toMatchObject({ amountCents: 4_000, description: "2 pizzas" });
    fails("2 pizzas 40,50 e 3,20", "AMBIGUOUS_AMOUNT");
  });
});

describe("parseQuickEntry: confiança de que é um lançamento", () => {
  it.each([
    "mercado 45,90",
    "mercado R$ 45",
    "uber 18 ontem",
    "uber 18 hoje",
    "luz 100 dia 10",
    "salário 5000",
    "+500 pix",
    "mercado 45 na conta Itaú",
  ])("%s é confiante", (input) => {
    expect(ok(input).confident).toBe(true);
  });

  it.each(["dashboard 2", "iphone 15", "mercado 45", "contas 2026", "tag 7"])(
    "%s parece busca comum, não lançamento",
    (input) => {
      expect(ok(input).confident).toBe(false);
    },
  );
});

describe("parseQuickEntry: robustez", () => {
  it("nunca lança e sempre devolve centavos inteiros, para entradas estranhas", () => {
    const inputs = [
      "💸 mercado 45,90",
      "mercado 45,90 😀",
      "mercado\t45,90\nontem",
      "R$",
      "R$ R$ 5",
      ",,,",
      "....",
      "1/1/1/1",
      "ontem ontem hoje 5",
      "5 5 5",
      "9".repeat(400),
      "mercado " + "1".repeat(50) + ",90",
      "<script>alert(1)</script> 10",
      "a".repeat(5000),
    ];
    for (const input of inputs) {
      const result = parseQuickEntry(input, today);
      if (result.ok) {
        expect(Number.isSafeInteger(result.amountCents)).toBe(true);
        expect(result.amountCents).toBeGreaterThan(0);
        expect(result.description.length).toBeLessThanOrEqual(100);
      }
    }
  });

  it("o texto digitado fica como está na descrição (nada é executado ou interpretado)", () => {
    expect(ok("<b>mercado</b> 10")).toMatchObject({ description: "<b>mercado</b>" });
  });

  it("a data de hoje injetada define 'dia N' e 'dd/mm' (sem depender do relógio da máquina)", () => {
    expect(ok("luz 100 dia 3", { year: 2030, month: 6, day: 20 }).date).toEqual({ year: 2030, month: 6, day: 3 });
    expect(ok("luz 100 3/4", { year: 2030, month: 6, day: 20 }).date).toEqual({ year: 2030, month: 4, day: 3 });
  });
});
