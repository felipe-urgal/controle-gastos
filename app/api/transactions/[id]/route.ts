import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    return NextResponse.json({ error: "ID não informado" }, { status: 400 });
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        account: true,
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error: unknown) {
    console.error("Erro no GET:", error);

    const message = error instanceof Error ? error.message : "Erro desconhecido";

    return NextResponse.json({ error: "Erro ao buscar transação", details: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    return NextResponse.json({ error: "ID não informado" }, { status: 400 });
  }

  try {
    const { 
      amount,
      type,
      description,
      unitPrice,
      quantity,
      userId,
      categoryId,
      transactionDate,
      accountId,
      year,
      month,
      day
    } = await req.json();

    // Validações básicas
    if (!amount || !type || !transactionDate || !accountId) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 }
      );
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        amount,
        type,
        description,
        unitPrice,
        quantity,
        userId,
        categoryId: categoryId || null, // Permite null
        transactionDate: new Date(transactionDate),
        accountId,
        year: year || new Date(transactionDate).getFullYear(),
        month: month || new Date(transactionDate).getMonth() + 1,
        day: day || new Date(transactionDate).getDate()
      },
      include: {
        account: true,
        category: true
      }
    });

    return NextResponse.json(updatedTransaction);
  } catch (error: unknown) {
    console.error("Erro no PUT:", error);

    const message = error instanceof Error ? error.message : "Erro desconhecido";

    return NextResponse.json(
      { error: "Erro ao atualizar transação", details: message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    return NextResponse.json({ error: "ID não informado" }, { status: 400 });
  }

  try {
    await prisma.transaction.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Transação deletada com sucesso" });
  } catch (error: unknown) {
    console.error("Erro no DELETE:", error);

    const message = error instanceof Error ? error.message : "Erro desconhecido";

    return NextResponse.json(
      { error: "Erro ao deletar transação", details: message },
      { status: 500 }
    );
  }
}