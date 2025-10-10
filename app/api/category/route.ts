import { NextResponse } from "next/server";
import { Prisma, CategoryType } from "@prisma/client";
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request): Promise<NextResponse<any>> {
  try {
    const body = await request.json();

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

    let errors = "";

    if (!name?.trim()) {
      errors += "Nome da categoria é obrigatório!;";
    }

    if (!userId) {
      errors += "Usuário é obrigatório!;";
    }

    if (name?.trim()) {
      if (name.trim().length < 2) {
        errors += "Nome da categoria deve ter pelo menos 2 caracteres!;";
      }

      if (name.trim().length > 50) {
        errors += "Nome da categoria não pode exceder 50 caracteres!;";
      }
    }

    if (type) {
      const validTypes = ['EXPENSE', 'INCOME'];
      if (!validTypes.includes(type)) {
        errors += "Tipo de categoria inválido!;";
      }
    }

    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      errors += "Formato de cor inválido (#RRGGBB)!;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false,
        message: formattedErrors
      });
    }

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      return NextResponse.json({ 
        status: 404,
        success: false,
        message: "Usuário não encontrado!" 
      });
    }

    const existingCategory = await prisma.category.findFirst({
      where: { 
        name: name.trim(),
        userId, 
        type: type as CategoryType,
        isActive: true 
      }
    });

    if (existingCategory) {
      return NextResponse.json({
        status: 409,
        success: false, 
        message: "Já existe uma categoria ativa com este nome para este tipo!" 
      });
    }

    const category = await prisma.category.create({
      data: { 
        name: name.trim(), 
        userId,
        color,
        icon,
        type: type as CategoryType,
        isActive,
        description: description?.trim(),
        position
      },
    });

    return NextResponse.json({ 
      status: 201,
      success: true, 
      message: "Categoria criada com sucesso!",
      data: category
    });

  } catch (error) {
    const errorMessage = translateCategoryError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  }
}

export async function GET(request: Request): Promise<NextResponse<any>> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const search = searchParams.get("search");
    const type = searchParams.get("type") as CategoryType | null;
    const isActive = searchParams.get("isActive");

    if (!userId) {
      return NextResponse.json({ 
        status: 400,
        success: false, 
        message: "Usuário é obrigatório!" 
      });
    }

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      return NextResponse.json({ 
        status: 404,
        success: false, 
        message: "Usuário não encontrado!" 
      });
    }

    if (type) {
      const validTypes = ['EXPENSE', 'INCOME'];
      if (!validTypes.includes(type)) {
        return NextResponse.json({ 
          status: 400,
          success: false, 
          message: "Tipo de categoria inválido!"
        });
      }
    }

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

    const categories = await prisma.category.findMany({
      where,
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
    });

    return NextResponse.json({
      status: 200,
      success: true,
      message: "Categorias carregadas com sucesso!",
      data: { items: categories },
    });

  } catch(error) {
    const errorMessage = translateFetchError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  }
}

export async function PUT(request: Request): Promise<NextResponse<any>> {
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
    } = await request.json();

    let errors = "";

    if (!id) {
      errors += "Categoria é obrigatório!;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false, 
        message: formattedErrors 
      });
    }

    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return NextResponse.json({ 
        status: 404,
        success: false, 
        message: "Categoria não encontrada!" 
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        errors += "Nome da categoria não pode estar vazio!;";
      } else {
        if (name.trim().length < 2) {
          errors += "Nome da categoria deve ter pelo menos 2 caracteres!;";
        }

        if (name.trim().length > 50) {
          errors += "Nome da categoria não pode exceder 50 caracteres!;";
        }

        if (name.trim() !== existingCategory.name && name.trim().length >= 2 && name.trim().length <= 50) {
          const duplicateCategory = await prisma.category.findFirst({
            where: {
              name: name.trim(),
              userId: existingCategory.userId,
              type: existingCategory.type,
              id: { not: id },
              isActive: true
            }
          });

          if (duplicateCategory) {
            errors += "Já existe uma categoria ativa com este nome para este tipo!;";
          }
        }
      }
    }

    if (type) {
      const validTypes = ['EXPENSE', 'INCOME'];
      if (!validTypes.includes(type)) {
        errors += "Tipo de categoria inválido!;";
      }
    }

    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      errors += "Formato de cor inválido (#RRGGBB)!;";
    }

    const updateData: any = {
      ...(name !== undefined && { name: name.trim() }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon }),
      ...(type && { type: type as CategoryType }),
      ...(isActive !== undefined && { isActive }),
      ...(description !== undefined && { description: description?.trim() }),
      ...(position !== undefined && { position })
    };

    if (Object.keys(updateData).length === 0) {
      errors += "Nenhum dado fornecido para atualização!;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false, 
        message: formattedErrors 
      });
    }

    await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });

    return NextResponse.json({ 
      status: 200,
      success: true, 
      message: "Categoria atualizada com sucesso!",
    });

  } catch(error) {
    const errorMessage = translateUpdateError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  }
}

export async function DELETE(request: Request): Promise<NextResponse<any>> {
  try {
    const { id } = await request.json();
    
    let errors = "";

    if (!id) {
      errors += "Categoria é obrigatório!;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false, 
        message: formattedErrors 
      });
    }
    
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    if (!category) {
      return NextResponse.json({ 
        status: 404,
        success: false,
        message: "Categoria não encontrada!"
      });
    }

    if (category._count.transactions > 0) {
      return NextResponse.json({ 
        status: 400,
        success: false,
        message: "Não é possível excluir esta categoria pois existem transações vinculadas a ela"
      });
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ 
      status: 200,
      success: true, 
      message: "Categoria excluída com sucesso!" 
    });

  } catch(error) {
    const errorMessage = translateDeleteError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  }
}


function translateCategoryError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao processar a criação da categoria";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')) {
      return "Já existe uma categoria com este nome para este tipo";
    }
    if (errorMessage.includes('foreign key constraint')) {
      return "Usuário não encontrado ou inválido";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao criar a categoria";
  }

  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return "Dados da categoria inválidos";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao criar a categoria. Tente novamente";
}

function translateFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao buscar categorias";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao buscar categorias";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao buscar categorias. Tente novamente";
}

function translateUpdateError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao atualizar a categoria";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')) {
      return "Já existe uma categoria com este nome para este tipo";
    }
    if (errorMessage.includes('record to update not found')) {
      return "Categoria não encontrada ou já foi excluída";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao atualizar a categoria";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao atualizar a categoria. Tente novamente";
}

function translateDeleteError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao excluir a categoria";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('foreign key constraint')) {
      return "Não é possível excluir: existem transações vinculadas a esta categoria";
    }
    if (errorMessage.includes('record to delete does not exist')) {
      return "A categoria não existe ou já foi excluída";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao excluir a categoria";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao excluir a categoria. Tente novamente";
}