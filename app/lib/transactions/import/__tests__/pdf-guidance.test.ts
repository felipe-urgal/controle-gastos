import { describe, expect, it } from "vitest";

import { isPdfBytes, pdfGuidanceMessage } from "@/app/lib/transactions/import/pdf-guidance";

describe("pdf-guidance", () => {
  it("reconhece o cabeçalho de PDF", () => {
    expect(isPdfBytes(new TextEncoder().encode("%PDF-1.4\n..."))).toBe(true);
    expect(isPdfBytes(new TextEncoder().encode("date,title,amount"))).toBe(false);
    expect(isPdfBytes(new Uint8Array())).toBe(false);
  });

  it("orienta a usar CSV ou OFX quando o PDF não tem texto reconhecível", () => {
    const message = pdfGuidanceMessage(new TextEncoder().encode("%PDF-1.4\nnada útil"));
    expect(message).toMatch(/CSV ou OFX/);
  });
});
