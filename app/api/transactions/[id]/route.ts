import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    return NextResponse.json({ error: "ID não informado" }, { status: 400 });
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true }}}
    });

    if (!transaction) {
      return NextResponse.json({ success: false, message: "Transação não encontrada" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch(error) {
    console.log(error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}