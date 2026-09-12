import crypto from "node:crypto";

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generatePasswordResetToken() {
  const token = crypto.randomBytes(32).toString("hex");

  return {
    token,
    tokenHash: hashPasswordResetToken(token),
  };
}
