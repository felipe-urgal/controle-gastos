import { describe, expect, it } from "vitest";

import { buildDigestEmail } from "@/app/lib/notifications/notification-email";

const links = { centerUrl: "https://app.example.test/avisos", preferencesUrl: "https://app.example.test/usuario" };

describe("buildDigestEmail", () => {
  it("assunto no singular e no plural", () => {
    const one = buildDigestEmail({ name: "Ana", items: [{ title: "Fatura", body: "vence amanhã", severity: "WARNING" }], ...links });
    const many = buildDigestEmail({
      name: "Ana",
      items: [
        { title: "A", body: "a", severity: "INFO" },
        { title: "B", body: "b", severity: "URGENT" },
      ],
      ...links,
    });

    expect(one.subject).toBe("Controle de Gastos: 1 aviso para hoje");
    expect(many.subject).toBe("Controle de Gastos: 2 avisos para hoje");
  });

  it("traz título, texto, gravidade, link da central e como parar de receber, em HTML e em texto", () => {
    const { html, text } = buildDigestEmail({
      name: "Ana",
      items: [{ title: "Fatura · Nubank", body: "venceu há 2 dias", severity: "URGENT" }],
      ...links,
    });

    for (const content of [html, text]) {
      expect(content).toContain("Fatura · Nubank");
      expect(content).toContain("venceu há 2 dias");
      expect(content).toContain("Urgente");
      expect(content).toContain("https://app.example.test/avisos");
      expect(content).toContain("https://app.example.test/usuario");
    }
    expect(html).toContain("Olá, Ana!");
    expect(text).toContain("Olá, Ana!");
  });

  it("escapa tudo que vem de dados do usuário (nome de categoria, descrição, nome)", () => {
    const { html, text } = buildDigestEmail({
      name: '<img src=x onerror="alert(1)">',
      items: [{ title: '<script>alert("x")</script> & Cia', body: "<b>negrito</b>", severity: "INFO" }],
      ...links,
    });

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>negrito</b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp; Cia");
    // O texto puro não é HTML: fica como está, sem entidades.
    expect(text).toContain("<script>");
  });

  it("sem nome, a saudação é genérica", () => {
    const { html } = buildDigestEmail({ name: "  ", items: [{ title: "A", body: "a", severity: "INFO" }], ...links });
    expect(html).toContain("Olá!");
  });
});
