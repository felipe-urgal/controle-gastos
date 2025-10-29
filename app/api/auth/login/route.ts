import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from '@/app/lib/prisma';

const SECRET_KEY = process.env.JWT_SECRET || "secret";

export async function POST(request: Request): Promise<NextResponse<any>> {
  try {
    const { email, password } = await request.json();

    let errors = "";

    // Validações
    if (!email?.trim()) {
      errors += "E-mail é obrigatório!;";
    }

    if (!password) {
      errors += "Senha é obrigatória!;";
    }

    if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors += "Formato de e-mail inválido!;";
    }

    if (password && password.length < 6) {
      errors += "Senha deve ter pelo menos 6 caracteres!;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false,
        message: formattedErrors
      });
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({ 
      where: { email: email.trim().toLowerCase() } 
    });

    if (!user) {
      return NextResponse.json({ 
        status: 401,
        success: false,
        message: "E-mail ou senha inválidos!"
      });
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ 
        status: 401,
        success: false,
        message: "E-mail ou senha inválidos!"
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id },
      SECRET_KEY,
      { expiresIn: "7d" }
    );

    // Criar resposta
    const response = NextResponse.json({
      status: 200,
      success: true,
      message: "Login realizado com sucesso!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        showValues: user.showValues
      }
    });

    // Configurar cookie seguro
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;

  } catch (error) {
    const errorMessage = translateLoginError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  } finally {
    await prisma.$disconnect();
  }
}

function translateLoginError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao processar o login";
  }

  const errorMessage = error.message.toLowerCase();

  // Erros do Prisma
  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao processar login";
  }

  // Erros de JWT
  if (errorMessage.includes('jwt') || errorMessage.includes('token')) {
    return "Erro ao gerar token de autenticação";
  }

  // Erros de bcrypt
  if (errorMessage.includes('bcrypt') || errorMessage.includes('hash')) {
    return "Erro ao verificar credenciais";
  }

  // Erros de rede/requisição
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  // Erro genérico
  return "Erro inesperado ao realizar login. Tente novamente";
}
