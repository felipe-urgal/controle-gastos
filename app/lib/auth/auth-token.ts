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

export function signAuthToken(userId: string) {
  return jwt.sign(
    { sub: userId },
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

  if (typeof decoded === "string" || typeof decoded.sub !== "string") {
    throw new Error("INVALID_TOKEN_SUBJECT");
  }

  return { userId: decoded.sub };
}
