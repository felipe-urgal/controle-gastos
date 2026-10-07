import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const privacySurfaces = {
  "imports/previews": [
    "app/components/pages/transactions/import/index.tsx",
    "app/components/pages/investment/investment-import-modal.tsx",
  ],
  reports: [
    "app/components/pages/financial-comparison/financial-comparison-page.tsx",
    "app/components/pages/investment/annual-income-report-card.tsx",
    "app/components/pages/investment/annual-tax-support-report-card.tsx",
  ],
  payroll: [
    "app/components/pages/payroll/payroll-center.tsx",
    "app/components/pages/payroll/payroll-annual-reconciliation-section.tsx",
  ],
  "investments/fiscal": [
    "app/components/pages/investment/investments-center.tsx",
    "app/components/pages/investment/investment-tax-control-card.tsx",
    "app/components/pages/investment/foreign-investment-annual-tax-card.tsx",
  ],
} as const;

describe("showValues privacy surface inventory", () => {
  for (const [surface, paths] of Object.entries(privacySurfaces)) {
    it(`keeps ${surface} wired to the global visibility preference`, () => {
      for (const path of paths) {
        const source = readFileSync(join(process.cwd(), path), "utf8");
        expect(source, path).toContain("showValues");
      }
    });
  }

  it("keeps text and accessible attributes covered by the cross-module E2E", () => {
    const source = readFileSync(
      join(process.cwd(), "tests/e2e/user-show-values-cross-module.spec.mjs"),
      "utf8",
    );

    expect(source).toContain("document.body.innerText");
    expect(source).toContain("aria-label");
    expect(source).toContain("title");
    expect(source).toContain("data-tooltip");
  });
});
