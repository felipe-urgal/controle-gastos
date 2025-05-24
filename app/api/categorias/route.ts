import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Categoria {
  id: string;
  nome: string;
  userId: string;
  createdAt: Date;
}

interface ErrorResponse {
  success: boolean;
  error: string;
  details?: Record<string, unknown>;
}

interface CategoriasResponse {
  success: boolean;
  data: {
    categorias: Categoria[];
    total: number;
  };
}
// Criar uma nova categoria (POST)
export async function POST(req: Request): Promise<NextResponse<Categoria | ErrorResponse | { count: number }>> {
  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      const { count } = await prisma.categoria.createMany({
        data: body,
        skipDuplicates: true,
      });
      return NextResponse.json({ count }, { status: 201 });
    }

    const { nome, userId } = body;

    const categoriaExistente = await prisma.categoria.findFirst({
      where: { nome, userId }
    });

    if (categoriaExistente) {
      return NextResponse.json(
        { success: false, error: "Você já possui uma categoria com este nome" },
        { status: 400 }
      );
    }

    const novaCategoria = await prisma.categoria.create({
      data: { nome, userId },
    });
    return NextResponse.json(novaCategoria, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Erro ao criar categoria" },
      { status: 500 }
    );
  }
}

// Listar todas as categorias (GET)
export async function GET(request: Request): Promise<NextResponse<CategoriasResponse | ErrorResponse>> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const pagina = Number(searchParams.get("pagina")) || 1;
  const limite = Number(searchParams.get("limite")) || 5;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "userId é obrigatório" },
      { status: 400 }
    );
  }

  try {
    const total = await prisma.categoria.count({ where: { userId } });
    const categorias = await prisma.categoria.findMany({
      where: { userId },
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { categorias, total }
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Erro ao listar categorias" },
      { status: 500 }
    );
  }
}

// Atualizar uma categoria (PUT)
export async function PUT(req: Request): Promise<NextResponse<Categoria | ErrorResponse>> {
  try {
    const { id, nome, userId } = await req.json();

    const categoriaExistente = await prisma.categoria.findFirst({
      where: {
        nome,
        userId,
        NOT: { id }
      }
    });

    if (categoriaExistente) {
      return NextResponse.json(
        { success: false, error: "Você já possui uma categoria com este nome" },
        { status: 400 }
      );
    }

    const categoriaAtualizada = await prisma.categoria.update({
      where: { id },
      data: { nome },
    });
    return NextResponse.json(categoriaAtualizada, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar categoria" },
      { status: 500 }
    );
  }
}

// Deletar uma categoria (DELETE)
export async function DELETE(req: Request): Promise<NextResponse<ErrorResponse | { success: true; message: string }>> {
  try {
    const { id } = await req.json();
    
    const transacoesComCategoria = await prisma.transacao.count({
      where: { categoriaId: id }
    });

    if (transacoesComCategoria > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: "Não é possível excluir esta categoria pois existem transações vinculadas a ela",
          details: { transacoesCount: transacoesComCategoria }
        },
        { status: 400 }
      );
    }

    await prisma.categoria.delete({ where: { id } });
    return NextResponse.json(
      { success: true, message: "Categoria deletada com sucesso" },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Erro ao deletar categoria" },
      { status: 500 }
    );
  }
}