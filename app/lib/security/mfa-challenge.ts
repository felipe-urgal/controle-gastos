import jwt from "jsonwebtoken";

const MFA_CHALLENGE_ISSUER = "controle-gastos-mfa";
const MFA_CHALLENGE_AUDIENCE = "controle-gastos-mfa-login";
const MFA_CHALLENGE_PURPOSE = "mfa-login";
const MFA_CHALLENGE_TTL = "5m";
const MFA_CHALLENGE_ALGORITHM = "HS256" as const;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET_NOT_CONFIGURED");
  }

  return secret;
}

export function signMfaChallenge(userId: string, challengeId: string) {
  if (!userId || !challengeId) {
    throw new Error("MFA_CHALLENGE_INPUT_INVALID");
  }

  return jwt.sign(
    {
      sub: userId,
      purpose: MFA_CHALLENGE_PURPOSE,
    },
    getJwtSecret(),
    {
      algorithm: MFA_CHALLENGE_ALGORITHM,
      expiresIn: MFA_CHALLENGE_TTL,
      issuer: MFA_CHALLENGE_ISSUER,
      audience: MFA_CHALLENGE_AUDIENCE,
      jwtid: challengeId,
    }
  );
}

export function verifyMfaChallenge(token: string) {
  const decoded = jwt.verify(token, getJwtSecret(), {
    algorithms: [MFA_CHALLENGE_ALGORITHM],
    issuer: MFA_CHALLENGE_ISSUER,
    audience: MFA_CHALLENGE_AUDIENCE,
  });

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    typeof decoded.jti !== "string" ||
    decoded.purpose !== MFA_CHALLENGE_PURPOSE
  ) {
    throw new Error("INVALID_MFA_CHALLENGE");
  }

  return {
    userId: decoded.sub,
    challengeId: decoded.jti,
  };
}
