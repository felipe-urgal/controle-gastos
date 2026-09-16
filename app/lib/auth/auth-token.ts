import jwt from "jsonwebtoken";

const TOKEN_ISSUER = "seu-app";
const TOKEN_AUDIENCE = "seu-app-users";
const TOKEN_TTL = "7d";
const TOKEN_ALGORITHM = "HS256" as const;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET_NOT_CONFIGURED");
  }

  return secret;
}

function isValidAuthVersion(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

export function signAuthToken(userId: string, authVersion: number) {
  if (!isValidAuthVersion(authVersion)) {
    throw new Error("INVALID_AUTH_VERSION");
  }

  return jwt.sign(
    { sub: userId, authVersion },
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
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    !isValidAuthVersion(decoded.authVersion)
  ) {
    throw new Error("INVALID_TOKEN_CLAIMS");
  }

  return { userId: decoded.sub, authVersion: decoded.authVersion };
}
