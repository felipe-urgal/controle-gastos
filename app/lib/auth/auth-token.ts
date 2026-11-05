import jwt from "jsonwebtoken";
import { getJwtSecret } from "@/app/lib/auth/jwt-secret";

const TOKEN_ISSUER = "controle-gastos";
const TOKEN_AUDIENCE = "controle-gastos-users";
// Tokens emitidos antes da troca do placeholder "seu-app" continuam válidos até expirarem (7 dias), para ninguém ser
// deslogado no deploy. Depois desse prazo, remova estas duas constantes e use só as de cima (ver docs/AUTH.md).
const LEGACY_TOKEN_ISSUER = "seu-app";
const LEGACY_TOKEN_AUDIENCE = "seu-app-users";
const TOKEN_TTL = "7d";
const TOKEN_ALGORITHM = "HS256" as const;

function isValidAuthVersion(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

/** `sessionId` liga o token a uma linha de `AuthSession` (revogável por aparelho). Token sem ele é do tempo anterior às sessões. */
export function signAuthToken(userId: string, authVersion = 0, sessionId?: string) {
  if (!isValidAuthVersion(authVersion)) {
    throw new Error("INVALID_AUTH_VERSION");
  }

  return jwt.sign(
    { sub: userId, authVersion, ...(sessionId ? { sid: sessionId } : {}) },
    getJwtSecret(),
    {
      algorithm: TOKEN_ALGORITHM,
      expiresIn: TOKEN_TTL,
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    }
  );
}

export function verifyAuthToken(token: string) {
  const decoded = jwt.verify(token, getJwtSecret(), {
    algorithms: [TOKEN_ALGORITHM],
    issuer: [TOKEN_ISSUER, LEGACY_TOKEN_ISSUER],
    audience: [TOKEN_AUDIENCE, LEGACY_TOKEN_AUDIENCE],
  });

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    !isValidAuthVersion(decoded.authVersion)
  ) {
    throw new Error("INVALID_TOKEN_CLAIMS");
  }

  const sessionId = typeof decoded.sid === "string" && decoded.sid.length > 0 ? decoded.sid : undefined;
  return { userId: decoded.sub, authVersion: decoded.authVersion, sessionId };
}
