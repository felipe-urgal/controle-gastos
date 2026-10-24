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

  it("usa a escala tipográfica do Tailwind (sem text-[Npx] ou text-[Nrem] soltos)", () => {
    const offenders = sourceFiles(ROOT).flatMap((file) =>
      (readFileSync(file, "utf8").match(/\btext-\[\d+(?:\.\d+)?(?:px|rem)\]/g) ?? []).map(
        (match) => `${relative(process.cwd(), file)}: ${match}`,
      ),
    );

    expect(offenders).toEqual([]);
  });

  it("usa os raios do design system (rounded-[var(--radius-*)]), sem px soltos", () => {
    const offenders = sourceFiles(ROOT).flatMap((file) =>
      (readFileSync(file, "utf8").match(/\brounded-\[\d+px\]/g) ?? []).map(
        (match) => `${relative(process.cwd(), file)}: ${match}`,
      ),
    );

    expect(offenders).toEqual([]);
  });

  it("usa só a escala de breakpoints padrão (+ um ponto compacto de 360px)", () => {
    const offenders = sourceFiles(ROOT).flatMap((file) => {
      const matches = readFileSync(file, "utf8").match(/\b(?:min|max)-\[\d+px\]:/g) ?? [];
      return matches
        .filter((match) => !["min-[360px]:", "max-[359px]:"].includes(match))
        .map((match) => `${relative(process.cwd(), file)}: ${match}`);
    });

    expect(offenders).toEqual([]);
  });

  it("não usa z-index numérico global (use os tokens --z-*)", () => {
    const offenders = sourceFiles(ROOT).flatMap((file) => {
      const matches = readFileSync(file, "utf8").match(/\bz-(?:30|40|50)\b|\bz-\[(?:60|70|80|90|1000)\]/g) ?? [];
      return matches.map((match) => `${relative(process.cwd(), file)}: ${match}`);
    });

    expect(offenders).toEqual([]);
  });

  it("títulos <h1> usam pageTitleClassName/appBarTitleClassName (sem tamanho literal)", () => {
    // Fora do shell autenticado: landing e telas de autenticação têm escala própria.
    const allowed = ["components/layout/auth-shell/", "components/pages/home/", "components/base-pages/page-title/"];
    const offenders = sourceFiles(join(ROOT, "components")).flatMap((file) => {
      const path = relative(process.cwd(), file);
      if (allowed.some((prefix) => path.includes(prefix))) return [];
      const matches = readFileSync(file, "utf8").match(/<h1\b[^>]*className="[^"]*"/g) ?? [];
      return matches
        .filter((match) => !/sr-only/.test(match))
        .map((match) => `${path}: ${match.slice(0, 90)}`);
    });

    expect(offenders).toEqual([]);
  });

  it("não usa modificadores !important do Tailwind em classes (amplie o primitivo)", () => {
    const offenders = sourceFiles(join(ROOT, "components")).flatMap((file) => {
      const matches =
        readFileSync(file, "utf8").match(/[\s"'`:]!(?:border|bg|p[xytrbl]?|m[xytrbl]?|shadow|rounded|min-h|min-w|max-w|max-h|text|outline|ring|h|w)(?:-|\b)/g) ?? [];
      return matches.map((match) => `${relative(process.cwd(), file)}: ${match.trim()}`);
    });

    expect(offenders).toEqual([]);
  });
});
