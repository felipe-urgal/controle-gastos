// app/api/investments/import/route.ts
import { NextRequest } from "next/server";
import { CsvProcessor } from '@/app/lib/csv/csvProcessor';
import { ImportResponse } from '@/app/lib/csv/importResponse';
import { InvestmentImportService } from '@/app/services/investmentImportService';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return ImportResponse.createErrorResponse('Arquivo e usuário são obrigatórios', 400);
    }

    const fileBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(fileBuffer).toString('utf-8');
    const delimiter = CsvProcessor.detectDelimiter(fileContent);
    const lines = CsvProcessor.parseCsvContent(fileContent, delimiter);
    const headers = lines[0];

    let successCount = 0;
    let errorCount = 0;
    const processedData: any[] = [];
    const errors: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i];
      const record: any = {};

      // Criar objeto record
      headers.forEach((header, index) => {
        const normalizedHeader = CsvProcessor.normalizeHeader(
          header, 
          InvestmentImportService.CSV_OPTIONS.columnMappings
        );
        record[normalizedHeader] = values[index];
      });

      const result = await InvestmentImportService.processInvestmentRecord(record, userId);

      processedData.push(record);

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        errors.push({
          row: i + 1,
          message: result.errors?.join(', ') || 'Erro desconhecido'
        });
      }
    }

    return ImportResponse.createResponse(
      successCount,
      errorCount,
      headers,
      processedData,
      errors
    );

  } catch (error) {
    return ImportResponse.createErrorResponse(
      error instanceof Error ? error.message : 'Erro durante a importação'
    );
  }
}
