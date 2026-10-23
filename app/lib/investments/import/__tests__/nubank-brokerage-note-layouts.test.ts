import { describe, expect, it } from "vitest";

import {
  applySymbolOverrides,
  parseNubankBrokerageNoteText,
  parseSymbolOverrides,
  UNRESOLVED_SYMBOL,
} from "@/app/lib/investments/import/nubank-brokerage-note-parser";

/** Notas em tabela (colunas por 3+ espaços), com dados fictícios, nos dois layouts da Nu Investimentos. */
const legacyPage = (number: string, date: string, quantity: string, price: string, gross: string, fee: string, net: string) =>
  [
    "NOTA DE CORRETAGEM",
    "Nr. Nota   Folha   Data pregão",
    `${number}   1   ${date}`,
    "NU INVESTIMENTOS S.A - CTVM",
    "C.N.P.J.: 11.111.111/0001-11   Carta Patente: A-1/2000",
    "Negocios realizados",
    "Q Negociação   C/V Tipo mercado   Prazo Especificação do título   Obs. (*) Quantidade   Preço / Ajuste   Valor Operação / Ajuste   D/C",
    `B3 RV LISTADO C VISTA   FII EXEMPLOIII CI ER   @   ${quantity}   ${price}   ${gross} D`,
    "Resumo dos Negócios   Resumo Financeiro   D/C",
    "Debêntures   0,00 Clearing",
    `Vendas à vista   0,00 Valor líquido das operações   ${gross} D`,
    `Compras à vista   ${gross} Taxa de liquidação/CCP   ${fee} D`,
    "Opções - compras   0,00 Taxa de Registro   0,00 D",
    "Taxa A.N.A.   0,00 D",
    "Emolumentos   0,00 D",
    "Total   0,00 D",
    "Corretagem / Despesas",
    "Clearing   0,00 D",
    "Última Atualização: 19/10/2026 10:47:14   Execução   0,00 D",
    "Execução casa   0,00 D",
    "ISS ( SÃO PAULO )   0,00",
    "Outras   0,00 D",
    "Total   0,00 D",
    `Líquido para 21/10/2026   ${net} D`,
  ].join("\n");

const tablePage = (number: string, date: string, quantity: string, price: string, gross: string, fee: string, net: string) =>
  [
    "Nu Investimentos S.A. - Corretora de Títulos e Valores Mobiliários   Data Pregão   Folha",
    `CNPJ: 11.111.111/0001-11 | www.nuinvest.com.br   ${date}   1 / 1`,
    "Rua Exemplo, nº 10, 5º andar   Número da nota",
    `01234-000 | São Paulo | SP | BR   ${number}`,
    "Mercado   C/V Tipo de Mercado   Especificação do Título   Observação   Quantidade   Preço/Ajuste   Valor/Ajuste D/C",
    `BOVESPA   C VISTA   EXMP11 CI ER   @   ${quantity}   R$ ${price}   R$ ${gross} D`,
    "Resumo dos Negócios   Resumo Financeiro",
    `Compras à vista   R$ ${gross}   Taxa de Liquidação/CCP   -R$ ${fee}`,
    "Opções - Compras   R$ 0,00   Taxa de Registro   R$ 0,00",
    "Especificações Diversas   Emolumentos   -R$ 0,00",
    "Corretagem/Despesas",
    "9 - Corretora ou pessoa vinculada atuou na    # - Negócio direto",
    "contra parte   Corretagem   R$ 0,00",
    "9 - Liquidação Institucional   D - Day-Trade   ISS (SÃO PAULO)   R$ 0,00",
    "F - Cobertura   B - Debêntures   I.R.R.F. s/ operações. Base R$ 0,00   R$ 0,00",
    "Outras   R$ 0,00",
    "Total Corretagem/Despesas   R$ 0,00",
    `Líquido para 21/10/2026   -R$ ${net}`,
  ].join("\n");

describe("notas de corretagem em tabela", () => {
  it("lê número, data, negócio e taxas do layout antigo (Sinacor)", () => {
    const parsed = parseNubankBrokerageNoteText(
      [legacyPage("23237", "19/10/2026", "30", "9,63", "288,90", "0,07", "288,97"), legacyPage("19959", "20/10/2026", "4", "9,62", "38,48", "0,00", "38,48")].join("\n"),
    );

    expect(parsed.notes.map((note) => [note.noteNumber, note.tradeDate, note.businesses, note.allocableFeesCents, note.netAmountCents])).toEqual([
      ["23237", "2026-10-19", 1, 7, 28_897],
      ["19959", "2026-10-20", 1, 0, 3_848],
    ]);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.items[0]).toMatchObject({ operationType: "BUY", quantity: "30", unitPriceCents: 963, amountCents: 28_890, feesCents: 7 });
  });

  it("sem ticker na nota, o negócio fica pendente com a especificação para o usuário informar", () => {
    const [item] = parseNubankBrokerageNoteText([legacyPage("1", "19/10/2026", "30", "9,63", "288,90", "0,07", "288,97"), legacyPage("2", "20/10/2026", "4", "9,62", "38,48", "0,00", "38,48")].join("\n")).items;
    expect(item.symbol).toBe(UNRESOLVED_SYMBOL);
    expect(item.brokerageNote.specification).toBe("FII EXEMPLOIII CI ER");
    expect(item.errors[0]).toMatch(/Ticker não identificado/);
  });

  it("lê o layout novo com ticker, valores com R$ e o número abaixo do rótulo (e não o CEP)", () => {
    const parsed = parseNubankBrokerageNoteText(
      [tablePage("23237", "19/10/2026", "30", "9,63", "288,90", "0,07", "288,97"), tablePage("19959", "20/10/2026", "4", "9,62", "38,48", "0,00", "38,48")].join("\n"),
    );

    expect(parsed.notes.map((note) => [note.noteNumber, note.tradeDate, note.allocableFeesCents, note.netAmountCents])).toEqual([
      ["23237", "2026-10-19", 7, 28_897],
      ["19959", "2026-10-20", 0, 3_848],
    ]);
    expect(parsed.items[0]).toMatchObject({ symbol: "EXMP11", assetType: "FII", operationType: "BUY", amountCents: 28_890 });
    expect(parsed.items[0].errors).toEqual([]);
    expect(parsed.warnings).toEqual([]);
  });

  it("avisa, sem bloquear, quando o líquido da nota não bate com as taxas lidas", () => {
    const parsed = parseNubankBrokerageNoteText(
      [tablePage("1", "19/10/2026", "30", "9,63", "288,90", "0,07", "300,00"), tablePage("2", "20/10/2026", "4", "9,62", "38,48", "0,00", "38,48")].join("\n"),
    );
    expect(parsed.warnings[0]).toMatch(/Nota 1: o líquido da nota/);
    expect(parsed.items).toHaveLength(2);
  });

  it("une páginas da mesma nota em uma só", () => {
    const parsed = parseNubankBrokerageNoteText([tablePage("7", "19/10/2026", "30", "9,63", "288,90", "0,07", "288,97"), tablePage("7", "19/10/2026", "4", "9,62", "38,48", "0,00", "38,48")].join("\n"));
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.items).toHaveLength(2);
  });
});

describe("tickers informados pelo usuário", () => {
  const unresolvedItem = {
    symbol: UNRESOLVED_SYMBOL,
    assetType: "STOCK" as const,
    errors: ['Ticker não identificado para "FII EXEMPLOIII CI ER". Informe o ticker para importar.'],
    brokerageNote: { specification: "FII EXEMPLOIII CI ER" },
  };

  it("aplica o ticker, recalcula o tipo do ativo e remove o erro pendente", () => {
    const [item] = applySymbolOverrides([unresolvedItem], parseSymbolOverrides(JSON.stringify({ "fii  exemploiii ci er": "exmp11" })));
    expect(item).toMatchObject({ symbol: "EXMP11", assetType: "FII", errors: [] });
  });

  it("deixa pendente o que não recebeu ticker e não altera itens já resolvidos", () => {
    const resolved = { ...unresolvedItem, symbol: "PETR4", errors: [] };
    expect(applySymbolOverrides([unresolvedItem, resolved], {})).toEqual([unresolvedItem, resolved]);
  });

  it("recusa ticker em formato inválido e JSON malformado", () => {
    expect(() => parseSymbolOverrides(JSON.stringify({ "FII X": "ab" }))).toThrow(/Ticker inválido/);
    expect(() => parseSymbolOverrides("não é json")).toThrow(/formato inválido/);
    expect(() => parseSymbolOverrides("[]")).toThrow(/formato inválido/);
    expect(parseSymbolOverrides(null)).toEqual({});
  });
});
