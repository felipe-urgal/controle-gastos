import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "userId é obrigatório" },
      { status: 400 }
    );
  }

  try {
    const transacoes = await prisma.transacao.findMany({
      where: { userId },
      // orderBy: { nome: "asc" },
    });

    return NextResponse.json(transacoes, { status: 200 });
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { success: false, error: "Erro ao listar categorias" },
      { status: 500 }
    );
  }
}