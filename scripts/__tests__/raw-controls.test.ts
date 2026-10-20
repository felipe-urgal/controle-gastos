import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { countRawControls } from "../count-raw-controls.mjs";

/**
 * Catraca de controles crus (<button>, <input>, <select>, <textarea>) fora de `components/ui`.
 * Prefira `Button`, `IconButton`, `Chip`, `Input` e `Select`. Ao migrar, rode
 * `node scripts/count-raw-controls.mjs --write` para baixar o baseline.
 */
describe("catraca de controles crus", () => {
  it("não aumenta o número de controles crus por arquivo", () => {
    const baseline: Record<string, number> = JSON.parse(
      readFileSync(join(process.cwd(), "scripts/__tests__/raw-controls-baseline.json"), "utf8"),
    );
    const counts = countRawControls() as Record<string, number>;
    const offenders = Object.entries(counts)
      .filter(([file, total]) => total > (baseline[file] ?? 0))
      .map(([file, total]) => `${file}: ${total} > ${baseline[file] ?? 0}`);

    expect(offenders).toEqual([]);
  });
});
