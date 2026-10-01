import { describe, expect, it } from 'vitest';

import { parseReceiptOcrText } from '@/app/lib/receipts/receipt-ocr-parser';

describe('parseReceiptOcrText', () => {
  it('extracts Brazilian total, date and merchant from a typical receipt', () => {
    const result = parseReceiptOcrText(`
MERCADO BOM PRECO LTDA
CNPJ 12.345.678/0001-90
01/10/2026 12:42
ARROZ 1 UN 28,90
FEIJAO 1 UN 9,50
TOTAL A PAGAR R$ 38,40
`);

    expect(result).toEqual({
      amountCents: 3840,
      date: { year: 2026, month: 10, day: 1 },
      description: 'MERCADO BOM PRECO LTDA',
    });
  });

  it('prefers the total over subtotal, discount and payment values', () => {
    const result = parseReceiptOcrText(`
PADARIA CENTRAL
SUBTOTAL 52,00
DESCONTO 2,00
TOTAL R$ 50,00
DINHEIRO R$ 100,00
TROCO R$ 50,00
`);

    expect(result.amountCents).toBe(5000);
  });

  it('uses the largest monetary value when the receipt has no total label', () => {
    const result = parseReceiptOcrText(`
LOJA TESTE
CAFE 8,50
ALMOCO 31,90
AGUA 5,00
`);

    expect(result.amountCents).toBe(3190);
  });

  it('parses thousand separators and two-digit years', () => {
    const result = parseReceiptOcrText(`
ELETRONICOS BRASIL
DATA 30-09-26
VALOR TOTAL R$ 1.234,56
`);

    expect(result.amountCents).toBe(123456);
    expect(result.date).toEqual({ year: 2026, month: 9, day: 30 });
  });

  it('ignores invalid dates and metadata when choosing the merchant', () => {
    const result = parseReceiptOcrText(`
CNPJ 00.000.000/0001-00
NFC-e DOCUMENTO AUXILIAR
LOJA DO BAIRRO
31/02/2026
TOTAL 15,75
`);

    expect(result.description).toBe('LOJA DO BAIRRO');
    expect(result.date).toBeUndefined();
  });

  it('returns no suggestions for empty OCR text', () => {
    expect(parseReceiptOcrText('  \n \n')).toEqual({});
  });
});
