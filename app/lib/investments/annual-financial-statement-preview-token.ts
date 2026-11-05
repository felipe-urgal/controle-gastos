import { createHash } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";

import type { ParsedAnnualFinancialTaxStatement } from "@/app/lib/investments/annual-financial-statement-parser";
import { getJwtSecret } from "@/app/lib/auth/jwt-secret";

const ISSUER = "controle-gastos-annual-financial-statement-preview";
const AUDIENCE = "controle-gastos-annual-financial-statement-confirm";

export type AnnualFinancialStatementPreview = ParsedAnnualFinancialTaxStatement & {
  fingerprint: string;
  duplicate: boolean;
};

function digest(statement: AnnualFinancialStatementPreview) {
  return createHash("sha256").update(JSON.stringify(statement)).digest("hex");
}

export function signAnnualFinancialStatementPreview(
  userId: string,
  statement: AnnualFinancialStatementPreview,
) {
  return jwt.sign({ digest: digest(statement) }, getJwtSecret(), {
    algorithm: "HS256",
    subject: userId,
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: "20m",
  });
}

export function verifyAnnualFinancialStatementPreview(
  token: string,
  userId: string,
  statement: AnnualFinancialStatementPreview,
) {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      subject: userId,
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as JwtPayload;
    if (payload.digest !== digest(statement)) {
      throw new Error("INVALID_PREVIEW_TOKEN");
    }
  } catch {
    throw new Error("INVALID_PREVIEW_TOKEN");
  }
}
