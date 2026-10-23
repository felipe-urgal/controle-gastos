import { describe, expect, it } from "vitest";

import { guessDocument, wrongDocumentMessage } from "@/app/lib/documents/document-guess";

describe("guessDocument", () => {
  it.each([
    ["COMPROVANTE DE RENDIMENTOS PAGOS E DE IMPOSTO SOBRE A RENDA RETIDO NA FONTE", "ANNUAL_EMPLOYMENT_INCOME"],
    ["Informe de Rendimentos Financeiros\nAno-Calendário 2025", "FINANCIAL_INCOME_STATEMENT"],
    ["Extrato de Custódia\nResumo da posição consolidada", "CUSTODY_STATEMENT"],
    ["NOTA DE CORRETAGEM\nNr. Nota   Folha   Data pregão", "BROKERAGE_NOTE"],
    ["Nu Investimentos\nNota de negociação", "BROKERAGE_NOTE"],
    ["Folha Mensal\nTotal de Vencimentos", "PAYSLIP"],
    ["AVISO E RECIBO DE FÉRIAS", "PAYSLIP"],
    ["Saldo inicial   100,00\nTotal de entradas   +1,00\nMovimentações", "BANK_ACCOUNT_STATEMENT"],
    ["Fatura do cartão\nLimite disponível", "CARD_STATEMENT"],
  ])("reconhece %#", (text, kind) => {
    expect(guessDocument(text)?.kind).toBe(kind);
  });

  it("não adivinha quando nada bate", () => {
    expect(guessDocument("Lista de compras: pão, leite")).toBeNull();
  });
});

describe("wrongDocumentMessage", () => {
  it("diz o que foi reconhecido e onde enviar", () => {
    const message = wrongDocumentMessage("NOTA DE CORRETAGEM", "um holerite");
    expect(message).toContain("nota de corretagem");
    expect(message).toContain("Investimentos");
  });

  it("orienta quando o documento não é reconhecido", () => {
    expect(wrongDocumentMessage("texto qualquer", "um holerite")).toMatch(/não foi reconhecido como um holerite/);
  });
});
