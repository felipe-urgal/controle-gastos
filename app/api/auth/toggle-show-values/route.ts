// app/api/auth/toggle-show-values/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from "@/app/lib/session";
import { prisma } from '@/app/lib/prisma';

export async function PUT(req: NextRequest) {
  try {

    const cookieHeader = req.headers.get("cookie");
    const token = cookieHeader
      ?.split(";")
      .find(c => c.trim().startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar a sessão diretamente com o token
    const session = await getSession(token);

    if (!session?.userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { showValues } = await req.json();

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { showValues },
      select: {
        id: true,
        name: true,
        email: true,
        showValues: true
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Erro ao atualizar showValues:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}