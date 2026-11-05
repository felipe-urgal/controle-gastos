import { createHash } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";

import type { ParsedAnnualEmploymentIncomeStatement } from "@/app/lib/payroll/annual-income-statement-parser";
import { getJwtSecret } from "@/app/lib/auth/jwt-secret";

const ISSUER = "controle-gastos-annual-employment-income-preview";
const AUDIENCE = "controle-gastos-annual-employment-income-confirm";

type PreviewStatement = ParsedAnnualEmploymentIncomeStatement & {
  fingerprint: string;
  duplicate: boolean;
};

function digest(statement: PreviewStatement) {
  return createHash("sha256").update(JSON.stringify(statement)).digest("hex");
}

export function signAnnualStatementPreview(userId: string, statement: PreviewStatement) {
  return jwt.sign({ digest: digest(statement) }, getJwtSecret(), {
    algorithm: "HS256",
    subject: userId,
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: "20m",
  });
}

export function verifyAnnualStatementPreview(
  token: string,
  userId: string,
  statement: PreviewStatement,
) {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      subject: userId,
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as JwtPayload;
    if (payload.digest !== digest(statement)) throw new Error("INVALID_PREVIEW_TOKEN");
  } catch {
    throw new Error("INVALID_PREVIEW_TOKEN");
  }
}
