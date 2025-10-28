import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from '@/app/lib/prisma';

const SECRET_KEY = process.env.JWT_SECRET || "secret";

export const dynamic = 'force-dynamic'; // Desativa cache

interface DecodedToken {
  userId: string;
}

export async function GET(): Promise<NextResponse<any>> {
  try {
    // Obter cookies de forma assíncrona
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ 
        status: 401,
        success: false,
        message: "Não autenticado"
      });
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, SECRET_KEY) as DecodedToken;

    // Buscar usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
  } finally {
    await prisma.$disconnect();
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