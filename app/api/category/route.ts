import { NextResponse } from "next/server";
import { Prisma, CategoryType } from "@prisma/client";
import { CategoryModel, CategoryResponse } from '@/app/types/category'
import { ErrorResponse } from '@/app/types/error'
import { prisma } from '@/app/lib/prisma';

// Criar uma nova categoria (POST)
export async function POST(req: Request): Promise<NextResponse<CategoryModel | ErrorResponse | { count: number }>> {
  try {
    const body = await req.json();

    // Suporte para criação em lote (mantido para compatibilidade)
    if (Array.isArray(body)) {
      const { count } = await prisma.category.createMany({
        data: body.map(cat => ({
          name: cat.name,
          userId: cat.userId,
          color: cat.color || "#3B82F6",
          icon: cat.icon || "tag",
          type: cat.type || "EXPENSE",
          isActive: cat.isActive !== undefined ? cat.isActive : true,
          description: cat.description || null,
          position: cat.position || 0
        })),
        skipDuplicates: true,
      });
      return NextResponse.json({ count }, { status: 201 });
    }

    const { 
      name, 
      userId, 
      color = "#3B82F6", 
      icon = "tag", 
      type = "EXPENSE", 
      isActive = true,
      description,
      position = 0
    } = body;

    // Validações
    if (!name || !userId) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Nome e usuário são obrigatórios!" 
        },
        { status: 400 }
      );
    }

    // Verificar se já existe uma categoria com o mesmo nome para o usuário
    const existingCategory = await prisma.category.findFirst({
      where: { 
        name, 
        userId,
        isActive: true 
      }
    });

    if (existingCategory) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Você já possui uma categoria ativa com este nome" 
        },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: { 
        name, 
        userId,
        color,
        icon,
        type: type as CategoryType,
        isActive,
        description,
        position
      },
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Categoria criada com sucesso!",
        data: category
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Category creation error:", error);
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
  const limit = Number(searchParams.get("limit")) || 10;
  const search = searchParams.get("search");
  const type = searchParams.get("type") as CategoryType | null;
  const isActive = searchParams.get("isActive");

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
      ...(type && { type }),
      ...(isActive !== null && { isActive: isActive === 'true' }),
      ...(search?.trim() && {
        OR: [
          {
            name: {
              contains: search.trim(),
              mode: Prisma.QueryMode.insensitive
            }
          },
          {
            description: {
              contains: search.trim(),
              mode: Prisma.QueryMode.insensitive
            }
          }
        ]
      })
    };

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { isActive: 'desc' },
          { position: 'asc' },
          { name: 'asc' }
        ],
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        }
      }),
      prisma.category.count({ where }),
    ]);

    // Estatísticas adicionais
    const stats = await prisma.category.groupBy({
      by: ['type', 'isActive'],
      where: { userId },
      _count: {
        id: true
      }
    });

    return NextResponse.json({
      success: true,
      data: { 
        items: categories, 
        total,
        additionalData: {
          stats
        }
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        limit: limit,
      }
    });
  } catch(error) {
    console.error("Category fetch error:", error);
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
    const { 
      id, 
      name, 
      color, 
      icon, 
      type, 
      isActive, 
      description, 
      position 
    } = await req.json();

    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          message: "ID da categoria é obrigatório!" 
        },
        { status: 400 }
      );
    }

    // Verificar se a categoria existe
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Categoria não encontrada!" 
        },
        { status: 404 }
      );
    }

    // Verificar se o nome já existe (apenas se o nome foi alterado)
    if (name && name !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findFirst({
        where: {
          name,
          userId: existingCategory.userId,
          id: { not: id },
          isActive: true
        }
      });

      if (duplicateCategory) {
        return NextResponse.json(
          { 
            success: false, 
            message: "Você já possui uma categoria ativa com este nome" 
          },
          { status: 400 }
        );
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { 
        ...(name && { name }),
        ...(color && { color }),
        ...(icon && { icon }),
        ...(type && { type: type as CategoryType }),
        ...(isActive !== undefined && { isActive }),
        ...(description !== undefined && { description }),
        ...(position !== undefined && { position })
      },
      include: {
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Categoria atualizada com sucesso!",
        data: updatedCategory
      },
      { status: 200 }
    );
  } catch(error) {
    console.error("Category update error:", error);
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
    
    // Delete único
    if (id) {
      // Verificar se a categoria existe
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        }
      });

      if (!category) {
        return NextResponse.json(
          { 
            success: false,
            message: "Categoria não encontrada",
          },
          { status: 404 }
        );
      }

      if (category._count.transactions > 0) {
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
    console.error("Category deletion error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// Nova rota para buscar todas as categorias ativas (sem paginação)
// export async function GET_ALL(request: Request): Promise<NextResponse<CategoryResponse | ErrorResponse>> {
//   const { searchParams } = new URL(request.url);
//   const userId = searchParams.get("userId");
//   const type = searchParams.get("type") as CategoryType | null;
//   const isActive = searchParams.get("isActive") || 'true';

//   if (!userId) {
//     return NextResponse.json(
//       { 
//         success: false, 
//         message: "Usuário é obrigatório!" 
//       },
//       { status: 400 }
//     );
//   }

//   try {
//     const categories = await prisma.category.findMany({
//       where: {
//         userId,
//         ...(type && { type }),
//         isActive: isActive === 'true'
//       },
//       orderBy: [
//         { position: 'asc' },
//         { name: 'asc' }
//       ],
//       select: {
//         id: true,
//         name: true,
//         color: true,
//         icon: true,
//         type: true,
//         isActive: true,
//         description: true,
//         position: true,
//         createdAt: true,
//         updatedAt: true
//       }
//     });

//     return NextResponse.json({
//       success: true,
//       data: { 
//         items: categories,
//         total: categories.length
//       }
//     });
//   } catch(error) {
//     console.error("Category fetch all error:", error);
//     return NextResponse.json(
//       { 
//         success: false, 
//         message: error instanceof Error ? error.message : String(error) 
//       },
//       { status: 500 }
//     );
//   }
// }