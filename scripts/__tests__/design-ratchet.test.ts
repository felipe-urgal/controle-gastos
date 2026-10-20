import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Catraca de dívida de design: os limites abaixo só podem diminuir.
 * Ao migrar um arquivo (overlay → ModalShell, hex → token), reduza ou remova a entrada.
 */
const ROOT = join(process.cwd(), "app/components");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return name.endsWith(".tsx") && !/\.test\./.test(name) ? [path] : [];
  });
}

function countByFile(pattern: RegExp) {
  const counts = new Map<string, number>();
  for (const file of sourceFiles(ROOT)) {
    const total = readFileSync(file, "utf8").match(pattern)?.length ?? 0;
    if (total > 0) counts.set(relative(process.cwd(), file), total);
  }
  return counts;
}

function overages(counts: Map<string, number>, allowed: Record<string, number>) {
  return [...counts]
    .filter(([file, total]) => total > (allowed[file] ?? 0))
    .map(([file, total]) => `${file}: ${total} > ${allowed[file] ?? 0}`);
}

// Overlays fora do ModalShell. Infra (overlays/, layout/, feedback/, navigation/) é permitida.
const OVERLAY_ALLOWED: Record<string, number> = {
  "app/components/overlays/modal-shell/index.tsx": 1,
  "app/components/overlays/confirmation-modal/index.tsx": 1,
  "app/components/overlays/delete-overlay/index.tsx": 1,
  "app/components/layout/mobile-more-menu/index.tsx": 1,
  "app/components/layout/background-particles/index.tsx": 1,
  "app/components/layout/global-search-dialog/index.tsx": 1,
  "app/components/navigation/dynamic-filters/index.tsx": 1,
  "app/components/feedback/splash-screen/index.tsx": 2,
  // Dívida de migração (#882):
  "app/components/pages/category/index/mobile-categories-center/index.tsx": 2,
  "app/components/pages/transactions/import/index.tsx": 1,
  "app/components/pages/transactions/index/orbit-transactions.tsx": 3,
  "app/components/pages/transactions/form/index.tsx": 1, // migrado no #902
  "app/components/pages/transactions/transfer-form/index.tsx": 1, // migrado no #902
};

// Cores literais. color-selector é a paleta que o usuário escolhe (dado, não tema).
const HEX_ALLOWED: Record<string, number> = {
  "app/components/ui/color-selector/index.tsx": 13,
  // Dívida de tokens (#880):
  "app/components/pages/category/show/category-info/index.tsx": 1,
  "app/components/pages/category/show/mobile-category-show/index.tsx": 2,
  "app/components/pages/category/index/monthly-limits/index.tsx": 7,
  "app/components/pages/category/index/mobile-categories-center/index.tsx": 8,
  "app/components/pages/category/form/index.tsx": 9,
  "app/components/pages/net-worth/net-worth-page/index.tsx": 1,
  "app/components/pages/transactions/show/mobile-transaction-show/index.tsx": 3,
  "app/components/pages/transactions/index/orbit-transactions.tsx": 1,
  "app/components/pages/account/show/account-info/index.tsx": 1,
  "app/components/pages/account/show/mobile-account-show/index.tsx": 1,
  "app/components/pages/account/index/orbit-accounts.tsx": 4,
  "app/components/pages/account/form/index.tsx": 10,
};

describe("catraca de dívida de design", () => {
  it("não cria novos overlays `fixed inset-0` fora do ModalShell", () => {
    expect(overages(countByFile(/fixed inset-0/g), OVERLAY_ALLOWED)).toEqual([]);
  });

  it("não cria novas cores hex literais em componentes", () => {
    expect(overages(countByFile(/#[0-9a-fA-F]{6}\b/g), HEX_ALLOWED)).toEqual([]);
  });
});
