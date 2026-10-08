export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/calendario",
  "/categorias",
  "/comparar",
  "/contas",
  "/compromissos",
  "/dividas",
  "/estabelecimentos",
  "/fechamento",
  "/metas",
  "/modelos",
  "/patrimonio",
  "/investimentos",
  "/recorrencias",
  "/rendimentos-trabalho",
  "/tags",
  "/transacoes",
  "/usuario",
] as const;

export const AUTHENTICATED_HOME = "/dashboard";

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Aceita apenas caminhos internos de rotas protegidas. Rejeita URLs absolutas,
 * `//host`, barras invertidas, protocolos e caracteres de controle.
 */
export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 512) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw, "http://localhost");
  } catch {
    return null;
  }

  if (parsed.origin !== "http://localhost") return null;
  if (!isProtectedPath(parsed.pathname)) return null;

  return `${parsed.pathname}${parsed.search}`;
}

export function resolvePostLoginPath(search: string) {
  const next = new URLSearchParams(search).get("next");
  return sanitizeNextPath(next) ?? AUTHENTICATED_HOME;
}
