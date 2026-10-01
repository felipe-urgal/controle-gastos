import { deflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import {
  PDF_EXPERIMENT_MAX_BYTES,
  PdfExperimentError,
  parsePdfImportExperiment,
} from "@/app/lib/transactions/import/pdf-experiment";

function makePdf(streams: Array<{ content: string; compressed?: boolean }>, pages = 1) {
  const pageObjects = Array.from(
    { length: pages },
    (_, index) => `${index + 1} 0 obj << /Type /Page >> endobj`,
  ).join("\n");
  const body = streams
    .map(({ content, compressed = false }, index) => {
      const bytes = compressed
        ? deflateSync(Buffer.from(content, "latin1"))
        : Buffer.from(content, "latin1");
      const dictionary = compressed
        ? `<< /Length ${bytes.length} /Filter /FlateDecode >>`
        : `<< /Length ${bytes.length} >>`;
      return Buffer.concat([
        Buffer.from(`\n${index + 20} 0 obj ${dictionary}\nstream\n`, "latin1"),
        bytes,
        Buffer.from("\nendstream\nendobj", "latin1"),
      ]);
    });

  return new Uint8Array(
    Buffer.concat([
      Buffer.from(`%PDF-1.7\n${pageObjects}`, "latin1"),
      ...body,
      Buffer.from("\n%%EOF", "latin1"),
    ]),
  );
}

describe("PDF import experiment", () => {
  it("extracts transactions from a textual PDF stream", () => {
    const pdf = makePdf([
      {
        content: [
          "BT",
          "(Data Descricao Valor) Tj T*",
          "(01/09/2026 Mercado Central -123,45) Tj T*",
          "(02/09/2026 Salario +5.000,00) Tj",
          "ET",
        ].join("\n"),
      },
    ]);

    const result = parsePdfImportExperiment(pdf);

    expect(result.pageCount).toBe(1);
    expect(result.items).toEqual([
      expect.objectContaining({
        source: "PDF",
        date: "2026-09-01",
        amountCents: 12345,
        type: "EXPENSE",
        description: "Mercado Central",
        errors: [],
      }),
      expect.objectContaining({
        date: "2026-09-02",
        amountCents: 500000,
        type: "INCOME",
        description: "Salario",
        errors: [],
      }),
    ]);
  });

  it("supports multiple pages, FlateDecode and multiline descriptions", () => {
    const pdf = makePdf(
      [
        {
          compressed: true,
          content: [
            "BT",
            "(03/09/2026 COMPRA) Tj T*",
            "(PADARIA DO BAIRRO 42,90 D) Tj",
            "ET",
          ].join("\n"),
        },
        {
          content: "BT\n(04/09/26 PIX RECEBIDO 150,00 C) Tj\nET",
        },
      ],
      2,
    );

    const result = parsePdfImportExperiment(pdf);

    expect(result.pageCount).toBe(2);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        description: "COMPRA PADARIA DO BAIRRO",
        amountCents: 4290,
        type: "EXPENSE",
      }),
    );
    expect(result.items[1]).toEqual(
      expect.objectContaining({
        date: "2026-09-04",
        amountCents: 15000,
        type: "INCOME",
      }),
    );
  });

  it("ignores balance rows instead of creating false transactions", () => {
    const pdf = makePdf([
      {
        content: [
          "BT",
          "(01/09/2026 Saldo anterior 1.000,00 C) Tj T*",
          "(02/09/2026 Cafe 10,00 D) Tj T*",
          "(30/09/2026 Saldo final 990,00 C) Tj",
          "ET",
        ].join("\n"),
      },
    ]);

    const result = parsePdfImportExperiment(pdf);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].description).toBe("Cafe");
  });

  it("marks ambiguous rows for human review", () => {
    const pdf = makePdf([
      {
        content: "BT\n(05/09/2026 TED RECEBIDA 100,00 C 1.100,00 C) Tj\nET",
      },
    ]);

    const result = parsePdfImportExperiment(pdf);

    expect(result.items[0].errors).toContain(
      "Mais de um valor monetário foi encontrado; revisar manualmente.",
    );
  });

  it("rejects corrupted, oversized and non-transaction PDFs", () => {
    expect(() =>
      parsePdfImportExperiment(new TextEncoder().encode("not a pdf")),
    ).toThrow(PdfExperimentError);

    expect(() =>
      parsePdfImportExperiment(new Uint8Array(PDF_EXPERIMENT_MAX_BYTES + 1)),
    ).toThrow("2 MB");

    expect(() =>
      parsePdfImportExperiment(
        makePdf([{ content: "BT\n(Apenas um cabecalho) Tj\nET" }]),
      ),
    ).toThrow("Nenhum lançamento");
  });

  it("rejects PDFs above the page limit", () => {
    expect(() =>
      parsePdfImportExperiment(
        makePdf([{ content: "BT\n(01/09/2026 Cafe 10,00 D) Tj\nET" }], 21),
      ),
    ).toThrow("20 páginas");
  });
});
