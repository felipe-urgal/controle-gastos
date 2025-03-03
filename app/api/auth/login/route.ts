import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const SECRET_KEY = process.env.SUPABASE_JWT_SECRET || "chave_secreta_super_segura";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: "7d" });

    const response = NextResponse.json({ user, token });
    response.cookies.set("token", token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/"
    });

    return response;
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
