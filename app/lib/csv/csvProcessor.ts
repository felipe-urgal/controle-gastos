// app/lib/csv/csvProcessor.ts
import { parse as dateParse, isValid } from 'date-fns';

export interface CsvProcessingOptions {
  delimiter?: string;
  dateFormats?: string[];
  decimalSeparator?: ',' | '.';
  columnMappings?: { [key: string]: string };
  requiredFields?: string[];
}

export interface ProcessingResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  rawData?: any;
}

export interface CsvValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

export class CsvProcessor {
  static detectDelimiter(content: string): string {
    const firstLine = content.split('\n')[0];
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    
    if (semicolonCount > commaCount) return ';';
    if (commaCount > semicolonCount) return ',';
    return ';';
  }

  static parseCsvContent(content: string, delimiter: string): string[][] {
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.split(delimiter).map(value => value.trim()));
  }

  static normalizeHeader(header: string, mappings?: { [key: string]: string }): string {
    const lowerHeader = header.toLowerCase();
    return mappings?.[lowerHeader] || header;
  }

  static parseValue(value: string, fieldType: 'string' | 'number' | 'date' | 'boolean', options?: CsvProcessingOptions): any {
    if (!value) return null;

    switch (fieldType) {
      case 'number':
        // Remove qualquer formatação monetária (R$, espaços, etc)
        let cleanedValue = value.replace(/[R$\s]/g, '');
        
        // Detecta automaticamente o formato baseado na presença de vírgula e ponto
        const hasComma = cleanedValue.includes(',');
        const hasDot = cleanedValue.includes('.');
        
        if (hasComma && hasDot) {
          // Formato brasileiro: 1.234,56 → remove pontos, substitui vírgula por ponto
          cleanedValue = cleanedValue.replace(/\./g, '').replace(',', '.');
        } else if (hasComma && !hasDot) {
          // Formato europeu: 1234,56 → substitui vírgula por ponto
          cleanedValue = cleanedValue.replace(',', '.');
        } else if (!hasComma && hasDot) {
          // Formato internacional: 1234.56 → mantém como está
          // Não faz nada, já está no formato correto
        }
        
        const number = parseFloat(cleanedValue);
        return isNaN(number) ? null : number;

      case 'date':
        for (const format of options?.dateFormats || ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy']) {
          try {
            const parsedDate = dateParse(value, format, new Date());
            if (isValid(parsedDate)) return parsedDate;
          } catch {
            continue;
          }
        }
        return null;

      case 'boolean':
        const lowerValue = value.toLowerCase();
        return ['true', 'yes', 'sim', '1', 'verdadeiro'].includes(lowerValue);

      default:
        return value;
    }
  }

  static validateRequiredFields(record: any, requiredFields: string[]): CsvValidationError[] {
    const errors: CsvValidationError[] = [];
    
    requiredFields.forEach(field => {
      if (!record[field] && record[field] !== 0) {
        errors.push({
          row: record._rowNumber || 0,
          field,
          message: `Campo obrigatório: ${field}`,
          value: record[field]
        });
      }
    });

    return errors;
  }

  static async processCsv<T>(
    file: File,
    processor: (record: any, rowNumber: number) => Promise<ProcessingResult<T>>,
    options?: CsvProcessingOptions
  ): Promise<{ results: ProcessingResult<T>[]; errors: CsvValidationError[] }> {
    const content = await file.text();
    const delimiter = options?.delimiter || this.detectDelimiter(content);
    const lines = this.parseCsvContent(content, delimiter);
    
    if (lines.length < 2) {
      throw new Error('Arquivo CSV vazio ou incompleto');
    }

    const headers = lines[0].map(header => 
      this.normalizeHeader(header, options?.columnMappings)
    );

    const results: ProcessingResult<T>[] = [];
    const errors: CsvValidationError[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i];
      const record: any = { _rowNumber: i + 1 };

      // Mapear valores para headers
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });

      // Validar campos obrigatórios
      if (options?.requiredFields) {
        const requiredErrors = this.validateRequiredFields(record, options.requiredFields);
        errors.push(...requiredErrors);
        
        if (requiredErrors.length > 0) {
          results.push({ success: false, errors: requiredErrors.map(e => e.message) });
          continue;
        }
      }

      try {
        const result = await processor(record, i + 1);
        results.push(result);
        
        if (!result.success && result.errors) {
          errors.push(...result.errors.map((error) => ({
            row: i + 1,
            field: 'general',
            message: error,
            value: JSON.stringify(record)
          })));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        results.push({ success: false, errors: [errorMessage] });
        errors.push({
          row: i + 1,
          field: 'general',
          message: errorMessage,
          value: JSON.stringify(record)
        });
      }
    }

    return { results, errors };
  }
}