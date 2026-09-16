import jwt from "jsonwebtoken";

const EMAIL_ISSUER = "controle-gastos-auth";
const EMAIL_AUDIENCE = "controle-gastos-email-verification";
const EMAIL_PURPOSE = "email-verification";
const EMAIL_TTL = "24h";
const EMAIL_ALGORITHM = "HS256" as const;

export type EmailVerificationKind = "signup" | "email-change";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET_NOT_CONFIGURED");
  return secret;
}

export function signEmailVerificationToken(args: {
  userId: string;
  email: string;
  kind: EmailVerificationKind;
  authVersion: number;
}) {
  if (!args.userId.trim() || !args.email.trim() || !Number.isInteger(args.authVersion)) {
    throw new Error("EMAIL_VERIFICATION_INPUT_INVALID");
  }

  return jwt.sign(
    {
      sub: args.userId,
      purpose: EMAIL_PURPOSE,
      email: args.email,
      kind: args.kind,
      authVersion: args.authVersion,
    },
    getJwtSecret(),
    {
      algorithm: EMAIL_ALGORITHM,
      expiresIn: EMAIL_TTL,
      issuer: EMAIL_ISSUER,
      audience: EMAIL_AUDIENCE,
    },
  );
}

export function verifyEmailVerificationToken(token: string) {
  const decoded = jwt.verify(token, getJwtSecret(), {
    algorithms: [EMAIL_ALGORITHM],
    issuer: EMAIL_ISSUER,
    audience: EMAIL_AUDIENCE,
  });

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    decoded.purpose !== EMAIL_PURPOSE ||
    typeof decoded.email !== "string" ||
    (decoded.kind !== "signup" && decoded.kind !== "email-change") ||
    typeof decoded.authVersion !== "number" ||
    !Number.isInteger(decoded.authVersion) ||
    decoded.authVersion < 0
  ) {
    throw new Error("INVALID_EMAIL_VERIFICATION_TOKEN");
  }

  return {
    userId: decoded.sub,
    email: decoded.email.trim().toLowerCase(),
    kind: decoded.kind as EmailVerificationKind,
    authVersion: decoded.authVersion,
  };
}
