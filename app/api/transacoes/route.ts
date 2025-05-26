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

    const { valor, mes, ano, tipo, descricao, data, valorUnitario, quantidade, userId, categoriaId } = body;

    const novaTransacao = await prisma.transacao.create({
      data: { valor, mes, ano, tipo, descricao, data: data, valorUnitario, quantidade, userId, categoriaId },
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
  
  // Parâmetros obrigatórios
  const userId = searchParams.get("userId");
  const mes = searchParams.get("mes");
  const ano = searchParams.get("ano");
  
  // Parâmetros de filtro
  const page = Number(searchParams.get("page")) || 1;
  const itemsPerPage = Number(searchParams.get("itemsPerPage")) || 5;
  const tipo = searchParams.get("tipo");
  const categoria = searchParams.get("categoria");
  const search = searchParams.get("search");

  if (!userId || !mes || !ano) {
    return NextResponse.json(
      { error: "Parâmetros obrigatórios: userId, mes e ano" },
      { status: 400 }
    );
  }

  try {
    // Construir where clause
    const where = {
      userId,
      mes: Number(mes),
      ano: Number(ano),
      ...(tipo && { tipo }),
      ...(categoria && { categoriaId: categoria }),
      ...(search && {
        descricao: {
          contains: search,
          mode: "insensitive" as const
        }
      })
    };

    // Obter total de itens (para paginação)
    const totalItems = await prisma.transacao.count({ where });

    // Obter transações com paginação
    const transacoes = await prisma.transacao.findMany({
      where,
      skip: (page - 1) * itemsPerPage,
      take: itemsPerPage,
      orderBy: { data: "desc" },
      include: {
        categoria: {
          select: { nome: true }
        }
      }
    });

    const allTransacoes = await prisma.transacao.findMany({
      where: {
        userId,
        mes: Number(mes),
        ano: Number(ano),
      },
      orderBy: { data: "asc" },
    });


    return NextResponse.json({
      data: transacoes,
      allTransacoes: allTransacoes,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / itemsPerPage),
        currentPage: page,
        itemsPerPage
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return NextResponse.json(
      { error: "Erro ao listar transações" }, 
      { status: 500 }
    );
  }
}

// Atualizar uma transação (PUT)
export async function PUT(req: Request) {
  try {
    const { id, valor, tipo, descricao, data, valorUnitario, quantidade, userId, categoriaId } = await req.json();

    const transacaoAtualizada = await prisma.transacao.update({
      where: { id },
      data: { valor, tipo, descricao, data: data, valorUnitario, quantidade, userId, categoriaId },
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
