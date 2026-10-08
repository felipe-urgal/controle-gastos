import { describe, expect, it } from 'vitest';

import {
  getApplicableReceiptOcrSuggestions,
  parseReceiptOcrText,
} from '@/app/lib/receipts/receipt-ocr-parser';

describe('parseReceiptOcrText: confidence and evidence', () => {
  it('returns evidence and confidence for a typical Brazilian receipt', () => {
    const suggestions = parseReceiptOcrText(`\nMERCADO BOM PRECO LTDA\nCNPJ 12.345.678/0001-90\nDATA 01/10/2026 12:42\nARROZ 1 UN 28,90\nFEIJAO 1 UN 9,50\nTOTAL A PAGAR R$ 38,40\n`);
    expect(suggestions.amount).toEqual({
      value: 3840,
      confidence: 'high',
      evidence: 'TOTAL A PAGAR R$ 38,40',
    });
    expect(suggestions.date).toEqual({
      value: { year: 2026, month: 10, day: 1 },
      confidence: 'high',
      evidence: 'DATA 01/10/2026 12:42',
    });
    expect(suggestions.description).toEqual({
      value: 'MERCADO BOM PRECO LTDA',
      confidence: 'medium',
      evidence: 'MERCADO BOM PRECO LTDA',
    });
    expect(getApplicableReceiptOcrSuggestions(suggestions)).toEqual({
      amountCents: 3840,
      date: { year: 2026, month: 10, day: 1 },
      description: 'MERCADO BOM PRECO LTDA',
    });
  });

  it('does not apply the largest amount without a total label', () => {
    const suggestions = parseReceiptOcrText('LOJA TESTE\nCAFE 8,50\nALMOCO 31,90\nAGUA 5,00');
    expect(suggestions.amount).toEqual({
      value: 3190,
      confidence: 'low',
      evidence: 'ALMOCO 31,90',
    });
    expect(getApplicableReceiptOcrSuggestions(suggestions).amountCents).toBeUndefined();
  });

  it('prefers the total rather than cash handed over', () => {
    const suggestions = parseReceiptOcrText('PADARIA CENTRAL\nSUBTOTAL 52,00\nDESCONTO 2,00\nTOTAL R$ 50,00\nDINHEIRO R$ 100,00\nTROCO R$ 50,00');
    expect(suggestions.amount?.value).toBe(5000);
    expect(suggestions.amount?.confidence).toBe('medium');
    expect(suggestions.amount?.evidence).toBe('TOTAL R$ 50,00');
  });

  it('keeps ambiguous dates for review, not application', () => {
    const suggestions = parseReceiptOcrText('DATA COMPRA 01/10/2026\nVENCIMENTO 10/10/2026');
    expect(suggestions.date?.confidence).toBe('low');
    expect(getApplicableReceiptOcrSuggestions(suggestions).date).toBeUndefined();
  });

  it('parses thousands separators and two-digit years', () => {
    const suggestions = parseReceiptOcrText('ELETRONICOS BRASIL\nDATA 30-09-26\nVALOR TOTAL R$ 1.234,56');
    expect(suggestions.amount?.value).toBe(123456);
    expect(suggestions.amount?.confidence).toBe('high');
    expect(suggestions.date?.value).toEqual({ year: 2026, month: 9, day: 30 });
  });

  it('skips invalid dates, returns no unwarranted confidence', () => {
    const suggestions = parseReceiptOcrText('CNPJ 00.000.000/0001-00\nNFC-e DOCUMENTO AUXILIAR\nLOJA DO BAIRRO\n31/02/2026\nTOTAL 15,75');
    expect(suggestions.description?.value).toBe('LOJA DO BAIRRO');
    expect(suggestions.date).toBeUndefined();
  });

  it('does not mistake CNPJ or dates for monetary values', () => {
    const suggestions = parseReceiptOcrText('LOJA TESTE\nCNPJ 12.345.678/0001-90\n01.10.2026');
    expect(suggestions.amount).toBeUndefined();
  });

  it('handles empty text without any suggestions', () => {
    expect(parseReceiptOcrText('  \n \n')).toEqual({});
    expect(getApplicableReceiptOcrSuggestions({})).toEqual({
      amountCents: undefined,
      date: undefined,
      description: undefined,
    });
  });

  it('does not apply low-confidence descriptions', () => {
    const suggestions = parseReceiptOcrText('CNPJ 12.345.678/0001-90\nCPF 123\nDATA 01/10/2026\nTELEFONE 11 999999999\nLOJA DO BAIRRO');
    expect(suggestions.description?.confidence).toBe('low');
    expect(getApplicableReceiptOcrSuggestions(suggestions).description).toBeUndefined();
  });
});
