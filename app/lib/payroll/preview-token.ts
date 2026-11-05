import { createHash } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";

import type { ParsedPayrollDocument } from "@/app/lib/payroll/payroll-parser";
import { getJwtSecret } from "@/app/lib/auth/jwt-secret";

const ISSUER = "controle-gastos-payroll-import-preview";
const AUDIENCE = "controle-gastos-payroll-import-confirm";

function digest(document: ParsedPayrollDocument & { fingerprint: string; duplicate: boolean }) {
  return createHash("sha256").update(JSON.stringify(document)).digest("hex");
}

export function signPayrollPreview(params: {
  userId: string;
  document: ParsedPayrollDocument & { fingerprint: string; duplicate: boolean };
}) {
  return jwt.sign({ digest: digest(params.document) }, getJwtSecret(), {
    algorithm: "HS256",
    subject: params.userId,
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: "20m",
  });
}

export function verifyPayrollPreview(params: {
  token: string;
  userId: string;
  document: ParsedPayrollDocument & { fingerprint: string; duplicate: boolean };
}) {
  try {
    const payload = jwt.verify(params.token, getJwtSecret(), {
      algorithms: ["HS256"],
      subject: params.userId,
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as JwtPayload;
    if (payload.digest !== digest(params.document)) {
      throw new Error("INVALID_PREVIEW_TOKEN");
    }
  } catch {
    throw new Error("INVALID_PREVIEW_TOKEN");
  }
}
