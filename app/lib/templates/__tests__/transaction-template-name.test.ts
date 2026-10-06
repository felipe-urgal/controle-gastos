import { describe, expect, it } from "vitest";

import { normalizeTransactionTemplateName } from "@/app/lib/templates/transaction-template-name";

describe("normalizeTransactionTemplateName", () => {
  it("normalizes case and repeated whitespace", () => {
    expect(normalizeTransactionTemplateName("  Almoço   de Domingo ")).toBe(
      "almoço de domingo",
    );
  });

  it("gives the same identity to visually equivalent names", () => {
    expect(normalizeTransactionTemplateName("Almoço")).toBe(
      normalizeTransactionTemplateName("almoço"),
    );
  });
});
