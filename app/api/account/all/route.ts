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
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      accounts
    });
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { success: false, error: "Erro ao listar contas" },
      { status: 500 }
    );
  }
}