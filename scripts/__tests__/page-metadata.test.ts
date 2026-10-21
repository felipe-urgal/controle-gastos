import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const PAGES = join(process.cwd(), "app/(pages)");

function pageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pageFiles(path);
    return name === "page.tsx" ? [path] : [];
  });
}

function routeOf(file: string) {
  const segments = relative(PAGES, file)
    .split(sep)
    .slice(0, -1)
    .filter((segment) => !/^\(.+\)$/.test(segment));
  return `/${segments.join("/")}`.replace(/\/$/, "") || "/";
}

describe("metadata das páginas", () => {
  it("canonical e openGraph.url apontam para a própria rota", () => {
    const mismatches = pageFiles(PAGES).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const urls = [...source.matchAll(/(?:canonical|url):\s*"https?:\/\/[^"/]+(\/[^"]*)"/g)].map((match) => match[1]);
      const route = routeOf(file);
      return urls
        .filter((path) => (path.replace(/\/$/, "") || "/") !== route)
        .map((path) => `${relative(process.cwd(), file)}: ${path} (esperado ${route})`);
    });

    expect(mismatches).toEqual([]);
  });

  it("rotas autenticadas (home) são noindex e não herdam o canonical da raiz", () => {
    const layout = readFileSync(join(PAGES, "(home)/layout.tsx"), "utf8");

    expect(layout).toMatch(/robots:\s*\{\s*index:\s*false/);
    expect(layout).toMatch(/canonical:\s*null/);
  });
});
