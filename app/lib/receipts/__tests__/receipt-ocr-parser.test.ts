import { describe, expect, it } from 'vitest';

import {
  getApplicableReceiptOcrSuggestions,
  parseReceiptOcrText,
} from '@/app/lib/receipts/receipt-ocr-parser';

describe('OCR receipt amount: conservative extraction', () => {
  it.each([
    ['TOTAL A PAGAR', 'TOTAL A PAGAR R$ 38,40', 3840, 'high'],
    ['VALOR TOTAL', 'VALOR TOTAL R$ 1.234,56', 123456, 'high'],
    ['TOTAL GERAL', 'TOTAL GERAL R$ 40,00', 4000, 'high'],
    ['TOTAL', 'TOTAL R$ 50,00', 5000, 'medium'],
  ] as const)('recognizes %s with evidence', (_label, line, cents, confidence) => {
    const result = parseReceiptOcrText('MERCADO BOM PRECO\n' + line);
    expect(result.amount).toEqual({ value: cents, confidence, evidence: line });
    expect(getApplicableReceiptOcrSuggestions(result).amountCents).toBe(cents);
  });

  it.each([
    ['cash received exceeds purchase', 'SUBTOTAL 42,00\nTOTAL R$ 37,50\nPAGAMENTO DINHEIRO R$ 100,00\nTROCO R$ 62,50', 3750],
    ['card plus total', 'VALOR TOTAL R$ 90,20\nCARTAO DE CREDITO R$ 90,20', 9020],
    ['PIX plus total', 'TOTAL A PAGAR R$ 12,80\nPAGAMENTO PIX R$ 12,80', 1280],
    ['change', 'TOTAL R$ 22,00\nDINHEIRO 50,00\nTROCO 28,00', 2200],
    ['discount', 'SUBTOTAL 100,00\nDESCONTO R$ 20,00\nTOTAL GERAL R$ 80,00', 8000],
    ['installments', 'VALOR TOTAL 120,00\n3 PARCELAS DE 40,00\nPAGAMENTO CARTAO 120,00', 12000],
  ] as const)('uses the purchase total with %s', (_name, receipt, cents) => {
    const result = parseReceiptOcrText('LOJA TESTE\n' + receipt);
    expect(result.amount?.value).toBe(cents);
    expect(result.amount?.confidence).not.toBe('low');
  });

  it.each([
    ['items without total', 'ARROZ 28,90\nFEIJAO 9,50\nAGUA 5,00'],
    ['cash without total', 'PAGAMENTO DINHEIRO R$ 100,00\nTROCO 20,00'],
    ['PIX without total', 'PAGAMENTO PIX R$ 52,00'],
    ['card without total', 'CARTAO DE CREDITO R$ 52,00'],
    ['payment received', 'VALOR PAGO R$ 52,00'],
    ['fees and discounts', 'TAXA R$ 5,00\nDESCONTO R$ 10,00'],
    ['installments without total', '3 PARCELAS R$ 40,00'],
    ['multiple values on total row', 'TOTAL R$ 10,00 R$ 20,00'],
    ['mixed total/payment row', 'TOTAL 50,00 PAGAMENTO PIX 50,00'],
    ['only CNPJ and date', 'CNPJ 12.345.678/0001-90\n01.10.2026'],
  ] as const)('does not apply any amount: %s', (_name, receipt) => {
    const result = parseReceiptOcrText('LOJA TESTE\n' + receipt);
    expect(result.amount).toBeUndefined();
    expect(getApplicableReceiptOcrSuggestions(result).amountCents).toBeUndefined();
  });

  it('marks conflicting total labels low confidence and does not apply', () => {
    const result = parseReceiptOcrText('TOTAL A PAGAR 30,00\nVALOR TOTAL 40,00');
    expect(result.amount?.confidence).toBe('low');
    expect(getApplicableReceiptOcrSuggestions(result).amountCents).toBeUndefined();
  });

  it('retains date and description even if amount cannot be identified', () => {
    const result = parseReceiptOcrText('MERCADO BOM PRECO LTDA\nDATA 01/10/2026\nCAFE 8,50\nAGUA 5,00');
    expect(result.amount).toBeUndefined();
    expect(result.date?.value).toEqual({ year: 2026, month: 10, day: 1 });
    expect(result.description?.value).toBe('MERCADO BOM PRECO LTDA');
  });

  it('handles empty OCR output', () => {
    expect(parseReceiptOcrText(' \n \n')).toEqual({});
  });
});
