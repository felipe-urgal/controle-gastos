import { describe, expect, it } from "vitest";

import { fitImportDescription } from "@/app/lib/transactions/import/import-description";

describe("fitImportDescription", () => {
  it("não altera descrições que já cabem", () => {
    expect(fitImportDescription("Mercado   do   bairro")).toBe("Mercado do bairro");
    const exact = "a".repeat(100);
    expect(fitImportDescription(exact)).toBe(exact);
  });

  it("remove ruído repetido dos Pix longos antes de cortar", () => {
    const pix =
      "Transferência recebida pelo Pix via Open Banking - Maria da Silva - •••.123.456-•• - MERCADO PAGO IP LTDA. (0323) Agência: 1 Conta: 1234567890-1";
    const fitted = fitImportDescription(pix);
    expect(fitted.length).toBeLessThanOrEqual(100);
    expect(fitted).toBe("Transferência recebida pelo Pix - Maria da Silva - MERCADO PAGO IP LTDA.");
  });

  it("corta em limite de palavra com reticências quando ainda não cabe", () => {
    const long = `Pagamento de boleto efetuado - ${"EMPRESA DE ENERGIA E SANEAMENTO ".repeat(5)}`;
    const fitted = fitImportDescription(long);
    expect(fitted.length).toBeLessThanOrEqual(100);
    expect(fitted.endsWith("…")).toBe(true);
    expect(fitted).not.toMatch(/\s…$/);
    expect(fitted.startsWith("Pagamento de boleto efetuado - EMPRESA")).toBe(true);
  });

  it("corta no limite quando não há espaço para quebrar", () => {
    expect(fitImportDescription("x".repeat(150))).toHaveLength(100);
  });
});
