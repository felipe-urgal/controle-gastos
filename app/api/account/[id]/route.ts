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
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error: unknown) {
    console.error("Erro no GET:", error);

    const message = error instanceof Error ? error.message : "Erro desconhecido";

    return NextResponse.json({ error: "Erro ao buscar conta", details: message }, { status: 500 });
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
      name,
      type,
      balance,
      currency,
      userId,
    } = await req.json();

    // Validações básicas
    if (!name || !type || !balance) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando" },
        { status: 400 }
      );
    }

    const updatedAccount = await prisma.account.update({
      where: { id },
      data: {
        name,
        type,
        balance,
        currency,
        userId,
      },
    });

    return NextResponse.json(updatedAccount);
  } catch (error: unknown) {
    console.error("Erro no PUT:", error);

    const message = error instanceof Error ? error.message : "Erro desconhecido";

    return NextResponse.json(
      { error: "Erro ao atualizar caonta", details: message },
      { status: 500 }
    );
  }
}
