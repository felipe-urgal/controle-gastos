// app/types/import.ts
export interface CSVTransaction {
  id?: string;
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  categoryName?: string;
  accountName?: string;
  originalData?: Record<string, string>; // Dados originais do CSV
}

export interface CSVImportConfig {
  dateFormat: string; // 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'
  decimalSeparator: ',' | '.';
  hasHeaders: boolean;
  fieldMapping: {
    date: string;      // Nome da coluna de data
    description: string; // Nome da coluna de descrição
    amount: string;    // Nome da coluna de valor
    type?: string;     // Opcional: coluna de tipo
    category?: string; // Opcional: coluna de categoria
  };
  accountId: string;   // Conta de destino
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  errorCount: number;
  duplicates: number;
  skipped: number;
  errors: string[];
  preview?: CSVTransaction[];
}

export interface CSVParseResult {
  transactions: CSVTransaction[];
  errors: string[];
  suggestedMapping: Partial<CSVImportConfig>;
  totalRows: number;
  validRows: number;
}

export interface CSVValidationError {
  row: number;
  field: string;
  message: string;
  originalValue: string;
}

export enum DateFormat {
  DD_MM_YYYY = 'DD/MM/YYYY',
  MM_DD_YYYY = 'MM/DD/YYYY', 
  YYYY_MM_DD = 'YYYY-MM-DD',
  DD_MM_YY = 'DD/MM/YY',
  MM_DD_YY = 'MM/DD/YY'
}

export enum BankFormat {
  NUBANK = 'nubank',
  ITAU = 'itau',
  BRADESCO = 'bradesco',
  SANTANDER = 'santander',
  GENERIC = 'generic'
}

export interface BankConfig {
  name: BankFormat;
  dateFormat: DateFormat;
  decimalSeparator: ',' | '.';
  headers: string[];
  amountMultiplier: number; // Para ajustar valores negativos/positivos
}