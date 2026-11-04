import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/share/route";

function multipart(entries: Record<string, string | File>, headers: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) form.append(key, value);
  return new Request("http://localhost/api/share", { method: "POST", body: form, headers });
}

describe("POST /api/share (fallback sem service worker)", () => {
  it("redireciona o texto compartilhado para a página de prévia", async () => {
    const response = await POST(multipart({ text: "Compra R$ 45,90 em PADARIA" }));

    expect(response.status).toBe(303);
    const location = response.headers.get("location")!;
    expect(location.startsWith("/compartilhar?")).toBe(true);
    expect(new URLSearchParams(location.split("?")[1]).get("text")).toBe("Compra R$ 45,90 em PADARIA");
  });

  it("o destino é sempre um caminho relativo do próprio app, mesmo com URL de outro site no texto", async () => {
    const response = await POST(multipart({ text: "https://evil.example/", url: "https://evil.example/" }));
    const location = response.headers.get("location")!;

    expect(location.startsWith("/compartilhar")).toBe(true);
    expect(location.startsWith("//")).toBe(false);
    expect(location).not.toMatch(/^https?:/);
  });

  it("imagem não sobe para o servidor: é ignorada e o texto segue", async () => {
    const response = await POST(
      multipart({ text: "mercado 10", imagem: new File([new Uint8Array(100)], "r.png", { type: "image/png" }) }),
    );

    const location = response.headers.get("location")!;
    expect(new URLSearchParams(location.split("?")[1]).get("text")).toBe("mercado 10");
    expect(location).not.toContain("imagem");
  });

  it("sem texto vai para a página vazia; corpo ilegível também", async () => {
    expect((await POST(multipart({}))).headers.get("location")).toBe("/compartilhar");

    const garbage = new Request("http://localhost/api/share", {
      method: "POST",
      body: "isso não é multipart",
      headers: { "content-type": "multipart/form-data; boundary=x" },
    });
    expect((await POST(garbage)).headers.get("location")).toBe("/compartilhar");
  });

  it("recusa corpo maior que 1 MB com 413, sem tentar ler", async () => {
    const response = await POST(multipart({ text: "x" }, { "content-length": String(2 * 1024 * 1024) }));
    expect(response.status).toBe(413);
  });
});
