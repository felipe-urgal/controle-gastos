/**
 * Contrato único de request ID, compatível com proxy (Edge) e rotas (Node).
 *
 * O ID é um identificador de CORRELAÇÃO: o cliente pode fornecê-lo e reutilizá-lo.
 * Nunca use-o como identificador de segurança/auditoria nem para autorização.
 */
export const SAFE_REQUEST_ID = /^[a-zA-Z0-9._:-]{8,128}$/;

export function resolveRequestId(incoming: string | null | undefined): string {
  const candidate = incoming?.trim();
  return candidate && SAFE_REQUEST_ID.test(candidate)
    ? candidate
    : globalThis.crypto.randomUUID();
}
