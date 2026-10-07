import jwt from "jsonwebtoken";

const EMAIL_ISSUER = "controle-gastos-auth";
const EMAIL_AUDIENCE = "controle-gastos-email-verification";
const EMAIL_PURPOSE = "email-verification";
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const EMAIL_TTL_SECONDS = EMAIL_VERIFICATION_TTL_MS / 1000;
const EMAIL_ALGORITHM = "HS256" as const;

export type EmailVerificationKind = "signup" | "email-change";

type SignupVerificationArgs = {
  userId: string;
  email: string;
  kind: "signup";
  authVersion: number;
};

type EmailChangeVerificationArgs = {
  userId: string;
  email: string;
  kind: "email-change";
  authVersion: number;
  pendingEmailVersion: number;
};

export function signEmailVerificationToken(
  args: SignupVerificationArgs | EmailChangeVerificationArgs,
) {
  if (
    !args.userId.trim() ||
    !args.email.trim() ||
    !Number.isInteger(args.authVersion) ||
    args.authVersion < 0 ||
    (args.kind === "email-change" &&
      (!Number.isInteger(args.pendingEmailVersion) ||
        args.pendingEmailVersion < 1))
  ) {
    throw new Error("EMAIL_VERIFICATION_INPUT_INVALID");
  }

  return jwt.sign(
    {
      sub: args.userId,
      purpose: EMAIL_PURPOSE,
      email: args.email,
      kind: args.kind,
      authVersion: args.authVersion,
      ...(args.kind === "email-change"
        ? { pendingEmailVersion: args.pendingEmailVersion }
        : {}),
    },
    getJwtSecret(),
    {
      algorithm: EMAIL_ALGORITHM,
      expiresIn: EMAIL_TTL_SECONDS,
      issuer: EMAIL_ISSUER,
      audience: EMAIL_AUDIENCE,
    },
  );
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET_NOT_CONFIGURED");
  return secret;
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
    decoded.authVersion < 0 ||
    (decoded.kind === "email-change" &&
      (typeof decoded.pendingEmailVersion !== "number" ||
        !Number.isInteger(decoded.pendingEmailVersion) ||
        decoded.pendingEmailVersion < 1))
  ) {
    throw new Error("INVALID_EMAIL_VERIFICATION_TOKEN");
  }

  return {
    userId: decoded.sub,
    email: decoded.email.trim().toLowerCase(),
    kind: decoded.kind as EmailVerificationKind,
    authVersion: decoded.authVersion,
    pendingEmailVersion:
      decoded.kind === "email-change" ? decoded.pendingEmailVersion : undefined,
  };
}
