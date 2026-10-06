import { Prisma } from "@prisma/client";

import {
  assertIdempotencyPayload,
  hashIdempotencyKey,
  hashIdempotencyPayload,
  requireIdempotencyKey,
} from "@/app/lib/idempotency";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

const MAX_ATTEMPTS = 3;

export type InvestmentIdempotencyContext = {
  keyHash: string;
  requestHash: string;
};

export async function runInvestmentIdempotentMutation<T>(args: {
  request: Request;
  userId: string;
  scope: string;
  payload: unknown;
  execute: (
    tx: Prisma.TransactionClient,
    context: InvestmentIdempotencyContext,
  ) => Promise<{ resourceId: string; value: T }>;
  replay: (
    tx: Prisma.TransactionClient,
    resourceId: string,
  ) => Promise<T | null>;
}) {
  const key = requireIdempotencyKey(args.request);
  const keyHash = hashIdempotencyKey(key);
  const requestHash = hashIdempotencyPayload(args.payload);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existing = await tx.investmentMutationRequest.findUnique({
            where: {
              userId_scope_idempotencyKeyHash: {
                userId: args.userId,
                scope: args.scope,
                idempotencyKeyHash: keyHash,
              },
            },
          });

          if (existing) {
            assertIdempotencyPayload(existing.requestHash, requestHash);
            if (!existing.resourceId) {
              throw new HttpError(
                "Operação idempotente ainda está em processamento",
                409,
                "IDEMPOTENCY_IN_PROGRESS",
              );
            }
            const replayed = await args.replay(tx, existing.resourceId);
            if (replayed === null) {
              throw new HttpError(
                "Resultado original da operação idempotente não está mais disponível",
                409,
                "IDEMPOTENCY_RESULT_UNAVAILABLE",
              );
            }
            return { value: replayed, replayed: true as const };
          }

          await tx.investmentMutationRequest.create({
            data: {
              userId: args.userId,
              scope: args.scope,
              idempotencyKeyHash: keyHash,
              requestHash,
            },
          });

          const executed = await args.execute(tx, { keyHash, requestHash });

          await tx.investmentMutationRequest.update({
            where: {
              userId_scope_idempotencyKeyHash: {
                userId: args.userId,
                scope: args.scope,
                idempotencyKeyHash: keyHash,
              },
            },
            data: { resourceId: executed.resourceId },
          });

          return { value: executed.value, replayed: false as const };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002");
      if (retryable && attempt < MAX_ATTEMPTS - 1) continue;
      throw error;
    }
  }

  throw new HttpError(
    "Não foi possível concluir a operação idempotente",
    409,
    "IDEMPOTENCY_RETRY_EXHAUSTED",
  );
}
