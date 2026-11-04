import { describe, expect, it } from "vitest";

import {
  draftFromReceipt,
  pickSharedText,
  readShareParams,
  SHARE_MAX_TEXT_LENGTH,
  shareTargetHref,
} from "@/app/lib/transactions/share-target";

const today = { year: 2026, month: 11, day: 4 };

describe("pickSharedText", () => {
  it("prefere o texto, depois o título, depois o link", () => {
    expect(pickSharedText({ title: "Banco", text: "Compra R$ 10,00", url: "https://x.test" })).toBe("Compra R$ 10,00");
    expect(pickSharedText({ title: "Banco", text: "  ", url: "https://x.test" })).toBe("Banco");
    expect(pickSharedText({ title: null, text: null, url: "https://x.test" })).toBe("https://x.test");
    expect(pickSharedText({})).toBe("");
  });

  it("apara espaços e corta textos enormes", () => {
    expect(pickSharedText({ text: "  mercado 10  " })).toBe("mercado 10");
    expect(pickSharedText({ text: "a".repeat(SHARE_MAX_TEXT_LENGTH + 500) })).toHaveLength(SHARE_MAX_TEXT_LENGTH);
  });
});

describe("shareTargetHref e readShareParams", () => {
  it("vão e voltam sem perder o texto, com acentos, símbolos e quebras de linha", () => {
    const text = "Compra aprovada R$ 45,90 em PADARIA & CIA\nem 04/11 às 14:32?";
    const href = shareTargetHref({ text, hasImage: false });
    const params = new URL(href, "https://app.example.test").searchParams;

    expect(href.startsWith("/compartilhar?")).toBe(true);
    expect(readShareParams(params)).toEqual({ text, hasImage: false });
  });

  it("marca a imagem e, sem nada, volta para a página sem parâmetros", () => {
    expect(shareTargetHref({ text: "", hasImage: true })).toBe("/compartilhar?imagem=1");
    expect(shareTargetHref({ text: "   ", hasImage: false })).toBe("/compartilhar");
  });

  it("só '1' liga a imagem e o texto é limitado ao ler", () => {
    expect(readShareParams(new URLSearchParams("imagem=true")).hasImage).toBe(false);
    expect(readShareParams(new URLSearchParams("imagem=1")).hasImage).toBe(true);
    expect(readShareParams(new URLSearchParams(`text=${"x".repeat(5_000)}`)).text).toHaveLength(SHARE_MAX_TEXT_LENGTH);
    expect(readShareParams(new URLSearchParams(""))).toEqual({ text: "", hasImage: false });
  });
});

describe("draftFromReceipt", () => {
  it("monta uma despesa com o que foi lido com segurança", () => {
    expect(
      draftFromReceipt(
        { amountCents: 4_590, date: { year: 2026, month: 10, day: 30 }, description: "Padaria Central" },
        today,
      ),
    ).toEqual({
      ok: true,
      amountCents: 4_590,
      description: "Padaria Central",
      type: "EXPENSE",
      typeInferred: false,
      date: { year: 2026, month: 10, day: 30 },
      dateSource: "full",
      accountHint: null,
      confident: true,
    });
  });

  it("sem valor seguro não há rascunho (o valor nunca é inventado)", () => {
    expect(draftFromReceipt({ amountCents: undefined, date: undefined, description: "Padaria" }, today)).toBeNull();
  });

  it("data ou descrição ilegíveis viram hoje e vazio; data impossível é ignorada", () => {
    expect(draftFromReceipt({ amountCents: 100, date: undefined, description: undefined }, today)).toMatchObject({
      date: today,
      dateSource: "default",
      description: "",
    });
    expect(
      draftFromReceipt({ amountCents: 100, date: { year: 2026, month: 2, day: 31 }, description: "x" }, today),
    ).toMatchObject({ date: today, dateSource: "default" });
  });

  it("limita a descrição ao tamanho aceito", () => {
    const draft = draftFromReceipt({ amountCents: 100, date: undefined, description: "d".repeat(300) }, today);
    expect(draft?.description.length).toBe(100);
  });
});
