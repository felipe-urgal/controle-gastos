import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from '@/app/lib/prisma';

const SECRET_KEY = process.env.JWT_SECRET || "secret";

export const dynamic = 'force-dynamic'; // Desativa cache

interface DecodedToken {
  userId: string;
}

export async function GET() {  // Removi o parâmetro não utilizado 'request'
  try {
    // Obter cookies de forma assíncrona
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, SECRET_KEY) as DecodedToken;

    // Buscar usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erro de autenticação:", error);
    return NextResponse.json(
      { error: "Token inválido ou expirado" },
      { status: 401 }
    );
  } finally {
    await prisma.$disconnect();
  }
}