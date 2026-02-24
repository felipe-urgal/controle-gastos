import { prisma } from "@/app/lib/prisma";
import { success, failure } from "@/app/lib/apiResponse";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { createAccountSchema } from "@/app/schemas/account.schema";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = await request.json();

    const parsed = createAccountSchema.parse(body);

    const existingAccount = await prisma.account.findFirst({
      where: {
        name: parsed.name,
        userId,
        isActive: true,
      },
    });

    if (existingAccount) {
      return failure(
        "Já existe uma conta ativa com este nome",
        409,
        "ACCOUNT_DUPLICATE"
      );
    }

    const account = await prisma.account.create({
      data: {
        ...parsed,
        userId,
      },
    });

    return success(account, "Conta criada com sucesso", 201);

  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return failure(
        err.issues[0]?.message ?? "Dados inválidos",
        400,
        "VALIDATION_ERROR"
      );
    }

    console.error("CREATE ACCOUNT ERROR:", err);

    return failure("Erro interno", 500, "INTERNAL_ERROR");
  }
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            transactions: true,
            investments: true,
          },
        },
      },
    });

    return success(
      { items: accounts },
      "Contas carregadas com sucesso"
    );

  } catch (err: any) {
    if (err.message === "UNAUTHORIZED")
      return failure("Não autenticado", 401);

    return failure("Erro ao buscar contas", 500);
  }
}