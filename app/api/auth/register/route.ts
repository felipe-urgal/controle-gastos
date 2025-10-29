import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request): Promise<NextResponse<any>> {
  try {
    const { name, email, password } = await request.json();

    let errors = "";

    // Validações
    if (!name?.trim()) {
      errors += "Nome é obrigatório!;";
    }

    if (!email?.trim()) {
      errors += "E-mail é obrigatório!;";
    }

    if (!password) {
      errors += "Senha é obrigatória!;";
    }

    if (name?.trim() && name.trim().length < 2) {
      errors += "Nome deve ter pelo menos 2 caracteres!;";
    }

    if (name?.trim() && name.trim().length > 100) {
      errors += "Nome não pode exceder 100 caracteres!;";
    }

    if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors += "Formato de e-mail inválido!;";
    }

    if (password && password.length < 6) {
      errors += "Senha deve ter pelo menos 6 caracteres!;";
    }

    if (password && password.length > 100) {
      errors += "Senha não pode exceder 100 caracteres!;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false,
        message: formattedErrors
      });
    }

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ 
        status: 400,
        success: false,
        message: "E-mail já está em uso"
      });
    }

    // Criptografar a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar novo usuário
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
      },
    });

    return NextResponse.json({
      status: 201,
      success: true,
      message: "Usuário criado com sucesso!",
      user: { 
        id: newUser.id, 
        email: newUser.email, 
        name: newUser.name,
        showValues: newUser.showValues
      }
    });

  } catch (error) {
    const errorMessage = translateRegisterError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  } finally {
    await prisma.$disconnect();
  }
}

function translateRegisterError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao processar o registro";
  }

  const errorMessage = error.message.toLowerCase();

  // Erros do Prisma
  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')) {
      return "E-mail já está em uso";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao criar usuário";
  }

  // Erros do bcrypt
  if (errorMessage.includes('bcrypt') || errorMessage.includes('hash')) {
    return "Erro ao criptografar a senha";
  }

  // Erros de rede/requisição
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  // Erro genérico
  return "Erro inesperado ao realizar registro. Tente novamente";
}