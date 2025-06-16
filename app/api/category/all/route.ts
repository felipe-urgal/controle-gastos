import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

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
    const categorias = await prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      categorias
    });
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { success: false, error: "Erro ao listar categorias" },
      { status: 500 }
    );
  }
}