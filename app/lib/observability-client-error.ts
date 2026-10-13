/** Contexto seguro e limitado de erros do browser (allowlist validada no servidor). */
export const CLIENT_ERROR_SURFACES = ["route", "global"] as const;
export type ClientErrorSurface = (typeof CLIENT_ERROR_SURFACES)[number];

const MAX_SEGMENTS = 6;
const MAX_SEGMENT_LENGTH = 24;
const STATIC_SEGMENT = /^[a-z]+(?:-[a-z]+)*$/;

export function parseClientErrorSurface(value: unknown): ClientErrorSurface | undefined {
  return typeof value === "string" &&
    (CLIENT_ERROR_SURFACES as readonly string[]).includes(value)
    ? (value as ClientErrorSurface)
    : undefined;
}

/**
 * Normaliza um pathname sem query/hash e sem identificadores: segmentos
 * estáticos (letras e hífens) são mantidos; qualquer outro vira `:id`.
 */
export function normalizeClientErrorPath(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    return undefined;
  }
  if (!value.startsWith("/")) return undefined;

  const pathname = value.split(/[?#]/, 1)[0] ?? "";
  const segments = pathname.split("/").filter(Boolean).slice(0, MAX_SEGMENTS);
  const normalized = segments.map((segment) =>
    segment.length <= MAX_SEGMENT_LENGTH && STATIC_SEGMENT.test(segment)
      ? segment
      : ":id",
  );
  return `/${normalized.join("/")}`;
}
