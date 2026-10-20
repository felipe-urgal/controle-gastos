import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "app");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx|css)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

describe("guardrails de design", () => {
  it("não usa texto menor que 12px (text-[Npx] com N < 12)", () => {
    const offenders = sourceFiles(ROOT).flatMap((file) => {
      const matches = readFileSync(file, "utf8").match(/text-\[(\d+(?:\.\d+)?)px\]/g) ?? [];
      return matches
        .filter((match) => Number.parseFloat(match.slice(6)) < 12)
        .map((match) => `${relative(process.cwd(), file)}: ${match}`);
    });

    expect(offenders).toEqual([]);
  });
});
