import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import {
  assertImportRulePatternIsSafe,
  findImportRuleRelationship,
} from "@/app/lib/import-rules/import-rule-guards";
import { toImportRuleDTO } from "@/app/lib/transactions/import/import-rule-dto";
import { prisma } from "@/app/lib/prisma";
import {
  importRuleInputSchema,
  type ImportRuleInput,
} from "@/app/lib/transactions/import/import-rule-schema";

async function lockImportRuleMutations(
  db: Prisma.TransactionClient,
  userId: string,
) {
  await db.$queryRaw`
    SELECT 1::int AS locked
    FROM pg_advisory_xact_lock(hashtext(${`import-rules:${userId}`}))
  `;
}

async function assertRuleReferences(
  db: Prisma.TransactionClient,
  input: ImportRuleInput,
  userId: string
) {
  const account = input.accountId
    ? await db.account.findFirst({
        where: {
          id: input.accountId,
          userId,
          isActive: true,
        },
        select: { id: true },
      })
    : null;
  const category = await db.category.findFirst({
    where: {
      id: input.categoryId,
      userId,
      isActive: true,
      type: input.transactionType,
    },
    select: { id: true },
  });

  if (input.accountId && !account) {
    throw new HttpError("Conta inválida ou inativa", 400);
  }

  if (!category) {
    throw new HttpError(
      "Categoria inválida, inativa ou incompatível com o tipo",
      400
    );
  }
}

async function assertRuleGuards(
  db: Prisma.TransactionClient,
  input: ImportRuleInput,
  userId: string,
  excludeRuleId?: string,
) {
  try {
    assertImportRulePatternIsSafe(
      input.descriptionOperator,
      input.descriptionPattern,
    );
  } catch (error) {
    throw new HttpError(
      error instanceof Error ? error.message : "Padrão de regra inválido",
      400,
      "IMPORT_RULE_PATTERN_TOO_BROAD",
    );
  }

  const existingRules = await db.transactionImportRule.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      priority: true,
      accountId: true,
      transactionType: true,
      descriptionOperator: true,
      descriptionPattern: true,
      minAmountCents: true,
      maxAmountCents: true,
      categoryId: true,
    },
  });

  const relationship = findImportRuleRelationship(input, existingRules, {
    excludeRuleId,
  });

  if (relationship.kind === "EQUIVALENT") {
    throw new HttpError(
      `Já existe uma regra equivalente: ${relationship.ruleName}`,
      409,
      "IMPORT_RULE_EQUIVALENT",
    );
  }

  if (relationship.kind === "CONFLICT") {
    throw new HttpError(
      `Já existe uma regra com o mesmo padrão e outro resultado: ${relationship.ruleName}`,
      409,
      "IMPORT_RULE_CONFLICT",
    );
  }
}

const importRuleDependencies = {
  account: {
    select: {
      name: true,
      isActive: true,
    },
  },
  category: {
    select: {
      name: true,
      isActive: true,
      type: true,
    },
  },
} as const;

const baseImportRuleCrud = baseCrudHandler({
  model: (db) => db.transactionImportRule,
  entityName: "Regra de importação",
  createSchema: importRuleInputSchema,
  updateSchema: importRuleInputSchema,
  include: importRuleDependencies,
  filterableFields: ["isActive", "accountId", "transactionType"],
  searchableFields: ["name", "descriptionPattern"],
  orderBy: [{ priority: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  limit: true,
  mapper: toImportRuleDTO,
  async summary({ userId }) {
    const aggregate = await prisma.transactionImportRule.aggregate({
      where: { userId },
      _max: { priority: true },
    });
    const currentMax = aggregate._max.priority;
    const nextPriority =
      currentMax === null ? 0 : Math.min(currentMax + 10, 2_147_483_647);
    return { nextPriority };
  },

  async beforeCreate(data, userId) {
    return prisma.$transaction(async (tx) => {
      await lockImportRuleMutations(tx, userId);
      await assertRuleReferences(tx, data, userId);
      await assertRuleGuards(tx, data, userId);

      return tx.transactionImportRule.create({
        data: {
          ...data,
          userId,
        },
        include: importRuleDependencies,
      });
    });
  },
});

async function updateImportRule(
  request: Request,
  context?: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Regra de importação não encontrada", 404);

    const { id } = await context.params;
    const input = importRuleInputSchema.parse(await parseJsonBody(request));

    const updated = await prisma.$transaction(async (tx) => {
      await lockImportRuleMutations(tx, userId);
      const existing = await tx.transactionImportRule.findFirst({
        where: { id, userId },
        select: { id: true },
      });

      if (!existing) {
        throw new HttpError("Regra de importação não encontrada", 404);
      }

      await assertRuleReferences(tx, input, userId);
      await assertRuleGuards(tx, input, userId, id);

      return tx.transactionImportRule.update({
        where: { id },
        data: input,
        include: importRuleDependencies,
      });
    });

    return success(
      toImportRuleDTO(updated),
      "Regra de importação atualizada com sucesso"
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }

    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }

    if (isUnauthorizedError(error)) {
      return failure("Não autenticado", 401);
    }

    return failure("Erro ao atualizar regra de importação", 500);
  }
}

export async function renumberImportRules() {
  try {
    const userId = await getAuthenticatedUserId();
    const result = await prisma.$transaction(async (tx) => {
      await lockImportRuleMutations(tx, userId);
      const rules = await tx.transactionImportRule.findMany({
        where: { userId },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true },
      });

      for (const [index, rule] of rules.entries()) {
        await tx.transactionImportRule.update({
          where: { id: rule.id },
          data: { priority: index * 10 },
        });
      }

      return {
        updated: rules.length,
        nextPriority: rules.length * 10,
      };
    });

    return success(result, "Prioridades renumeradas com sucesso");
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    return failure("Não foi possível renumerar as prioridades", 500);
  }
}

export const importRuleCrud = {
  ...baseImportRuleCrud,
  update: updateImportRule,
};
