import { NextRequest } from "next/server";
import { CsvProcessor } from '@/app/lib/csv/csvProcessor';
import { ImportResponse } from '@/app/lib/csv/importResponse';
import { AccountImportService } from '@/app/services/accountImportService';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return ImportResponse.createErrorResponse('Arquivo e usuário são obrigatórios', 400);
    }

    // Processar arquivo CSV
    const fileBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(fileBuffer).toString('utf-8');
    const delimiter = CsvProcessor.detectDelimiter(fileContent);
    const lines = CsvProcessor.parseCsvContent(fileContent, delimiter);
    
    if (lines.length === 0) {
      return ImportResponse.createErrorResponse('Arquivo CSV vazio', 400);
    }

    const headers = lines[0];
    
    // Validar colunas obrigatórias usando o serviço
    if (!AccountImportService.validateRequiredColumns(headers)) {
      return ImportResponse.createErrorResponse(
        'Colunas obrigatórias faltando. Use: name/nome, type/tipo, balance/saldo',
        400
      );
    }

    // Processar registros
    let successCount = 0;
    let errorCount = 0;
    const processedData: any[] = [];
    const errors: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i];
      
      // Pular linhas vazias
      if (values.every(value => !value || value.trim() === '')) {
        continue;
      }

      const record: any = {};

      // Criar objeto record com headers normalizados
      headers.forEach((header, index) => {
        const normalizedHeader = CsvProcessor.normalizeHeader(
          header, 
          AccountImportService.CSV_OPTIONS.columnMappings
        );
        record[normalizedHeader] = values[index];
      });

      // Usar o serviço para processar o registro
      const result = await AccountImportService.processAccountRecord(record, userId);

      processedData.push({
        ...record,
        _row: i + 1,
        _success: result.success,
        _errors: result.errors
      });

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        errors.push({
          row: i + 1,
          message: result.errors?.join(', ') || 'Erro desconhecido',
          data: record
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