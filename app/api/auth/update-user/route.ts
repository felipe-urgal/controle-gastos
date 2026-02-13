import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from '@/app/lib/prisma';
import { getAuthUserIdFromRequest } from "@/app/lib/auth";

const SALT_ROUNDS = 10;

type UserUpdatePayload = {
  name?: string;
  email?: string;
  password?: string;
};

export async function PUT(request: Request): Promise<NextResponse<any>> {
  try {
    const userId = getAuthUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ 
        status: 401,
        success: false,
        message: "Sessão inválida ou expirada"
      });
    }

    const { name, email, newPassword } = await request.json();
    let errors = "";

    // Validações
    if (name !== undefined) {
      if (!name.trim()) {
        errors += "Nome não pode estar vazio!;";
      } else if (name.trim().length < 2) {
        errors += "Nome deve ter pelo menos 2 caracteres!;";
      } else if (name.trim().length > 100) {
        errors += "Nome não pode exceder 100 caracteres!;";
      }
    }

    if (email !== undefined) {
      if (!email.trim()) {
        errors += "E-mail não pode estar vazio!;";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors += "Formato de e-mail inválido!;";
      }
    }

    if (newPassword !== undefined) {
      if (!newPassword) {
        errors += "Nova senha não pode estar vazia!;";
      } else if (newPassword.length < 6) {
        errors += "Senha deve ter pelo menos 6 caracteres!;";
      } else if (newPassword.length > 100) {
        errors += "Senha não pode exceder 100 caracteres!;";
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
      where: { id: userId }
    });

    if (!userExists) {
      return NextResponse.json({ 
        status: 404,
        success: false,
        message: "Usuário não encontrado"
      });
    }

    // Verificar se o e-mail já está em uso (se estiver sendo alterado)
    if (email && email.trim().toLowerCase() !== userExists.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() }
      });

      if (emailExists) {
        return NextResponse.json({ 
          status: 400,
          success: false,
          message: "E-mail já está em uso por outro usuário"
        });
      }
    }

    const updateData: UserUpdatePayload = {};

    // Atualizar nome/email
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();

    // Atualizar senha (se for o caso)
    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    // Verificar se há dados para atualizar
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        status: 400,
        success: false,
        message: "Nenhum dado fornecido para atualização"
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
      message: "Dados do usuário atualizados com sucesso!",
      user: updatedUser
    });

  } catch (error) {
    const errorMessage = translateUpdateUserError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  }
}

function translateUpdateUserError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao atualizar dados do usuário";
  }

  const errorMessage = error.message.toLowerCase();

  // Erros do Prisma
  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')) {
      return "E-mail já está em uso por outro usuário";
    }
    if (errorMessage.includes('record to update not found')) {
      return "Usuário não encontrado";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao atualizar usuário";
  }

  // Erros de bcrypt
  if (errorMessage.includes('bcrypt') || errorMessage.includes('hash')) {
    return "Erro ao criptografar a senha";
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
  return "Erro inesperado ao atualizar dados do usuário. Tente novamente";
}