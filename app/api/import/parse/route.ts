// app/api/import/parse/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/app/services/importService';

export async function POST(request: NextRequest) {
  try {
    const { fileContent, config, userId } = await request.json();

    if (!fileContent || !userId) {
      return NextResponse.json(
        { error: 'fileContent e userId são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await parseCSV(fileContent, config);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro no parse do CSV:', error);
    return NextResponse.json(
      { error: 'Erro ao processar arquivo CSV' },
      { status: 500 }
    );
  }
}