import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { isProtectedPath } from "@/app/lib/auth/protected-routes";

type Shortcut = { name: string; short_name: string; url: string; icons: Array<{ src: string }> };
type ShareTarget = {
  action: string;
  method: string;
  enctype: string;
  params: { title: string; text: string; url: string; files: Array<{ name: string; accept: string[] }> };
};
type Manifest = { scope: string; shortcuts: Shortcut[]; share_target: ShareTarget };

const manifest = JSON.parse(readFileSync(join(process.cwd(), "public/manifest.json"), "utf8")) as Manifest;

describe("manifest do PWA: atalhos do ícone", () => {
  it("os quatro primeiros (os que o Android mostra) são lançar despesa, receita, transferência e compromissos", () => {
    expect(manifest.shortcuts.slice(0, 4).map((item) => item.url)).toEqual([
      "/transacoes/nova?type=expense",
      "/transacoes/nova?type=income",
      "/transacoes/nova?mode=transfer",
      "/compromissos",
    ]);
  });

  it("todo atalho fica no escopo do app, aponta para tela autenticada e tem nome curto e ícone", () => {
    for (const shortcut of manifest.shortcuts) {
      const url = new URL(shortcut.url, "https://app.example.test");
      expect(url.origin).toBe("https://app.example.test");
      expect(url.pathname.startsWith(manifest.scope)).toBe(true);
      expect(isProtectedPath(url.pathname)).toBe(true);
      expect(shortcut.short_name.length).toBeLessThanOrEqual(14);
      expect(shortcut.icons.length).toBeGreaterThan(0);
    }
  });

  it("os parâmetros dos atalhos são os que a tela de nova transação entende", () => {
    const params = manifest.shortcuts
      .map((item) => new URL(item.url, "https://app.example.test"))
      .filter((url) => url.pathname === "/transacoes/nova")
      .map((url) => Object.fromEntries(url.searchParams));

    for (const query of params) {
      if ("type" in query) expect(["expense", "income"]).toContain(query.type);
      if ("mode" in query) expect(query.mode).toBe("transfer");
    }
  });

  it("não repete destinos", () => {
    const urls = manifest.shortcuts.map((item) => item.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("manifest do PWA: compartilhar para o app", () => {
  const share = manifest.share_target;
  const sw = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

  it("envia por POST multipart para a rota que o service worker intercepta", () => {
    expect(share.method).toBe("POST");
    expect(share.enctype).toBe("multipart/form-data");
    expect(share.action).toBe("/api/share");
    expect(sw).toContain(`const SHARE_PATH = "${share.action}"`);
  });

  it("os campos do formulário são os que o service worker e a rota leem", () => {
    expect(share.params).toMatchObject({ title: "title", text: "text", url: "url" });
    expect(share.params.files).toHaveLength(1);
    expect(share.params.files[0].name).toBe("imagem");
    expect(sw).toMatch(/getAll\("imagem"\)/);
  });

  it("aceita só os formatos que o OCR de recibo lê (JPG e PNG)", () => {
    expect(share.params.files[0].accept.sort()).toEqual(["image/jpeg", "image/png"]);
  });

  it("a página de destino fica no escopo e exige login", () => {
    expect("/compartilhar".startsWith(manifest.scope)).toBe(true);
    expect(isProtectedPath("/compartilhar")).toBe(true);
  });
});
