import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const protectedMetadataPages = [
  "app/(pages)/(home)/contas/show/[id]/page.tsx",
  "app/(pages)/(home)/contas/alterar/[id]/page.tsx",
  "app/(pages)/(home)/categorias/show/[id]/page.tsx",
  "app/(pages)/(home)/categorias/alterar/[id]/page.tsx",
  "app/(pages)/(home)/transacoes/show/[id]/page.tsx",
  "app/(pages)/(home)/transacoes/alterar/[id]/page.tsx",
  "app/(pages)/(home)/usuario/show/[id]/page.tsx",
  "app/(pages)/(home)/usuario/alterar/[id]/page.tsx",
];

const legacyMetadataServices = [
  "app/lib/services/account.service.ts",
  "app/lib/services/category.service.ts",
  "app/lib/services/transaction.service.ts",
  "app/lib/services/user.service.ts",
];

describe("protected route metadata privacy", () => {
  it.each(protectedMetadataPages)("keeps %s independent from private entity reads", (relativePath) => {
    const source = readFileSync(join(process.cwd(), relativePath), "utf8");

    expect(source).not.toContain("@/app/lib/services/");
    expect(source).not.toContain("@/app/lib/prisma");
    expect(source).not.toMatch(/get(?:Account|Category|Transaction|User)ById/);
  });

  it("removes the legacy server metadata services", () => {
    for (const relativePath of legacyMetadataServices) {
      expect(existsSync(join(process.cwd(), relativePath))).toBe(false);
    }
  });
});
