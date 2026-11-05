import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { failure, rateLimitFailure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { consumeTransactionMutationRateLimit } from "@/app/lib/security/application-rate-limit";
import {
  detectAttachmentMime,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_BYTES_PER_USER,
  MAX_ATTACHMENTS_PER_TRANSACTION,
  safeAttachmentFilename,
} from "@/app/lib/transactions/attachment-domain";

type Context = { params: Promise<{ id: string; attachmentId?: string }> };

const metadataSelect = { id: true, filename: true, mimeType: true, sizeBytes: true, createdAt: true } as const;

async function ownedTransactionOrThrow(userId: string, id: string) {
  const transaction = await prisma.transaction.findFirst({ where: { id, userId }, select: { id: true } });
  if (!transaction) throw new HttpError("Transação não encontrada", 404);
  return transaction;
}

async function resolve(context: Context | undefined) {
  if (!context) throw new HttpError("Transação não encontrada", 404);
  return context.params;
}

/** `GET /api/transactions/{id}/attachments` — metadados dos comprovantes (sem os bytes). */
export async function listTransactionAttachments(_request: Request, context?: Context) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await resolve(context);
    await ownedTransactionOrThrow(userId, id);
    const items = await prisma.transactionAttachment.findMany({
      where: { transactionId: id, userId },
      select: metadataSelect,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return success({ items, limits: { maxBytes: MAX_ATTACHMENT_BYTES, maxPerTransaction: MAX_ATTACHMENTS_PER_TRANSACTION } });
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao carregar os comprovantes" });
  }
}

/** `POST /api/transactions/{id}/attachments` (multipart, campo `file`) — anexa uma foto ou PDF pequeno. */
export async function uploadTransactionAttachment(request: Request, context?: Context) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await resolve(context);

    const limit = await consumeTransactionMutationRateLimit(userId);
    if (limit.limited) {
      return rateLimitFailure(
        "Muitas alterações em pouco tempo. Tente novamente em instantes",
        limit.retryAfterSeconds,
        "TRANSACTION_RATE_LIMITED",
      );
    }

    await ownedTransactionOrThrow(userId, id);

    // Barra cedo o que claramente passa do limite, antes de ler o corpo na memória.
    const declared = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > MAX_ATTACHMENT_BYTES + 64 * 1024) {
      throw new HttpError("Arquivo grande demais (máximo 1,5 MB)", 413, "ATTACHMENT_TOO_LARGE");
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new HttpError("Envie um arquivo no campo \"file\"", 400, "ATTACHMENT_MISSING");
    if (file.size === 0) throw new HttpError("Arquivo vazio", 400, "ATTACHMENT_EMPTY");
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new HttpError("Arquivo grande demais (máximo 1,5 MB)", 413, "ATTACHMENT_TOO_LARGE");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = detectAttachmentMime(bytes);
    if (!mime) throw new HttpError("Use uma imagem JPEG, PNG ou WebP, ou um PDF", 415, "ATTACHMENT_TYPE");

    const [count, used] = await Promise.all([
      prisma.transactionAttachment.count({ where: { transactionId: id, userId } }),
      prisma.transactionAttachment.aggregate({ where: { userId }, _sum: { sizeBytes: true } }),
    ]);
    if (count >= MAX_ATTACHMENTS_PER_TRANSACTION) {
      throw new HttpError(`Cada transação aceita até ${MAX_ATTACHMENTS_PER_TRANSACTION} comprovantes`, 409, "ATTACHMENT_LIMIT");
    }
    if ((used._sum.sizeBytes ?? 0) + bytes.length > MAX_ATTACHMENT_BYTES_PER_USER) {
      throw new HttpError("O espaço de comprovantes da conta acabou (50 MB). Remova algum para anexar outro", 409, "ATTACHMENT_QUOTA");
    }

    const created = await prisma.transactionAttachment.create({
      data: {
        userId,
        transactionId: id,
        filename: safeAttachmentFilename(file.name, mime),
        mimeType: mime,
        sizeBytes: bytes.length,
        data: Buffer.from(bytes),
      },
      select: metadataSelect,
    });
    return success(created, "Comprovante anexado");
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao anexar o comprovante" });
  }
}

/** `GET /api/transactions/{id}/attachments/{attachmentId}` — o arquivo. */
export async function downloadTransactionAttachment(_request: Request, context?: Context) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id, attachmentId } = await resolve(context);
    const attachment = attachmentId
      ? await prisma.transactionAttachment.findFirst({ where: { id: attachmentId, transactionId: id, userId } })
      : null;
    if (!attachment) throw new HttpError("Comprovante não encontrado", 404);

    return new Response(new Uint8Array(attachment.data), {
      headers: {
        "content-type": attachment.mimeType,
        "content-length": String(attachment.sizeBytes),
        "content-disposition": `inline; filename="${attachment.filename}"; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
        // O arquivo é de terceiros (foto, PDF): nunca deixa o navegador "adivinhar" o tipo nem rodar nada dele.
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao abrir o comprovante" });
  }
}

/** `DELETE /api/transactions/{id}/attachments/{attachmentId}` */
export async function deleteTransactionAttachment(_request: Request, context?: Context) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id, attachmentId } = await resolve(context);

    const limit = await consumeTransactionMutationRateLimit(userId);
    if (limit.limited) {
      return failure("Muitas alterações em pouco tempo. Tente novamente em instantes", 429, "TRANSACTION_RATE_LIMITED");
    }

    const deleted = attachmentId
      ? await prisma.transactionAttachment.deleteMany({ where: { id: attachmentId, transactionId: id, userId } })
      : { count: 0 };
    if (deleted.count !== 1) throw new HttpError("Comprovante não encontrado", 404);
    return success({ id: attachmentId }, "Comprovante removido");
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao remover o comprovante" });
  }
}
