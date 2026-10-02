import { createHash } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";

import type { ParsedAnnualEmploymentIncomeStatement } from "@/app/lib/payroll/annual-income-statement-parser";

const ISSUER = "controle-gastos-annual-employment-income-preview";
const AUDIENCE = "controle-gastos-annual-employment-income-confirm";

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is required");
  return value;
}

type PreviewStatement = ParsedAnnualEmploymentIncomeStatement & {
  fingerprint: string;
  duplicate: boolean;
};

function digest(statement: PreviewStatement) {
  return createHash("sha256").update(JSON.stringify(statement)).digest("hex");
}

export function signAnnualStatementPreview(userId: string, statement: PreviewStatement) {
  return jwt.sign({ digest: digest(statement) }, secret(), {
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
    const payload = jwt.verify(token, secret(), {
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
