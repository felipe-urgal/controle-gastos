import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { CategoryModel, CategoryResponse } from '@/app/types/category'
import { ErrorResponse } from '@/app/types/error'
import { prisma } from '@/app/lib/prisma';

// Criar uma nova categoria (POST)
export async function POST(req: Request): Promise<NextResponse<CategoryModel | ErrorResponse | { count: number }>> {
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
        { 
          success: false, 
          message: "Você já possui uma categoria com este nome" 
        },
        { status: 400 }
      );
    }

    await prisma.category.create({
      data: { name, userId },
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Categoria criada com sucesso!" 
      },
      { status: 200 }
    );

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// Listar todas as categorias (GET)
export async function GET(request: Request): Promise<NextResponse<CategoryResponse | ErrorResponse>> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 8;
  const search = searchParams.get("search");

  if (!userId) {
    return NextResponse.json(
      { 
        success: false, 
        message: "Usuário é obrigatório!" 
      },
      { status: 400 }
    );
  }
  try {

    const where: Prisma.CategoryWhereInput = {
      userId,
      ...(search?.trim() && {
        name: {
          contains: search.trim(),
          mode: Prisma.QueryMode.insensitive
        }
      })
    };

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.category.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { items: categories, total },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        limit: limit,
      }
    });
  } catch(error) {
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// Atualizar uma categoria (PUT)
export async function PUT(req: Request): Promise<NextResponse<CategoryResponse | ErrorResponse>> {
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
        { 
          success: false, 
          message: "Você já possui uma categoria com este nome" 
        },
        { status: 400 }
      );
    }

    await prisma.category.update({
      where: { id },
      data: { name },
    })

    return NextResponse.json(
      { 
        success: true, 
        message: "Categoria atualizada com sucesso!" 
      },
      { status: 200 }
    );
  } catch(error) {
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// Deletar uma categoria (DELETE)
export async function DELETE(req: Request): Promise<NextResponse<ErrorResponse | { success: true; message: string; count?: number }>> {
  try {
    const { id, ids } = await req.json();
    
    // Suporte para delete em lote
    if (ids && Array.isArray(ids)) {
      // Verificar se alguma categoria tem transações
      const categoriesWithTransactions = await prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          categoryId: { in: ids }
        },
        _count: {
          categoryId: true
        }
      });

      if (categoriesWithTransactions.length > 0) {
        const categoryIdsWithTransactions = categoriesWithTransactions.map(item => item.categoryId);
        return NextResponse.json(
          { 
            success: false,
            message: `Não é possível excluir categorias com transações vinculadas. IDs: ${categoryIdsWithTransactions.join(', ')}`,
          },
          { status: 400 }
        );
      }

      const { count } = await prisma.category.deleteMany({
        where: { 
          id: { in: ids } 
        }
      });

      return NextResponse.json(
        { 
          success: true, 
          message: `${count} categorias deletadas com sucesso`,
          count
        },
        { status: 200 }
      );
    }
    
    // Delete único (código existente)
    if (id) {
      const transactionsWithCategory = await prisma.transaction.count({
        where: { categoryId: id }
      });

      if (transactionsWithCategory > 0) {
        return NextResponse.json(
          { 
            success: false,
            message: "Não é possível excluir esta categoria pois existem transações vinculadas a ela",
          },
          { status: 400 }
        );
      }

      await prisma.category.delete({ where: { id } });
      return NextResponse.json(
        { 
          success: true, 
          message: "Categoria deletada com sucesso" 
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "ID ou IDs são obrigatórios" 
      },
      { status: 400 }
    );
    
  } catch(error) {
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
