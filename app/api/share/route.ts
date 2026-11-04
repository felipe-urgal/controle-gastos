import { pickSharedText, shareTargetHref } from "@/app/lib/transactions/share-target";

/** O servidor só repassa texto: imagem é lida no navegador (OCR local) e nunca sobe para cá. */
const MAX_BODY_BYTES = 1024 * 1024;

/**
 * Fallback do "compartilhar para o app". Normalmente o service worker trata esta URL; se o
 * compartilhamento chegar antes de ele estar ativo, o texto ainda chega à tela de prévia. Não lê
 * nem devolve dado do usuário: só monta um redirecionamento fixo para `/compartilhar`.
 */
export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 });
  }

  let text = "";
  try {
    const form = await request.formData();
    const field = (name: string) => {
      const value = form.get(name);
      return typeof value === "string" ? value : null;
    };
    text = pickSharedText({ title: field("title"), text: field("text"), url: field("url") });
  } catch {
    // Corpo ilegível: segue para a tela vazia, que explica o que fazer.
  }

  // Location relativo: não depende do host que o proxy repassa.
  return new Response(null, { status: 303, headers: { Location: shareTargetHref({ text, hasImage: false }) } });
}
