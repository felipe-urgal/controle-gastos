import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { toImportRuleDTO } from "@/app/lib/mappers/import-rule.mapper";
import { prisma } from "@/app/lib/prisma";
import {
  importRuleInputSchema,
  type ImportRuleInput,
} from "@/app/schemas/import-rule.schema";

async function assertRuleReferences(
  db: Prisma.TransactionClient,
  input: ImportRuleInput,
  userId: string
) {
  const [account, category] = await Promise.all([
    input.accountId
      ? db.account.findFirst({
          where: {
            id: input.accountId,
            userId,
            isActive: true,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    db.category.findFirst({
      where: {
        id: input.categoryId,
        userId,
        isActive: true,
        type: input.transactionType,
      },
      select: { id: true },
    }),
  ]);

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

const baseImportRuleCrud = baseCrudHandler({
  model: (db) => db.transactionImportRule,
  entityName: "Regra de importação",
  createSchema: importRuleInputSchema,
  updateSchema: importRuleInputSchema,
  filterableFields: ["isActive", "accountId", "transactionType"],
  searchableFields: ["name", "descriptionPattern", "normalizedDescription"],
  orderBy: [{ priority: "asc" }, { id: "asc" }],
  mapper: toImportRuleDTO,

  async beforeCreate(data, userId) {
    return prisma.$transaction(async (tx) => {
      await assertRuleReferences(tx, data, userId);

      return tx.transactionImportRule.create({
        data: {
          ...data,
          userId,
        },
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
    const input = importRuleInputSchema.parse(await request.json());

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.transactionImportRule.findFirst({
        where: { id, userId },
        select: { id: true },
      });

      if (!existing) {
        throw new HttpError("Regra de importação não encontrada", 404);
      }

      await assertRuleReferences(tx, input, userId);

      return tx.transactionImportRule.update({
        where: { id },
        data: input,
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

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Não autenticado", 401);
    }

    return failure("Erro ao atualizar regra de importação", 500);
  }
}

export const importRuleCrud = {
  ...baseImportRuleCrud,
  update: updateImportRule,
};
