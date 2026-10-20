#!/usr/bin/env node
// Conta controles crus (<button>, <input>, <select>, <textarea>) por arquivo em app/components
// e compara com o baseline em scripts/__tests__/raw-controls-baseline.json.
// Uso:  node scripts/count-raw-controls.mjs          → tabela por módulo + diferença vs. baseline
//       node scripts/count-raw-controls.mjs --write  → grava o baseline atual (use ao migrar controles)
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const components = join(root, "app/components");
const baselinePath = join(root, "scripts/__tests__/raw-controls-baseline.json");

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return name.endsWith(".tsx") && !/\.test\./.test(name) ? [path] : [];
  });
}

export function countRawControls() {
  const counts = {};
  for (const file of files(components)) {
    const source = readFileSync(file, "utf8");
    const total = (source.match(/<(?:button|input|select|textarea)\b/g) ?? []).length;
    // Primitivos do design system são a implementação; não entram na conta.
    if (total > 0 && !relative(root, file).startsWith("app/components/ui/")) {
      counts[relative(root, file)] = total;
    }
  }
  return counts;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const counts = countRawControls();
  if (process.argv.includes("--write")) {
    writeFileSync(baselinePath, `${JSON.stringify(counts, Object.keys(counts).sort(), 2)}\n`);
    console.log("baseline atualizado");
  } else {
    let baseline = {};
    try {
      baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
    } catch {}
    const byModule = {};
    for (const [file, total] of Object.entries(counts)) {
      const key = file.split("/").slice(2, 4).join("/");
      byModule[key] = (byModule[key] ?? 0) + total;
    }
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    const baselineTotal = Object.values(baseline).reduce((sum, value) => sum + value, 0);
    console.table(byModule);
    console.log(`total: ${total} (baseline ${baselineTotal})`);
  }
}
