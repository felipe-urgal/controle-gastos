import {
  Prisma,
  type ImportRuleDescriptionOperator,
} from "@prisma/client";

import {
  normalizeMerchantAliasValue,
  type MerchantAliasMatchCandidate,
} from "@/app/lib/merchants/merchant-alias-matching";
import { prisma } from "@/app/lib/prisma";

type RawMatchRow = {
  normalizedDescription: string;
  id: string;
  merchantId: string;
  merchantName: string;
  operator: string;
  normalizedPattern: string;
  priority: number;
};

export async function findMatchingMerchantAliasesForDescriptions(
  userId: string,
  descriptions: readonly string[],
) {
  const normalizedDescriptions = Array.from(
    new Set(
      descriptions
        .map(normalizeMerchantAliasValue)
        .filter((description) => description.length > 0),
    ),
  );

  const grouped = new Map<string, MerchantAliasMatchCandidate[]>();
  for (const description of normalizedDescriptions) {
    grouped.set(description, []);
  }
  if (normalizedDescriptions.length === 0) return grouped;

  const values = Prisma.join(
    normalizedDescriptions.map((description) => Prisma.sql`(${description})`),
  );

  const rows = await prisma.$queryRaw<RawMatchRow[]>(Prisma.sql`
    WITH input("normalizedDescription") AS (
      VALUES ${values}
    )
    SELECT
      input."normalizedDescription" AS "normalizedDescription",
      alias."id" AS "id",
      alias."merchant_id" AS "merchantId",
      merchant."name" AS "merchantName",
      alias."operator"::text AS "operator",
      alias."normalized_pattern" AS "normalizedPattern",
      alias."priority" AS "priority"
    FROM input
    JOIN "merchant_aliases" alias
      ON (
        (
          alias."operator"::text = 'EQUALS'
          AND alias."normalized_pattern" = input."normalizedDescription"
        )
        OR (
          alias."operator"::text = 'STARTS_WITH'
          AND left(
            input."normalizedDescription",
            char_length(alias."normalized_pattern")
          ) = alias."normalized_pattern"
        )
        OR (
          alias."operator"::text = 'CONTAINS'
          AND strpos(
            input."normalizedDescription",
            alias."normalized_pattern"
          ) > 0
        )
      )
    JOIN "merchants" merchant
      ON merchant."id" = alias."merchant_id"
      AND merchant."userId" = ${userId}
      AND merchant."is_active" = true
    WHERE alias."userId" = ${userId}
  `);

  for (const row of rows) {
    const operator = row.operator as ImportRuleDescriptionOperator;
    if (!["EQUALS", "STARTS_WITH", "CONTAINS"].includes(operator)) continue;
    grouped.get(row.normalizedDescription)?.push({
      id: row.id,
      merchantId: row.merchantId,
      merchantName: row.merchantName,
      operator,
      normalizedPattern: row.normalizedPattern,
      priority: row.priority,
    });
  }

  return grouped;
}

export async function findMatchingMerchantAliasesForUser(
  userId: string,
  description: string,
) {
  const normalizedDescription = normalizeMerchantAliasValue(description);
  const grouped = await findMatchingMerchantAliasesForDescriptions(userId, [
    normalizedDescription,
  ]);
  return grouped.get(normalizedDescription) ?? [];
}
