import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Criar uma nova transação (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      const transacoesCriadas = await prisma.transacao.createMany({
        data: body,
        skipDuplicates: true, // opcional: ignora duplicadas com base na chave única
      });
      return NextResponse.json(transacoesCriadas, { status: 201 });
    }

    const { valor, mes, ano, tipo, descricao, data, valorUnitario, quantidade, userId } = body;

    const novaTransacao = await prisma.transacao.create({
      data: { valor, mes, ano, tipo, descricao, data: data, valorUnitario, quantidade, userId },
    });
    return NextResponse.json(novaTransacao, { status: 201 });
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: "Erro ao criar transação" }, { status: 500 });
  }
}

// Listar todas as transações (GET)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

   if (!userId) {
    return NextResponse.json(
      { error: "userId é obrigatório" },
      { status: 400 }
    );
  }
  
  try {
    const transacoes = await prisma.transacao.findMany({
      where: { userId },
      orderBy: { data: "desc" },
    });
    return NextResponse.json(transacoes, { status: 200 });
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: "Erro ao listar transações" }, { status: 500 });
  }
}

// Atualizar uma transação (PUT)
export async function PUT(req: Request) {
  try {
    const { id, valor, mes, ano, tipo, descricao, data, valorUnitario, quantidade, userId } = await req.json();
    const transacaoAtualizada = await prisma.transacao.update({
      where: { id },
      data: { valor, mes, ano, tipo, descricao, data: new Date(data), valorUnitario, quantidade, userId },
    });
    return NextResponse.json(transacaoAtualizada, { status: 200 });
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: "Erro ao atualizar transação" }, { status: 500 });
  }
}

// Deletar uma transação (DELETE)
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await prisma.transacao.delete({ where: { id } });
    return NextResponse.json({ message: "Transação deletada" }, { status: 200 });
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: "Erro ao deletar transação" }, { status: 500 });
  }
}
// export async function DELETE() {
//   try {
//     await prisma.transacao.deleteMany();
//     return NextResponse.json({ message: "Todas as transações foram apagadas!" });
//   } catch (error) {
//     console.error("Erro ao apagar transações:", error);
//     return NextResponse.json({ error: "Erro ao apagar transações" }, { status: 500 });
//   }
// }
