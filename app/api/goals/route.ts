// app/api/goals/route.ts
import { NextResponse } from "next/server";
import { Prisma, GoalType } from "@prisma/client";
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request): Promise<NextResponse<any>> {
  try {
    const body = await request.json();
    const { 
      title, 
      targetAmount, 
      deadline, 
      type, 
      color = '#3B82F6', 
      icon = '🎯', 
      description,
      userId 
    } = body;

    let errors = "";

    // Validações básicas
    if (!title?.trim()) {
      errors += "Título é obrigatório.;";
    }

    if (!targetAmount || typeof targetAmount !== 'number' || isNaN(targetAmount)) {
      errors += "Valor da meta é obrigatório e deve ser um número válido.;";
    } else if (targetAmount <= 0) {
      errors += "Valor da meta deve ser maior que zero.;";
    } else if (targetAmount > 100000000000) { // 1 bilhão
      errors += "Valor da meta não pode exceder 1.000.000.000,00.;";
    }

    if (!deadline) {
      errors += "Data limite é obrigatória.;";
    }

    if (!type) {
      errors += "Tipo da meta é obrigatório.;";
    }

    if (!userId) {
      errors += "ID do usuário é obrigatório.;";
    }

    if (title?.trim()) {
      if (title.trim().length < 2) {
        errors += "Título deve ter pelo menos 2 caracteres.;";
      }

      if (title.trim().length > 100) {
        errors += "Título não pode exceder 100 caracteres.;";
      }
    }

    if (description?.trim() && description.trim().length > 500) {
      errors += "Descrição não pode exceder 500 caracteres.;";
    }

    if (deadline) {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (deadlineDate < today) {
        errors += "Data limite não pode ser no passado.;";
      }
    }

    if (type) {
      const validTypes = ['TRAVEL', 'EMERGENCY_FUND', 'INVESTMENT', 'EDUCATION', 'HOME', 'VEHICLE', 'OTHER'];
      if (!validTypes.includes(type)) {
        errors += "Tipo de meta inválido.;";
      }
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false,
        message: formattedErrors
      });
    }

    // Verificar se o usuário existe
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

    const goal = await prisma.financialGoal.create({
      data: {
        title: title.trim(),
        targetAmount,
        currentAmount: 0,
        deadline: new Date(deadline),
        type,
        color,
        icon,
        description: description?.trim(),
        userId
      }
    });

    return NextResponse.json({
      status: 201,
      success: true,
      data: goal,
      message: 'Meta criada com sucesso!'
    });

  } catch (error) {
    const errorMessage = translateGoalError(error);
    
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
    
    // Parâmetros obrigatórios
    const userId = searchParams.get("userId");
    
    // Parâmetros opcionais
    const type = searchParams.get("type");
    const isCompleted = searchParams.get("isCompleted");
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const search = searchParams.get("search");

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
      const validTypes = ['TRAVEL', 'EMERGENCY_FUND', 'INVESTMENT', 'EDUCATION', 'HOME', 'VEHICLE', 'OTHER'];
      if (!validTypes.includes(type)) {
        return NextResponse.json({ 
          status: 400,
          success: false, 
          message: 'Tipo de meta inválido'
        });
      }
    }

    const where: Prisma.FinancialGoalWhereInput = {
      userId,
      ...(type && { type: type as GoalType }),
      ...(isCompleted !== null && { isCompleted: isCompleted === 'true' }),
      ...(search?.trim() && {
        OR: [
          {
            title: {
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

    const [goals, total] = await Promise.all([
      prisma.financialGoal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { isCompleted: 'asc' },
          { deadline: 'asc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.financialGoal.count({ where })
    ]);

    // Calcular dados adicionais
    const totalGoals = goals.length;
    const completedGoals = goals.filter(goal => goal.isCompleted).length;
    const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalCurrent = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const totalProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

    return NextResponse.json({
      status: 200,
      success: true,
      message: "Metas carregadas com sucesso!",
      data: { 
        items: goals,
        total,
        additionalData: {
          totalGoals,
          completedGoals,
          totalTarget,
          totalCurrent,
          totalProgress
        },
      },
      pagination: { 
        currentPage: page, 
        totalPages: Math.ceil(total / limit), 
        totalItems: total, 
        limit: limit 
      }
    });

  } catch (error) {
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
      title, 
      targetAmount, 
      currentAmount, 
      deadline, 
      type, 
      color, 
      icon, 
      description,
      isCompleted 
    } = await request.json();

    let errors = "";

    if (!id) {
      errors += "ID da meta é obrigatório.;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false, 
        message: formattedErrors 
      });
    }

    const existingGoal = await prisma.financialGoal.findUnique({
      where: { id },
      include: {
        user: { select: { id: true } }
      }
    });

    if (!existingGoal) {
      return NextResponse.json({ 
        status: 404,
        success: false, 
        message: "Meta não encontrada!" 
      });
    }

    // Validações condicionais
    if (title !== undefined) {
      if (!title.trim()) {
        errors += "Título não pode estar vazio.;";
      } else {
        if (title.trim().length < 2) {
          errors += "Título deve ter pelo menos 2 caracteres.;";
        }

        if (title.trim().length > 100) {
          errors += "Título não pode exceder 100 caracteres.;";
        }
      }
    }

    if (targetAmount !== undefined) {
      if (typeof targetAmount !== 'number' || isNaN(targetAmount)) {
        errors += "Valor da meta deve ser um número válido.;";
      } else if (targetAmount <= 0) {
        errors += "Valor da meta deve ser maior que zero.;";
      } else if (targetAmount > 100000000000) {
        errors += "Valor da meta não pode exceder 1.000.000.000,00.;";
      }
    }

    if (currentAmount !== undefined) {
      if (typeof currentAmount !== 'number' || isNaN(currentAmount)) {
        errors += "Valor atual deve ser um número válido.;";
      } else if (currentAmount < 0) {
        errors += "Valor atual não pode ser negativo.;";
      } else if (currentAmount > 100000000000) {
        errors += "Valor atual não pode exceder 1.000.000.000,00.;";
      }
    }

    if (deadline !== undefined) {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (deadlineDate < today) {
        errors += "Data limite não pode ser no passado.;";
      }
    }

    if (type !== undefined) {
      const validTypes = ['TRAVEL', 'EMERGENCY_FUND', 'INVESTMENT', 'EDUCATION', 'HOME', 'VEHICLE', 'OTHER'];
      if (!validTypes.includes(type)) {
        errors += "Tipo de meta inválido.;";
      }
    }

    if (description !== undefined && description?.trim().length > 500) {
      errors += "Descrição não pode exceder 500 caracteres.;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false, 
        message: formattedErrors 
      });
    }

    // Preparar dados de atualização
    const updateData: Prisma.FinancialGoalUpdateInput = {
      ...(title !== undefined && { title: title.trim() }),
      ...(targetAmount !== undefined && { targetAmount }),
      ...(currentAmount !== undefined && { currentAmount }),
      ...(deadline !== undefined && { deadline: new Date(deadline) }),
      ...(type !== undefined && { type }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon }),
      ...(description !== undefined && { description: description?.trim() }),
      ...(isCompleted !== undefined && { isCompleted })
    };

    const updatedGoal = await prisma.financialGoal.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ 
      status: 200,
      success: true, 
      message: "Meta atualizada com sucesso!",
      data: updatedGoal
    });

  } catch (error) {
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
    const data = await request.json();
    
    const id = typeof data.id === 'string' ? data.id : data.id?.id;
    
    if (!id) {
      return NextResponse.json({ 
        status: 400,
        success: false, 
        message: "ID da meta é obrigatório!",
      });
    }

    const existingGoal = await prisma.financialGoal.findUnique({
      where: { id }
    });

    if (!existingGoal) {
      return NextResponse.json({ 
        status: 404,
        success: false, 
        message: "Meta não encontrada!" 
      });
    }

    await prisma.financialGoal.delete({ 
      where: { id } 
    });

    return NextResponse.json({ 
      status: 200,
      success: true, 
      message: "Meta excluída com sucesso!" 
    });
    
  } catch (error) {
    const errorMessage = translateDeleteError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  }
}

// Funções de tradução de erro seguindo o mesmo padrão
function translateGoalError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao processar a criação da meta";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')) {
      return "Já existe uma meta com este título para este usuário";
    }
    if (errorMessage.includes('foreign key constraint')) {
      return "Usuário não encontrado ou inválido";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao criar a meta";
  }

  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return "Dados da meta inválidos";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao criar a meta. Tente novamente";
}

function translateFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao buscar metas";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao buscar metas";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao buscar metas. Tente novamente";
}

function translateUpdateError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao atualizar a meta";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')) {
      return "Já existe uma meta com este título para este usuário";
    }
    if (errorMessage.includes('record to update not found')) {
      return "Meta não encontrada ou já foi excluída";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao atualizar a meta";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao atualizar a meta. Tente novamente";
}

function translateDeleteError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao excluir a meta";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('foreign key constraint')) {
      return "Não é possível excluir: existem registros vinculados a esta meta";
    }
    if (errorMessage.includes('record to delete does not exist')) {
      return "A meta não existe ou já foi excluída";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao excluir a meta";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao excluir a meta. Tente novamente";
}
