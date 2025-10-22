// app/api/import/detect-format/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { detectCSVFormat } from '@/app/services/importService';

export async function POST(request: NextRequest) {
  try {
    const { fileContent } = await request.json();

    if (!fileContent) {
      return NextResponse.json(
        { error: 'fileContent é obrigatório' },
        { status: 400 }
      );
    }

    const suggestedConfig = await detectCSVFormat(fileContent);

    return NextResponse.json(suggestedConfig);
  } catch (error) {
    console.error('Erro na detecção de formato:', error);
    return NextResponse.json(
      { error: 'Erro ao detectar formato do CSV' },
      { status: 500 }
    );
  }
}