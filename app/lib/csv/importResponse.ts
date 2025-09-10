// app/lib/csv/importResponse.ts
import { NextResponse } from "next/server";
import { stringify } from "csv-stringify/sync";

export class ImportResponse {
  static createResponse(
    successCount: number,
    errorCount: number,
    originalHeaders: string[],
    processedData: any[],
    errors: any[]
  ): NextResponse {
    // Adicionar coluna de erro aos headers
    const modifiedHeaders = [...originalHeaders, 'erro'];
    const modifiedLines: string[][] = [];

    // Processar cada linha com seu erro correspondente
    processedData.forEach((data, index) => {
      const errorMessage = errors.find(error => error.row === index + 2)?.message || '';
      modifiedLines.push([...Object.values(data), errorMessage]);
    });

    // Criar CSV modificado
    const csvContent = stringify([modifiedHeaders, ...modifiedLines], {
      delimiter: ';',
      quoted: true
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: new Headers({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="import_result_${Date.now()}.csv"`,
        'X-Success-Count': successCount.toString(),
        'X-Error-Count': errorCount.toString(),
      }),
    });
  }

  static createErrorResponse(message: string, status: number = 500): NextResponse {
    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}