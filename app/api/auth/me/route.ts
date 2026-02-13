import { NextResponse } from "next/server";
import { prisma } from '@/app/lib/prisma';
import { getAuthUserIdFromCookies } from "@/app/lib/auth";

export const dynamic = 'force-dynamic'; // Desativa cache

export async function GET(): Promise<NextResponse<any>> {
  try {
    const userId = await getAuthUserIdFromCookies();

    if (!userId) {
      return NextResponse.json({ 
        status: 401,
        success: false,
        message: "Não autenticado"
      });
    }

    // Buscar usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        showValues: true
      }
    });

    if (!user) {
      return NextResponse.json({ 
        status: 404,
        success: false,
        message: "Usuário não encontrado"
      });
    }

    return NextResponse.json({
      status: 200,
      success: true,
      message: "Usuário autenticado com sucesso",
      user: user
    });

  } catch (error) {
    const errorMessage = translateAuthError(error);
    
    return NextResponse.json({ 
      status: 401,
      success: false, 
      message: errorMessage,
    });
  }
}

function translateAuthError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao verificar autenticação";
  }

  const errorMessage = error.message.toLowerCase();

  // Erros do JWT
  if (errorMessage.includes('jwt') || errorMessage.includes('token')) {
    if (errorMessage.includes('expired')) {
      return "Token de autenticação expirado";
    }
    if (errorMessage.includes('invalid')) {
      return "Token de autenticação inválido";
    }
    return "Erro na verificação do token";
  }

  // Erros do Prisma
  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao buscar usuário";
  }

  // Erros de rede/requisição
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  // Erro genérico
  return "Erro inesperado ao verificar autenticação. Tente novamente";
}