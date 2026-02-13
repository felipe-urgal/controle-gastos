import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getAuthUserIdFromRequest } from "@/app/lib/auth";

export async function PUT(request: NextRequest): Promise<NextResponse<any>> {
  try {
    const userId = getAuthUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ 
        status: 401,
        success: false,
        message: "Sessão inválida ou expirada"
      });
    }

    const { showValues } = await request.json();

    let errors = "";

    // Validações
    if (typeof showValues !== 'boolean') {
      errors += "O campo showValues deve ser um booleano!;";
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
        message: "Usuário não encontrado"
      });
    }

    // Atualizar preferência do usuário
    const user = await prisma.user.update({
      where: { id: userId },
      data: { showValues },
      select: {
        id: true,
        name: true,
        email: true,
        showValues: true
      }
    });

    return NextResponse.json({
      status: 200,
      success: true,
      message: "Preferência de visualização atualizada com sucesso!",
      user: user
    });

  } catch (error) {
    const errorMessage = translateToggleShowValuesError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  }
}

function translateToggleShowValuesError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao atualizar preferência de visualização";
  }

  const errorMessage = error.message.toLowerCase();

  // Erros do Prisma
  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    if (errorMessage.includes('record to update not found')) {
      return "Usuário não encontrado";
    }
    return "Erro no banco de dados ao atualizar preferência";
  }

  // Erros de sessão/token
  if (errorMessage.includes('jwt') || errorMessage.includes('token') || errorMessage.includes('session')) {
    return "Erro de autenticação. Faça login novamente";
  }

  // Erros de rede/requisição
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  // Erro genérico
  return "Erro inesperado ao atualizar preferência. Tente novamente";
}