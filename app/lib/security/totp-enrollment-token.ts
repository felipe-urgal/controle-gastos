import jwt from "jsonwebtoken";

const ENROLLMENT_ISSUER = "controle-gastos-mfa";
const ENROLLMENT_AUDIENCE = "controle-gastos-totp-enrollment";
const ENROLLMENT_PURPOSE = "totp-enrollment";
const ENROLLMENT_TTL = "10m";
const ENROLLMENT_TTL_SECONDS = 10 * 60;
const ENROLLMENT_ALGORITHM = "HS256" as const;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET_NOT_CONFIGURED");
  }

  return secret;
}

export function signTotpEnrollmentToken(args: {
  userId: string;
  secretEnvelope: string;
}) {
  if (!args.userId.trim() || !args.secretEnvelope.trim()) {
    throw new Error("TOTP_ENROLLMENT_INPUT_INVALID");
  }

  return jwt.sign(
    {
      sub: args.userId,
      purpose: ENROLLMENT_PURPOSE,
      secretEnvelope: args.secretEnvelope,
    },
    getJwtSecret(),
    {
      algorithm: ENROLLMENT_ALGORITHM,
      expiresIn: ENROLLMENT_TTL,
      issuer: ENROLLMENT_ISSUER,
      audience: ENROLLMENT_AUDIENCE,
    }
  );
}

export function verifyTotpEnrollmentToken(token: string) {
  const decoded = jwt.verify(token, getJwtSecret(), {
    algorithms: [ENROLLMENT_ALGORITHM],
    issuer: ENROLLMENT_ISSUER,
    audience: ENROLLMENT_AUDIENCE,
  });

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    decoded.purpose !== ENROLLMENT_PURPOSE ||
    typeof decoded.secretEnvelope !== "string" ||
    !decoded.secretEnvelope.trim()
  ) {
    throw new Error("INVALID_TOTP_ENROLLMENT_TOKEN");
  }

  return {
    userId: decoded.sub,
    secretEnvelope: decoded.secretEnvelope,
  };
}

export const TOTP_ENROLLMENT_TTL_SECONDS = ENROLLMENT_TTL_SECONDS;
