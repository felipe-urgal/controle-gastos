import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// PUT - Atualiza categoria
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    return NextResponse.json({ error: "ID não informado" }, { status: 400 });
  }

  try {

    const requestData: { nome: string } = await req.json();

    const existingCategory = await prisma.categoria.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Categoria não encontrada' },
        { status: 404 }
      );
    }

    const duplicate = await prisma.categoria.findFirst({
      where: {
        nome: requestData.nome,
        userId: existingCategory.userId,
        NOT: { id }
      }
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, error: 'Já existe uma categoria com este nome' },
        { status: 409 }
      );
    }

    const updated = await prisma.categoria.update({
      where: { id },
      data: { nome: requestData.nome },
      select: { id: true, nome: true }
    });

    return NextResponse.json(
      { success: true, data: updated },
      { status: 200 }
    );

  } catch (error) {
    console.error('[CATEGORIA_PUT_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Remove categoria
export async function PUT(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    return NextResponse.json({ error: "ID não informado" }, { status: 400 });
  }

  try {
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da categoria não fornecido' },
        { status: 400 }
      );
    }

    const existing = await prisma.categoria.findUnique({
      where: { id },
      include: { _count: { select: { transacoes: true } } }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Categoria não encontrada' },
        { status: 404 }
      );
    }

    if (existing._count.transacoes > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Não é possível excluir categoria com transações vinculadas',
          details: { count: existing._count.transacoes }
        },
        { status: 400 }
      );
    }

    await prisma.categoria.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('[CATEGORIA_DELETE_ERROR]', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
