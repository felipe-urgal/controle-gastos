import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Category {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
}

interface ErrorResponse {
  success: boolean;
  error: string;
  details?: Record<string, unknown>;
}

interface CategoriesResponse {
  success: boolean;
  data: {
    categories: Category[];
    total: number;
  };
}
// Criar uma nova categoria (POST)
export async function POST(req: Request): Promise<NextResponse<Category | ErrorResponse | { count: number }>> {
  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      const { count } = await prisma.category.createMany({
        data: body,
        skipDuplicates: true,
      });
      return NextResponse.json({ count }, { status: 201 });
    }

    const { name, userId } = body;

    const existingCategory = await prisma.category.findFirst({
      where: { name, userId }
    });

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: "Você já possui uma categoria com este nome" },
        { status: 400 }
      );
    }

    const newCategory = await prisma.category.create({
      data: { name, userId },
    });
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : JSON.stringify(error)
      },
      { status: 500 }
    );
  }
}

// Listar todas as categorias (GET)
export async function GET(request: Request): Promise<NextResponse<CategoriesResponse | ErrorResponse>> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 5;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "userId é obrigatório" },
      { status: 400 }
    );
  }

  try {
    const total = await prisma.category.count({ where: { userId } });
    const categories = await prisma.category.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { categories, total },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Erro ao listar categorias" },
      { status: 500 }
    );
  }
}

// Atualizar uma categoria (PUT)
export async function PUT(req: Request): Promise<NextResponse<Category | ErrorResponse>> {
  try {
    const { id, name, userId } = await req.json();

    const existingCategory = await prisma.category.findFirst({
      where: {
        name,
        userId,
        NOT: { id }
      }
    });

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: "Você já possui uma categoria com este nome" },
        { status: 400 }
      );
    }

    const updateCategory = await prisma.category.update({
      where: { id },
      data: { name },
    });
    return NextResponse.json(updateCategory, { status: 200 });
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
    
    const transactionsWithCategory = await prisma.transaction.count({
      where: { categoryId: id }
    });

    if (transactionsWithCategory > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: "Não é possível excluir esta categoria pois existem transações vinculadas a ela",
          details: { transacoesCount: transactionsWithCategory }
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });
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