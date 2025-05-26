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
    const transacao = await prisma.transacao.findUnique({
      where: { id },
    });

    if (!transacao) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    }

    return NextResponse.json(transacao);
  } catch (error) {
    console.error("Erro no GET:", error);
    return NextResponse.json({ error: "Erro ao buscar transação" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    return NextResponse.json({ error: "ID não informado" }, { status: 400 });
  }

  try {
    const { valor, tipo, descricao, valorUnitario, quantidade, userId, categoriaId, data } = await req.json();

    const transacaoAtualizada = await prisma.transacao.update({
      where: { id },
      data: {
        valor,
        tipo,
        descricao,
        valorUnitario,
        quantidade,
        userId,
        categoriaId,
        data: data
      },
    });

    return NextResponse.json(transacaoAtualizada);
  } catch (error) {
    console.error("Erro no PUT:", error);
    return NextResponse.json({ error: "Erro ao atualizar transação" }, { status: 500 });
  }
}
