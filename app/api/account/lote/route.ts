import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { AccountModel } from '@/app/types/account'
import { ErrorResponse } from '@/app/types/error'

const prisma = new PrismaClient();

export async function POST(req: Request): Promise<NextResponse<AccountModel | ErrorResponse | { count: number }>> {
  try {
    const body = await req.json();

    const { count } = await prisma.account.createMany({
      data: body,
      skipDuplicates: true,
    });
    return NextResponse.json(
      { count }, 
      { status: 201 }
    );

  } catch(error) {
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}