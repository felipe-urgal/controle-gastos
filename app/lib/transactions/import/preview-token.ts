import { createHash } from "node:crypto";
import jwt, { JwtPayload } from "jsonwebtoken";

import type { PreviewImportItem } from "@/app/lib/transactions/import/parser";

const PREVIEW_ISSUER = "controle-gastos-import-preview";
const PREVIEW_AUDIENCE = "controle-gastos-import-confirm";
const PREVIEW_TTL = "20m";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for import preview tokens");
  return secret;
}

export function createPreviewDigest(params: {
  accountId: string;
  items: PreviewImportItem[];
}) {
  const canonical = params.items.map((item) => ({
    index: item.index,
    source: item.source,
    date: item.date,
    amountCents: item.amountCents,
    type: item.type,
    description: item.description,
    externalId: item.externalId ?? null,
    currency: item.currency ?? null,
    errors: item.errors,
    fingerprint: item.fingerprint,
    duplicate: item.duplicate,
  }));

  return createHash("sha256")
    .update(JSON.stringify({ accountId: params.accountId, items: canonical }))
    .digest("hex");
}

export function signImportPreviewToken(params: {
  userId: string;
  accountId: string;
  items: PreviewImportItem[];
}) {
  const digest = createPreviewDigest({ accountId: params.accountId, items: params.items });
  return jwt.sign({ digest }, getJwtSecret(), {
    algorithm: "HS256",
    subject: params.userId,
    issuer: PREVIEW_ISSUER,
    audience: PREVIEW_AUDIENCE,
    expiresIn: PREVIEW_TTL,
  });
}

export function verifyImportPreviewToken(params: {
  token: string;
  userId: string;
  accountId: string;
  items: PreviewImportItem[];
}) {
  const payload = jwt.verify(params.token, getJwtSecret(), {
    algorithms: ["HS256"],
    issuer: PREVIEW_ISSUER,
    audience: PREVIEW_AUDIENCE,
    subject: params.userId,
  }) as JwtPayload;

  const expectedDigest = createPreviewDigest({ accountId: params.accountId, items: params.items });
  if (payload.digest !== expectedDigest) throw new Error("INVALID_PREVIEW_TOKEN");
}
