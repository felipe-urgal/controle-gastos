import { prisma } from "@/app/lib/prisma";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { failure, success } from "@/app/lib/apiResponse";
import { updateAccountSchema } from "@/app/schemas/account.schema";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;

    const account = await prisma.account.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: {
            transactions: true,
            investments: true,
          },
        },
      },
    });

    if (!account) {
      return failure("Conta não encontrada", 404);
    }

    return success(account);

  } catch (err: any) {
    console.error("GET ACCOUNT ERROR:", err);
    return failure("Erro ao buscar conta", 500);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;

    const body = await request.json();
    const parsed = updateAccountSchema.parse(body);

    const account = await prisma.account.findFirst({
      where: { id, userId },
    });

    if (!account)
      return failure("Conta não encontrada", 404);

    const updated = await prisma.account.update({
      where: { id },
      data: parsed,
    });

    return success(updated, "Conta atualizada");

  } catch (err: any) {
    if (err.message === "UNAUTHORIZED")
      return failure("Não autenticado", 401);

    if (err.name === "ZodError")
      return failure(err.errors[0].message, 400);

    return failure("Erro ao atualizar conta", 500);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await context.params;

    const account = await prisma.account.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: {
            transactions: true,
            investments: true,
          },
        },
      },
    });

    if (!account)
      return failure("Conta não encontrada", 404);

    if (account._count.transactions > 0)
      return failure(
        "Conta possui transações vinculadas",
        400
      );

    if (account._count.investments > 0)
      return failure(
        "Conta possui investimentos vinculados",
        400
      );

    await prisma.account.delete({
      where: { id },
    });

    return success(null, "Conta deletada");

  } catch (err: any) {
    if (err.message === "UNAUTHORIZED")
      return failure("Não autenticado", 401);

    return failure("Erro ao deletar conta", 500);
  }
}
