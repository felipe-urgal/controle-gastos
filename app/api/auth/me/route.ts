import { NextResponse } from "next/server";
import { cookies } from "next/headers";  // Melhor maneira de acessar cookies no App Router
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const SECRET_KEY = process.env.SUPABASE_JWT_SECRET || "chave_secreta_super_segura";

interface DecodedToken {
  userId: string;
}

export async function GET() {
  try {
    const cookieStore = await cookies(); // Adiciona await para obter os cookies corretamente
    const token = cookieStore.get("token")?.value;  

    if (!token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const decoded = jwt.verify(token, SECRET_KEY) as DecodedToken;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erro de autenticação:", error);
    return NextResponse.json({ error: "Erro ao buscar usuário" }, { status: 500 });
  }
}