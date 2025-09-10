import { prisma } from '@/app/lib/prisma';
import { CsvProcessor } from '@/app/lib/csv/csvProcessor';

export class CategoryImportService {
  public static readonly CSV_OPTIONS = {
    columnMappings: {
      'nome': 'name',
      'name': 'name',
      'categoria': 'name',
      'category': 'name'
    },
    requiredFields: ['name'],
    decimalSeparator: ',' as const,
    dateFormats: ['dd/MM/yyyy', 'yyyy-MM-dd']
  };

  // Método público para validar headers
  static validateRequiredColumns(headers: string[]): boolean {
    const normalizedHeaders = headers.map(header => 
      CsvProcessor.normalizeHeader(header, this.CSV_OPTIONS.columnMappings)
    );
    
    return this.CSV_OPTIONS.requiredFields.every(field => 
      normalizedHeaders.includes(field)
    );
  }

  static async processCategoryRecord(record: any, userId: string): Promise<{ success: boolean; errors?: string[] }> {
    const errors: string[] = [];

    try {
      // Validar nome da categoria
      const categoryName = record.name?.trim();
      if (!categoryName) {
        errors.push('Nome da categoria é obrigatório');
      }

      if (errors.length > 0) {
        return { success: false, errors };
      }

      // Verificar se categoria já existe
      const existingCategory = await prisma.category.findFirst({
        where: { 
          name: { equals: categoryName!, mode: 'insensitive' },
          userId: userId
        }
      });

      if (existingCategory) {
        return { 
          success: true, 
          errors: [`Categoria "${categoryName}" já existe, ignorando duplicata`] 
        };
      }

      // Criar nova categoria
      await prisma.category.create({
        data: {
          name: categoryName!,
          userId: userId
        }
      });

      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Erro ao criar categoria'] 
      };
    }
  }
}