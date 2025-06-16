import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    return NextResponse.json({ error: "ID não informado" }, { status: 400 });
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true }}}
    });

    if (!category) {
      return NextResponse.json({ 
        success: false, 
        message: "Categoria não encontrada" 
      }, { 
        status: 404 
      });
    }

    return NextResponse.json(category);
  } catch(error) {
    console.log(error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}