import { createHash } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";

import type { PreviewInvestmentImportItem } from "@/app/lib/investments/import/investment-import-parser";

const PREVIEW_ISSUER = "controle-gastos-investment-import-preview";
const PREVIEW_AUDIENCE = "controle-gastos-investment-import-confirm";
const PREVIEW_TTL = "20m";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for investment import preview tokens");
  return secret;
}

function digest(accountId: string, items: PreviewInvestmentImportItem[]) {
  return createHash("sha256")
    .update(JSON.stringify({ accountId, items }))
    .digest("hex");
}

export function signInvestmentImportPreview(params: {
  userId: string;
  accountId: string;
  items: PreviewInvestmentImportItem[];
}) {
  return jwt.sign(
    { digest: digest(params.accountId, params.items) },
    getJwtSecret(),
    {
      algorithm: "HS256",
      subject: params.userId,
      issuer: PREVIEW_ISSUER,
      audience: PREVIEW_AUDIENCE,
      expiresIn: PREVIEW_TTL,
    },
  );
}

export function verifyInvestmentImportPreview(params: {
  token: string;
  userId: string;
  accountId: string;
  items: PreviewInvestmentImportItem[];
}) {
  const payload = jwt.verify(params.token, getJwtSecret(), {
    algorithms: ["HS256"],
    subject: params.userId,
    issuer: PREVIEW_ISSUER,
    audience: PREVIEW_AUDIENCE,
  }) as JwtPayload;

  if (payload.digest !== digest(params.accountId, params.items)) {
    throw new Error("INVALID_PREVIEW_TOKEN");
  }
}
