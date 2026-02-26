import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from '@/app/lib/prisma';

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET não configurado");
}

const SECRET_KEY = process.env.JWT_SECRET;

export async function POST(request: Request): Promise<NextResponse<any>> {
  try {
    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "JSON inválido" },
        { status: 400 }
      );
    }

    const { email, password } = body;

    const errors: string[] = [];

    const emailNormalized = email?.trim().toLowerCase();

    if (!emailNormalized) {
      errors.push("E-mail é obrigatório!");
    }

    if (!password) {
      errors.push("Senha é obrigatória!");
    }

    if (emailNormalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
      errors.push("E-mail inválido!");
    }

    if (password && password.length < 6) {
      errors.push("Senha deve ter pelo menos 6 caracteres!");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: errors },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ 
      where: { email: emailNormalized } 
    });

    const fakeHash = "$2a$10$7EqJtq98hPqEX7fNZaFWoOeQO8J1p0Cz6l5Qn8jY5h5E6E6E6E6E6";

    const passwordMatch = await bcrypt.compare(
      password,
      user?.password ?? fakeHash
    );

    if (!user || !passwordMatch) {
      return NextResponse.json(
        { success: false, message: "E-mail ou senha inválidos!" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        sub: user.id,
      },
      SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "seu-app",
        audience: "seu-app-users",
      }
    );

    const response = NextResponse.json(
      {
        success: true,
        message: "Login realizado com sucesso!",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          showValues: user.showValues
        },
      },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      priority: "high",
    });

    return response;

  } catch (error) {
    const errorMessage = translateLoginError(error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage,
      },
      { status: 500 }
    );
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
